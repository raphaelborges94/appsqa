import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Edit, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DashboardGrid from "../components/dashboard/DashboardGrid";
import DashboardPlaygroundFilters from "../components/dashboard/DashboardPlaygroundFilters";

export default function ViewDashboard() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const dashboardId = urlParams.get('id');

  const [activeTabId, setActiveTabId] = useState('');
  const [playgroundFilters, setPlaygroundFilters] = useState({});

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
    if (dashboard?.tabs && dashboard.tabs.length > 0 && !activeTabId) {
      setActiveTabId(dashboard.tabs[0].id);
    }
  }, [dashboard, activeTabId]);

  // ✅ LOG: Monitorar mudanças nos filtros playground
  useEffect(() => {
    console.log('🎛️ [ViewDashboard] playgroundFilters ATUALIZADOS:', {
      chartsWithFilters: Object.keys(playgroundFilters).length,
      filters: playgroundFilters
    });
  }, [playgroundFilters]);

  // ✅ LOG: Callback de atualização de filtros
  const handleFiltersChange = (newFilters) => {
    console.log('🎛️ [ViewDashboard] handleFiltersChange CHAMADO:', {
      oldFilters: playgroundFilters,
      newFilters,
    });
    setPlaygroundFilters(newFilters);
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

  const activeTab = dashboard.tabs?.find(t => t.id === activeTabId);
  
  // Buscar todos os charts do dashboard (para coletar filtros playground)
  const allDashboardCharts = dashboard.tabs?.flatMap(tab => 
    tab.layout?.map(item => charts.find(c => c.id === item.chart_id)).filter(Boolean) || []
  ) || [];

  return (
    <div className="flex flex-col h-[calc(100vh-73px)]">
      {/* Header */}
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
          <Button 
            onClick={() => navigate(createPageUrl("EditDashboard") + `?id=${dashboardId}`)}
            variant="outline"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>

        {/* Tabs */}
        {dashboard.tabs && dashboard.tabs.length > 1 && (
          <div className="mt-4">
            <Tabs value={activeTabId} onValueChange={setActiveTabId}>
              <TabsList className="h-auto p-0 bg-transparent">
                {dashboard.tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-slate-800 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
                  >
                    {tab.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900/50">
          {activeTab?.layout && activeTab.layout.length > 0 ? (
            <DashboardGrid
              items={activeTab.layout}
              onUpdateItems={() => {}}
              isEditMode={false}
              playgroundFilters={playgroundFilters}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Nenhum chart nesta aba
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  Adicione charts ao dashboard para visualizar seus dados
                </p>
                <Button onClick={() => navigate(createPageUrl("EditDashboard") + `?id=${dashboardId}`)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Playground Filters Sidebar - Só mostra se houver filtros playground */}
        {allDashboardCharts.length > 0 && (
          <DashboardPlaygroundFilters
            charts={allDashboardCharts}
            onFiltersChange={handleFiltersChange}
          />
        )}
      </div>
    </div>
  );
}