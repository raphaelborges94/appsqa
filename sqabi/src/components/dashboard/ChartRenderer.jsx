import React, { useMemo, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import PivotTable from "../bi/pivot/PivotTable";
import BarChartRenderer from "../bi/bar/BarChartRenderer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const normalizeFieldName = (fieldName) => {
  if (!fieldName) return '';
  return String(fieldName)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const getFieldValue = (record, fieldName, aliases = {}) => {
  if (!record || !fieldName) return null;
  
  const actualFieldName = Object.keys(aliases).find(key => aliases[key] === fieldName) || fieldName;
  
  if (record[actualFieldName] !== undefined) return record[actualFieldName];
  if (record[fieldName] !== undefined) return record[fieldName];
  
  const normalizedSearch = normalizeFieldName(actualFieldName);
  const matchingKey = Object.keys(record).find(key => 
    normalizeFieldName(key) === normalizedSearch
  );
  
  return matchingKey ? record[matchingKey] : null;
};

const parseNumericValue = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  
  const strValue = String(value).trim();
  if (strValue === '' || strValue === '-') return null;
  
  let cleanValue = strValue.replace(/[R$\s]/g, '').replace(/[^\d.,-]/g, '');
  
  const hasComma = cleanValue.includes(',');
  const hasDot = cleanValue.includes('.');
  
  if (hasComma && hasDot) {
    const lastCommaPos = cleanValue.lastIndexOf(',');
    const lastDotPos = cleanValue.lastIndexOf('.');
    cleanValue = lastCommaPos > lastDotPos 
      ? cleanValue.replace(/\./g, '').replace(',', '.') 
      : cleanValue.replace(/,/g, '');
  } else if (hasComma) {
    const parts = cleanValue.split(',');
    cleanValue = parts.length === 2 && parts[1].length <= 2 
      ? cleanValue.replace(',', '.') 
      : cleanValue.replace(/,/g, '');
  }
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? null : parsed;
};

// ✅ NOVA FUNÇÃO: Aplicar filtros FIXOS (do config)
const applyFixedFilters = (data, filters = [], aliases = {}) => {
  if (!data || data.length === 0 || !filters || filters.length === 0) {
    return data;
  }

  // ✅ Filtrar apenas os filtros FIXOS (isPlayground !== true)
  const fixedFilters = filters.filter(f => f.enabled !== false && f.isPlayground !== true);
  
  if (fixedFilters.length === 0) return data;

  const filteredData = data.filter(record => {
    return fixedFilters.every(filter => {
      const fieldValue = getFieldValue(record, filter.field, aliases);
      
      if (filter.operator === 'isEmpty') {
        return fieldValue == null || String(fieldValue).trim() === '';
      }
      if (filter.operator === 'isNotEmpty') {
        return fieldValue != null && String(fieldValue).trim() !== '';
      }

      if (filter.type === 'string') {
        const strValue = String(fieldValue || '').toLowerCase();
        const filterValue = String(filter.value || '').toLowerCase();

        switch (filter.operator) {
          case 'equals': return strValue === filterValue;
          case 'notEquals': return strValue !== filterValue;
          case 'contains': return strValue.includes(filterValue);
          case 'notContains': return !strValue.includes(filterValue);
          case 'startsWith': return strValue.startsWith(filterValue);
          case 'endsWith': return strValue.endsWith(filterValue);
          default: return true;
        }
      }

      if (filter.type === 'number') {
        const numValue = parseNumericValue(fieldValue);
        const filterNum = parseNumericValue(filter.value);
        const filterNum2 = parseNumericValue(filter.value2);
        
        if (numValue === null) return false;

        switch (filter.operator) {
          case 'equals': return filterNum !== null && numValue === filterNum;
          case 'notEquals': return filterNum !== null && numValue !== filterNum;
          case 'greaterThan': return filterNum !== null && numValue > filterNum;
          case 'greaterThanOrEqual': return filterNum !== null && numValue >= filterNum;
          case 'lessThan': return filterNum !== null && numValue < filterNum;
          case 'lessThanOrEqual': return filterNum !== null && numValue <= filterNum;
          case 'between': return filterNum !== null && filterNum2 !== null && numValue >= filterNum && numValue <= filterNum2;
          default: return true;
        }
      }

      if (filter.type === 'date') {
        const dateValue = new Date(fieldValue);
        if (isNaN(dateValue.getTime())) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (filter.operator) {
          case 'today': {
            const recordDate = new Date(dateValue);
            recordDate.setHours(0, 0, 0, 0);
            return recordDate.getTime() === today.getTime();
          }
          case 'yesterday': {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const recordDate = new Date(dateValue);
            recordDate.setHours(0, 0, 0, 0);
            return recordDate.getTime() === yesterday.getTime();
          }
          case 'thisWeek': {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            return dateValue >= startOfWeek && dateValue <= endOfWeek;
          }
          case 'thisMonth': {
            return dateValue.getMonth() === today.getMonth() && 
                   dateValue.getFullYear() === today.getFullYear();
          }
          case 'thisYear': {
            return dateValue.getFullYear() === today.getFullYear();
          }
          case 'lastNDays': {
            const n = parseInt(filter.value) || 0;
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - n);
            startDate.setHours(0,0,0,0);
            dateValue.setHours(0,0,0,0);
            return dateValue >= startDate && dateValue <= today;
          }
        }

        const filterDate = new Date(filter.value);
        const filterDate2 = new Date(filter.value2);

        if (isNaN(filterDate.getTime()) && !['today', 'yesterday', 'thisWeek', 'thisMonth', 'thisYear', 'lastNDays'].includes(filter.operator)) {
          return true;
        }

        switch (filter.operator) {
          case 'equals': {
            const d1 = new Date(dateValue);
            const d2 = new Date(filterDate);
            d1.setHours(0, 0, 0, 0);
            d2.setHours(0, 0, 0, 0);
            return d1.getTime() === d2.getTime();
          }
          case 'notEquals': {
            const d1 = new Date(dateValue);
            const d2 = new Date(filterDate);
            d1.setHours(0, 0, 0, 0);
            d2.setHours(0, 0, 0, 0);
            return d1.getTime() !== d2.getTime();
          }
          case 'before': return dateValue < filterDate;
          case 'after': return dateValue > filterDate;
          case 'between': return !isNaN(filterDate2.getTime()) && dateValue >= filterDate && dateValue <= filterDate2;
          default: return true;
        }
      }

      return true;
    });
  });

  console.log(`✅ [ChartRenderer] Filtros FIXOS aplicados:`, {
    dadosOriginais: data.length,
    dadosFiltrados: filteredData.length,
    filtrosFixos: fixedFilters.length
  });

  return filteredData;
};

// ✅ FUNÇÃO ATUALIZADA: Aplicar filtros PLAYGROUND
const applyPlaygroundFilters = (data, playgroundFilters = {}, aliases = {}, chartId) => {
  if (!data || data.length === 0 || !playgroundFilters || Object.keys(playgroundFilters).length === 0) {
    return data;
  }

  const filteredData = data.filter(record => {
    return Object.values(playgroundFilters).every(filter => {
      if (!filter || filter.enabled === false || !filter.isPlayground) {
        return true;
      }

      const fieldValue = getFieldValue(record, filter.field, aliases);
      
      if (filter.operator === 'isEmpty') {
        return fieldValue == null || String(fieldValue).trim() === '';
      }
      if (filter.operator === 'isNotEmpty') {
        return fieldValue != null && String(fieldValue).trim() !== '';
      }

      if (filter.type === 'string') {
        const strValue = String(fieldValue || '').toLowerCase();
        const filterValue = String(filter.value || '').toLowerCase();

        switch (filter.operator) {
          case 'equals': return strValue === filterValue;
          case 'notEquals': return strValue !== filterValue;
          case 'contains': return strValue.includes(filterValue);
          case 'notContains': return !strValue.includes(filterValue);
          default: return true;
        }
      }

      if (filter.type === 'number') {
        const numValue = parseNumericValue(fieldValue);
        const filterNum = parseNumericValue(filter.value);
        
        if (numValue === null) return false;

        switch (filter.operator) {
          case 'equals': return filterNum !== null && numValue === filterNum;
          case 'greaterThan': return filterNum !== null && numValue > filterNum;
          case 'lessThan': return filterNum !== null && numValue < filterNum;
          default: return true;
        }
      }

      return true;
    });
  });
  
  console.log(`✅ [ChartRenderer] Filtros PLAYGROUND aplicados para chart ${chartId}:`, {
    dadosOriginais: data.length,
    dadosFiltrados: filteredData.length,
    registrosRemovidos: data.length - filteredData.length
  });

  return filteredData;
};

const calculateKPIValues = (data, config, aliases = {}) => {
  if (!config.valueField || !data || data.length === 0) {
    return { currentValue: 0, previousValue: 0, target: 0 };
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const hasDateFields = data.length > 0 && (
    getFieldValue(data[0], 'Ano', aliases) !== null || 
    getFieldValue(data[0], 'Mês', aliases) !== null 
  );

  let currentData = data;

  if (hasDateFields && config.periodType !== 'all') {
    currentData = data.filter(d => {
      const ano = parseNumericValue(getFieldValue(d, 'Ano', aliases));
      const mes = parseNumericValue(getFieldValue(d, 'Mês', aliases));
      
      if (ano === null || mes === null) return false;

      switch (config.periodType) {
        case 'current_month':
          return ano === currentYear && mes === currentMonth;
        case 'current_year':
          return ano === currentYear;
        default:
          return true;
      }
    });
  }

  const values = currentData
    .map(d => parseNumericValue(getFieldValue(d, config.valueField, aliases)))
    .filter(v => v !== null && !isNaN(v));

  if (values.length === 0) {
    return { currentValue: 0, previousValue: 0, target: config.targetValue || 0 };
  }

  let currentValue = 0;
  
  switch (config.aggregation) {
    case 'sum':
      currentValue = values.reduce((sum, v) => sum + v, 0);
      break;
    case 'avg':
      currentValue = values.reduce((sum, v) => sum + v, 0) / values.length;
      break;
    case 'count':
      currentValue = values.length;
      break;
    case 'min':
      currentValue = Math.min(...values);
      break;
    case 'max':
      currentValue = Math.max(...values);
      break;
    default:
      currentValue = values.reduce((sum, v) => sum + v, 0);
  }

  let target = 0;
  
  if (config.targetField) {
    const targetValues = currentData
      .map(d => parseNumericValue(getFieldValue(d, config.targetField, aliases)))
      .filter(v => v !== null && !isNaN(v));
    
    if (targetValues.length > 0) {
      switch (config.targetAggregation || config.aggregation) {
        case 'sum':
          target = targetValues.reduce((sum, v) => sum + v, 0);
          break;
        case 'avg':
          target = targetValues.reduce((sum, v) => sum + v, 0) / targetValues.length;
          break;
        case 'count':
          target = targetValues.length;
          break;
        case 'min':
          target = Math.min(...targetValues);
          break;
        case 'max':
          target = Math.max(...targetValues);
          break;
        default:
          target = targetValues.reduce((sum, v) => sum + v, 0);
      }
    }
  } else {
    target = config.targetValue || currentValue * 1.2;
  }

  return {
    currentValue,
    previousValue: 0,
    target,
  };
};

const formatValue = (value, format, decimals = 0) => {
  if (value == null || isNaN(value)) return '-';
  const num = Number(value);
  
  if (format === 'currency') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  } else if (format === 'percent') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num / 100);
  } else if (format === 'compact') {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(decimals)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  }
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

function KPIRenderer({ data, config, aliases = {}, playgroundFilters = {}, chartId }) {
  const lastCalculatedRef = useRef(null);
  
  // ✅ CORREÇÃO: Aplicar filtros FIXOS primeiro, depois PLAYGROUND
  const filteredData = useMemo(() => {
    // 1️⃣ Aplicar filtros FIXOS do config
    let result = applyFixedFilters(data, config.filters, aliases);
    
    // 2️⃣ Aplicar filtros PLAYGROUND
    result = applyPlaygroundFilters(result, playgroundFilters, aliases, chartId);
    
    return result;
  }, [data, config.filters, playgroundFilters, aliases, chartId]);
  
  const kpiValues = useMemo(() => {
    const calcKey = `${filteredData.length}-${config.valueField}-${config.aggregation}-${config.periodType}-${config.targetField || 'fixed'}`;
    
    if (lastCalculatedRef.current?.key === calcKey) {
      return lastCalculatedRef.current.value;
    }
    
    const result = calculateKPIValues(filteredData, config, aliases);
    lastCalculatedRef.current = { key: calcKey, value: result };
    return result;
  }, [filteredData, config.valueField, config.aggregation, config.periodType, config.targetField, aliases]);
  
  const { currentValue, previousValue, target } = kpiValues;
  
  const change = currentValue - previousValue;
  const changePercent = previousValue !== 0 ? ((change / previousValue) * 100) : 0;
  const targetProgress = target !== 0 ? ((currentValue / target) * 100) : 0;
  const trendColor = change > 0 ? (config.colorPositive || '#10b981') : 
                     change < 0 ? (config.colorNegative || '#ef4444') : 
                     (config.colorNeutral || '#64748b');

  if (!config?.valueField) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Configure o KPI
      </div>
    );
  }

  return (
    <Card className="h-full border-0 shadow-none flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-center">
          <div className="text-base font-semibold text-slate-900 dark:text-white">
            {config.title || 'KPI'}
          </div>
          {config.subtitle && (
            <div className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-1">
              {config.subtitle}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            {formatValue(currentValue, config.format || 'number', config.decimals || 0)}
          </div>
          
          {config.showComparison && config.comparisonType !== 'none' && previousValue > 0 && (
            <div className="flex items-center justify-center gap-1 text-base mb-1">
              <div className="flex items-center gap-1 font-semibold" style={{ color: trendColor }}>
                {config.showTrend && (
                  <>
                    {change > 0 && <TrendingUp className="w-4 h-4" />}
                    {change < 0 && <TrendingDown className="w-4 h-4" />}
                    {change === 0 && <Minus className="w-4 h-4" />}
                  </>
                )}
                <span>
                  {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {config.showTarget && (
          <div className="space-y-3 mt-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Progresso da Meta
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {targetProgress.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(targetProgress, 100)}%`,
                    backgroundColor: targetProgress >= 100 ? (config.colorPositive || '#10b981') : '#3b82f6'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ChartRenderer({ chartId, playgroundFilters = {} }) {
  const { data: chart, isLoading: loadingChart } = useQuery({
    queryKey: ['chart', chartId],
    queryFn: () => base44.entities.ChartConfig.get(chartId),
    enabled: !!chartId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // ✅ Buscar informações do dataset para obter connection_id, source_type, etc.
  // ✅ CORREÇÃO: Não buscar se datasource_id for 'mock' (placeholder)
  const { data: dataset, isLoading: loadingDataset } = useQuery({
    queryKey: ['dataset', chart?.datasource_id],
    queryFn: () => base44.entities.DataSource.get(chart.datasource_id),
    enabled: !!chart?.datasource_id && chart.datasource_id !== 'mock',
    staleTime: 30 * 60 * 1000,
  });

  const { data: chartData, isLoading: loadingData, error: dataError } = useQuery({
    queryKey: ['chartData', chart?.datasource_id, chartId],
    queryFn: async () => {
      if (!chart?.datasource_id || !dataset) {
        return { success: false, data: [], field_aliases: {} };
      }

      try {
        // ✅ CORREÇÃO: Enviar connection_id, source_type, table_name/sql_query
        const response = await base44.functions.invoke('fetchDatasetData', {
          connection_id: dataset.connection_id,
          source_type: dataset.source_type,
          table_name: dataset.table_name || null,
          sql_query: dataset.sql_query || null,
          limit: 10000,
        });

        if (!response.data) {
          return {
            success: false,
            data: [],
            field_aliases: dataset.field_aliases || {},
            message: 'Resposta vazia do servidor'
          };
        }

        // ✅ Retornar dados com field_aliases do dataset
        return {
          ...response.data,
          field_aliases: dataset.field_aliases || {},
        };
      } catch (error) {
        let errorMessage = error.message;
        
        if (error.response?.data) {
          const errorData = error.response.data;
          
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        }
        
        return { 
          success: false, 
          data: [], 
          field_aliases: {}, 
          message: errorMessage,
          fullError: error.response?.data 
        };
      }
    },
    enabled: !!chart?.datasource_id && !!dataset, // ✅ Aguardar dataset estar carregado
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // ✅ CORREÇÃO: A API retorna `rows` e não `data`
  const data = useMemo(() => chartData?.rows || chartData?.data || [], [chartData]);
  const config = useMemo(() => chart?.config || {}, [chart]);
  const aliases = useMemo(() => chartData?.field_aliases || dataset?.field_aliases || {}, [chartData, dataset]);

  // ✅ CORREÇÃO: Para Pivot e Bar, também aplicar filtros FIXOS primeiro
  const filteredData = useMemo(() => {
    // 1️⃣ Aplicar filtros FIXOS do config
    let result = applyFixedFilters(data, config.filters, aliases);
    
    // 2️⃣ Aplicar filtros PLAYGROUND
    result = applyPlaygroundFilters(result, playgroundFilters, aliases, chartId);
    
    return result;
  }, [data, config.filters, playgroundFilters, aliases, chartId]);

  if (loadingChart || loadingDataset || loadingData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500">
          {loadingChart ? 'Carregando chart...' : loadingDataset ? 'Carregando dataset...' : 'Carregando dados...'}
        </p>
      </div>
    );
  }

  if (!chart) {
    return (
      <Alert className="m-4">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>Chart não encontrado (ID: {chartId})</AlertDescription>
      </Alert>
    );
  }

  // ✅ CORREÇÃO: Verificar se o chart tem dataset configurado
  if (!chart.datasource_id || chart.datasource_id === 'mock') {
    console.warn('⚠️ [ChartRenderer] Chart sem datasource_id ou com "mock":', {
      chartId,
      chartName: chart.name,
      datasource_id: chart.datasource_id,
      fullChart: chart
    });

    return (
      <Alert className="m-4 bg-amber-50 dark:bg-amber-900/10 border-amber-500">
        <AlertCircle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <div className="space-y-2">
            <div>
              <strong>Chart não configurado</strong>
            </div>
            <div className="text-sm">
              Este chart precisa ser configurado com um dataset válido.
              Edite o chart e selecione um dataset para visualizar os dados.
            </div>
            <div className="text-xs mt-2 font-mono bg-amber-100 dark:bg-amber-900/30 p-2 rounded">
              Chart ID: {chartId}<br/>
              Datasource ID: {chart.datasource_id || '(vazio)'}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  console.log('✅ [ChartRenderer] Chart com dataset válido:', {
    chartId,
    chartName: chart.name,
    datasource_id: chart.datasource_id
  });

  if (dataError || (chartData && !chartData.success)) {
    const errorMessage = chartData?.message || dataError?.message || 'Erro desconhecido';
    const fullError = chartData?.fullError;
    
    return (
      <Alert className="m-4 bg-red-50 dark:bg-red-900/10 border-red-500">
        <AlertCircle className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          <div className="space-y-2">
            <div>
              <strong>Erro ao carregar dados do chart:</strong>
            </div>
            <div className="text-sm">
              {errorMessage}
            </div>
            {fullError && (
              <details className="text-xs mt-2">
                <summary className="cursor-pointer hover:underline">
                  Ver detalhes técnicos
                </summary>
                <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded overflow-auto max-h-40">
                  {JSON.stringify(fullError, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (data.length === 0) {
    return (
      <Alert className="m-4 bg-amber-50 dark:bg-amber-900/10 border-amber-500">
        <AlertCircle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          Sem dados disponíveis para este chart
        </AlertDescription>
      </Alert>
    );
  }

  if (chart.type === 'kpi') {
    return <KPIRenderer data={data} config={config} aliases={aliases} playgroundFilters={playgroundFilters} chartId={chartId} />;
  } else if (chart.type === 'pivot') {
    return (
      <div className="w-full h-full overflow-hidden">
        <PivotTable data={filteredData} config={config} aliases={aliases} />
      </div>
    );
  } else if (chart.type === 'bar' || chart.type === 'column') {
    return (
      <div className="w-full h-full overflow-hidden">
        <BarChartRenderer data={filteredData} config={config} aliases={aliases} />
      </div>
    );
  }

  return (
    <Alert className="m-4">
      <AlertCircle className="w-4 h-4" />
      <AlertDescription>Tipo de chart não suportado: {chart.type}</AlertDescription>
    </Alert>
  );
}