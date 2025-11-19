import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Plus, 
  Eye, 
  Edit3,
  X,
  GripVertical
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import DashboardGrid from "../components/dashboard/DashboardGrid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function EditDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const dashboardId = urlParams.get('id');

  useEffect(() => {
    console.log('🔍 [EditDashboard] ID do dashboard:', dashboardId);
  }, [dashboardId]);

  const [isEditMode, setIsEditMode] = useState(true);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [tabs, setTabs] = useState([
    { id: 'tab-1', name: 'Página 1', layout: [] }
  ]);
  const [newTabName, setNewTabName] = useState('');
  const [showAddTab, setShowAddTab] = useState(false);
  const [showChartPicker, setShowChartPicker] = useState(false);

  const { data: dashboard, isLoading: loadingDashboard, error: dashboardError } = useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => base44.entities.Dashboard.get(dashboardId),
    enabled: !!dashboardId,
  });

  // ✅ CORREÇÃO: Normalizar resposta da API que retorna { items, total }
  const { data: charts = [], error: chartsError } = useQuery({
    queryKey: ['charts'],
    queryFn: () => base44.entities.ChartConfig.list({ order: '-updated_date' }),
    select: (raw) => {
      // Normaliza para array
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.items)) return raw.items;
      if (Array.isArray(raw.data)) return raw.data;
      return [];
    },
  });

  useEffect(() => {
    console.log('🔍 [EditDashboard] Estado atual:', {
      loadingDashboard,
      dashboardError: dashboardError?.message,
      dashboard: dashboard ? { id: dashboard.id, name: dashboard.name, tabs: dashboard.tabs?.length } : null,
      chartsCount: charts?.length,
      chartsError: chartsError?.message,
    });
  }, [loadingDashboard, dashboardError, dashboard, charts, chartsError]);

  useEffect(() => {
    if (dashboard?.tabs && dashboard.tabs.length > 0) {
      console.log('📋 [EditDashboard] Carregando tabs do dashboard:', dashboard.tabs);
      setTabs(dashboard.tabs);
      setActiveTabId(dashboard.tabs[0].id);
    }
  }, [dashboard]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      console.log('💾 [EditDashboard] Salvando dashboard:', data);
      return base44.entities.Dashboard.update(dashboardId, data);
    },
    onSuccess: () => {
      console.log('✅ [EditDashboard] Dashboard salvo com sucesso');
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] });
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Dashboard salvo com sucesso!');
    },
    onError: (error) => {
      console.error('❌ [EditDashboard] Erro ao salvar:', error);
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  const handleSave = async () => {
    console.log('💾 [EditDashboard] Iniciando salvamento com tabs:', tabs);
    await saveMutation.mutateAsync({
      tabs: tabs,
    });
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  const updateActiveTabLayout = (newLayout) => {
    console.log('🔄 [EditDashboard] Atualizando layout da tab:', activeTabId, newLayout);
    setTabs(tabs.map(tab =>
      tab.id === activeTabId ? { ...tab, layout: newLayout } : tab
    ));
  };

  const addTab = () => {
    const newId = `tab-${Date.now()}`;
    console.log('➕ [EditDashboard] Adicionando nova tab:', newId);
    setTabs([...tabs, {
      id: newId,
      name: newTabName || `Página ${tabs.length + 1}`,
      layout: []
    }]);
    setActiveTabId(newId);
    setNewTabName('');
    setShowAddTab(false);
  };

  const removeTab = (tabId) => {
    if (tabs.length === 1) {
      toast.error('Não é possível remover a última aba');
      return;
    }
    console.log('🗑️ [EditDashboard] Removendo tab:', tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const renameTab = (tabId, newName) => {
    console.log('✏️ [EditDashboard] Renomeando tab:', tabId, newName);
    setTabs(tabs.map(tab =>
      tab.id === tabId ? { ...tab, name: newName } : tab
    ));
  };

  const addChartToLayout = (chartId) => {
    console.log('➕ [EditDashboard] Adicionando chart ao layout:', chartId);
    const newItem = {
      id: `item-${Date.now()}`,
      chart_id: chartId,
      x: 0,
      y: 0,
      w: 15,
      h: 12,
    };
    updateActiveTabLayout([...(activeTab?.layout || []), newItem]);
    setShowChartPicker(false);
  };

  if (loadingDashboard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            ❌ Erro ao carregar dashboard
          </h2>
          <p className="text-slate-600 mb-4">{dashboardError.message}</p>
          <Button onClick={() => navigate(createPageUrl("Dashboard"))}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Dashboard não encontrado
          </h2>
          <Button onClick={() => navigate(createPageUrl("Dashboard"))}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-73px)]">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("Dashboard"))}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {dashboard.name}
              </h1>
              {dashboard.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {dashboard.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isEditMode ? "outline" : "default"}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Editar
                </>
              )}
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveMutation.isPending}
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
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {isEditMode && (
          <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto p-4 flex-shrink-0">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
              Charts Disponíveis
            </h3>
            <div className="space-y-2">
              {charts.map((chart) => (
                <Card
                  key={chart.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-slate-200 dark:border-slate-700"
                  onClick={() => addChartToLayout(chart.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-900 dark:text-white">
                          {chart.name}
                        </p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {chart.type}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {charts.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                  Nenhum chart disponível. Crie charts primeiro.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-2 flex-shrink-0">
            <Tabs value={activeTabId} onValueChange={setActiveTabId}>
              <TabsList className="h-auto p-0 bg-transparent">
                {tabs.map((tab) => (
                  <div key={tab.id} className="relative group">
                    <TabsTrigger 
                      value={tab.id}
                      className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-slate-800 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 pr-8"
                    >
                      <span 
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => renameTab(tab.id, e.currentTarget.textContent)}
                        className="outline-none text-sm font-medium px-1 min-w-[60px] inline-block"
                      >
                        {tab.name}
                      </span>
                      {tabs.length > 1 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTab(tab.id);
                          }}
                          className="absolute right-2 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/20 rounded p-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </span>
                      )}
                    </TabsTrigger>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddTab(true)}
                  className="ml-2"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-slate-50 dark:bg-slate-900/50">
            <DashboardGrid
              items={activeTab?.layout || []}
              onUpdateItems={updateActiveTabLayout}
              isEditMode={isEditMode}
            />
          </div>
        </div>
      </div>

      <Dialog open={showAddTab} onOpenChange={setShowAddTab}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Aba</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tabName">Nome da Aba</Label>
              <Input
                id="tabName"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder={`Página ${tabs.length + 1}`}
              />
            </div>
            <Button onClick={addTab} className="w-full">
              Criar Aba
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}