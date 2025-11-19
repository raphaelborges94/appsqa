import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PARAMETER_TYPES = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Número" },
  { value: "data", label: "Data" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Select" },
];

export default function ParameterManager({ parameters = [], onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    label: "",
    tipo: "texto",
    obrigatorio: false,
    valor_padrao: "",
    opcoes: [],
    placeholder: "",
    ajuda: "",
  });
  const [opcaoTemp, setOpcaoTemp] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newParameter = {
      ...formData,
      nome: formData.nome.toLowerCase().replace(/\s+/g, '_'),
    };

    let newParameters;
    if (editingIndex !== null) {
      newParameters = [...parameters];
      newParameters[editingIndex] = newParameter;
    } else {
      newParameters = [...parameters, newParameter];
    }

    onChange(newParameters);
    resetForm();
  };

  const handleDelete = (index) => {
    const newParameters = parameters.filter((_, i) => i !== index);
    onChange(newParameters);
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      label: "",
      tipo: "texto",
      obrigatorio: false,
      valor_padrao: "",
      opcoes: [],
      placeholder: "",
      ajuda: "",
    });
    setEditingIndex(null);
    setShowForm(false);
  };

  const handleEdit = (index) => {
    setFormData(parameters[index]);
    setEditingIndex(index);
    setShowForm(true);
  };

  const addOpcao = () => {
    if (opcaoTemp.trim()) {
      setFormData({
        ...formData,
        opcoes: [...(formData.opcoes || []), opcaoTemp.trim()]
      });
      setOpcaoTemp("");
    }
  };

  const removeOpcao = (index) => {
    setFormData({
      ...formData,
      opcoes: formData.opcoes.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-3">
      {!showForm && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Parâmetro
        </Button>
      )}

      {showForm && (
        <Card className="border-slate-300 bg-blue-50">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome Técnico *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="ex: data_inicio"
                    required
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Label *</Label>
                  <Input
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="ex: Data de Início"
                    required
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARAMETER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo === 'select' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Opções</Label>
                  <div className="flex gap-2">
                    <Input
                      value={opcaoTemp}
                      onChange={(e) => setOpcaoTemp(e.target.value)}
                      placeholder="Digite uma opção"
                      className="h-8 text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addOpcao();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={addOpcao}
                      className="h-8"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  {formData.opcoes && formData.opcoes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.opcoes.map((opcao, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs cursor-pointer hover:bg-red-100"
                          onClick={() => removeOpcao(idx)}
                        >
                          {opcao} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Placeholder</Label>
                  <Input
                    value={formData.placeholder}
                    onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                    placeholder="ex: Informe a data"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Valor Padrão</Label>
                  <Input
                    value={formData.valor_padrao}
                    onChange={(e) => setFormData({ ...formData, valor_padrao: e.target.value })}
                    placeholder="ex: 2025-01-01"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Texto de Ajuda</Label>
                <Input
                  value={formData.ajuda}
                  onChange={(e) => setFormData({ ...formData, ajuda: e.target.value })}
                  placeholder="Texto explicativo para o usuário"
                  className="h-8 text-sm"
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                <div>
                  <Label className="text-xs font-medium">Campo Obrigatório</Label>
                  <p className="text-xs text-slate-500">Usuário deve preencher</p>
                </div>
                <Switch
                  checked={formData.obrigatorio}
                  onCheckedChange={(checked) => setFormData({ ...formData, obrigatorio: checked })}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-300">
                <Button 
                  type="submit" 
                  size="sm"
                  className="flex-1 h-8 bg-blue-600 hover:bg-blue-700"
                >
                  {editingIndex !== null ? 'Atualizar' : 'Adicionar'}
                </Button>
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={resetForm}
                  className="h-8"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {parameters.length > 0 && (
        <div className="space-y-2">
          {parameters.map((param, index) => (
            <div
              key={index}
              className="p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <GripVertical className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs font-mono text-blue-700 font-semibold">
                        {param.nome}
                      </code>
                      <Badge variant="outline" className="text-xs">
                        {PARAMETER_TYPES.find(t => t.value === param.tipo)?.label}
                      </Badge>
                      {param.obrigatorio && (
                        <Badge className="text-xs bg-orange-100 text-orange-700">
                          Obrigatório
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-700">{param.label}</p>
                    {param.ajuda && (
                      <p className="text-xs text-slate-500 mt-1">{param.ajuda}</p>
                    )}
                    {param.tipo === 'select' && param.opcoes && param.opcoes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {param.opcoes.map((opcao, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {opcao}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(index)}
                    className="h-7 w-7"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(index)}
                    className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {parameters.length === 0 && !showForm && (
        <div className="text-center py-6 text-slate-500 text-sm">
          Nenhum parâmetro definido
        </div>
      )}
    </div>
  );
}