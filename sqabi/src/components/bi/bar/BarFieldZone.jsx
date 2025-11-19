import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, GripVertical, BarChart3, TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const aggregationOptions = [
  { value: 'sum', label: 'Soma' },
  { value: 'avg', label: 'Média' },
  { value: 'count', label: 'Contagem' },
  { value: 'min', label: 'Mínimo' },
  { value: 'max', label: 'Máximo' },
];

const displayTypeOptions = [
  { value: 'bar', label: 'Barra', icon: BarChart3 },
  { value: 'line', label: 'Linha', icon: TrendingUp },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function BarFieldZone({ 
  title, 
  zone, 
  fields = [], 
  onRemove, 
  onAggregationChange,
  onDisplayTypeChange,
  onColorChange,
  allowAggregation = false,
  allowMultiple = true 
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </h4>
        <Badge variant="secondary" className="text-xs">
          {fields.length}
        </Badge>
      </div>
      
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-3 min-h-[80px] space-y-2">
        {fields.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Arraste campos aqui
          </p>
        ) : (
          fields.map((field, index) => (
            <Card key={index} className="p-3 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="space-y-3">
                {/* Header com nome e botão remover */}
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="text-xs font-medium text-slate-900 dark:text-white flex-1">
                    {field.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(index)}
                    className="h-5 w-5 text-slate-500 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                {/* Opções de agregação e visualização */}
                {allowAggregation && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                          Agregação
                        </label>
                        <Select
                          value={field.aggregation || 'sum'}
                          onValueChange={(value) => onAggregationChange && onAggregationChange(index, value)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {aggregationOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                          Exibir como
                        </label>
                        <Select
                          value={field.displayType || 'bar'}
                          onValueChange={(value) => onDisplayTypeChange && onDisplayTypeChange(index, value)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {displayTypeOptions.map(opt => {
                              const Icon = opt.icon;
                              return (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  <div className="flex items-center gap-1">
                                    <Icon className="w-3 h-3" />
                                    {opt.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Seletor de cor */}
                    <div>
                      <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                        Cor
                      </label>
                      <div className="flex gap-1 flex-wrap">
                        {COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => onColorChange && onColorChange(index, color)}
                            className={`w-6 h-6 rounded border-2 transition-all ${
                              (field.color || COLORS[index % COLORS.length]) === color 
                                ? 'border-slate-900 dark:border-white scale-110' 
                                : 'border-slate-300 dark:border-slate-600 hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}