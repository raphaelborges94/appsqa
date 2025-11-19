import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Eye,
  LayoutDashboard,
  Search,
  Loader2,
  Grid3x3
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DashViewer() {
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ CORREÇÃO: Normalizar resposta da API que retorna { items, total }
  const { data: dashboards = [], isLoading, error } = useQuery({
    queryKey: ['viewer-dashboards'],
    queryFn: () => base44.entities.Dashboard.list({ order: '-updated_date' }),
    select: (raw) => {
      // Normaliza para array
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.items)) return raw.items;
      if (Array.isArray(raw.data)) return raw.data;
      return [];
    },
  });

  const filteredDashboards = dashboards.filter(dashboard =>
    dashboard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dashboard.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto mt-8">
          <h2 className="text-red-800 font-bold mb-2">Erro ao carregar dashboards</h2>
          <p className="text-red-600 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Simples */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Dashboards
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {dashboards.length} dashboard{dashboards.length !== 1 ? 's' : ''} disponíve{dashboards.length !== 1 ? 'is' : 'l'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        {/* Dashboards List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDashboards.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              {searchTerm ? (
                <Search className="w-8 h-8 text-slate-400" />
              ) : (
                <LayoutDashboard className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {searchTerm 
                ? 'Nenhum dashboard encontrado'
                : 'Nenhum dashboard disponível'
              }
            </p>
            {!searchTerm && (
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="outline" size="sm">
                  Criar primeiro dashboard
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDashboards.map((dashboard) => {
              const totalCharts = dashboard.tabs?.reduce((sum, tab) => sum + (tab.layout?.length || 0), 0) || 0;
              
              return (
                <Card 
                  key={dashboard.id}
                  className="group hover:shadow-md transition-all hover:border-green-200 dark:hover:border-green-800"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                            {dashboard.name}
                          </h3>
                          {totalCharts > 0 && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                              <Grid3x3 className="w-3 h-3" />
                              <span>{totalCharts}</span>
                            </div>
                          )}
                        </div>
                        {dashboard.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {dashboard.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {format(new Date(dashboard.updated_date), "dd/MM/yy", { locale: ptBR })}
                        </span>
                        <Link to={createPageUrl("ViewOnlyDashboard") + `?id=${dashboard.id}`}>
                          <Button 
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}