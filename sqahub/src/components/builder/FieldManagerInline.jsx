import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, Type, X, Lock } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const FIELD_TYPES = [
  { value: "inteiro", label: "Inteiro", icon: "123" },
  { value: "texto", label: "Texto", icon: "Aa" },
  { value: "decimal", label: "Decimal", icon: "0.0" },
  { value: "data", label: "Data", icon: "📅" },
  { value: "datetime", label: "Data + Hora", icon: "🕐" },
  { value: "hora", label: "Hora", icon: "⏰" },
  { value: "checkbox", label: "Checkbox", icon: "☑" },
  { value: "texto_longo", label: "Texto Longo", icon: "📝" },
  { value: "imagem", label: "Imagem", icon: "🖼" },
  { value: "anexo", label: "Anexo", icon: "📎" },
  { value: "fk", label: "FK", icon: "🔗" },
];

export default function FieldManagerInline({ screenId, tempFields, onFieldsChange }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nome_campo: "",
    label: "",
    tipo: "texto",
    obrigatorio: false,
    unico: false,
    somente_leitura: false,
    tamanho_maximo: null,
    valor_padrao: "",
    fk_screen_id: null,
    fk_display_field: "",
    placeholder: "",
    ajuda: "",
  });

  const { data: serverFields, isLoading } = useQuery({
    queryKey: ['fields', screenId],
    queryFn: () => base44.entities.FieldDefinition.listByScreen(screenId),
    initialData: [],
    enabled: !!screenId,
  });

  const { data: screens } = useQuery({
    queryKey: ['screens'],
    queryFn: () => base44.entities.ScreenDefinition.list(),
    initialData: [],
  });

  const fields = screenId ? serverFields : (tempFields || []);

  // Debug: verificar o que está sendo carregado
  React.useEffect(() => {
    if (screenId) {
      console.log('FieldManagerInline - screenId:', screenId);
      console.log('FieldManagerInline - serverFields:', serverFields);
      console.log('FieldManagerInline - isLoading:', isLoading);
    }
  }, [screenId, serverFields, isLoading]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FieldDefinition.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fields', screenId] });
      toast.success('Campo adicionado!');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FieldDefinition.delete(id, screenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fields', screenId] });
      toast.success('Campo removido!');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.nome_campo.trim() || !formData.label.trim()) {
      toast.error('Preencha nome do campo e label');
      return;
    }

    if (formData.tipo === 'fk' && !formData.fk_screen_id) {
      toast.error('Selecione a tabela referenciada para campo FK');
      return;
    }

    const newField = {
      ...formData,
      nome_campo: formData.nome_campo.toLowerCase().replace(/\s+/g, '_'),
      id: screenId ? undefined : `temp_${Date.now()}`,
    };

    // Preencher fk_tabela_nome se for campo FK
    if (newField.tipo === 'fk' && newField.fk_screen_id) {
      const referencedScreen = screens.find(s => s.id === newField.fk_screen_id);
      if (referencedScreen) {
        newField.fk_tabela_nome = referencedScreen.tabela_nome;
      }
    }

    if (screenId) {
      createMutation.mutate({
        ...newField,
        screen_id: screenId,
        ordem: fields.length,
      });
    } else {
      onFieldsChange([...fields, newField]);
      toast.success('Campo adicionado!');
      resetForm();
    }
  };

  const handleDelete = (field) => {
    if (!screenId && field.id && field.id.startsWith('default_')) {
      toast.error('Não é possível remover campos padrão');
      return;
    }

    if (screenId) {
      if (confirm('Deseja remover este campo?')) {
        deleteMutation.mutate(field.id);
      }
    } else {
      onFieldsChange(fields.filter(f => f.id !== field.id));
      toast.success('Campo removido!');
    }
  };

  const resetForm = () => {
    setFormData({
      nome_campo: "",
      label: "",
      tipo: "texto",
      obrigatorio: false,
      unico: false,
      somente_leitura: false,
      tamanho_maximo: null,
      valor_padrao: "",
      fk_screen_id: null,
      fk_display_field: "",
      placeholder: "",
      ajuda: "",
    });
    setShowForm(false);
  };

  const getTypeInfo = (tipo) => {
    return FIELD_TYPES.find(t => t.value === tipo) || { icon: "•", label: tipo };
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-200 bg-slate-50 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Type className="w-4 h-4 text-slate-700" />
            Campos ({fields.length})
          </CardTitle>
          <Button
            size="sm"
            variant={showForm ? "outline" : "default"}
            onClick={() => setShowForm(!showForm)}
            className={!showForm ? "bg-slate-800 hover:bg-slate-900 h-8" : "h-8 border-slate-300"}
          >
            {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {showForm && (
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nome Técnico *</Label>
                <Input
                  value={formData.nome_campo}
                  onChange={(e) => setFormData({ ...formData, nome_campo: e.target.value })}
                  placeholder="ex: cpf_cliente"
                  required
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Label *</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="ex: CPF do Cliente"
                  required
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="text-sm">
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo === 'fk' ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Tabela Referenciada *</Label>
                    <Select
                      value={formData.fk_screen_id || ''}
                      onValueChange={(value) => setFormData({ ...formData, fk_screen_id: value })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {screens.map((screen) => (
                          <SelectItem key={screen.id} value={screen.id} className="text-sm">
                            {screen.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Campo de Exibição</Label>
                    <Input
                      value={formData.fk_display_field}
                      onChange={(e) => setFormData({ ...formData, fk_display_field: e.target.value })}
                      placeholder="ex: nome"
                      className="h-8 text-sm"
                    />
                  </div>
                </>
              ) : formData.tipo === 'texto' ? (
                <div className="space-y-1">
                  <Label className="text-xs">Tamanho Máx.</Label>
                  <Input
                    type="number"
                    value={formData.tamanho_maximo || ''}
                    onChange={(e) => setFormData({ ...formData, tamanho_maximo: parseInt(e.target.value) || null })}
                    placeholder="ex: 255"
                    className="h-8 text-sm"
                  />
                </div>
              ) : (
                <div></div>
              )}

              <div className="col-span-2 flex items-center gap-3 pt-1">
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="obrigatorio"
                    checked={formData.obrigatorio}
                    onCheckedChange={(checked) => setFormData({ ...formData, obrigatorio: checked })}
                  />
                  <Label htmlFor="obrigatorio" className="text-xs cursor-pointer">Obrigatório</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="unico"
                    checked={formData.unico}
                    onCheckedChange={(checked) => setFormData({ ...formData, unico: checked })}
                  />
                  <Label htmlFor="unico" className="text-xs cursor-pointer">Único</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="somente_leitura"
                    checked={formData.somente_leitura}
                    onCheckedChange={(checked) => setFormData({ ...formData, somente_leitura: checked })}
                  />
                  <Label htmlFor="somente_leitura" className="text-xs cursor-pointer">Só Leitura</Label>
                </div>
              </div>

              <div className="col-span-2 flex gap-2 pt-1">
                <Button 
                  type="submit" 
                  size="sm"
                  className="flex-1 bg-slate-800 hover:bg-slate-900 h-8"
                  disabled={createMutation.isPending}
                >
                  <Save className="w-3 h-3 mr-1" />
                  Adicionar
                </Button>
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={resetForm}
                  className="h-8 border-slate-300"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : fields.length === 0 ? (
          <div className="text-center py-8">
            <Type className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Nenhum campo adicionado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12 font-semibold text-xs">Tipo</TableHead>
                  <TableHead className="font-semibold text-xs">Nome Interface</TableHead>
                  <TableHead className="font-semibold text-xs">Nome Técnico</TableHead>
                  <TableHead className="font-semibold text-xs">Validações</TableHead>
                  <TableHead className="w-16 text-center font-semibold text-xs">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => {
                  const isDefaultField = field.id && field.id.startsWith('default_');
                  const typeInfo = getTypeInfo(field.tipo);
                  
                  return (
                    <TableRow 
                      key={field.id}
                      className={isDefaultField ? 'bg-slate-50' : 'hover:bg-slate-50'}
                    >
                      <TableCell className="py-2">
                        <span className="text-sm">{typeInfo.icon}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="font-medium text-slate-900 text-sm">
                          {field.label}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <code className="text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {field.nome_campo}
                        </code>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex gap-1 flex-wrap">
                          {field.obrigatorio && (
                            <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-300">
                              obrigatório
                            </Badge>
                          )}
                          {field.unico && (
                            <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-300">
                              único
                            </Badge>
                          )}
                          {field.somente_leitura && (
                            <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-300">
                              <Lock className="w-2.5 h-2.5 mr-0.5" />
                              leitura
                            </Badge>
                          )}
                          {isDefaultField && (
                            <Badge variant="outline" className="text-xs bg-slate-200 text-slate-700 border-slate-400">
                              padrão
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        {!isDefaultField && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(field)}
                            className="h-6 w-6 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}