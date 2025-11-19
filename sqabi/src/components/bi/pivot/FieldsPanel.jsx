import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, ChevronLeft, ChevronRight, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FieldsPanel({ fields, onDragStart, onDragEnd, isExpanded, onToggle }) {
  const fieldTypeIcons = {
    string: '📝',
    number: '🔢',
    date: '📅',
    boolean: '✓',
  };

  return (
    <div 
      className={`border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 flex-shrink-0 ${
        isExpanded ? 'w-64' : 'w-12'
      }`}
    >
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {isExpanded ? (
            <>
              <span className="font-semibold text-sm text-slate-900 dark:text-white">Campos</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-6 w-6"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-6 w-6 mx-auto"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        {isExpanded && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {fields.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
                Selecione um dataset
              </p>
            ) : (
              fields.map((field) => (
                <Card
                  key={field.name}
                  draggable
                  onDragStart={() => onDragStart(field)}
                  onDragEnd={onDragEnd}
                  className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow p-2 ${
                    field.isCalculated 
                      ? 'border-purple-300 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="text-lg flex-shrink-0">
                      {field.isCalculated ? (
                        <Calculator className="w-4 h-4 text-purple-600" />
                      ) : (
                        fieldTypeIcons[field.type] || '📋'
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {field.displayName || field.name}
                      </div>
                      {field.displayName && field.displayName !== field.name && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {field.name}
                        </div>
                      )}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-[9px] px-1 py-0 flex-shrink-0 ${
                        field.isCalculated ? 'bg-purple-600 text-white border-purple-600' : ''
                      }`}
                    >
                      {field.type}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}