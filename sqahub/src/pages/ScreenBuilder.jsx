import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, Edit, Settings, Layers, Database, Search, Type, Zap, Download, FileCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import FieldManagerInline from "../components/builder/FieldManagerInline";
import ActionButtonManager from "../components/builder/ActionButtonManager";
import ScreenTable from "../components/builder/ScreenTable";

const DEFAULT_FIELDS = [
  {
    id: 'default_id',
    nome_campo: 'id',
    label: 'ID',
    tipo: 'inteiro', // INTEGER com AUTO INCREMENT (padrão ERP)
    obrigatorio: true,
    somente_leitura: true,
    ordem: 0,
  },
  {
    id: 'default_dhinc',
    nome_campo: 'dhinc',
    label: 'Data Inclusão',
    tipo: 'datetime',
    obrigatorio: false,
    somente_leitura: true,
    ordem: 1,
  },
  {
    id: 'default_dhalter',
    nome_campo: 'dhalter',
    label: 'Data Alteração',
    tipo: 'datetime',
    obrigatorio: false,
    somente_leitura: true,
    ordem: 2,
  },
];

export default function ScreenBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const screenId = urlParams.get('id');

  const [showForm, setShowForm] = useState(false);
  const [editingScreen, setEditingScreen] = useState(null);
  const [selectedScreens, setSelectedScreens] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFormTab, setActiveFormTab] = useState("dados");
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    tabela_nome: "",
    ativa: true,
    icone: "Database",
    cor_primaria: "#64748B",
    is_subtable: false,
    parent_screen_id: null,
    ordem_aba: 0,
  });

  const [tempFields, setTempFields] = useState([...DEFAULT_FIELDS]);

  const { data: screens = [], isLoading } = useQuery({
    queryKey: ['screens', 'v2'], // v2 para invalidar cache
    queryFn: async () => {
      const allScreens = await base44.entities.ScreenDefinition.list('-created_date');
      console.log('📋 ScreenBuilder - Total de screens:', allScreens.length);
      console.log('📋 Tipos:', allScreens.map(s => ({ nome: s.nome, type: s.screen_type })));
      return allScreens;
    },
    initialData: [],
  });

  const { data: allFields = [] } = useQuery({
    queryKey: ['all-fields'],
    queryFn: () => base44.entities.FieldDefinition.list(),
    initialData: [],
  });

  const { data: allButtons = [] } = useQuery({
    queryKey: ['all-buttons'],
    queryFn: () => base44.entities.ActionButton.list(),
    initialData: [],
  });

  const mainScreens = screens.filter(s => !s.is_subtable);

  const generateAndDownloadEntity = async (screen) => {
    try {
      const response = await base44.functions.invoke('generateEntityFile', {
        screenId: screen.id
      });

      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${screen.tabela_nome}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success(`Arquivo ${screen.tabela_nome}.json baixado! Salve na pasta entities/ do projeto e faça deploy para criar a tabela.`, {
        duration: 8000,
      });
    } catch (error) {
      console.error('Erro ao gerar entidade:', error);
      toast.error('Erro ao gerar arquivo de entidade: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Garantir que screen_type seja 'crud' ou 'subtable'
      const screenType = data.screenData.is_subtable ? 'subtable' : 'crud';
      const screenData = { ...data.screenData, screen_type: screenType };
      const screen = await base44.entities.ScreenDefinition.create(screenData);

      if (data.fields && data.fields.length > 0) {
        await Promise.all(
          data.fields.map((field, index) => {
            const { id, ...fieldData } = field;
            return base44.entities.FieldDefinition.create({
              ...fieldData,
              screen_id: screen.id,
              ordem: index,
            });
          })
        );
      }

      // Sincronizar tabela física no banco de dados
      try {
        await base44.entities.ScreenDefinition.syncTable(screen.id);
        console.log(`✅ Tabela ${screen.tabela_nome} criada no banco de dados`);
      } catch (syncError) {
        console.error('Erro ao sincronizar tabela:', syncError);
        toast.error('Tabela criada mas houve erro ao sincronizar: ' + syncError.message);
      }

      return screen;
    },
    onSuccess: async (screen) => {
      queryClient.invalidateQueries({ queryKey: ['screens'] });
      queryClient.invalidateQueries({ queryKey: ['all-fields'] });
      toast.success('Tela criada com sucesso!');

      await generateAndDownloadEntity(screen);

      handleCancel();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedScreen = await base44.entities.ScreenDefinition.update(id, data);

      // Sincronizar tabela física após atualização (importante para subtelas)
      try {
        await base44.entities.ScreenDefinition.syncTable(id);
        console.log(`✅ Tabela ${updatedScreen.tabela_nome} sincronizada no banco de dados`);
      } catch (syncError) {
        console.error('Erro ao sincronizar tabela:', syncError);
        toast.warning('Tela atualizada mas houve erro ao sincronizar tabela: ' + syncError.message);
      }

      return updatedScreen;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screens'] });
      toast.success('Tela atualizada com sucesso!');
      handleCancel();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ScreenDefinition.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screens'] });
      toast.success('Tela excluída com sucesso!');
      setSelectedScreens([]);
    },
  });

  useEffect(() => {
    if (screenId && screens.length > 0) {
      const screen = screens.find(s => s.id === screenId);
      if (screen) {
        setFormData(screen);
        setEditingScreen(screen);
        setShowForm(true);
      }
    }
  }, [screenId, screens]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let fieldsToCreate = [...tempFields];
    
    if (formData.is_subtable && formData.parent_screen_id && !editingScreen) {
      const parentScreen = screens.find(s => s.id === formData.parent_screen_id);
      if (parentScreen) {
        const fkField = {
          id: `temp_fk_${Date.now()}`,
          nome_campo: `${parentScreen.tabela_nome}_id`,
          label: `${parentScreen.nome} (ID)`,
          tipo: 'fk',
          obrigatorio: true,
          fk_screen_id: formData.parent_screen_id,
          fk_tabela_nome: parentScreen.tabela_nome,
          fk_display_field: 'id',
          ordem: fieldsToCreate.length,
        };
        fieldsToCreate.push(fkField);
      }
    }
    
    if (editingScreen) {
      updateMutation.mutate({ id: editingScreen.id, data: formData });
    } else {
      createMutation.mutate({
        screenData: formData,
        fields: fieldsToCreate,
      });
    }
  };

  const handleGenerateEntity = async () => {
    if (!editingScreen) return;
    await generateAndDownloadEntity(editingScreen);
  };

  const handleDelete = () => {
    if (selectedScreens.length === 0) return;

    const count = selectedScreens.length;
    if (confirm(`Tem certeza que deseja excluir ${count} ${count === 1 ? 'tela' : 'telas'}?`)) {
      selectedScreens.forEach(id => {
        deleteMutation.mutate(id);
      });
    }
  };

  const handleNew = () => {
    setEditingScreen(null);
    setFormData({
      nome: "",
      descricao: "",
      tabela_nome: "",
      ativa: true,
      icone: "Database",
      cor_primaria: "#64748B",
      is_subtable: false,
      parent_screen_id: null,
      ordem_aba: 0,
    });
    setTempFields([...DEFAULT_FIELDS]);
    setActiveFormTab("dados");
    setShowForm(true);
  };

  const handleEdit = () => {
    if (selectedScreens.length === 1) {
      const screen = screens.find(s => s.id === selectedScreens[0]);
      setFormData(screen);
      setEditingScreen(screen);
      setActiveFormTab("dados");
      setShowForm(true);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingScreen(null);
    setSelectedScreens([]);
    setActiveFormTab("dados");
    setFormData({
      nome: "",
      descricao: "",
      tabela_nome: "",
      ativa: true,
      icone: "Database",
      cor_primaria: "#64748B",
      is_subtable: false,
      parent_screen_id: null,
      ordem_aba: 0,
    });
    setTempFields([...DEFAULT_FIELDS]);
    if (screenId) {
      navigate(createPageUrl("screenbuilder"));
    }
  };

  const getFieldCount = (screenId) => {
    if (!screenId || !allFields) return 0;
    return allFields.filter(f => f.screen_id === screenId).length;
  };

  const getButtonCount = (screenId) => {
    if (!screenId || !allButtons) return 0;
    return allButtons.filter(b => b.screen_id === screenId && b.ativo).length;
  };

  const filteredScreens = screens.filter(screen =>
    screen.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    screen.tabela_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (screen.descricao && screen.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const { data: currentScreenFields = [] } = useQuery({
    queryKey: ['fields', editingScreen?.id],
    queryFn: () => base44.entities.FieldDefinition.filter({ screen_id: editingScreen.id }, 'ordem'),
    enabled: !!editingScreen?.id,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Construtor de Telas
            </h1>
            <p className="text-sm text-slate-600">
              Gerencie as telas do sistema e gere tabelas no banco de dados
            </p>
          </div>
        </div>
      </div>

      {!showForm && (
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleNew}
              className="bg-slate-800 hover:bg-slate-900"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Incluir
            </Button>
            
            <Button
              size="sm"
              onClick={handleEdit}
              disabled={selectedScreens.length !== 1}
              variant="outline"
              className="border-slate-300"
            >
              <Edit className="w-4 h-4 mr-1.5" />
              Editar
            </Button>
            
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={selectedScreens.length === 0}
              variant="outline"
              className="border-slate-300"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Excluir
            </Button>

            {selectedScreens.length > 0 && (
              <span className="text-sm text-slate-600 ml-2">
                {selectedScreens.length} selecionada{selectedScreens.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar telas..."
              className="pl-9 pr-4 h-9 w-64 bg-slate-50 border-slate-200"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        {showForm ? (
          <div className="p-6 h-full overflow-auto">
            <div className="max-w-7xl mx-auto">
              <Card className="border-none shadow-lg">
                <CardHeader className="border-b border-slate-100 bg-white pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-lg">
                      {editingScreen ? 'Editar Tela' : 'Nova Tela'}
                    </CardTitle>
                    {editingScreen && (
                      <Button
                        onClick={handleGenerateEntity}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <FileCode className="w-4 h-4" />
                        Baixar Entidade
                      </Button>
                    )}
                  </div>

                  <Tabs value={activeFormTab} onValueChange={setActiveFormTab} className="w-full">
                    <TabsList className="w-full justify-start bg-slate-50 border-b border-slate-200 rounded-none h-12 p-0">
                      <TabsTrigger 
                        value="dados"
                        className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none px-6 py-3"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Dados da Tela
                      </TabsTrigger>
                      <TabsTrigger 
                        value="campos"
                        className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none px-6 py-3"
                      >
                        <Type className="w-4 h-4 mr-2" />
                        Campos ({editingScreen ? getFieldCount(editingScreen.id) : tempFields.length})
                      </TabsTrigger>
                      <TabsTrigger 
                        value="acoes"
                        className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none px-6 py-3"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Botões de Ação {editingScreen && `(${getButtonCount(editingScreen.id)})`}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dados" className="mt-0">
                      <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="nome">Nome da Tela *</Label>
                              <Input
                                id="nome"
                                value={formData.nome}
                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                placeholder="Ex: Cadastro de Clientes"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="tabela_nome">Nome da Tabela *</Label>
                              <Input
                                id="tabela_nome"
                                value={formData.tabela_nome}
                                onChange={(e) => setFormData({ ...formData, tabela_nome: e.target.value })}
                                placeholder="Ex: clientes"
                                required
                              />
                              <p className="text-xs text-slate-500">Nome da tabela no banco de dados</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="descricao">Descrição</Label>
                            <Textarea
                              id="descricao"
                              value={formData.descricao}
                              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                              placeholder="Descreva a funcionalidade desta tela"
                              rows={2}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="cor_primaria">Cor Primária</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="cor_primaria"
                                  type="color"
                                  value={formData.cor_primaria}
                                  onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                                  className="w-20"
                                />
                                <Input
                                  value={formData.cor_primaria}
                                  onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                                  placeholder="#64748B"
                                />
                              </div>
                            </div>

                            <div className="flex items-end">
                              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 w-full">
                                <div>
                                  <Label htmlFor="ativa" className="font-medium text-sm">Tela Ativa</Label>
                                  <p className="text-xs text-slate-500">Disponível no sistema</p>
                                </div>
                                <Switch
                                  id="ativa"
                                  checked={formData.ativa}
                                  onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-slate-600" />
                                <div>
                                  <Label htmlFor="is_subtable" className="font-medium">Subtela (Aba)</Label>
                                  <p className="text-xs text-slate-500">Esta tela será exibida como aba</p>
                                </div>
                              </div>
                              <Switch
                                id="is_subtable"
                                checked={formData.is_subtable}
                                onCheckedChange={(checked) => setFormData({ 
                                  ...formData, 
                                  is_subtable: checked,
                                  parent_screen_id: checked ? formData.parent_screen_id : null,
                                })}
                              />
                            </div>

                            {formData.is_subtable && (
                              <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                  <Label htmlFor="parent_screen_id">Tela Principal *</Label>
                                  <Select
                                    value={formData.parent_screen_id || ''}
                                    onValueChange={(value) => setFormData({ ...formData, parent_screen_id: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione a tela principal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {mainScreens.map((screen) => (
                                        <SelectItem key={screen.id} value={screen.id}>
                                          {screen.nome}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <p className="text-xs text-slate-500">
                                    Um campo FK será criado automaticamente
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="ordem_aba">Ordem da Aba</Label>
                                  <Input
                                    id="ordem_aba"
                                    type="number"
                                    value={formData.ordem_aba}
                                    onChange={(e) => setFormData({ ...formData, ordem_aba: parseInt(e.target.value) || 0 })}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-3 border-t border-slate-200">
                            <Button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-900">
                              <Save className="w-4 h-4 mr-2" />
                              {editingScreen ? 'Atualizar Tela' : 'Criar Tela'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCancel}
                              className="border-slate-300"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </TabsContent>

                    <TabsContent value="campos" className="mt-0">
                      <CardContent className="p-6">
                        {editingScreen ? (
                          <FieldManagerInline screenId={editingScreen.id} />
                        ) : (
                          <FieldManagerInline 
                            screenId={null} 
                            tempFields={tempFields}
                            onFieldsChange={setTempFields}
                          />
                        )}
                        
                        <div className="flex gap-2 pt-6 mt-6 border-t border-slate-200">
                          <Button
                            type="button"
                            onClick={handleSubmit}
                            className="flex-1 bg-slate-800 hover:bg-slate-900"
                            disabled={!editingScreen && tempFields.filter(f => !f.id.startsWith('default_')).length === 0}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {editingScreen ? 'Atualizar Tela' : 'Criar Tela'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            className="border-slate-300"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </CardContent>
                    </TabsContent>

                    <TabsContent value="acoes" className="mt-0">
                      <CardContent className="p-6">
                        <ActionButtonManager 
                          screenId={editingScreen?.id} 
                          fields={currentScreenFields}
                        />
                      </CardContent>
                    </TabsContent>
                  </Tabs>
                </CardHeader>
              </Card>
            </div>
          </div>
        ) : (
          <div className="h-full p-6">
            <ScreenTable
              screens={filteredScreens}
              isLoading={isLoading}
              selectedScreens={selectedScreens}
              onSelectionChange={setSelectedScreens}
              getFieldCount={getFieldCount}
              getButtonCount={getButtonCount}
              handleNew={handleNew}
              searchTerm={searchTerm}
            />
          </div>
        )}
      </div>
    </div>
  );
}