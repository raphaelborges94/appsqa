import React, { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Palette, TrendingUp, BarChart3, CheckCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const formatTypes = [
  { value: 'background', label: 'Cor de Fundo', icon: Palette },
  { value: 'text', label: 'Cor do Texto', icon: Palette },
  { value: 'dataBar', label: 'Barras de Dados', icon: BarChart3 },
  { value: 'colorScale', label: 'Escala de Cores', icon: TrendingUp },
  { value: 'iconSet', label: 'Conjunto de Ícones', icon: CheckCircle },
];

const conditionTypes = {
  number: [
    { value: 'greaterThan', label: 'Maior que' },
    { value: 'lessThan', label: 'Menor que' },
    { value: 'between', label: 'Entre' },
    { value: 'equals', label: 'Igual a' },
    { value: 'topN', label: 'Top N' },
    { value: 'bottomN', label: 'Bottom N' },
    { value: 'aboveAverage', label: 'Acima da Média' },
    { value: 'belowAverage', label: 'Abaixo da Média' },
    { value: 'topPercent', label: 'Top % (Percentual)' },
    { value: 'bottomPercent', label: 'Bottom % (Percentual)' },
  ],
  string: [
    { value: 'equals', label: 'Igual a' },
    { value: 'notEquals', label: 'Diferente de' },
    { value: 'contains', label: 'Contém' },
    { value: 'notContains', label: 'Não contém' },
    { value: 'startsWith', label: 'Começa com' },
    { value: 'endsWith', label: 'Termina com' },
  ],
  date: [
    { value: 'equals', label: 'Igual a' },
    { value: 'before', label: 'Antes de' },
    { value: 'after', label: 'Depois de' },
    { value: 'between', label: 'Entre' },
  ],
};

const colorScaleTypes = [
  { value: '2color', label: '2 Cores (Mín → Máx)' },
  { value: '3color', label: '3 Cores (Mín → Médio → Máx)' },
];

const iconSets = [
  { value: 'arrows', label: 'Setas (↑ → ↓)', icons: ['↑', '→', '↓'] },
  { value: 'traffic', label: 'Semáforo (🟢 🟡 🔴)', icons: ['🟢', '🟡', '🔴'] },
  { value: 'flags', label: 'Bandeiras (🚩 🏳️ ⚐)', icons: ['🚩', '🏳️', '⚐'] },
  { value: 'stars', label: 'Estrelas (⭐ ⚝ ☆)', icons: ['⭐', '⚝', '☆'] },
  { value: 'circles', label: 'Círculos (🔴 🟡 🟢)', icons: ['🔴', '🟡', '🟢'] },
];

const scopeOptions = [
  { value: 'cell', label: 'Apenas a Célula' },
  { value: 'row', label: 'Linha Inteira' },
  { value: 'column', label: 'Coluna Inteira' },
];

export default function PivotFormatting({ 
  formatRules = [], 
  onFormatRulesChange, 
  valueFields = [],
  rowFields = [],
  columnFields = []
}) {
  // Migração automática de regras antigas
  useEffect(() => {
    let needsMigration = false;
    const migratedRules = formatRules.map(rule => {
      if (!rule.applyToTarget || !rule.scope) {
        needsMigration = true;
        return {
          ...rule,
          applyToTarget: rule.applyToTarget || 'values',
          scope: rule.scope || 'cell',
          value1: rule.value1 !== undefined ? rule.value1 : (rule.value1 === 0 ? 0 : ''),
          value2: rule.value2 !== undefined ? rule.value2 : (rule.value2 === 0 ? 0 : ''),
        };
      }
      return rule;
    });
    
    if (needsMigration) {
      onFormatRulesChange(migratedRules);
    }
  }, []);

  const addFormatRule = () => {
    onFormatRulesChange([
      ...formatRules,
      {
        name: 'Nova Regra',
        enabled: true,
        formatType: 'background',
        applyToTarget: 'values',
        applyTo: 'all',
        scope: 'cell',
        conditionType: 'greaterThan',
        value1: '',
        value2: '',
        color: '#ef4444',
        minColor: '#ef4444',
        midColor: '#fbbf24',
        maxColor: '#10b981',
        colorScaleType: '3color',
        iconSet: 'arrows',
        dataBarColor: '#3b82f6',
        showValue: true,
      }
    ]);
  };

  const removeFormatRule = (index) => {
    onFormatRulesChange(formatRules.filter((_, i) => i !== index));
  };

  const updateFormatRule = (index, updates) => {
    onFormatRulesChange(
      formatRules.map((rule, i) => 
        i === index ? { ...rule, ...updates } : rule
      )
    );
  };

  const duplicateRule = (index) => {
    const rule = formatRules[index];
    onFormatRulesChange([
      ...formatRules,
      { ...rule, name: `${rule.name} (cópia)` }
    ]);
  };

  const getFieldsByTarget = (target) => {
    switch (target) {
      case 'values':
        return valueFields;
      case 'rows':
        return rowFields;
      case 'columns':
        return columnFields;
      default:
        return [];
    }
  };

  const getFieldType = (fieldName, target) => {
    const fields = getFieldsByTarget(target);
    const field = fields.find(f => f.name === fieldName);
    return field?.type || 'string';
  };

  const needsValue1 = (conditionType) => {
    return ['greaterThan', 'lessThan', 'equals', 'notEquals', 'topN', 'bottomN', 'topPercent', 'bottomPercent', 'contains', 'notContains', 'startsWith', 'endsWith', 'before', 'after'].includes(conditionType);
  };

  const needsValue2 = (conditionType) => {
    return conditionType === 'between';
  };

  const getConditionsByFieldType = (fieldType) => {
    if (fieldType === 'number') return conditionTypes.number;
    if (fieldType === 'date') return conditionTypes.date;
    return conditionTypes.string;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-slate-500" />
          <Label className="text-xs font-semibold">Formatação Condicional</Label>
        </div>
      </div>

      {formatRules.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
          Nenhuma regra de formatação definida
        </p>
      )}

      {formatRules.map((rule, index) => {
        const FormatIcon = formatTypes.find(t => t.value === rule.formatType)?.icon || Palette;
        const selectedFields = getFieldsByTarget(rule.applyToTarget || 'values');
        const fieldType = rule.applyTo !== 'all' ? getFieldType(rule.applyTo, rule.applyToTarget || 'values') : 'number';
        const availableConditions = getConditionsByFieldType(fieldType);
        
        return (
          <Card key={index} className="p-3 border-slate-200 dark:border-slate-700">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 mr-2">
                  <FormatIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <Input
                    value={rule.name}
                    onChange={(e) => updateFormatRule(index, { name: e.target.value })}
                    className="h-7 text-xs font-semibold border-none px-1 flex-1"
                    placeholder="Nome da regra"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked) => updateFormatRule(index, { enabled: checked })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFormatRule(index)}
                    className="h-6 w-6"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Tipo de Formatação */}
              <div>
                <Label className="text-xs">Tipo de Formatação</Label>
                <Select
                  value={rule.formatType}
                  onValueChange={(value) => updateFormatRule(index, { formatType: value })}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formatTypes.map(type => (
                      <SelectItem key={type.value} value={type.value} className="text-xs">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Aplicar em (Target) */}
              <div>
                <Label className="text-xs">Aplicar em</Label>
                <Select
                  value={rule.applyToTarget || 'values'}
                  onValueChange={(value) => {
                    const fields = getFieldsByTarget(value);
                    updateFormatRule(index, { 
                      applyToTarget: value,
                      applyTo: fields.length > 0 ? 'all' : 'all'
                    });
                  }}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="values" className="text-xs">
                      Valores (Values)
                    </SelectItem>
                    <SelectItem value="rows" className="text-xs">
                      Linhas (Rows)
                    </SelectItem>
                    <SelectItem value="columns" className="text-xs">
                      Colunas (Columns)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campo específico */}
              <div>
                <Label className="text-xs">Campo</Label>
                <Select
                  value={rule.applyTo || 'all'}
                  onValueChange={(value) => updateFormatRule(index, { applyTo: value })}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todos os Campos</SelectItem>
                    {selectedFields.map(field => (
                      <SelectItem key={field.name} value={field.name} className="text-xs">
                        {field.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Escopo da formatação - SEMPRE MOSTRAR */}
              <div>
                <Label className="text-xs">Escopo</Label>
                <Select
                  value={rule.scope || 'cell'}
                  onValueChange={(value) => updateFormatRule(index, { scope: value })}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Condição - SEMPRE MOSTRAR para background e text */}
              {(rule.formatType === 'background' || rule.formatType === 'text') && (
                <div>
                  <Label className="text-xs">Condição</Label>
                  <Select
                    value={rule.conditionType}
                    onValueChange={(value) => updateFormatRule(index, { conditionType: value })}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableConditions.map(type => (
                        <SelectItem key={type.value} value={type.value} className="text-xs">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Valor - SEMPRE MOSTRAR quando necessário */}
              {(rule.formatType === 'background' || rule.formatType === 'text') && needsValue1(rule.conditionType) && (
                <div>
                  <Label className="text-xs">
                    {['topN', 'bottomN'].includes(rule.conditionType) ? 'N (quantidade)' : 
                     ['topPercent', 'bottomPercent'].includes(rule.conditionType) ? 'Percentual (%)' : 'Valor'}
                  </Label>
                  <Input
                    type="text"
                    value={rule.value1 !== undefined ? rule.value1 : ''}
                    onChange={(e) => updateFormatRule(index, { value1: e.target.value })}
                    className="mt-1 h-8 text-xs"
                    placeholder={fieldType === 'date' ? 'YYYY-MM-DD' : 'Digite o valor...'}
                  />
                </div>
              )}

              {(rule.formatType === 'background' || rule.formatType === 'text') && needsValue2(rule.conditionType) && (
                <div>
                  <Label className="text-xs">Valor Máximo</Label>
                  <Input
                    type="text"
                    value={rule.value2 !== undefined ? rule.value2 : ''}
                    onChange={(e) => updateFormatRule(index, { value2: e.target.value })}
                    className="mt-1 h-8 text-xs"
                    placeholder={fieldType === 'date' ? 'YYYY-MM-DD' : 'Digite o valor...'}
                  />
                </div>
              )}

              {/* Cor - SEMPRE MOSTRAR para background e text */}
              {(rule.formatType === 'background' || rule.formatType === 'text') && (
                <div>
                  <Label className="text-xs">Cor</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={rule.color}
                      onChange={(e) => updateFormatRule(index, { color: e.target.value })}
                      className="w-14 h-8 p-1 cursor-pointer"
                    />
                    <Input
                      value={rule.color}
                      onChange={(e) => updateFormatRule(index, { color: e.target.value })}
                      className="flex-1 h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Configurações de Escala de Cores */}
              {rule.formatType === 'colorScale' && (
                <>
                  <div>
                    <Label className="text-xs">Tipo de Escala</Label>
                    <Select
                      value={rule.colorScaleType}
                      onValueChange={(value) => updateFormatRule(index, { colorScaleType: value })}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {colorScaleTypes.map(type => (
                          <SelectItem key={type.value} value={type.value} className="text-xs">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Cor Mínima</Label>
                      <div className="flex gap-1 mt-1">
                        <Input
                          type="color"
                          value={rule.minColor}
                          onChange={(e) => updateFormatRule(index, { minColor: e.target.value })}
                          className="w-12 h-8 p-1 cursor-pointer"
                        />
                        <Input
                          value={rule.minColor}
                          onChange={(e) => updateFormatRule(index, { minColor: e.target.value })}
                          className="flex-1 h-8 text-xs"
                        />
                      </div>
                    </div>
                    {rule.colorScaleType === '3color' && (
                      <div>
                        <Label className="text-xs">Cor Média</Label>
                        <div className="flex gap-1 mt-1">
                          <Input
                            type="color"
                            value={rule.midColor}
                            onChange={(e) => updateFormatRule(index, { midColor: e.target.value })}
                            className="w-12 h-8 p-1 cursor-pointer"
                          />
                          <Input
                            value={rule.midColor}
                            onChange={(e) => updateFormatRule(index, { midColor: e.target.value })}
                            className="flex-1 h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">Cor Máxima</Label>
                      <div className="flex gap-1 mt-1">
                        <Input
                          type="color"
                          value={rule.maxColor}
                          onChange={(e) => updateFormatRule(index, { maxColor: e.target.value })}
                          className="w-12 h-8 p-1 cursor-pointer"
                        />
                        <Input
                          value={rule.maxColor}
                          onChange={(e) => updateFormatRule(index, { maxColor: e.target.value })}
                          className="flex-1 h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Configurações de Conjunto de Ícones */}
              {rule.formatType === 'iconSet' && (
                <>
                  <div>
                    <Label className="text-xs">Conjunto de Ícones</Label>
                    <Select
                      value={rule.iconSet}
                      onValueChange={(value) => updateFormatRule(index, { iconSet: value })}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {iconSets.map(set => (
                          <SelectItem key={set.value} value={set.value} className="text-xs">
                            {set.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Mostrar Valor</Label>
                    <Switch
                      checked={rule.showValue}
                      onCheckedChange={(checked) => updateFormatRule(index, { showValue: checked })}
                    />
                  </div>
                </>
              )}

              {/* Configurações de Barras de Dados */}
              {rule.formatType === 'dataBar' && (
                <>
                  <div>
                    <Label className="text-xs">Cor da Barra</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={rule.dataBarColor}
                        onChange={(e) => updateFormatRule(index, { dataBarColor: e.target.value })}
                        className="w-14 h-8 p-1 cursor-pointer"
                      />
                      <Input
                        value={rule.dataBarColor}
                        onChange={(e) => updateFormatRule(index, { dataBarColor: e.target.value })}
                        className="flex-1 h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Mostrar Valor</Label>
                    <Switch
                      checked={rule.showValue}
                      onCheckedChange={(checked) => updateFormatRule(index, { showValue: checked })}
                    />
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => duplicateRule(index)}
                  className="h-7 text-xs flex-1"
                >
                  Duplicar
                </Button>
              </div>
            </div>
          </Card>
        );
      })}

      <Button
        variant="outline"
        size="sm"
        onClick={addFormatRule}
        className="w-full"
      >
        <Plus className="w-3 h-3 mr-2" />
        Adicionar Regra de Formatação
      </Button>
    </div>
  );
}