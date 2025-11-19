import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, ArrowUpDown, GripVertical } from "lucide-react";

const sortTypes = [
  { value: 'asc', label: 'Crescente (A→Z, 1→9)' },
  { value: 'desc', label: 'Decrescente (Z→A, 9→1)' },
  { value: 'value_asc', label: 'Do Menor para o Maior (Valores)' },
  { value: 'value_desc', label: 'Do Maior para o Menor (Valores)' },
  { value: 'custom', label: 'Personalizada' },
];

export default function PivotSorting({ 
  sortRules = [], 
  onSortRulesChange, 
  availableFields = [],
  rowFields = [],
  columnFields = [],
  valueFields = []
}) {
  const addSortRule = () => {
    // Usar todos os campos disponíveis, não apenas os em uso
    const firstField = availableFields[0] || [...rowFields, ...columnFields, ...valueFields][0];
    if (!firstField) return;

    onSortRulesChange([
      ...sortRules,
      {
        target: 'data', // Nova opção: ordenar pelos dados brutos
        field: firstField.name,
        sortType: 'asc',
        customOrder: '',
      }
    ]);
  };

  const removeSortRule = (index) => {
    onSortRulesChange(sortRules.filter((_, i) => i !== index));
  };

  const updateSortRule = (index, updates) => {
    onSortRulesChange(
      sortRules.map((rule, i) => 
        i === index ? { ...rule, ...updates } : rule
      )
    );
  };

  const moveRule = (fromIndex, toIndex) => {
    const newRules = [...sortRules];
    const [movedRule] = newRules.splice(fromIndex, 1);
    newRules.splice(toIndex, 0, movedRule);
    onSortRulesChange(newRules);
  };

  const getFieldsByTarget = (target) => {
    switch (target) {
      case 'rows':
        return rowFields;
      case 'columns':
        return columnFields;
      case 'values':
        return valueFields;
      case 'data':
        return availableFields; // NOVO: Todos os campos disponíveis
      default:
        return [];
    }
  };

  const getTargetLabel = (target) => {
    switch (target) {
      case 'rows':
        return 'Linhas';
      case 'columns':
        return 'Colunas';
      case 'values':
        return 'Valores';
      case 'data':
        return 'Dados (qualquer campo)';
      default:
        return target;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-500" />
          <Label className="text-xs font-semibold">Ordenação</Label>
        </div>
      </div>

      {sortRules.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
          Nenhuma ordenação definida
        </p>
      )}

      {sortRules.map((rule, index) => {
        const targetFields = getFieldsByTarget(rule.target);
        const currentField = targetFields.find(f => f.name === rule.field);
        
        return (
          <Card key={index} className="p-3 border-slate-200 dark:border-slate-700">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3 h-3 text-slate-400 cursor-move" />
                  <Label className="text-xs font-semibold">
                    Ordenação {index + 1}
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSortRule(index)}
                  className="h-6 w-6 text-red-500 hover:text-red-700"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>

              <div>
                <Label className="text-xs text-slate-600 dark:text-slate-400">Aplicar em</Label>
                <Select
                  value={rule.target}
                  onValueChange={(value) => {
                    const fields = getFieldsByTarget(value);
                    updateSortRule(index, { 
                      target: value,
                      field: fields[0]?.name || ''
                    });
                  }}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* NOVO: Opção para ordenar por qualquer campo */}
                    {availableFields.length > 0 && (
                      <SelectItem value="data" className="text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">TODOS</Badge>
                          Dados (qualquer campo)
                        </div>
                      </SelectItem>
                    )}
                    {rowFields.length > 0 && (
                      <SelectItem value="rows" className="text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-blue-50">ROWS</Badge>
                          Linhas
                        </div>
                      </SelectItem>
                    )}
                    {columnFields.length > 0 && (
                      <SelectItem value="columns" className="text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-50">COLS</Badge>
                          Colunas
                        </div>
                      </SelectItem>
                    )}
                    {valueFields.length > 0 && (
                      <SelectItem value="values" className="text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-50">VALS</Badge>
                          Valores
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-600 dark:text-slate-400">Campo</Label>
                <Select
                  value={rule.field}
                  onValueChange={(value) => updateSortRule(index, { field: value })}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {targetFields.map(field => (
                      <SelectItem key={field.name} value={field.name} className="text-xs">
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

              <div>
                <Label className="text-xs text-slate-600 dark:text-slate-400">Tipo de Ordenação</Label>
                <Select
                  value={rule.sortType}
                  onValueChange={(value) => updateSortRule(index, { sortType: value })}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortTypes.map(type => (
                      <SelectItem key={type.value} value={type.value} className="text-xs">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {rule.sortType === 'custom' && (
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">Ordem Personalizada</Label>
                  <Input
                    type="text"
                    placeholder="Ex: Q1, Q2, Q3, Q4"
                    value={rule.customOrder || ''}
                    onChange={(e) => updateSortRule(index, { customOrder: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Separar valores por vírgula
                  </p>
                </div>
              )}

              {/* Indicador de campo usado/não usado */}
              {rule.target === 'data' && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary" className="text-[10px] px-2 py-0">
                      ℹ️ INFO
                    </Badge>
                    <span className="text-slate-600 dark:text-slate-400">
                      Campo não precisa estar na estrutura
                    </span>
                  </div>
                </div>
              )}

              {/* Botões de movimentação */}
              {index > 0 && (
                <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveRule(index, index - 1)}
                    className="h-6 text-xs flex-1"
                  >
                    ↑ Mover para cima
                  </Button>
                </div>
              )}
              {index < sortRules.length - 1 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveRule(index, index + 1)}
                    className="h-6 text-xs flex-1"
                  >
                    ↓ Mover para baixo
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );
      })}

      <Button
        variant="outline"
        size="sm"
        onClick={addSortRule}
        className="w-full"
        disabled={availableFields.length === 0}
      >
        <Plus className="w-3 h-3 mr-2" />
        Adicionar Ordenação
      </Button>

      {availableFields.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
          ⚠️ Selecione um dataset para adicionar ordenações
        </p>
      )}
    </div>
  );
}