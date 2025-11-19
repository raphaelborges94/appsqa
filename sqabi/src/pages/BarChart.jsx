import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, ArrowLeft, Loader2, Database, RefreshCw, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import GlobalSidebar from "../components/bi/GlobalSidebar";
import FieldsPanel from "../components/bi/pivot/FieldsPanel";
import BarFieldZone from "../components/bi/bar/BarFieldZone";
import BarChartRenderer from "../components/bi/bar/BarChartRenderer";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PivotFilters from "../components/bi/pivot/PivotFilters";

export default function BarChart() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const chartId = urlParams.get('id');

  const [config, setConfig] = useState({
    name: 'Novo Gráfico de Barras',
    datasource_id: '',
    xAxis: null,
    values: [],
    orientation: 'vertical',
    stacked: false,
    showLegend: true,
    showDataLabels: true,
    showGridLines: true,
    showLines: false,
    sortBy: null,
    sortDirection: 'asc',
    maxBarSize: 80,
    xAxisAngle: -45,
    filters: [],
  });

  const [draggedField, setDraggedField] = useState(null);
  const [fieldsPanelExpanded, setFieldsPanelExpanded] = useState(true);
  const [availableFields, setAvailableFields] = useState([]);
  const [datasetData, setDatasetData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // ✅ REFs para controlar loops infinitos
  const loadingDataRef = useRef(false);
  const lastLoadedDatasetRef = useRef(null);

  // ✅ CORREÇÃO: Normalizar dataSources para sempre ser array
  const { data: dataSources = [], isLoading: loadingDataSources } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () => base44.entities.DataSource.list(),
    select: (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (raw.items && Array.isArray(raw.items)) return raw.items;
      if (raw.data && Array.isArray(raw.data)) return raw.data;
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
        name: savedChart.name,
        datasource_id: savedChart.datasource_id,
      }));
    }
  }, [savedChart]);

  const loadDatasetData = async (datasetId) => {
    if (!datasetId || loadingDataRef.current) {
      return;
    }

    loadingDataRef.current = true;
    setLoadingData(true);
    lastLoadedDatasetRef.current = datasetId;

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
      const fieldAliases = selectedDataset.field_aliases || {};
      
      const allFields = [
        ...originalFields.map(f => ({
          ...f,
          displayName: fieldAliases[f.name] || f.name,
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

      toast.info('🔍 Carregando TODOS os dados...', { duration: 2000 });

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
        toast.success(`✅ ${rows.length.toLocaleString('pt-BR')} registros carregados!`);
      } else {
        throw new Error(result.message || result.error || 'Erro ao carregar dados');
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('❌ Erro: ' + error.message);
      setAvailableFields([]);
      setDatasetData([]);
      lastLoadedDatasetRef.current = null;
    } finally {
      setLoadingData(false);
      loadingDataRef.current = false;
    }
  };

  useEffect(() => {
    const shouldLoad = 
      config.datasource_id && 
      dataSources.length > 0 && 
      !loadingDataRef.current &&
      lastLoadedDatasetRef.current !== config.datasource_id;

    if (shouldLoad) {
      loadDatasetData(config.datasource_id);
    } else if (!config.datasource_id) {
      setAvailableFields([]);
      setDatasetData([]);
      lastLoadedDatasetRef.current = null;
    }
  }, [config.datasource_id, dataSources.length]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (chartId) {
        return base44.entities.ChartConfig.update(chartId, data);
      } else {
        return base44.entities.ChartConfig.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charts'] });
      toast.success('✅ Gráfico salvo com sucesso!');
    },
  });

  const handleSave = async () => {
    if (!config.datasource_id) {
      toast.error('⚠️ Selecione um dataset antes de salvar');
      return;
    }

    await saveMutation.mutateAsync({
      name: config.name,
      type: 'bar',
      datasource_id: config.datasource_id,
      config: config,
    });
  };

  const handleFieldDrop = (zone, field) => {
    if (zone === 'xAxis') {
      setConfig(prev => ({ ...prev, xAxis: field }));
    } else if (zone === 'values') {
      setConfig(prev => ({
        ...prev,
        values: [...prev.values, { ...field, aggregation: 'sum', displayType: 'bar' }]
      }));
    }
  };

  const handleRemoveField = (zone, index) => {
    if (zone === 'xAxis') {
      setConfig(prev => ({ ...prev, xAxis: null }));
    } else if (zone === 'values') {
      setConfig(prev => ({
        ...prev,
        values: prev.values.filter((_, i) => i !== index)
      }));
    }
  };

  const handleAggregationChange = (index, aggregation) => {
    setConfig(prev => ({
      ...prev,
      values: prev.values.map((f, i) => 
        i === index ? { ...f, aggregation } : f
      )
    }));
  };

  const handleDisplayTypeChange = (index, displayType) => {
    setConfig(prev => ({
      ...prev,
      values: prev.values.map((f, i) => 
        i === index ? { ...f, displayType } : f
      ),
      showLines: prev.values.some((f, i) => 
        i === index ? displayType === 'line' : f.displayType === 'line'
      )
    }));
  };

  const handleColorChange = (index, color) => {
    setConfig(prev => ({
      ...prev,
      values: prev.values.map((f, i) => 
        i === index ? { ...f, color } : f
      )
    }));
  };

  const getFieldValue = (record, fieldName) => {
    if (!record || !fieldName) return null;
    if (record[fieldName] !== undefined) return record[fieldName];
    const fieldNameLower = fieldName.toLowerCase();
    const matchingKey = Object.keys(record).find(key => key.toLowerCase() === fieldNameLower);
    return matchingKey ? record[matchingKey] : null;
  };

  const applyFilters = (data, filters) => {
    if (!filters || filters.length === 0) return data;
    
    const activeFilters = filters.filter(f => f.enabled !== false && f.isPlayground !== true);
    if (activeFilters.length === 0) return data;

    return data.filter(record => {
      return activeFilters.every(filter => {
        const fieldValue = getFieldValue(record, filter.field);
        
        if (filter.operator === 'isEmpty') {
          return fieldValue == null || String(fieldValue).trim() === '';
        }
        if (filter.operator === 'isNotEmpty') {
          return fieldValue != null && String(fieldValue).trim() !== '';
        }
        
        if (fieldValue == null) {
          return false;
        }

        if (filter.type === 'string') {
          const strValue = String(fieldValue).toLowerCase();
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
              yesterday.setDate(today.getDate() - 1);
              const recordDate = new Date(dateValue);
              recordDate.setHours(0, 0, 0, 0);
              return recordDate.getTime() === yesterday.getTime();
            }
            case 'thisWeek': {
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay());
              startOfWeek.setHours(0,0,0,0);
              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 6);
              endOfWeek.setHours(23, 59, 59, 999);
              return dateValue >= startOfWeek && dateValue <= endOfWeek;
            }
            case 'thisMonth': return dateValue.getMonth() === today.getMonth() && dateValue.getFullYear() === today.getFullYear();
            case 'thisYear': return dateValue.getFullYear() === today.getFullYear();
            case 'lastNDays': {
              const n = parseInt(filter.value) || 0;
              const startDate = new Date(today);
              startDate.setDate(today.getDate() - n);
              startDate.setHours(0,0,0,0);
              const endDate = new Date(today); 
              endDate.setHours(23,59,59,999);
              return dateValue >= startDate && dateValue <= endDate;
            }
          }

          const filterDate = new Date(filter.value);
          const filterDate2 = new Date(filter.value2);
          if (isNaN(filterDate.getTime()) && !['today', 'yesterday', 'thisWeek', 'thisMonth', 'thisYear', 'lastNDays'].includes(filter.operator)) return true;

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

  const filteredDatasetData = applyFilters(datasetData, config.filters);

  const handleReset = () => {
    setConfig({
      name: 'Novo Gráfico de Barras',
      datasource_id: '',
      xAxis: null,
      values: [],
      orientation: 'vertical',
      stacked: false,
      showLegend: true,
      showDataLabels: true,
      showGridLines: true,
      showLines: false,
      sortBy: null,
      sortDirection: 'asc',
      maxBarSize: 80,
      xAxisAngle: -45,
      filters: [],
    });
    setAvailableFields([]);
    setDatasetData([]);
    lastLoadedDatasetRef.current = null;
  };

  const handleReloadData = () => {
    lastLoadedDatasetRef.current = null;
    loadDatasetData(config.datasource_id);
  };

  if (loadingChart) {
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
              placeholder="Nome do Gráfico"
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
                Salvar Gráfico
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <FieldsPanel
          fields={availableFields}
          onDragStart={setDraggedField}
          onDragEnd={() => setDraggedField(null)}
          isExpanded={fieldsPanelExpanded}
          onToggle={() => setFieldsPanelExpanded(!fieldsPanelExpanded)}
        />

        <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900/50">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm h-full">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Database className="w-5 h-5" />
                Preview do Gráfico
              </h3>
              {config.datasource_id ? (
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                  {loadingData ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Carregando dados reais do PostgreSQL...
                    </>
                  ) : filteredDatasetData.length > 0 ? (
                    <>
                      ✅ {filteredDatasetData.length} registros
                      {config.filters?.filter(f => f.enabled && !f.isPlayground).length > 0 && 
                        ` (${config.filters.filter(f => f.enabled && !f.isPlayground).length} filtro${config.filters.filter(f => f.enabled && !f.isPlayground).length > 1 ? 's' : ''} aplicado${config.filters.filter(f => f.enabled && !f.isPlayground).length > 1 ? 's' : ''})`
                      }
                      {config.xAxis && config.values.length > 0 && 
                        ` • ${config.xAxis.name} por ${config.values.map(v => v.name).join(', ')}`
                      }
                    </>
                  ) : (
                    <>⚠️ Nenhum dado disponível</>
                  )}
                </p>
              ) : (
                <p className="text-sm text-amber-600 mt-1">
                  ⚠️ Selecione um dataset para visualizar
                </p>
              )}
            </div>
            
            <div className="p-6" style={{ height: 'calc(100% - 100px)' }}>
              {!config.datasource_id ? (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Selecione um <strong>Dataset</strong> na lateral direita para começar.
                  </AlertDescription>
                </Alert>
              ) : loadingData ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Carregando dados reais...
                  </p>
                </div>
              ) : filteredDatasetData.length === 0 ? (
                <Alert className="bg-amber-50 dark:bg-amber-900/10 border-amber-500">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    {datasetData.length === 0 
                      ? 'O dataset não possui dados.'
                      : 'Nenhum registro encontrado com os filtros aplicados.'}
                  </AlertDescription>
                </Alert>
              ) : (
                <BarChartRenderer data={filteredDatasetData} config={config} />
              )}
            </div>
          </div>
        </div>

        <GlobalSidebar
          config={config}
          onSave={handleSave}
          onReset={handleReset}
          chartType="bar"
        >
          {{
            dataSource: (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Dataset *</Label>
                  <Select 
                    value={config.datasource_id} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, datasource_id: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione um dataset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingDataSources ? (
                        <div className="p-2 text-xs text-slate-500 text-center">
                          <Loader2 className="w-3 h-3 animate-spin mx-auto mb-1" />
                          Carregando...
                        </div>
                      ) : dataSources.length === 0 ? (
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
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedField) handleFieldDrop('xAxis', draggedField);
                  }}
                >
                  <BarFieldZone
                    title="Eixo X (Categorias)"
                    zone="xAxis"
                    fields={config.xAxis ? [config.xAxis] : []}
                    onRemove={() => handleRemoveField('xAxis', 0)}
                    allowMultiple={false}
                  />
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedField) handleFieldDrop('values', draggedField);
                  }}
                >
                  <BarFieldZone
                    title="Eixo Y (Valores)"
                    zone="values"
                    fields={config.values}
                    onRemove={(idx) => handleRemoveField('values', idx)}
                    onAggregationChange={handleAggregationChange}
                    onDisplayTypeChange={handleDisplayTypeChange}
                    onColorChange={handleColorChange}
                    allowAggregation
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Visualização
                    </Label>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Mostrar Totalizadores</Label>
                      <Switch
                        checked={config.showDataLabels}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showDataLabels: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Linhas de Grade</Label>
                      <Switch
                        checked={config.showGridLines}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showGridLines: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Mostrar Legenda</Label>
                      <Switch
                        checked={config.showLegend}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showLegend: checked }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Layout
                    </Label>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Orientação</Label>
                      <Select
                        value={config.orientation}
                        onValueChange={(value) => setConfig(prev => ({ ...prev, orientation: value }))}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vertical">Vertical</SelectItem>
                          <SelectItem value="horizontal">Horizontal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Barras Empilhadas</Label>
                      <Switch
                        checked={config.stacked}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, stacked: checked }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Largura Máx. das Barras</Label>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {config.maxBarSize}px
                        </span>
                      </div>
                      <Slider
                        value={[config.maxBarSize]}
                        onValueChange={([value]) => setConfig(prev => ({ ...prev, maxBarSize: value }))}
                        min={20}
                        max={150}
                        step={10}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Ângulo dos Labels</Label>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {config.xAxisAngle}°
                        </span>
                      </div>
                      <Slider
                        value={[config.xAxisAngle]}
                        onValueChange={([value]) => setConfig(prev => ({ ...prev, xAxisAngle: value }))}
                        min={-90}
                        max={0}
                        step={15}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Ordenação
                    </Label>

                    <div>
                      <Label className="text-xs">Ordenar Por</Label>
                      <Select
                        value={config.sortBy || 'none'}
                        onValueChange={(value) => setConfig(prev => ({ 
                          ...prev, 
                          sortBy: value === 'none' ? null : value 
                        }))}
                      >
                        <SelectTrigger className="mt-1 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem Ordenação</SelectItem>
                          {config.xAxis && (
                            <SelectItem value="name">
                              {config.xAxis.name} (Categorias)
                            </SelectItem>
                          )}
                          {config.values.map(v => (
                            <SelectItem key={v.name} value={v.name}>
                              {v.name} (Valores)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {config.sortBy && config.sortBy !== 'none' && (
                      <div>
                        <Label className="text-xs">Direção</Label>
                        <Select
                          value={config.sortDirection}
                          onValueChange={(value) => setConfig(prev => ({ ...prev, sortDirection: value }))}
                        >
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">Crescente ↑</SelectItem>
                            <SelectItem value="desc">Decrescente ↓</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ),
            filters: (
              <PivotFilters
                availableFields={availableFields}
                filters={config.filters}
                onFiltersChange={(filters) => setConfig(prev => ({ ...prev, filters }))}
              />
            ),
          }}
        </GlobalSidebar>
      </div>
    </div>
  );
}