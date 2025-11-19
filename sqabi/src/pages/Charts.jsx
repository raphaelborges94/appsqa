import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Plus, 
  Grid3x3, 
  Activity, 
  BarChart3, 
  Trash2, 
  Copy,
  MoreVertical,
  ExternalLink
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const chartIcons = {
  pivot: Grid3x3,
  kpi: Activity,
  bar: BarChart3,
  column: BarChart3,
};

const chartLabels = {
  pivot: "Matriz/Pivot",
  kpi: "KPI Card",
  bar: "Gráfico de Barras",
  column: "Gráfico de Colunas",
};

export default function Charts() {
  const [open, setOpen] = useState(false);
  const [chartType, setChartType] = useState('pivot');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ✅ CORREÇÃO: Normalizar resposta da API que retorna { items, total }
  const { data: charts = [], isLoading } = useQuery({
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

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const chart = await base44.entities.ChartConfig.create(data);
      return chart;
    },
    onSuccess: (chart) => {
      queryClient.invalidateQueries({ queryKey: ['charts'] });
      setOpen(false);
      
      const pageMap = {
        pivot: 'PivotMatrix',
        kpi: 'KPICards',
        bar: 'BarChart',
        column: 'BarChart'
      };
      
      navigate(createPageUrl(pageMap[chart.type]) + `?id=${chart.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ChartConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charts'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (chart) => {
      const newChart = {
        ...chart,
        name: `${chart.name} (cópia)`,
      };
      delete newChart.id;
      delete newChart.created_date;
      delete newChart.updated_date;
      return base44.entities.ChartConfig.create(newChart);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charts'] });
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createMutation.mutate({
      name: formData.get('name'),
      description: formData.get('description'),
      type: chartType,
      datasource_id: 'mock',
      config: {
        name: formData.get('name'),
        description: formData.get('description'),
      },
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>

        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Chart
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Chart</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Chart</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Vendas por Região" 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  placeholder="Análise de vendas por região..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="type">Tipo de Chart</Label>
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pivot">
                      <div className="flex items-center gap-2">
                        <Grid3x3 className="w-4 h-4" />
                        Matriz/Pivot
                      </div>
                    </SelectItem>
                    <SelectItem value="kpi">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        KPI Card
                      </div>
                    </SelectItem>
                    <SelectItem value="bar">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Gráfico de Barras
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Chart'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
            Meus Charts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : charts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Grid3x3 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Nenhum chart ainda
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Comece criando sua primeira visualização
              </p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Chart
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {charts.map((chart) => {
                const Icon = chartIcons[chart.type] || Grid3x3;
                return (
                  <div 
                    key={chart.id} 
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                            {chart.name}
                          </h3>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {chartLabels[chart.type]}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Atualizado {format(new Date(chart.updated_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link to={createPageUrl(
                          chart.type === 'pivot' ? 'PivotMatrix' :
                          chart.type === 'kpi' ? 'KPICards' : 'BarChart'
                        ) + `?id=${chart.id}`}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Abrir
                          </Button>
                        </Link>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => duplicateMutation.mutate(chart)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteMutation.mutate(chart.id)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}