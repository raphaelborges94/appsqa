import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, Type, Zap, Layers } from "lucide-react";
import { format } from "date-fns";

export default function ScreenTable({ 
  screens, 
  isLoading,
  selectedScreens = [],
  onSelectionChange,
  getFieldCount,
  getButtonCount
}) {
  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(screens.map(s => s.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectScreen = (screenId, checked) => {
    if (checked) {
      onSelectionChange([...selectedScreens, screenId]);
    } else {
      onSelectionChange(selectedScreens.filter(id => id !== screenId));
    }
  };

  const isAllSelected = screens.length > 0 && screens.every(s => selectedScreens.includes(s.id));
  const isSomeSelected = selectedScreens.length > 0 && !isAllSelected;

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <Card className="border-none shadow-lg bg-white flex-1 flex flex-col">
          <CardContent className="p-6 space-y-3 flex-1">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screens.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <Card className="border-none shadow-lg bg-white flex-1 flex flex-col">
          <CardContent className="p-16 text-center flex-1 flex flex-col items-center justify-center">
            <Database className="w-16 h-16 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">Nenhuma tela encontrada</p>
            <p className="text-sm text-slate-400">Use os botões acima para adicionar telas</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Card className="border-none shadow-lg flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                {/* Checkbox */}
                <th className="w-12 p-3 text-left">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todos"
                    className={isSomeSelected ? "data-[state=checked]:bg-blue-600" : ""}
                  />
                </th>

                {/* Nome */}
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-slate-700">
                  Nome da Tela
                </th>

                {/* Tabela */}
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-slate-700">
                  Tabela
                </th>

                {/* Descrição */}
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-slate-700">
                  Descrição
                </th>

                {/* Status */}
                <th className="px-4 py-3 text-center font-semibold text-xs uppercase text-slate-700 w-24">
                  Status
                </th>

                {/* Campos */}
                <th className="px-4 py-3 text-center font-semibold text-xs uppercase text-slate-700 w-24">
                  Campos
                </th>

                {/* Ações */}
                <th className="px-4 py-3 text-center font-semibold text-xs uppercase text-slate-700 w-24">
                  Ações
                </th>

                {/* Tipo */}
                <th className="px-4 py-3 text-center font-semibold text-xs uppercase text-slate-700 w-32">
                  Tipo
                </th>

                {/* Data Criação */}
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-slate-700 w-40">
                  Data Criação
                </th>
              </tr>
            </thead>

            <tbody>
              {screens.map((screen) => {
                const isSelected = selectedScreens.includes(screen.id);
                const fieldCount = getFieldCount(screen.id);
                const buttonCount = getButtonCount(screen.id);
                
                return (
                  <tr 
                    key={screen.id} 
                    className={`border-b border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50' : 'bg-white'
                    }`}
                    onClick={() => handleSelectScreen(screen.id, !isSelected)}
                  >
                    {/* Checkbox */}
                    <td className="p-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          handleSelectScreen(screen.id, checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Selecionar tela"
                      />
                    </td>

                    {/* Nome */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Database className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{screen.nome}</div>
                        </div>
                      </div>
                    </td>

                    {/* Tabela */}
                    <td className="px-4 py-3">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700 font-mono">
                        {screen.tabela_nome}
                      </code>
                    </td>

                    {/* Descrição */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-600 line-clamp-2 max-w-md">
                        {screen.descricao || '-'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      {screen.ativa ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-300 text-slate-600 text-xs">
                          Inativa
                        </Badge>
                      )}
                    </td>

                    {/* Campos */}
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <Type className="w-3 h-3" />
                        <span className="font-medium">{fieldCount}</span>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3 text-center">
                      {buttonCount > 0 ? (
                        <div className="inline-flex items-center gap-1 text-xs text-blue-600">
                          <Zap className="w-3 h-3" />
                          <span className="font-medium">{buttonCount}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3 text-center">
                      {screen.is_subtable ? (
                        <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50 text-xs">
                          <Layers className="w-3 h-3 mr-1" />
                          Subtela
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-300 text-slate-600 text-xs">
                          Principal
                        </Badge>
                      )}
                    </td>

                    {/* Data Criação */}
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {screen.created_at ? format(new Date(screen.created_at), 'dd/MM/yyyy HH:mm') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé com Total */}
        <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-700 font-medium">
              Total: <span className="text-blue-600">{screens.length}</span> {screens.length === 1 ? 'tela' : 'telas'}
            </div>
            
            {selectedScreens.length > 0 && (
              <Badge className="bg-blue-600 text-white">
                {selectedScreens.length} selecionada{selectedScreens.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}