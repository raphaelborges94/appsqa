import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Save, Trash2, Edit, Search, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import FieldManagerInline from "../components/builder/FieldManagerInline";

const DEFAULT_TREE_FIELDS = [
  {
    id: 'default_id',
    nome_campo: 'id',
    label: 'ID',
    tipo: 'inteiro',
    obrigatorio: true,
    somente_leitura: true,
    ordem: 0,
  },
  {
    id: 'default_nome',
    nome_campo: 'nome',
    label: 'Nome',
    tipo: 'texto',
    obrigatorio: true,
    ordem: 1,
  },
  {
    id: 'default_pai_id',
    nome_campo: 'pai_id',
    label: 'Nó Pai',
    tipo: 'inteiro', // FK para o próprio registro pai (auto-referência)
    obrigatorio: false,
    ordem: 2,
  },
  {
    id: 'default_codigo',
    nome_campo: 'codigo',
    label: 'Código',
    tipo: 'texto',
    obrigatorio: false,
    ordem: 3,
  },
  {
    id: 'default_dhinc',
    nome_campo: 'dhinc',
    label: 'Data Inclusão',
    tipo: 'datetime',
    obrigatorio: false,
    somente_leitura: true,
    ordem: 4,
  },
  {
    id: 'default_dhalter',
    nome_campo: 'dhalter',
    label: 'Data Alteração',
    tipo: 'datetime',
    obrigatorio: false,
    somente_leitura: true,
    ordem: 5,
  },
];

export default function TreeScreenBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const screenId = urlParams.get('id');

  const [showForm, setShowForm] = useState(false);
  const [editingScreen, setEditingScreen] = useState(null);
  const [selectedScreens, setSelectedScreens] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    tabela_nome: "",
    ativa: true,
    icone: "Network",
    cor_primaria: "#10B981",
    campo_nome: "nome",
    campo_pai: "pai_id",
    campo_codigo: "codigo",
    permitir_raiz: true,
    nivel_maximo: null,
  });

  const [tempFields, setTempFields] = useState([...DEFAULT_TREE_FIELDS]);

  const { data: screens = [], isLoading } = useQuery({
    queryKey: ['tree-screens'],
    queryFn: () => base44.entities.TreeScreenDefinition.list('-created_date'),
    initialData: [],
  });

  const { data: allFields = [] } = useQuery({
    queryKey: ['all-fields'],
    queryFn: () => base44.entities.FieldDefinition.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Garantir que screen_type seja 'tree'
      const screenData = { ...data.screenData, screen_type: 'tree' };
      const screen = await base44.entities.TreeScreenDefinition.create(screenData);

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
        await base44.entities.TreeScreenDefinition.syncTable(screen.id);
        console.log(`✅ Tabela ${screen.tabela_nome} criada no banco de dados`);
      } catch (syncError) {
        console.error('Erro ao sincronizar tabela:', syncError);
        toast.error('Tabela criada mas houve erro ao sincronizar: ' + syncError.message);
      }

      return screen;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-screens'] });
      queryClient.invalidateQueries({ queryKey: ['all-fields'] });
      toast.success('Tela em árvore criada com sucesso!');
      handleCancel();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedScreen = await base44.entities.TreeScreenDefinition.update(id, data);

      // Sincronizar tabela física após atualização
      try {
        await base44.entities.TreeScreenDefinition.syncTable(id);
        console.log(`✅ Tabela ${updatedScreen.tabela_nome} sincronizada no banco de dados`);
      } catch (syncError) {
        console.error('Erro ao sincronizar tabela:', syncError);
        toast.warning('Tela atualizada mas houve erro ao sincronizar tabela: ' + syncError.message);
      }

      return updatedScreen;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-screens'] });
      toast.success('Tela atualizada com sucesso!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TreeScreenDefinition.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-screens'] });
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
    
    const fieldsToCreate = [...tempFields];
    
    if (editingScreen) {
      updateMutation.mutate({ id: editingScreen.id, data: formData });
    } else {
      createMutation.mutate({
        screenData: formData,
        fields: fieldsToCreate,
      });
    }
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
      icone: "Network",
      cor_primaria: "#10B981",
      campo_nome: "nome",
      campo_pai: "pai_id",
      campo_codigo: "codigo",
      permitir_raiz: true,
      nivel_maximo: null,
    });
    setTempFields([...DEFAULT_TREE_FIELDS]);
    setShowForm(true);
  };

  const handleEdit = () => {
    if (selectedScreens.length === 1) {
      const screen = screens.find(s => s.id === selectedScreens[0]);
      if (screen) {
        navigate(`${createPageUrl("treescreenbuilder")}?id=${screen.id}`);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingScreen(null);
    setSelectedScreens([]);
    setFormData({
      nome: "",
      descricao: "",
      tabela_nome: "",
      ativa: true,
      icone: "Network",
      cor_primaria: "#10B981",
      campo_nome: "nome",
      campo_pai: "pai_id",
      campo_codigo: "codigo",
      permitir_raiz: true,
      nivel_maximo: null,
    });
    setTempFields([...DEFAULT_TREE_FIELDS]);
    if (screenId) {
      navigate(createPageUrl("treescreenbuilder"));
    }
  };

  const getFieldCount = (screenId) => {
    if (!screenId || !allFields) return 0;
    return allFields.filter(f => f.screen_id === screenId).length;
  };

  const filteredScreens = screens.filter(screen =>
    screen.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    screen.tabela_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (screen.descricao && screen.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Construtor de Telas em Árvore
            </h1>
            <p className="text-sm text-slate-600">
              Crie telas hierárquicas para plano de contas, naturezas, centros de resultado, etc
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
            <div className="max-w-6xl mx-auto">
              <Card className="border-none shadow-lg">
                <CardHeader className="border-b border-slate-100 bg-white">
                  <CardTitle className="text-lg">
                    {editingScreen ? 'Editar Tela em Árvore' : 'Nova Tela em Árvore'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome da Tela *</Label>
                        <Input
                          id="nome"
                          value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          placeholder="Ex: Plano de Contas"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tabela_nome">Nome da Tabela *</Label>
                        <Input
                          id="tabela_nome"
                          value={formData.tabela_nome}
                          onChange={(e) => setFormData({ ...formData, tabela_nome: e.target.value })}
                          placeholder="Ex: plano_contas"
                          required
                        />
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

                    <div className="border-t border-slate-200 pt-4">
                      <h3 className="text-sm font-semibold text-slate-900 mb-4">Configuração da Árvore</h3>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="campo_nome">Campo de Nome *</Label>
                          <Input
                            id="campo_nome"
                            value={formData.campo_nome}
                            onChange={(e) => setFormData({ ...formData, campo_nome: e.target.value })}
                            placeholder="nome"
                            required
                          />
                          <p className="text-xs text-slate-500">Campo exibido na árvore</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="campo_pai">Campo Pai *</Label>
                          <Input
                            id="campo_pai"
                            value={formData.campo_pai}
                            onChange={(e) => setFormData({ ...formData, campo_pai: e.target.value })}
                            placeholder="pai_id"
                            required
                          />
                          <p className="text-xs text-slate-500">Referência ao nó pai</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="campo_codigo">Campo Código</Label>
                          <Input
                            id="campo_codigo"
                            value={formData.campo_codigo}
                            onChange={(e) => setFormData({ ...formData, campo_codigo: e.target.value })}
                            placeholder="codigo"
                          />
                          <p className="text-xs text-slate-500">Código/ID hierárquico</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div>
                            <Label htmlFor="permitir_raiz" className="font-medium text-sm">Permitir Nós Raiz</Label>
                            <p className="text-xs text-slate-500">Criar nós sem pai</p>
                          </div>
                          <Switch
                            id="permitir_raiz"
                            checked={formData.permitir_raiz}
                            onCheckedChange={(checked) => setFormData({ ...formData, permitir_raiz: checked })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="nivel_maximo">Nível Máximo</Label>
                          <Input
                            id="nivel_maximo"
                            type="number"
                            value={formData.nivel_maximo || ''}
                            onChange={(e) => setFormData({ ...formData, nivel_maximo: e.target.value ? parseInt(e.target.value) : null })}
                            placeholder="Ilimitado"
                          />
                          <p className="text-xs text-slate-500">Profundidade máxima da árvore</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                      <h3 className="text-sm font-semibold text-slate-900 mb-4">Campos Adicionais</h3>
                      {editingScreen ? (
                        <FieldManagerInline screenId={editingScreen.id} />
                      ) : (
                        <FieldManagerInline 
                          screenId={null} 
                          tempFields={tempFields}
                          onFieldsChange={setTempFields}
                        />
                      )}
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-200">
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
              </Card>
            </div>
          </div>
        ) : (
          <div className="h-full p-6">
            <Card className="border-none shadow-lg h-full">
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredScreens.length === 0 ? (
                  <div className="text-center py-12">
                    <Network className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Nenhuma tela em árvore criada
                    </h3>
                    <p className="text-slate-600 mb-4">
                      Crie sua primeira tela hierárquica
                    </p>
                    <Button onClick={handleNew}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeira Tela
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredScreens.map((screen) => (
                      <div
                        key={screen.id}
                        onClick={() => setSelectedScreens([screen.id])}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedScreens.includes(screen.id)
                            ? 'border-slate-400 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Network className="w-5 h-5 text-emerald-600 mt-0.5" />
                            <div>
                              <h3 className="font-semibold text-slate-900">{screen.nome}</h3>
                              <p className="text-sm text-slate-600">{screen.tabela_nome}</p>
                              {screen.descricao && (
                                <p className="text-xs text-slate-500 mt-1">{screen.descricao}</p>
                              )}
                              <div className="flex gap-2 mt-2">
                                <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                                  {getFieldCount(screen.id)} campos
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  screen.ativa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {screen.ativa ? 'Ativa' : 'Inativa'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}