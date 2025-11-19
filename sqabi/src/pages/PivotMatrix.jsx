import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, ArrowLeft, Loader2, Database, RefreshCw, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import GlobalSidebar from "../components/bi/GlobalSidebar";
import FieldsPanel from "../components/bi/pivot/FieldsPanel";
import PivotFieldZone from "../components/bi/pivot/PivotFieldZone";
import PivotTable from "../components/bi/pivot/PivotTable";
import PivotFilters from "../components/bi/pivot/PivotFilters";
import PivotSorting from "../components/bi/pivot/PivotSorting";
import PivotFormatting from "../components/bi/pivot/PivotFormatting";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PivotMatrix() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const chartId = urlParams.get('id');

  const [config, setConfig] = useState({
    name: 'Nova Matriz Pivot',
    datasource_id: '',
    rows: [],
    columns: [],
    values: [],
    filters: [],
    sortRules: [],
    formatRules: [],
    field_aliases: {},
  });

  const [draggedField, setDraggedField] = useState(null);
  const [fieldsPanelExpanded, setFieldsPanelExpanded] = useState(true);
  const [availableFields, setAvailableFields] = useState([]);
  const [datasetData, setDatasetData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // ✅ REF para evitar loops infinitos
  const loadingDataRef = useRef(false);
  const lastLoadedDatasetRef = useRef(null);

  // ✅ CORREÇÃO: Normalizar dataSources para sempre ser array
  // ✅ CORREÇÃO: Normalizar dataSources para sempre ser array
  const { data: dataSources = [], isLoading: loadingDataSources } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () => base44.entities.DataSource.list(),
    select: (raw) => {
      // Normaliza para array
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

  // ✅ CORREÇÃO: useEffect com controle de execução para evitar loops
  useEffect(() => {
    // Não tentar carregar se ainda estiver carregando os datasets
    if (loadingDataSources) {
      return;
    }

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
  }, [config.datasource_id, dataSources.length, loadingDataSources]); // ✅ Dependências mínimas

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
      setConfig(prev => ({
        ...prev,
        field_aliases: fieldAliases
      }));

      toast.info('🔍 Carregando TODOS os dados do PostgreSQL...', { duration: 2000 });

      // ✅ CORREÇÃO: Enviar connection_id, source_type e table_name/sql_query para a API
      const response = await base44.functions.invoke('fetchDatasetData', {
        connection_id: selectedDataset.connection_id,
        source_type: selectedDataset.source_type,
        table_name: selectedDataset.table_name || null,
        sql_query: selectedDataset.sql_query || null,
        limit: 10000, // Limite de registros
      });

      const result = response.data;

      if (result.success) {
        // ✅ CORREÇÃO: A API retorna `rows` e não `data`
        const rows = result.rows || result.data || [];
        setDatasetData(rows);

        const calculatedCount = result.calculatedFieldsProcessed || 0;
        const message = calculatedCount > 0
          ? `✅ ${rows.length.toLocaleString('pt-BR')} registros carregados (${calculatedCount} campos calculados)!`
          : `✅ ${rows.length.toLocaleString('pt-BR')} registros carregados!`;

        toast.success(message);
      } else {
        throw new Error(result.message || result.error || 'Erro ao carregar dados');
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);

      // ✅ Melhor tratamento de erros da API
      let errorMessage = error.message;
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Requisição inválida. Verifique se o dataset e a conexão estão configurados corretamente.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Endpoint não encontrado no servidor.';
      }

      // Log detalhado para debug
      console.error('Detalhes do erro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      toast.error('❌ Erro ao carregar dados: ' + errorMessage);
      setAvailableFields([]);
      setDatasetData([]);
      lastLoadedDatasetRef.current = null;
    } finally {
      setLoadingData(false);
      loadingDataRef.current = false;
    }
  };

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
      toast.success('✅ Matriz Pivot salva com sucesso!');
    },
  });

  const handleSave = async () => {
    if (!config.datasource_id) {
      toast.error('⚠️ Selecione um dataset antes de salvar');
      return;
    }

    await saveMutation.mutateAsync({
      name: config.name,
      type: 'pivot',
      datasource_id: config.datasource_id,
      config: config,
    });
  };

  const handleFieldDrop = (zone, field) => {
    if (zone === 'rows') {
      setConfig(prev => ({
        ...prev,
        rows: [...prev.rows, { ...field, hierarchical: false }]
      }));
    } else if (zone === 'columns') {
      setConfig(prev => ({
        ...prev,
        columns: [...prev.columns, field]
      }));
    } else if (zone === 'values') {
      setConfig(prev => ({
        ...prev,
        values: [...prev.values, { 
          ...field, 
          aggregation: 'sum',
          showPercentColumn: false,
          showComparison: false,
          decimals: 0,
        }]
      }));
    }
  };

  const handleRemoveField = (zone, index) => {
    setConfig(prev => ({
      ...prev,
      [zone]: prev[zone].filter((_, i) => i !== index)
    }));
  };

  const handleFieldUpdate = (zone, index, updates) => {
    setConfig(prev => ({
      ...prev,
      [zone]: prev[zone].map((field, i) =>
        i === index ? { ...field, ...updates } : field
      )
    }));
  };

  const handleReset = () => {
    setConfig({
      name: 'Nova Matriz Pivot',
      datasource_id: '',
      rows: [],
      columns: [],
      values: [],
      filters: [],
      sortRules: [],
      formatRules: [],
      field_aliases: {},
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
              placeholder="Nome da Matriz"
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
                Salvar Matriz
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
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Database className="w-5 h-5" />
                Preview da Matriz Pivot
              </h3>
              {config.datasource_id ? (
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                  {loadingData ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Carregando dados reais do PostgreSQL...
                    </>
                  ) : datasetData.length > 0 ? (
                    <>✅ {datasetData.length.toLocaleString('pt-BR')} registros carregados</>
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
            
            <div className="p-6">
              {!config.datasource_id ? (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Selecione um <strong>Dataset</strong> na lateral direita para começar a construir sua matriz pivot.
                  </AlertDescription>
                </Alert>
              ) : loadingData ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Conectando ao PostgreSQL e carregando dados reais...
                  </p>
                </div>
              ) : datasetData.length === 0 ? (
                <Alert className="bg-amber-50 dark:bg-amber-900/10 border-amber-500">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    O dataset selecionado não possui dados. Verifique a query SQL ou tabela.
                  </AlertDescription>
                </Alert>
              ) : (
                <PivotTable data={datasetData} config={config} />
              )}
            </div>
          </div>
        </div>

        <GlobalSidebar
          config={config}
          onSave={handleSave}
          onReset={handleReset}
          chartType="pivot"
        >
          {{
            dataSource: (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Dataset *</Label>
                  <Select
                    value={config.datasource_id ? String(config.datasource_id) : ''}
                    onValueChange={(value) => {
                      console.log('Dataset selecionado:', value);
                      setConfig(prev => ({ ...prev, datasource_id: value }));
                    }}
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
                          <SelectItem key={ds.id} value={String(ds.id)}>
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
                    if (draggedField) handleFieldDrop('rows', draggedField);
                  }}
                >
                  <PivotFieldZone
                    title="Linhas"
                    zone="rows"
                    fields={config.rows}
                    onRemove={(idx) => handleRemoveField('rows', idx)}
                    onFieldUpdate={(idx, updates) => handleFieldUpdate('rows', idx, updates)}
                  />
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedField) handleFieldDrop('columns', draggedField);
                  }}
                >
                  <PivotFieldZone
                    title="Colunas"
                    zone="columns"
                    fields={config.columns}
                    onRemove={(idx) => handleRemoveField('columns', idx)}
                    onFieldUpdate={(idx, updates) => handleFieldUpdate('columns', idx, updates)}
                  />
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedField) handleFieldDrop('values', draggedField);
                  }}
                >
                  <PivotFieldZone
                    title="Valores"
                    zone="values"
                    fields={config.values}
                    onRemove={(idx) => handleRemoveField('values', idx)}
                    onFieldUpdate={(idx, updates) => handleFieldUpdate('values', idx, updates)}
                  />
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
            sorting: (
              <PivotSorting
                availableFields={availableFields}
                rowFields={config.rows}
                columnFields={config.columns}
                valueFields={config.values}
                sortRules={config.sortRules}
                onSortRulesChange={(sortRules) => setConfig(prev => ({ ...prev, sortRules }))}
              />
            ),
            formatting: (
              <PivotFormatting
                rowFields={config.rows}
                columnFields={config.columns}
                valueFields={config.values}
                formatRules={config.formatRules}
                onFormatRulesChange={(formatRules) => setConfig(prev => ({ ...prev, formatRules }))}
              />
            ),
          }}
        </GlobalSidebar>
      </div>
    </div>
  );
}