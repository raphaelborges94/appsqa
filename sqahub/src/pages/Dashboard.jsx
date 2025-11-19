import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Database, Shield, Plus, TrendingUp, Eye, AlertCircle, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: screens, isLoading: screensLoading } = useQuery({
    queryKey: ['screens'],
    queryFn: () => base44.entities.ScreenDefinition.list('-created_date'),
    initialData: [],
  });

  const { data: fields, isLoading: fieldsLoading } = useQuery({
    queryKey: ['fields'],
    queryFn: () => base44.entities.FieldDefinition.list(),
    initialData: [],
  });

  const { data: accessControls, isLoading: accessLoading } = useQuery({
    queryKey: ['access'],
    queryFn: () => base44.entities.AccessControl.list(),
    initialData: [],
  });

  const { data: dynamicData, isLoading: dataLoading } = useQuery({
    queryKey: ['all-dynamic-data'],
    queryFn: () => base44.entities.DynamicData.list(),
    initialData: [],
  });

  const activeScreens = screens.filter(s => s.ativa);
  const totalFields = fields.length;
  const screensWithAccess = [...new Set(accessControls.map(a => a.screen_id))].length;
  const totalRecords = dynamicData.length;

  const stats = [
    {
      title: "Telas Criadas",
      value: screens.length,
      icon: LayoutDashboard,
      color: "from-blue-500 to-blue-600",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
      description: `${activeScreens.length} ativas`,
    },
    {
      title: "Total de Campos",
      value: totalFields,
      icon: Database,
      color: "from-emerald-500 to-emerald-600",
      textColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
      description: "Em todas as telas",
    },
    {
      title: "Registros Criados",
      value: totalRecords,
      icon: Database,
      color: "from-purple-500 to-purple-600",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Total de dados",
    },
    {
      title: "Controles de Acesso",
      value: accessControls.length,
      icon: Shield,
      color: "from-orange-500 to-orange-600",
      textColor: "text-orange-600",
      bgColor: "bg-orange-50",
      description: `${screensWithAccess} telas com regras`,
    },
  ];

  const recentScreens = activeScreens.slice(0, 5);

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Dashboard
          </h1>
          <p className="text-slate-600">Visão geral do sistema de construção de telas</p>
        </div>
        <Link to={createPageUrl("screenbuilder")}>
          <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Nova Tela
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {screensLoading || fieldsLoading || accessLoading || dataLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full transform translate-x-16 -translate-y-16`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-sm text-slate-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Telas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {screensLoading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentScreens.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhuma tela criada ainda</p>
              <Link to={createPageUrl("screenbuilder")}>
                <Button variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Tela
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentScreens.map((screen) => (
                <div key={screen.id} className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Database className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {screen.nome}
                        </h3>
                        <p className="text-sm text-slate-500">{screen.tabela_nome}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Ativa
                      </span>
                      <Link to={`${createPageUrl("dynamicscreen")}?screen_id=${screen.id}`}>
                        <Button size="sm" className="bg-gradient-to-r from-blue-600 to-blue-700">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Acessar
                        </Button>
                      </Link>
                    </div>
                  </div>
                  {screen.descricao && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-1">{screen.descricao}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}