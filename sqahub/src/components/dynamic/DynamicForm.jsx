import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Lock } from "lucide-react";
import { toast } from "sonner";

export default function DynamicForm({ fields, initialData, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({});
  const [fkOptions, setFkOptions] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});

  // Carregar opções de FK
  useEffect(() => {
    const loadFkOptions = async () => {
      const fkFields = fields.filter(f => f.tipo === 'fk' && f.fk_screen_id);

      for (const field of fkFields) {
        try {
          // Primeiro, buscar a screen definition para obter o nome da tabela
          const screen = await base44.entities.ScreenDefinition.get(field.fk_screen_id);
          if (!screen?.tabela_nome) {
            console.error(`Screen FK ${field.fk_screen_id} não tem tabela_nome`);
            continue;
          }

          // Agora buscar os registros da tabela física
          const records = await base44.entities.list(screen.tabela_nome);
          setFkOptions(prev => ({
            ...prev,
            [field.nome_campo]: records,
          }));
        } catch (error) {
          console.error(`Erro ao carregar opções FK para ${field.nome_campo}:`, error);
        }
      }
    };

    if (fields.length > 0) {
      loadFkOptions();
    }
  }, [fields]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      const defaultData = {};
      fields.forEach(field => {
        if (field.valor_padrao) {
          defaultData[field.nome_campo] = field.valor_padrao;
        } else if (field.tipo === 'checkbox') {
          defaultData[field.nome_campo] = false;
        }
      });
      setFormData(defaultData);
    }
  }, [initialData, fields]);

  const handleChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleFileUpload = async (fieldName, file) => {
    if (!file) return;

    setUploadingFiles(prev => ({ ...prev, [fieldName]: true }));
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange(fieldName, file_url);
      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
      console.error(error);
    } finally {
      setUploadingFiles(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validar campos obrigatórios (excluindo somente_leitura)
    const missingFields = fields
      .filter(f => f.obrigatorio && !f.somente_leitura && !formData[f.nome_campo])
      .map(f => f.label);
    
    if (missingFields.length > 0) {
      toast.error(`Campos obrigatórios: ${missingFields.join(', ')}`);
      return;
    }

    onSubmit(formData);
  };

  const renderField = (field) => {
    const value = formData[field.nome_campo] || '';

    // Se é campo somente leitura, mostrar com ícone de cadeado
    if (field.somente_leitura) {
      return (
        <div className="relative">
          <Input
            type="text"
            value={value || '-'}
            disabled
            className="bg-slate-100 text-slate-500 pr-10"
          />
          <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
        </div>
      );
    }

    switch (field.tipo) {
      case 'inteiro':
        return (
          <Input
            type="number"
            step="1"
            value={value}
            onChange={(e) => handleChange(field.nome_campo, parseInt(e.target.value) || null)}
            placeholder={field.placeholder}
            required={field.obrigatorio}
            className="bg-white"
          />
        );

      case 'decimal':
        return (
          <Input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => handleChange(field.nome_campo, parseFloat(e.target.value) || null)}
            placeholder={field.placeholder}
            required={field.obrigatorio}
            className="bg-white"
          />
        );

      case 'data':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleChange(field.nome_campo, e.target.value)}
            required={field.obrigatorio}
            className="bg-white"
          />
        );

      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={value}
            onChange={(e) => handleChange(field.nome_campo, e.target.value)}
            required={field.obrigatorio}
            className="bg-white"
          />
        );

      case 'hora':
        return (
          <Input
            type="time"
            value={value}
            onChange={(e) => handleChange(field.nome_campo, e.target.value)}
            required={field.obrigatorio}
            className="bg-white"
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2 h-10">
            <Switch
              checked={value === true || value === 'true'}
              onCheckedChange={(checked) => handleChange(field.nome_campo, checked)}
            />
            <span className="text-sm text-slate-600">
              {value === true || value === 'true' ? 'Sim' : 'Não'}
            </span>
          </div>
        );

      case 'texto_longo':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleChange(field.nome_campo, e.target.value)}
            placeholder={field.placeholder}
            required={field.obrigatorio}
            rows={4}
            className="bg-white"
          />
        );

      case 'imagem':
      case 'anexo':
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="file"
                accept={field.tipo === 'imagem' ? 'image/*' : '*'}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(field.nome_campo, file);
                }}
                disabled={uploadingFiles[field.nome_campo]}
                className="bg-white"
              />
            </div>
            {uploadingFiles[field.nome_campo] && (
              <p className="text-xs text-blue-600">Enviando arquivo...</p>
            )}
            {value && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <span>✓</span>
                <span>Arquivo enviado</span>
                {field.tipo === 'imagem' && (
                  <a href={value} target="_blank" rel="noopener noreferrer" className="underline">
                    Ver imagem
                  </a>
                )}
              </div>
            )}
          </div>
        );

      case 'fk':
        const options = fkOptions[field.nome_campo] || [];
        return (
          <Select
            value={value}
            onValueChange={(val) => handleChange(field.nome_campo, val)}
            required={field.obrigatorio}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder={`Selecione ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.length === 0 ? (
                <SelectItem value={null} disabled>
                  Nenhum registro disponível
                </SelectItem>
              ) : (
                options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option[field.fk_display_field] || option.id}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        );

      case 'texto':
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleChange(field.nome_campo, e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.tamanho_maximo}
            required={field.obrigatorio}
            className="bg-white"
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map((field) => (
          <div 
            key={field.id} 
            className={`space-y-2 ${field.tipo === 'texto_longo' ? 'md:col-span-2' : ''}`}
          >
            <Label htmlFor={field.nome_campo} className="text-sm font-medium flex items-center gap-2">
              {field.label}
              {field.obrigatorio && !field.somente_leitura && <span className="text-red-500">*</span>}
              {field.somente_leitura && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  somente leitura
                </span>
              )}
            </Label>
            {renderField(field)}
            {field.ajuda && (
              <p className="text-xs text-slate-500">{field.ajuda}</p>
            )}
            {field.tamanho_maximo && field.tipo === 'texto' && (
              <p className="text-xs text-slate-500">
                Máximo {field.tamanho_maximo} caracteres
              </p>
            )}
          </div>
        ))}
      </div>

      {fields.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          Nenhum campo definido para esta tela. Configure os campos no Construtor de Telas.
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading || fields.length === 0}
          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}