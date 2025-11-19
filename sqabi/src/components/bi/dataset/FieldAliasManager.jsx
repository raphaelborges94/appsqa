import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Type, Hash, Calendar, ToggleLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const fieldTypeIcons = {
  string: Type,
  number: Hash,
  date: Calendar,
  boolean: ToggleLeft,
};

export default function FieldAliasManager({ fields = [], aliases = {}, onAliasesChange }) {
  const [localAliases, setLocalAliases] = useState(aliases || {});

  // ✅ Sincronizar com props quando aliases mudar externamente
  useEffect(() => {
    setLocalAliases(aliases || {});
  }, [aliases]);

  // ✅ Atualizar parent IMEDIATAMENTE em cada mudança
  const handleAliasChange = (fieldName, alias) => {
    const newAliases = { ...localAliases };
    
    if (alias && alias.trim() !== '') {
      newAliases[fieldName] = alias.trim();
    } else {
      delete newAliases[fieldName];
    }
    
    setLocalAliases(newAliases);
    
    // ✅ CORREÇÃO: Notificar parent imediatamente
    onAliasesChange(newAliases);
  };

  return (
    <Card>
      <CardHeader className="border-b border-slate-200 dark:border-slate-800">
        <CardTitle className="text-lg">Apelidos dos Campos</CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Defina nomes mais amigáveis para seus campos. Os apelidos serão exibidos nos charts e dashboards.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-3">
            {fields.map((field) => {
              const Icon = fieldTypeIcons[field.type] || Type;
              const hasAlias = localAliases[field.name];
              
              return (
                <div 
                  key={field.name}
                  className={`p-3 rounded-lg border transition-all ${
                    hasAlias 
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-slate-500" />
                        <span className="font-medium text-sm text-slate-900 dark:text-white">
                          {field.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {field.type}
                        </Badge>
                      </div>
                      {hasAlias && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleAliasChange(field.name, '')}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-xs text-slate-600 dark:text-slate-400">
                        Apelido (nome amigável)
                      </Label>
                      <Input
                        value={localAliases[field.name] || ''}
                        onChange={(e) => handleAliasChange(field.name, e.target.value)}
                        placeholder={`Ex: ${
                          field.name === 'CODEMP' ? 'Código da Empresa' :
                          field.name === 'VLRFAT' ? 'Valor do Faturamento' :
                          field.name === 'QTD' ? 'Quantidade' :
                          'Nome Amigável'
                        }`}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    
                    {hasAlias && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Será exibido como:</span>
                          <span className="font-semibold text-blue-700 dark:text-blue-400">
                            {localAliases[field.name]}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}