import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Eye, EyeOff, Filter, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Operadores por tipo de campo
const filterOperators = {
  string: [
    { value: 'equals', label: 'Igual a' },
    { value: 'notEquals', label: 'Diferente de' },
    { value: 'contains', label: 'Contém' },
    { value: 'notContains', label: 'Não contém' },
    { value: 'startsWith', label: 'Começa com' },
    { value: 'endsWith', label: 'Termina com' },
    { value: 'isEmpty', label: 'Está vazio' },
    { value: 'isNotEmpty', label: 'Não está vazio' },
  ],
  number: [
    { value: 'equals', label: 'Igual a' },
    { value: 'notEquals', label: 'Diferente de' },
    { value: 'greaterThan', label: 'Maior que' },
    { value: 'greaterThanOrEqual', label: 'Maior ou igual a' },
    { value: 'lessThan', label: 'Menor que' },
    { value: 'lessThanOrEqual', label: 'Menor ou igual a' },
    { value: 'between', label: 'Entre' },
    { value: 'isEmpty', label: 'Está vazio' },
    { value: 'isNotEmpty', label: 'Não está vazio' },
  ],
  date: [
    { value: 'equals', label: 'Igual a' },
    { value: 'notEquals', label: 'Diferente de' },
    { value: 'before', label: 'Antes de' },
    { value: 'after', label: 'Depois de' },
    { value: 'between', label: 'Entre' },
    { value: 'isEmpty', label: 'Está vazio' },
    { value: 'isNotEmpty', label: 'Não está vazio' },
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'thisWeek', label: 'Esta semana' },
    { value: 'thisMonth', label: 'Este mês' },
    { value: 'thisYear', label: 'Este ano' },
    { value: 'lastNDays', label: 'Últimos N dias' },
  ],
};

// Operadores que não precisam de valor
const operatorsWithoutValue = ['isEmpty', 'isNotEmpty', 'today', 'yesterday', 'thisWeek', 'thisMonth', 'thisYear'];

// Operadores que precisam de dois valores (range)
const operatorsWithTwoValues = ['between'];

export default function PivotFilters({ filters = [], onFiltersChange, availableFields = [] }) {
  const addFilter = () => {
    const firstField = availableFields[0];
    onFiltersChange([
      ...filters,
      {
        id: `filter_${Date.now()}`,
        field: firstField?.name || '',
        operator: 'equals',
        value: '',
        value2: '', // Para operador "between"
        type: firstField?.type || 'string',
        isPlayground: false, // Se true, será visível para o usuário final
        enabled: true, // Se false, o filtro está desabilitado temporariamente
      }
    ]);
  };

  const removeFilter = (index) => {
    onFiltersChange(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index, updates) => {
    onFiltersChange(
      filters.map((filter, i) => 
        i === index ? { ...filter, ...updates } : filter
      )
    );
  };

  const handleFieldChange = (index, fieldName) => {
    const field = availableFields.find(f => f.name === fieldName);
    updateFilter(index, {
      field: fieldName,
      type: field?.type || 'string',
      operator: 'equals',
      value: '',
      value2: '',
    });
  };

  const handleOperatorChange = (index, operator) => {
    updateFilter(index, {
      operator,
      value: operatorsWithoutValue.includes(operator) ? '' : filters[index].value,
      value2: '',
    });
  };

  const needsValue = (operator) => !operatorsWithoutValue.includes(operator);
  const needsTwoValues = (operator) => operatorsWithTwoValues.includes(operator);

  const playgroundCount = filters.filter(f => f.isPlayground).length;
  const fixedCount = filters.filter(f => !f.isPlayground).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Filtros ({filters.length})
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="default" className="text-xs bg-blue-600">
            <Eye className="w-3 h-3 mr-1" />
            {playgroundCount} Playground
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {fixedCount} Fixos
          </Badge>
        </div>
      </div>

      {/* Explicação */}
      <Alert className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <AlertCircle className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Filtros Fixos:</strong> Aplicados no preview e restringem os dados permanentemente.<br/>
          <strong>Filtros Playground:</strong> Não afetam o preview. São campos de filtro para o usuário final no dashboard.
        </AlertDescription>
      </Alert>

      {filters.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6 bg-slate-50 dark:bg-slate-800/30 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
          Nenhum filtro adicionado. Clique abaixo para criar um filtro.
        </p>
      )}

      {filters.map((filter, index) => {
        const selectedField = availableFields.find(f => f.name === filter.field);
        const operators = filterOperators[filter.type] || filterOperators.string;
        const isPlayground = filter.isPlayground;

        return (
          <Card 
            key={filter.id || index} 
            className={`p-3 transition-all ${
              filter.enabled 
                ? isPlayground 
                  ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60'
            }`}
          >
            <div className="space-y-3">
              {/* Header com toggle e remoção */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={filter.enabled}
                    onCheckedChange={(checked) => updateFilter(index, { enabled: checked })}
                    className="scale-75"
                  />
                  <Label className="text-xs font-semibold">
                    Filtro {index + 1}
                    {!filter.enabled && (
                      <span className="ml-1 text-slate-400">(Desabilitado)</span>
                    )}
                  </Label>
                </div>
                <div className="flex items-center gap-1">
                  {isPlayground && (
                    <Badge variant="default" className="text-xs px-2 py-0 bg-blue-600">
                      <Eye className="w-3 h-3 mr-1" />
                      Playground
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFilter(index)}
                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Campo */}
              <div>
                <Label className="text-xs text-slate-600 dark:text-slate-400">Campo</Label>
                <Select
                  value={filter.field}
                  onValueChange={(value) => handleFieldChange(index, value)}
                  disabled={!filter.enabled}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map(field => (
                      <SelectItem key={field.name} value={field.name}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {field.type}
                          </Badge>
                          {field.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Operador */}
              <div>
                <Label className="text-xs text-slate-600 dark:text-slate-400">Operador</Label>
                <Select
                  value={filter.operator}
                  onValueChange={(value) => handleOperatorChange(index, value)}
                  disabled={!filter.enabled}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map(op => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Valor(es) - Apenas para filtros FIXOS ou com valor necessário */}
              {!isPlayground && needsValue(filter.operator) && (
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">
                    {needsTwoValues(filter.operator) ? 'Valor Inicial' : 'Valor'}
                  </Label>
                  <Input
                    type={filter.type === 'number' ? 'number' : filter.type === 'date' ? 'date' : 'text'}
                    value={filter.value}
                    onChange={(e) => updateFilter(index, { value: e.target.value })}
                    placeholder={
                      filter.type === 'number' ? 'Ex: 100' :
                      filter.type === 'date' ? 'Selecione uma data' :
                      'Digite o valor...'
                    }
                    className="mt-1 h-8 text-xs"
                    disabled={!filter.enabled}
                  />
                </div>
              )}

              {!isPlayground && needsTwoValues(filter.operator) && (
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">Valor Final</Label>
                  <Input
                    type={filter.type === 'number' ? 'number' : filter.type === 'date' ? 'date' : 'text'}
                    value={filter.value2}
                    onChange={(e) => updateFilter(index, { value2: e.target.value })}
                    placeholder={
                      filter.type === 'number' ? 'Ex: 1000' :
                      filter.type === 'date' ? 'Selecione uma data' :
                      'Digite o valor final...'
                    }
                    className="mt-1 h-8 text-xs"
                    disabled={!filter.enabled}
                  />
                </div>
              )}

              {/* Operador "lastNDays" precisa de input numérico - Apenas para filtros FIXOS */}
              {!isPlayground && filter.operator === 'lastNDays' && (
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">Quantidade de Dias</Label>
                  <Input
                    type="number"
                    min="1"
                    value={filter.value}
                    onChange={(e) => updateFilter(index, { value: e.target.value })}
                    placeholder="Ex: 7 (últimos 7 dias)"
                    className="mt-1 h-8 text-xs"
                    disabled={!filter.enabled}
                  />
                </div>
              )}

              {/* Info para filtros Playground */}
              {isPlayground && (
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
                  <Eye className="w-3 h-3 text-blue-600" />
                  <AlertDescription className="text-[10px] text-blue-700 dark:text-blue-300">
                    Este filtro estará disponível para o usuário final no dashboard. Não é necessário definir valor aqui.
                  </AlertDescription>
                </Alert>
              )}

              {/* Toggle Playground */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPlayground ? (
                      <Eye className="w-4 h-4 text-blue-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <Label className="text-xs font-semibold text-slate-900 dark:text-white">
                        Modo Playground
                      </Label>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {isPlayground 
                          ? '✓ Usuário pode filtrar no dashboard' 
                          : '✓ Filtro fixo aplicado no preview'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isPlayground}
                    onCheckedChange={(checked) => updateFilter(index, { 
                      isPlayground: checked,
                      // Limpar valores ao ativar playground
                      value: checked ? '' : filter.value,
                      value2: checked ? '' : filter.value2,
                    })}
                    disabled={!filter.enabled}
                  />
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      <Button
        variant="outline"
        size="sm"
        onClick={addFilter}
        className="w-full"
        disabled={availableFields.length === 0}
      >
        <Plus className="w-3 h-3 mr-2" />
        Adicionar Filtro
      </Button>

      {availableFields.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
          ⚠️ Selecione um dataset para adicionar filtros
        </p>
      )}
    </div>
  );
}