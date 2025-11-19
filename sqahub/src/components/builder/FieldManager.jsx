import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Type, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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
  { value: "fk", label: "FK (Referência)", icon: "🔗" },
];

export default function FieldManager({ screenId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedFields, setExpandedFields] = useState({});
  const [formData, setFormData] = useState({
    screen_id: screenId,
    nome_campo: "",
    label: "",
    tipo: "texto",
    obrigatorio: false,
    unico: false,
    tamanho_maximo: null,
    valor_padrao: "",
    fk_screen_id: null,
    fk_display_field: "",
    ordem: 0,
    placeholder: "",
    ajuda: "",
  });

  const { data: fields, isLoading } = useQuery({
    queryKey: ['fields', screenId],
    queryFn: () => base44.entities.FieldDefinition.filter({ screen_id: screenId }, 'ordem'),
    initialData: [],
  });

  const { data: screens } = useQuery({
    queryKey: ['screens'],
    queryFn: () => base44.entities.ScreenDefinition.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FieldDefinition.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fields', screenId] });
      toast.success('Campo adicionado com sucesso!');
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao criar campo: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FieldDefinition.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fields', screenId] });
      toast.success('Campo removido com sucesso!');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validações
    if (!formData.nome_campo.trim()) {
      toast.error('Nome do campo na tabela é obrigatório');
      return;
    }
    
    if (!formData.label.trim()) {
      toast.error('Nome do campo na interface é obrigatório');
      return;
    }

    if (formData.tipo === 'fk' && !formData.fk_screen_id) {
      toast.error('Selecione a tabela referenciada para campo FK');
      return;
    }

    createMutation.mutate({
      ...formData,
      ordem: fields.length,
      nome_campo: formData.nome_campo.toLowerCase().replace(/\s+/g, '_'),
    });
  };

  const resetForm = () => {
    setFormData({
      screen_id: screenId,
      nome_campo: "",
      label: "",
      tipo: "texto",
      obrigatorio: false,
      unico: false,
      tamanho_maximo: null,
      valor_padrao: "",
      fk_screen_id: null,
      fk_display_field: "",
      ordem: 0,
      placeholder: "",
      ajuda: "",
    });
    setShowForm(false);
  };

  const toggleFieldExpand = (fieldId) => {
    setExpandedFields(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  const getTypeIcon = (tipo) => {
    return FIELD_TYPES.find(t => t.value === tipo)?.icon || "•";
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5 text-blue-600" />
            Campos da Tela ({fields.length})
          </CardTitle>
          <Button
            size="sm"
            variant={showForm ? "outline" : "default"}
            onClick={() => setShowForm(!showForm)}
            className={!showForm ? "bg-gradient-to-r from-blue-600 to-blue-700" : ""}
          >
            {showForm ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Novo Campo
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-5 bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Adicionar Novo Campo</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_campo" className="text-sm font-semibold">
                  Nome do Campo na Tabela *
                </Label>
                <Input
                  id="nome_campo"
                  value={formData.nome_campo}
                  onChange={(e) => setFormData({ ...formData, nome_campo: e.target.value })}
                  placeholder="ex: cpf_cliente"
                  required
                  className="bg-white"
                />
                <p className="text-xs text-slate-500">Identificador técnico (sem espaços)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="label" className="text-sm font-semibold">
                  Nome do Campo na Interface *
                </Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="ex: CPF do Cliente"
                  required
                  className="bg-white"
                />
                <p className="text-xs text-slate-500">Rótulo exibido para o usuário</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo" className="text-sm font-semibold">Tipo do Campo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.tipo === 'fk' && (
              <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                  🔗 Configuração de Chave Estrangeira (FK)
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="fk_screen_id">Tabela Referenciada *</Label>
                  <Select
                    value={formData.fk_screen_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, fk_screen_id: value })}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecione a tabela" />
                    </SelectTrigger>
                    <SelectContent>
                      {screens.filter(s => s.id !== screenId).map((screen) => (
                        <SelectItem key={screen.id} value={screen.id}>
                          {screen.nome} ({screen.tabela_nome})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-purple-600">
                    Tabela que será referenciada por este campo
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fk_display_field">Campo de Exibição</Label>
                  <Input
                    id="fk_display_field"
                    value={formData.fk_display_field}
                    onChange={(e) => setFormData({ ...formData, fk_display_field: e.target.value })}
                    placeholder="ex: nome"
                    className="bg-white"
                  />
                  <p className="text-xs text-purple-600">
                    Campo da tabela referenciada que será exibido no select
                  </p>
                </div>
              </div>
            )}

            {formData.tipo === 'texto' && (
              <div className="space-y-2">
                <Label htmlFor="tamanho_maximo">Tamanho Máximo (caracteres)</Label>
                <Input
                  id="tamanho_maximo"
                  type="number"
                  value={formData.tamanho_maximo || ''}
                  onChange={(e) => setFormData({ ...formData, tamanho_maximo: parseInt(e.target.value) || null })}
                  placeholder="ex: 255"
                  className="bg-white"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input
                id="placeholder"
                value={formData.placeholder}
                onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                placeholder="Texto de ajuda no campo"
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ajuda">Texto de Ajuda</Label>
              <Textarea
                id="ajuda"
                value={formData.ajuda}
                onChange={(e) => setFormData({ ...formData, ajuda: e.target.value })}
                placeholder="Descrição adicional ou instruções"
                rows={2}
                className="bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                <Label htmlFor="obrigatorio" className="cursor-pointer">Obrigatório</Label>
                <Switch
                  id="obrigatorio"
                  checked={formData.obrigatorio}
                  onCheckedChange={(checked) => setFormData({ ...formData, obrigatorio: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                <Label htmlFor="unico" className="cursor-pointer">Único</Label>
                <Switch
                  id="unico"
                  checked={formData.unico}
                  onCheckedChange={(checked) => setFormData({ ...formData, unico: checked })}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              disabled={createMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending ? 'Adicionando...' : 'Adicionar Campo'}
            </Button>
          </form>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : fields.length === 0 ? (
          <div className="text-center py-12">
            <Type className="w-16 h-16 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">Nenhum campo definido</p>
            <p className="text-sm text-slate-400">Clique em "Novo Campo" para começar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((field) => (
              <div
                key={field.id}
                className="rounded-lg border border-slate-200 hover:border-slate-300 transition-all overflow-hidden"
              >
                <div 
                  className="flex items-center justify-between p-4 bg-white cursor-pointer hover:bg-slate-50"
                  onClick={() => toggleFieldExpand(field.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getTypeIcon(field.tipo)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{field.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {FIELD_TYPES.find(t => t.value === field.tipo)?.label}
                          </Badge>
                          {field.obrigatorio && (
                            <Badge className="bg-red-100 text-red-700 text-xs">
                              obrigatório
                            </Badge>
                          )}
                          {field.unico && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              único
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 font-mono">{field.nome_campo}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedFields[field.id] ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Deseja remover este campo?')) {
                          deleteMutation.mutate(field.id);
                        }
                      }}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {expandedFields[field.id] && (
                  <div className="px-4 pb-4 bg-slate-50 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                      {field.placeholder && (
                        <div>
                          <span className="text-slate-500">Placeholder:</span>
                          <p className="text-slate-700">{field.placeholder}</p>
                        </div>
                      )}
                      {field.ajuda && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Ajuda:</span>
                          <p className="text-slate-700">{field.ajuda}</p>
                        </div>
                      )}
                      {field.tamanho_maximo && (
                        <div>
                          <span className="text-slate-500">Tamanho Máx:</span>
                          <p className="text-slate-700">{field.tamanho_maximo} caracteres</p>
                        </div>
                      )}
                      {field.tipo === 'fk' && field.fk_screen_id && (
                        <>
                          <div>
                            <span className="text-slate-500">Tabela FK:</span>
                            <p className="text-slate-700">
                              {screens.find(s => s.id === field.fk_screen_id)?.nome || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">Campo Exibição:</span>
                            <p className="text-slate-700">{field.fk_display_field || 'ID'}</p>
                          </div>
                        </>
                      )}
                      <div>
                        <span className="text-slate-500">Ordem:</span>
                        <p className="text-slate-700">{field.ordem}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}