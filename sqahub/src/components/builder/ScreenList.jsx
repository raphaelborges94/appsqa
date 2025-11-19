import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ScreenList({ screens, isLoading }) {
  if (isLoading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-200 bg-slate-50 py-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-200 bg-slate-50 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="w-4 h-4 text-slate-700" />
          Telas Criadas ({screens.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {screens.length === 0 ? (
          <div className="text-center py-8">
            <Database className="w-12 h-12 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Nenhuma tela criada</p>
            <p className="text-xs text-slate-400">Preencha o formulário ao lado para começar</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {screens.map((screen) => (
              <Link key={screen.id} to={`${createPageUrl("screenbuilder")}?id=${screen.id}`}>
                <div className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                        <Database className="w-4 h-4 text-slate-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-slate-900 group-hover:text-slate-700 transition-colors">
                          {screen.nome}
                        </h3>
                        <p className="text-xs text-slate-500">{screen.tabela_nome}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {screen.ativa ? (
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded border border-green-200">
                          Ativa
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded border border-slate-200">
                          Inativa
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}