import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, Maximize2, Minimize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DashboardGrid from "../components/dashboard/DashboardGrid";
import DashboardPlaygroundFilters from "../components/dashboard/DashboardPlaygroundFilters";

export default function ViewOnlyDashboard() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const dashboardId = urlParams.get('id');
  const [activeTab, setActiveTab] = useState('');
  const [playgroundFilters, setPlaygroundFilters] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['viewer-dashboard', dashboardId],
    queryFn: () => base44.entities.Dashboard.get(dashboardId),
    enabled: !!dashboardId,
  });

  // ✅ CORREÇÃO: Normalizar resposta da API que retorna { items, total }
  const { data: charts = [] } = useQuery({
    queryKey: ['viewer-charts'],
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
    if (dashboard?.tabs?.length > 0 && !activeTab) {
      setActiveTab(dashboard.tabs[0].id);
    }
  }, [dashboard, activeTab]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-red-800 font-bold mb-2">Erro ao carregar dashboard</h2>
              <p className="text-red-600 text-sm mb-4">
                {error?.message || 'Dashboard não encontrado'}
              </p>
              <Button onClick={() => navigate(createPageUrl("DashViewer"))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para DashViewer
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeTabData = dashboard.tabs?.find(tab => tab.id === activeTab);
  const activeTabCharts = charts.filter(chart => 
    activeTabData?.layout?.some(item => item.chart_id === chart.id)
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header - esconder em fullscreen */}
      {!isFullscreen && (
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate(createPageUrl("DashViewer"))}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {dashboard.name}
                  </h1>
                  {dashboard.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {dashboard.description}
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                Tela Cheia
              </Button>
            </div>

            {dashboard.tabs && dashboard.tabs.length > 1 && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  {dashboard.tabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id}>
                      {tab.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
          </div>
        </div>
      )}

      {/* Botão de sair do fullscreen (só aparece em fullscreen) */}
      {isFullscreen && (
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="bg-white/90 backdrop-blur-sm"
          >
            <Minimize2 className="w-4 h-4 mr-2" />
            Sair da Tela Cheia
          </Button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
          {activeTabData && activeTabData.layout?.length > 0 ? (
            <DashboardGrid
              items={activeTabData.layout}
              onUpdateItems={() => {}} // Read-only, nenhuma atualização permitida
              isEditMode={false}
              playgroundFilters={playgroundFilters}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-500 dark:text-slate-400">
                <p className="text-lg font-semibold mb-2">Nenhum chart nesta aba</p>
                <p className="text-sm">Esta aba ainda não possui visualizações</p>
              </div>
            </div>
          )}
        </div>

        {/* Filtros Playground */}
        {activeTabCharts.length > 0 && (
          <DashboardPlaygroundFilters
            charts={activeTabCharts}
            onFiltersChange={setPlaygroundFilters}
          />
        )}
      </div>
    </div>
  );
}