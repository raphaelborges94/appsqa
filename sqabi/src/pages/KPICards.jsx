
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, Save, ArrowLeft, Loader2, Database, RefreshCw, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import GlobalSidebar from "../components/bi/GlobalSidebar";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PivotFilters from "../components/bi/pivot/PivotFilters";

const aggregationOptions = [
  { value: 'sum', label: 'Soma' },
  { value: 'avg', label: 'Média' },
  { value: 'count', label: 'Contagem' },
  { value: 'min', label: 'Mínimo' },
  { value: 'max', label: 'Máximo' },
];

const comparisonOptions = [
  { value: 'previous_period', label: 'Período Anterior (MoM/QoQ)' },
  { value: 'previous_year', label: 'Ano Anterior (YoY)' },
  { value: 'fixed_target', label: 'Meta Fixa' },
  { value: 'none', label: 'Sem Comparação' },
];

const periodTypeOptions = [
  { value: 'current_month', label: 'Mês Atual (MTD)' },
  { value: 'last_month', label: 'Último Mês' },
  { value: 'last_3_months', label: 'Últimos 3 Meses' },
  { value: 'last_6_months', label: 'Últimos 6 Meses' },
  { value: 'current_quarter', label: 'Trimestre Atual (QTD)' },
  { value: 'last_quarter', label: 'Último Trimestre' },
  { value: 'last_4_quarters', label: 'Últimos 4 Trimestres' },
  { value: 'current_year', label: 'Ano Atual (YTD)' },
  { value: 'last_12_months', label: 'Últimos 12 Meses' },
  { value: 'custom_months_back', label: 'Meses Retroativos (Custom)' },
  { value: 'all', label: 'Todos os Dados (Sem Filtro)' },
];

const formatOptions = [
  { value: 'currency', label: 'Moeda (R$)' },
  { value: 'number', label: 'Número' },
  { value: 'percent', label: 'Percentual (%)' },
  { value: 'compact', label: 'Compacto (K, M)' },
];

const normalizeFieldName = (fieldName) => {
  if (!fieldName) return '';
  return String(fieldName)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const getFieldValue = (record, fieldName, aliases = {}) => {
  if (!record || !fieldName) return null;
  
  // 1. Check for alias direct match (if fieldName is an alias)
  const aliasedFieldName = Object.keys(aliases).find(key => aliases[key] === fieldName);
  if (aliasedFieldName && record[aliasedFieldName] !== undefined) {
    return record[aliasedFieldName];
  }

  // 2. Check for exact field name match
  if (record[fieldName] !== undefined) {
    return record[fieldName];
  }
  
  // 3. Check for original field name from alias mapping
  // This case might be tricky if fieldName is an alias's display name, but we need the original.
  // The first check handles when fieldName IS the original key for the alias.
  // This step ensures if fieldName is a display name, we find its original.
  const originalNameFromAlias = Object.keys(aliases).find(key => aliases[key] === fieldName);
  if (originalNameFromAlias && record[originalNameFromAlias] !== undefined) {
    return record[originalNameFromAlias];
  }

  // 4. Case-insensitive match on original field names
  const normalizedSearch = normalizeFieldName(fieldName);
  const matchingKey = Object.keys(record).find(key => 
    normalizeFieldName(key) === normalizedSearch
  );
  
  if (matchingKey) {
    return record[matchingKey];
  }

  // 5. Case-insensitive match on alias display names
  // This handles cases where fieldName is a normalized display name
  const matchingAliasKey = Object.keys(aliases).find(key => 
    normalizeFieldName(aliases[key]) === normalizedSearch
  );
  
  if (matchingAliasKey && record[matchingAliasKey] !== undefined) {
    return record[matchingAliasKey];
  }
  
  return null;
};

const getQuarter = (month) => Math.ceil(month / 3);

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

// FUNÇÃO ATUALIZADA - Suporta meta fixa OU campo de meta
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
        case 'last_month': {
          const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
          const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
          return ano === lastMonthYear && mes === lastMonth;
        }
        case 'last_3_months': {
          const threeMonthsAgo = new Date(currentYear, currentMonth - 4, 1);
          const dataDate = new Date(ano, mes - 1, 1);
          const currentDate = new Date(currentYear, currentMonth - 1, 1);
          return dataDate >= threeMonthsAgo && dataDate <= currentDate;
        }
        case 'last_6_months': {
          const sixMonthsAgo = new Date(currentYear, currentMonth - 7, 1);
          const dataDate = new Date(ano, mes - 1, 1);
          const currentDate = new Date(currentYear, currentMonth - 1, 1);
          return dataDate >= sixMonthsAgo && dataDate <= currentDate;
        }
        case 'current_quarter': {
          const currentQuarter = getQuarter(currentMonth);
          const quarter = getQuarter(mes);
          return ano === currentYear && quarter === currentQuarter;
        }
        case 'last_quarter': {
          const currentQuarter = getQuarter(currentMonth);
          const lastQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
          const lastQuarterYear = currentQuarter === 1 ? currentYear - 1 : currentYear;
          const quarter = getQuarter(mes);
          return ano === lastQuarterYear && quarter === lastQuarter;
        }
        case 'last_12_months': {
          const twelveMonthsAgo = new Date(currentYear, currentMonth - 13, 1);
          const dataDate = new Date(ano, mes - 1, 1);
          const currentDate = new Date(currentYear, currentMonth - 1, 1);
          return dataDate >= twelveMonthsAgo && dataDate <= currentDate;
        }
        case 'custom_months_back': {
          const monthsBack = config.customMonthsBack || 1;
          const startDate = new Date(currentYear, currentMonth - 1 - monthsBack, 1);
          const endDate = new Date(currentYear, currentMonth - 1, 31); // Up to current month's end (approx)
          const dataDate = new Date(ano, mes - 1, 1);
          return dataDate >= startDate && dataDate <= endDate;
        }
        default:
          return true;
      }
    });
  } else if (!hasDateFields && config.periodType !== 'all') {
    console.warn('⚠️ Dataset não possui campos de data (Ano/Mês) para filtragem por período.');
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

  // CALCULAR META - Pode ser campo ou valor fixo
  let target = 0;
  
  if (config.useTargetField && config.targetField) {
    // Meta vem de um campo do dataset
    const targetValues = currentData
      .map(d => parseNumericValue(getFieldValue(d, config.targetField, aliases)))
      .filter(v => v !== null && !isNaN(v));
    
    if (targetValues.length > 0) {
      // Usar mesma agregação que o valor principal
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
    // Meta fixa (valor manual)
    target = config.targetValue || currentValue * 1.2;
  }

  return {
    currentValue,
    previousValue: 0, // This outline explicitly sets previousValue to 0
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
    if (Math.abs(num) >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(decimals)}B`;
    } else if (Math.abs(num) >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(decimals)}M`;
    } else if (Math.abs(num) >= 1_000) {
      return `${(num / 1_000).toFixed(decimals)}K`;
    }
    return num.toFixed(decimals);
  }
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

const getComparisonLabel = (comparisonType, periodType) => {
  if (comparisonType === 'previous_period') {
    if (['current_quarter', 'last_quarter', 'last_4_quarters'].includes(periodType)) {
      return 'vs. trimestre anterior (QoQ)';
    }
    return 'vs. período anterior (MoM)';
  } else if (comparisonType === 'previous_year') {
    return 'vs. ano anterior (YoY)';
  } else if (comparisonType === 'fixed_target') {
    return 'vs. meta';
  }
  return '';
};

export default function KPICards() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const chartId = urlParams.get('id');

  const [config, setConfig] = useState({
    name: 'Novo KPI',
    datasource_id: '',
    title: 'Vendas Totais',
    subtitle: 'Mês Atual',
    valueField: '',
    aggregation: 'sum',
    format: 'currency',
    decimals: 0,
    comparisonType: 'previous_period',
    periodType: 'current_year',
    customMonthsBack: 1,
    targetValue: 150000,
    targetField: '', // NOVO: Campo de meta
    targetAggregation: 'sum', // NOVO: Agregação da meta
    useTargetField: false, // NOVO: Toggle entre campo ou valor fixo
    showTarget: true,
    showComparison: true,
    showTrend: true,
    colorPositive: '#10b981',
    colorNegative: '#ef4444',
    colorNeutral: '#64748b',
    filters: [], 
  });

  const [availableFields, setAvailableFields] = useState([]);
  const [datasetData, setDatasetData] = useState([]);
  const [fieldAliases, setFieldAliases] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  
  const loadingRef = useRef(false);
  const lastLoadedDatasetRef = useRef(null);

  // ✅ CORREÇÃO: Normalizar resposta da API que retorna { items, total }
  const { data: dataSources = [], isLoading: loadingDataSources } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () => base44.entities.DataSource.list({ order: '-updated_date' }),
    select: (raw) => {
      // Normaliza para array
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.items)) return raw.items;
      if (Array.isArray(raw.data)) return raw.data;
      return [];
    },
  });

  const { data: savedChart, isLoading: loadingChart } = useQuery({
    queryKey: ['chart', chartId],
    queryFn: () => base44.entities.ChartConfig.get(chartId),
    enabled: !!chartId,
  });

  useEffect(() => {
    if (savedChart?.config) {
      setConfig(prev => ({
        ...prev,
        ...savedChart.config,
        // Ensure new fields are initialized if not present in saved config
        targetField: savedChart.config.targetField ?? '',
        targetAggregation: savedChart.config.targetAggregation ?? 'sum',
        useTargetField: savedChart.config.useTargetField ?? false,
        name: savedChart.name,
        datasource_id: savedChart.datasource_id,
      }));
    }
  }, [savedChart]);

  const loadDatasetData = async (datasetId) => {
    if (!datasetId || loadingRef.current || lastLoadedDatasetRef.current === datasetId) {
      return;
    }

    loadingRef.current = true;
    lastLoadedDatasetRef.current = datasetId;
    setLoadingData(true);

    try {
      // ✅ CORREÇÃO: Comparação segura de tipos e busca direta se não encontrar
      let selectedDataset = dataSources.find(ds => String(ds.id) === String(datasetId));

      // Se não encontrou na lista, buscar diretamente da API
      if (!selectedDataset) {
        console.warn('Dataset não encontrado na lista local. Buscando da API...', {
          datasetId,
          dataSources: dataSources.map(ds => ({ id: ds.id, name: ds.name }))
        });

        try {
          selectedDataset = await base44.entities.DataSource.get(datasetId);
          console.log('✅ Dataset carregado da API:', selectedDataset);
        } catch (apiError) {
          console.error('❌ Erro ao buscar dataset da API:', apiError);
          throw new Error(`Dataset "${datasetId}" não encontrado. Verifique se o dataset existe.`);
        }
      }

      if (!selectedDataset) {
        throw new Error('Dataset não encontrado');
      }

      const originalFields = selectedDataset.fields || [];
      const calculatedFields = selectedDataset.calculated_fields || [];
      const aliases = selectedDataset.field_aliases || {};
      
      setFieldAliases(aliases);
      
      const allFields = [
        ...originalFields.map(f => ({
          ...f,
          displayName: aliases[f.name] || f.name,
          isCalculated: false
        })),
        ...calculatedFields.map(f => ({
          name: f.name,
          type: f.type,
          displayName: f.displayName || f.name,
          isCalculated: true
        }))
      ];
      
      setAvailableFields(allFields);

      toast.info('🔍 Carregando dados do PostgreSQL...', { duration: 2000 });

      // ✅ CORREÇÃO: Enviar connection_id, source_type, table_name/sql_query
      const response = await base44.functions.invoke('fetchDatasetData', {
        connection_id: selectedDataset.connection_id,
        source_type: selectedDataset.source_type,
        table_name: selectedDataset.table_name || null,
        sql_query: selectedDataset.sql_query || null,
        limit: 10000,
      });

      const result = response.data;

      if (result.success) {
        // ✅ CORREÇÃO: A API retorna `rows` e não `data`
        const rows = result.rows || result.data || [];
        setDatasetData(rows);

        const calculatedCount = result.calculatedFieldsProcessed || 0;
        const message = calculatedCount > 0
          ? `✅ ${rows.length.toLocaleString('pt-BR')} registros carregados (${calculatedCount} campos calculados processados)!`
          : `✅ ${rows.length.toLocaleString('pt-BR')} registros carregados!`;

        toast.success(message);
      } else {
        throw new Error(result.message || result.error || 'Erro ao carregar dados');
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('❌ Erro: ' + error.message);
      setAvailableFields([]);
      setDatasetData([]);
      setFieldAliases({});
      lastLoadedDatasetRef.current = null;
    } finally {
      setLoadingData(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    if (config.datasource_id && dataSources.length > 0) {
      if (lastLoadedDatasetRef.current !== config.datasource_id) {
        loadDatasetData(config.datasource_id);
      }
    } else if (!config.datasource_id) {
      setAvailableFields([]);
      setDatasetData([]);
      setFieldAliases({});
      lastLoadedDatasetRef.current = null;
    }
  }, [config.datasource_id, dataSources.length]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      console.log('💾 [KPICards] Salvando chart com dados:', data);
      if (chartId) {
        const result = await base44.entities.ChartConfig.update(chartId, data);
        console.log('✅ [KPICards] Chart atualizado:', result);
        return result;
      } else {
        const result = await base44.entities.ChartConfig.create(data);
        console.log('✅ [KPICards] Chart criado:', result);
        return result;
      }
    },
    onSuccess: (savedChart) => {
      // ✅ CORREÇÃO: Invalidar cache do chart específico + lista
      queryClient.invalidateQueries({ queryKey: ['charts'] });
      queryClient.invalidateQueries({ queryKey: ['chart', chartId] });
      queryClient.invalidateQueries({ queryKey: ['chart', savedChart?.id] });

      console.log('🔄 [KPICards] Cache invalidado para chart:', savedChart?.id || chartId);
      toast.success('✅ KPI salvo com sucesso!');
    },
  });

  const handleSave = async () => {
    if (!config.datasource_id) {
      toast.error('⚠️ Selecione um dataset antes de salvar');
      return;
    }

    await saveMutation.mutateAsync({
      name: config.name,
      type: 'kpi',
      datasource_id: config.datasource_id,
      config: config,
    });
  };

  const applyFilters = (data, filters, aliases) => {
    if (!filters || filters.length === 0) return data;
    
    const activeFilters = filters.filter(f => f.enabled !== false && f.isPlayground !== true);
    
    if (activeFilters.length === 0) return data;

    return data.filter(record => {
      return activeFilters.every(filter => {
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
          const numValue = parseFloat(fieldValue);
          const filterNum = parseFloat(filter.value);
          const filterNum2 = parseFloat(filter.value2);

          if (isNaN(numValue)) return false;

          switch (filter.operator) {
            case 'equals': return !isNaN(filterNum) && numValue === filterNum;
            case 'notEquals': return !isNaN(filterNum) && numValue !== filterNum;
            case 'greaterThan': return !isNaN(filterNum) && numValue > filterNum;
            case 'greaterThanOrEqual': return !isNaN(filterNum) && numValue >= filterNum;
            case 'lessThan': return !isNaN(filterNum) && numValue < filterNum;
            case 'lessThanOrEqual': return !isNaN(filterNum) && numValue <= filterNum;
            case 'between': return !isNaN(filterNum) && !isNaN(filterNum2) && numValue >= filterNum && numValue <= filterNum2;
            default: return true;
          }
        }

        // Date filter logic remains the same, relies on string conversion and then Date parsing
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
            // Add other date operators as needed
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
  };

  const handleReloadData = () => {
    lastLoadedDatasetRef.current = null;
    loadDatasetData(config.datasource_id);
  };

  const filteredData = applyFilters(datasetData, config.filters, fieldAliases);
  const { currentValue, previousValue, target } = calculateKPIValues(filteredData, config, fieldAliases);
  
  const change = currentValue - previousValue;
  const changePercent = previousValue !== 0 ? ((change / previousValue) * 100) : 0;
  const targetProgress = target !== 0 ? ((currentValue / target) * 100) : 0;

  const trendColor = change > 0 ? config.colorPositive : change < 0 ? config.colorNegative : config.colorNeutral;

  if (loadingChart || loadingDataSources) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-73px)]">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("Charts"))}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Input
              value={config.name}
              onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
              className="text-xl font-bold border-none focus-visible:ring-0 px-0 max-w-md"
              placeholder="Nome do KPI"
            />
          </div>
          <Button 
            onClick={handleSave}
            disabled={saveMutation.isPending || !config.datasource_id}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar KPI
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
          {!config.datasource_id ? (
            <Alert className="max-w-md">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Selecione um <strong>Dataset</strong> na lateral direita para começar a construir seu KPI.
              </AlertDescription>
            </Alert>
          ) : loadingData ? (
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                Conectando ao PostgreSQL e carregando dados reais...
              </p>
            </div>
          ) : datasetData.length === 0 ? (
            <Alert className="max-w-md bg-amber-50 dark:bg-amber-900/10 border-amber-500">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                O dataset selecionado não possui dados. Verifique a query SQL ou tabela.
              </AlertDescription>
            </Alert>
          ) : currentValue === 0 && config.valueField ? (
            <Alert className="max-w-md bg-amber-50 dark:bg-amber-900/10 border-amber-500">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Nenhum dado encontrado para o período selecionado ou após filtros aplicados.</strong>
                <br />
                Tente ajustar o período, os filtros ou verifique se há dados disponíveis.
              </AlertDescription>
            </Alert>
          ) : (
            <Card className="w-full max-w-md shadow-2xl">
              <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <CardTitle className="text-center">
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {config.title}
                  </div>
                  {config.subtitle && (
                    <div className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                      {config.subtitle}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-slate-900 dark:text-white mb-3">
                    {formatValue(currentValue, config.format, config.decimals)}
                  </div>
                  
                  {config.showComparison && config.comparisonType !== 'none' && previousValue > 0 && (
                    <div className="flex items-center justify-center gap-2 text-lg mb-2">
                      <div 
                        className="flex items-center gap-1 font-semibold"
                        style={{ color: trendColor }}
                      >
                        {config.showTrend && (
                          <>
                            {change > 0 && <TrendingUp className="w-5 h-5" />}
                            {change < 0 && <TrendingDown className="w-5 h-5" />}
                            {change === 0 && <Minus className="w-5 h-5" />}
                          </>
                        )}
                        <span>
                          {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {config.showComparison && config.comparisonType !== 'none' && previousValue > 0 && (
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {getComparisonLabel(config.comparisonType, config.periodType)}
                      {' - '}
                      {formatValue(previousValue, config.format, config.decimals)}
                    </div>
                  )}
                </div>

                {config.showTarget && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          Progresso da Meta
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {targetProgress.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(targetProgress, 100)}%`,
                            backgroundColor: targetProgress >= 100 ? config.colorPositive : '#3b82f6'
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                          Meta
                        </div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">
                          {formatValue(target, config.format, config.decimals)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                          Faltam
                        </div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">
                          {formatValue(Math.max(0, target - currentValue), config.format, config.decimals)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <GlobalSidebar
          config={config}
          onSave={handleSave}
          onReset={() => {
            setConfig({
              name: 'Novo KPI',
              datasource_id: '',
              title: 'Vendas Totais',
              subtitle: 'Mês Atual',
              valueField: '',
              aggregation: 'sum',
              format: 'currency',
              decimals: 0,
              comparisonType: 'previous_period',
              periodType: 'current_year',
              customMonthsBack: 1,
              targetValue: 150000,
              targetField: '',
              targetAggregation: 'sum',
              useTargetField: false,
              showTarget: true,
              showComparison: true,
              showTrend: true,
              colorPositive: '#10b981',
              colorNegative: '#ef4444',
              colorNeutral: '#64748b',
              filters: [], 
            });
            setAvailableFields([]);
            setDatasetData([]);
            setFieldAliases({});
            lastLoadedDatasetRef.current = null;
          }}
          chartType="kpi"
        >
          {{
            dataSource: (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Dataset *</Label>
                  <Select 
                    value={config.datasource_id} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, datasource_id: value, valueField: '' }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={loadingDataSources ? "Carregando datasets..." : "Selecione um dataset..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {dataSources.length === 0 ? (
                        <div className="p-2 text-xs text-slate-500 text-center">
                          Nenhum dataset disponível
                        </div>
                      ) : (
                        dataSources.map(ds => (
                          <SelectItem key={ds.id} value={ds.id}>
                            <div className="flex items-center gap-2">
                              <Database className="w-3 h-3" />
                              <span>{ds.name}</span>
                              <span className="text-xs text-slate-500">
                                ({ds.fields?.length || 0} campos)
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {config.datasource_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={handleReloadData}
                      disabled={loadingData}
                    >
                      {loadingData ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                          Recarregando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3 mr-2" />
                          Recarregar Dados
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ),
            structure: (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Título do KPI</Label>
                  <Input
                    value={config.title}
                    onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Subtítulo</Label>
                  <Input
                    value={config.subtitle}
                    onChange={(e) => setConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                    className="mt-1"
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <Label className="text-xs">Campo de Valor *</Label>
                  <Select 
                    value={config.valueField} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, valueField: value }))}
                    disabled={!config.datasource_id || loadingData}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={!config.datasource_id ? "Selecione um dataset primeiro" : "Selecione um campo..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.length === 0 ? (
                        <div className="p-2 text-xs text-slate-500 text-center">
                          {loadingData ? 'Carregando campos...' : 'Nenhum campo disponível'}
                        </div>
                      ) : (
                        availableFields.map(field => (
                          <SelectItem key={field.name} value={field.name}>
                            <div className="flex items-center gap-2">
                              {field.isCalculated && <span className="text-xs text-blue-500">(fx)</span>}
                              <span>{field.displayName}</span>
                              <span className="text-xs text-slate-400">({field.type})</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Agregação</Label>
                  <Select 
                    value={config.aggregation} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, aggregation: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aggregationOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Período</Label>
                  <Select 
                    value={config.periodType} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, periodType: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periodTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {config.periodType === 'custom_months_back' && (
                  <div>
                    <Label className="text-xs">Quantos meses retroativos?</Label>
                    <Input
                      type="number"
                      min="1"
                      max="36"
                      value={config.customMonthsBack || 1}
                      onChange={(e) => setConfig(prev => ({ ...prev, customMonthsBack: parseInt(e.target.value) || 1 }))}
                      className="mt-1"
                      placeholder="Ex: 3 (últimos 3 meses)"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs">Formato</Label>
                  <Select 
                    value={config.format} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, format: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formatOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Casas Decimais</Label>
                  <Input
                    type="number"
                    min="0"
                    max="4"
                    value={config.decimals}
                    onChange={(e) => setConfig(prev => ({ ...prev, decimals: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label className="text-xs">Mostrar Comparação</Label>
                  <Switch
                    checked={config.showComparison}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showComparison: checked }))}
                  />
                </div>

                {config.showComparison && (
                  <>
                    <div>
                      <Label className="text-xs">Tipo de Comparação</Label>
                      <Select 
                        value={config.comparisonType} 
                        onValueChange={(value) => setConfig(prev => ({ ...prev, comparisonType: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {comparisonOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Mostrar Indicador</Label>
                      <Switch
                        checked={config.showTrend}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showTrend: checked }))}
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Label className="text-xs">Mostrar Meta</Label>
                  <Switch
                    checked={config.showTarget}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showTarget: checked }))}
                  />
                </div>

                {/* NOVA SEÇÃO: Configuração de Meta */}
                {config.showTarget && (
                  <>
                    <div className="flex items-center justify-between pt-2 pb-2 border-t border-slate-200 dark:border-slate-700">
                      <Label className="text-xs font-semibold">Usar Campo de Meta</Label>
                      <Switch
                        checked={config.useTargetField}
                        onCheckedChange={(checked) => setConfig(prev => ({ 
                          ...prev, 
                          useTargetField: checked,
                          targetField: checked ? prev.targetField : '',
                        }))}
                      />
                    </div>

                    {config.useTargetField ? (
                      <>
                        <div>
                          <Label className="text-xs">Campo da Meta *</Label>
                          <Select 
                            value={config.targetField} 
                            onValueChange={(value) => setConfig(prev => ({ ...prev, targetField: value }))}
                            disabled={!config.datasource_id || loadingData}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Selecione o campo da meta..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields.length === 0 ? (
                                <div className="p-2 text-xs text-slate-500 text-center">
                                  {loadingData ? 'Carregando campos...' : 'Nenhum campo disponível'}
                                </div>
                              ) : (
                                availableFields.map(field => (
                                  <SelectItem key={field.name} value={field.name}>
                                    <div className="flex items-center gap-2">
                                      {field.isCalculated && <span className="text-xs text-blue-500">(fx)</span>}
                                      <span>{field.displayName}</span>
                                      <span className="text-xs text-slate-400">({field.type})</span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Agregação da Meta</Label>
                          <Select 
                            value={config.targetAggregation || config.aggregation} 
                            onValueChange={(value) => setConfig(prev => ({ ...prev, targetAggregation: value }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {aggregationOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      <div>
                        <Label className="text-xs">Valor da Meta (Fixo)</Label>
                        <Input
                          type="number"
                          value={config.targetValue}
                          onChange={(e) => setConfig(prev => ({ ...prev, targetValue: parseFloat(e.target.value) || 0 }))}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            ),
            filters: (
              <PivotFilters
                availableFields={availableFields}
                filters={config.filters}
                onFiltersChange={(filters) => setConfig(prev => ({ ...prev, filters }))}
              />
            ),
            formatting: (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Cor - Positivo</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={config.colorPositive}
                      onChange={(e) => setConfig(prev => ({ ...prev, colorPositive: e.target.value }))}
                      className="w-14 h-9 p-1 cursor-pointer"
                    />
                    <Input
                      value={config.colorPositive}
                      onChange={(e) => setConfig(prev => ({ ...prev, colorPositive: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Cor - Negativo</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={config.colorNegative}
                      onChange={(e) => setConfig(prev => ({ ...prev, colorNegative: e.target.value }))}
                      className="w-14 h-9 p-1 cursor-pointer"
                    />
                    <Input
                      value={config.colorNegative}
                      onChange={(e) => setConfig(prev => ({ ...prev, colorNegative: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Cor - Neutro</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={config.colorNeutral}
                      onChange={(e) => setConfig(prev => ({ ...prev, colorNeutral: e.target.value }))}
                      className="w-14 h-9 p-1 cursor-pointer"
                    />
                    <Input
                      value={config.colorNeutral}
                      onChange={(e) => setConfig(prev => ({ ...prev, colorNeutral: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            ),
          }}
        </GlobalSidebar>
      </div>
    </div>
  );
}
