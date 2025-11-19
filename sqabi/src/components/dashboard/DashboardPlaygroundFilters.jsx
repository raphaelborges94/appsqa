import React, { useState, useEffect, useMemo } from "react";
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
import { Filter, X, RotateCcw, ChevronRight, ChevronDown, Check, Layers, PanelRightClose, PanelRightOpen, FilterX } from "lucide-react";

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

export default function DashboardPlaygroundFilters({ charts = [], onFiltersChange }) {
  // Estado LOCAL dos filtros (não aplicados ainda)
  const [draftFilters, setDraftFilters] = useState({});
  // Estado dos filtros APLICADOS (enviados para o parent)
  const [appliedFilters, setAppliedFilters] = useState({});
  const [expandedFields, setExpandedFields] = useState(new Set());
  const [isExpanded, setIsExpanded] = useState(true);

  const groupedFilters = useMemo(() => {
    const grouped = new Map();
    
    charts.forEach(chart => {
      const chartFilters = chart.config?.filters?.filter(f => f.isPlayground === true) || [];
      
      chartFilters.forEach(filter => {
        const fieldKey = filter.field;
        
        if (!grouped.has(fieldKey)) {
          grouped.set(fieldKey, {
            field: filter.field,
            type: filter.type,
            operator: filter.operator,
            charts: []
          });
        }
        
        const uniqueKey = `${chart.id}-${filter.field}`;
        
        grouped.get(fieldKey).charts.push({
          chartId: chart.id,
          chartName: chart.name,
          chartType: chart.type,
          filterId: uniqueKey,
          filter: filter
        });
      });
    });
    
    const result = Array.from(grouped.entries()).map(([fieldKey, data]) => ({
      fieldKey,
      ...data
    }));
    
    return result;
  }, [charts]);

  useEffect(() => {
    const initialFilters = {};
    
    groupedFilters.forEach(({ fieldKey, type, operator }) => {
      initialFilters[fieldKey] = {
        field: fieldKey,
        type: type,
        operator: operator,
        value: '',
        value2: '',
        isPlayground: true,
        enabled: true,
      };
    });
    
    setDraftFilters(initialFilters);
    
    if (groupedFilters.length > 0) {
      setExpandedFields(new Set([groupedFilters[0].fieldKey]));
    }
  }, [groupedFilters]);

  // ✨ Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    return Object.values(appliedFilters).filter(f => {
      if (operatorsWithoutValue.includes(f.operator)) return true;
      return f.value || f.value2;
    }).length;
  }, [appliedFilters]);

  // ✨ Verificar se um campo específico tem filtro ativo
  const hasActiveFilter = (fieldKey) => {
    const filter = appliedFilters[fieldKey];
    if (!filter) return false;
    if (operatorsWithoutValue.includes(filter.operator)) return true;
    return !!(filter.value || filter.value2);
  };

  // ✨ Obter resumo do valor do filtro
  const getFilterValueSummary = (fieldKey) => {
    const filter = appliedFilters[fieldKey];
    if (!filter) return null;
    
    const operator = filterOperators[filter.type]?.find(op => op.value === filter.operator)?.label || filter.operator;
    
    if (operatorsWithoutValue.includes(filter.operator)) {
      return operator;
    }
    
    if (operatorsWithTwoValues.includes(filter.operator)) {
      return `${operator}: ${filter.value} - ${filter.value2}`;
    }
    
    return `${operator}: ${filter.value}`;
  };

  const hasPendingChanges = useMemo(() => {
    return JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);
  }, [draftFilters, appliedFilters]);

  const applyFilters = () => {
    const filtersPerChart = {};
    
    Object.entries(draftFilters).forEach(([fieldKey, filterData]) => {
      const needsValue = !operatorsWithoutValue.includes(filterData.operator);
      if (needsValue && !filterData.value && !filterData.value2) {
        return;
      }
      
      const fieldGroup = groupedFilters.find(g => g.fieldKey === fieldKey);
      
      if (fieldGroup) {
        fieldGroup.charts.forEach(({ chartId, filterId }) => {
          if (!filtersPerChart[chartId]) {
            filtersPerChart[chartId] = {};
          }
          
          filtersPerChart[chartId][filterId] = filterData;
        });
      }
    });
    
    setAppliedFilters(draftFilters);
    
    // ✨ Fechar campos após aplicar (mantém apenas os com filtro ativo expandidos)
    const newExpandedFields = new Set();
    Object.entries(draftFilters).forEach(([fieldKey, filter]) => {
      const needsValue = !operatorsWithoutValue.includes(filter.operator);
      if (!needsValue || filter.value || filter.value2) {
        newExpandedFields.add(fieldKey);
      }
    });
    setExpandedFields(newExpandedFields);
    
    if (onFiltersChange) {
      onFiltersChange(filtersPerChart);
    }
  };

  const updateDraftFilter = (fieldKey, updates) => {
    setDraftFilters(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        ...updates,
      }
    }));
  };

  const resetFilter = (fieldKey) => {
    const fieldGroup = groupedFilters.find(g => g.fieldKey === fieldKey);
    
    if (fieldGroup) {
      updateDraftFilter(fieldKey, {
        value: '',
        value2: '',
      });
    }
  };

  const resetAllFilters = () => {
    const resetFilters = {};
    
    groupedFilters.forEach(({ fieldKey, type, operator }) => {
      resetFilters[fieldKey] = {
        field: fieldKey,
        type: type,
        operator: operator,
        value: '',
        value2: '',
        isPlayground: true,
        enabled: true,
      };
    });
    
    setDraftFilters(resetFilters);
    setAppliedFilters({});
    setExpandedFields(new Set());
    
    if (onFiltersChange) {
      onFiltersChange({});
    }
  };

  const toggleFieldExpanded = (fieldKey) => {
    setExpandedFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldKey)) {
        newSet.delete(fieldKey);
      } else {
        newSet.add(fieldKey);
      }
      return newSet;
    });
  };

  const needsValue = (operator) => !operatorsWithoutValue.includes(operator);
  const needsTwoValues = (operator) => operatorsWithTwoValues.includes(operator);

  const getChartTypeBadge = (type) => {
    const colors = {
      kpi: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      bar: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      column: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      pivot: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    
    return colors[type] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
  };

  if (groupedFilters.length === 0) {
    return null;
  }

  const totalFiltersCount = groupedFilters.length;

  return (
    <div 
      className={`border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-80' : 'w-12'
      }`}
    >
      {/* Botão de Retrair/Expandir */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group relative"
          title={isExpanded ? 'Retrair filtros' : 'Expandir filtros'}
        >
          {isExpanded ? (
            <PanelRightClose className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          ) : (
            <>
              <PanelRightOpen className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              {/* ✨ Badge de filtros ativos quando retraído */}
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Conteúdo da Sidebar (só aparece quando expandida) */}
      {isExpanded && (
        <>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 sticky top-12 bg-white dark:bg-slate-900 z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Filtros Interativos
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {/* ✨ Badge de filtros ativos */}
                {activeFiltersCount > 0 && (
                  <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold">
                    {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {totalFiltersCount} total
                </Badge>
              </div>
            </div>
            
            {/* ✨ Resumo dos filtros ativos */}
            {activeFiltersCount > 0 && (
              <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Filtros Aplicados:
                </div>
                <div className="space-y-1">
                  {Object.entries(appliedFilters).map(([fieldKey, filter]) => {
                    if (operatorsWithoutValue.includes(filter.operator)) {
                      return (
                        <div key={fieldKey} className="text-xs text-blue-600 dark:text-blue-300">
                          <span className="font-semibold">{filter.field}</span>: {filterOperators[filter.type]?.find(op => op.value === filter.operator)?.label}
                        </div>
                      );
                    }
                    if (!filter.value && !filter.value2) return null;
                    return (
                      <div key={fieldKey} className="text-xs text-blue-600 dark:text-blue-300">
                        <span className="font-semibold">{filter.field}</span>: {getFilterValueSummary(fieldKey)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {activeFiltersCount > 0 
                ? 'Ajuste ou limpe os filtros abaixo'
                : 'Ajuste os filtros para explorar os dados'
              }
            </p>
            
            {/* Botão Aplicar Filtros */}
            <Button
              onClick={applyFilters}
              disabled={!hasPendingChanges}
              className="w-full"
            >
              <Check className="w-4 h-4 mr-2" />
              Aplicar Filtros
            </Button>

            {/* Botão Limpar */}
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetAllFilters}
                className="w-full mt-2 text-xs"
              >
                <FilterX className="w-3 h-3 mr-2" />
                Limpar Todos os Filtros
              </Button>
            )}
          </div>

          <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
            {groupedFilters.map(({ fieldKey, field, type, operator, charts }) => {
              const isFieldExpanded = expandedFields.has(fieldKey);
              const currentFilter = draftFilters[fieldKey] || { field, type, operator, value: '', value2: '' };
              const operators = filterOperators[type] || filterOperators.string;
              const chartsCount = charts.length;
              const isActive = hasActiveFilter(fieldKey);
              
              return (
                <Card 
                  key={fieldKey} 
                  className={`overflow-hidden transition-all ${
                    isActive 
                      ? 'border-blue-500 dark:border-blue-600 shadow-md ring-1 ring-blue-500/20' 
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <button
                    onClick={() => toggleFieldExpanded(fieldKey)}
                    className={`w-full p-3 flex items-center justify-between transition-colors ${
                      isActive 
                        ? 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {isFieldExpanded ? (
                        <ChevronDown className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      ) : (
                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      )}
                      <div className="text-left flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`text-sm font-semibold ${
                            isActive ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-white'
                          }`}>
                            {field}
                          </div>
                          {/* ✨ Badge de filtro ativo */}
                          {isActive && (
                            <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              Ativo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {type}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Layers className="w-3 h-3" />
                            <span>{chartsCount} chart{chartsCount > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        {/* ✨ Mostrar valor do filtro quando colapsado */}
                        {!isFieldExpanded && isActive && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                            {getFilterValueSummary(fieldKey)}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {isFieldExpanded && (
                    <div className="p-3 pt-0 space-y-3 border-t border-slate-200 dark:border-slate-700">
                      {/* Charts que usam este filtro */}
                      <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-2">
                        <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                          Aplicado em:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {charts.map(({ chartId, chartName, chartType, filterId }) => (
                            <Badge 
                              key={filterId} 
                              className={`text-[10px] px-2 py-0 ${getChartTypeBadge(chartType)}`}
                            >
                              {chartName}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Operador */}
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                          Operador
                        </Label>
                        <Select
                          value={currentFilter.operator}
                          onValueChange={(value) => updateDraftFilter(fieldKey, { 
                            operator: value,
                            value: operatorsWithoutValue.includes(value) ? '' : currentFilter.value,
                            value2: '',
                          })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map(op => (
                              <SelectItem key={op.value} value={op.value} className="text-xs">
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Valor(es) */}
                      {needsValue(currentFilter.operator) && (
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {needsTwoValues(currentFilter.operator) ? 'Valor Inicial' : 'Valor'}
                          </Label>
                          <Input
                            type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
                            value={currentFilter.value}
                            onChange={(e) => updateDraftFilter(fieldKey, { value: e.target.value })}
                            placeholder={
                              type === 'number' ? 'Ex: 100' :
                              type === 'date' ? 'Selecione uma data' :
                              'Digite o valor...'
                            }
                            className="h-8 text-xs"
                          />

                          {currentFilter.operator === 'lastNDays' && (
                            <>
                              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2">
                                Quantidade de Dias
                              </Label>
                              <Input
                                type="number"
                                min="1"
                                value={currentFilter.value}
                                onChange={(e) => updateDraftFilter(fieldKey, { value: e.target.value })}
                                placeholder="Ex: 7 (últimos 7 dias)"
                                className="h-8 text-xs"
                              />
                            </>
                          )}

                          {needsTwoValues(currentFilter.operator) && (
                            <>
                              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2">
                                Valor Final
                              </Label>
                              <Input
                                type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
                                value={currentFilter.value2}
                                onChange={(e) => updateDraftFilter(fieldKey, { value2: e.target.value })}
                                placeholder="Valor final..."
                                className="h-8 text-xs"
                              />
                            </>
                          )}
                        </div>
                      )}

                      {/* Botão Reset Individual */}
                      {(currentFilter.value || currentFilter.value2) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetFilter(fieldKey)}
                          className="w-full h-7 text-xs text-slate-500 hover:text-slate-700"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Limpar
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}