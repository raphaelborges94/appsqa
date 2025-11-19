import React, { useState, useEffect } from "react";
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
  Plus, 
  LayoutDashboard,
  Trash2,
  MoreVertical,
  Edit,
  Eye
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ✅ CORREÇÃO: Normalizar resposta da API que retorna { items, total }
  const { data: dashboards = [], isLoading, error } = useQuery({
    queryKey: ['dashboards'],
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

  // ✅ LOG DE DEPURAÇÃO
  useEffect(() => {
    console.log('🔍 [Dashboard] Estado atual:', {
      isLoading,
      error: error?.message,
      dashboardsCount: dashboards?.length,
      dashboards: dashboards?.map(d => ({ id: d.id, name: d.name }))
    });
  }, [isLoading, error, dashboards]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log('📝 [Dashboard] Criando dashboard:', data);
      const dashboard = await base44.entities.Dashboard.create(data);
      console.log('✅ [Dashboard] Dashboard criado:', dashboard);
      return dashboard;
    },
    onSuccess: (dashboard) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      setOpen(false);
      console.log('🔄 [Dashboard] Navegando para EditDashboard com id:', dashboard.id);
      navigate(createPageUrl("EditDashboard") + `?id=${dashboard.id}`);
    },
    onError: (error) => {
      console.error('❌ [Dashboard] Erro ao criar:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      console.log('🗑️ [Dashboard] Deletando dashboard:', id);
      return base44.entities.Dashboard.delete(id);
    },
    onSuccess: () => {
      console.log('✅ [Dashboard] Dashboard deletado');
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
    onError: (error) => {
      console.error('❌ [Dashboard] Erro ao deletar:', error);
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      tabs: [
        {
          id: 'tab-1',
          name: 'Página 1',
          layout: []
        }
      ],
      is_public: false,
    };
    console.log('📋 [Dashboard] Dados do formulário:', data);
    createMutation.mutate(data);
  };

  // LOG DE ERRO VISUAL
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-bold mb-2">❌ Erro ao carregar dashboards</h2>
          <p className="text-red-600 text-sm">{error.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Recarregar Página
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>

        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Dashboard
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Dashboard</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Dashboard</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Vendas 2024" 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  placeholder="Dashboard de análise de vendas..."
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Dashboard'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
            Meus Dashboards
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
          ) : dashboards.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <LayoutDashboard className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Nenhum dashboard criado
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Crie seu primeiro dashboard para começar a visualizar seus dados
              </p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Dashboard
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {dashboards.map((dashboard) => (
                <div 
                  key={dashboard.id} 
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate mb-1">
                        {dashboard.name}
                      </h3>
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Atualizado {format(new Date(dashboard.updated_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        {dashboard.description && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                              {dashboard.description}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link to={createPageUrl("ViewDashboard") + `?id=${dashboard.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </Button>
                      </Link>
                      
                      <Link to={createPageUrl("EditDashboard") + `?id=${dashboard.id}`}>
                        <Button size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                      </Link>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(dashboard.id)} 
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}