import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, GripVertical, Percent, ChevronRight, Sigma } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
  { value: 'distinct', label: 'Distintos' },
];

export default function PivotFieldZone({ 
  title, 
  zone, 
  fields = [], 
  onRemove,
  onFieldUpdate,
  allowAggregation = false 
}) {
  const isRowZone = zone === 'rows';
  const isValueZone = zone === 'values';

  const handleToggle = (index, property, value) => {
    if (onFieldUpdate) {
      onFieldUpdate(index, { [property]: value });
    }
  };

  const handleAggregationChange = (index, aggregation) => {
    if (onFieldUpdate) {
      onFieldUpdate(index, { aggregation });
    }
  };

  const handlePercentBaseChange = (index, percentBaseField) => {
    if (onFieldUpdate) {
      onFieldUpdate(index, { percentBaseField });
    }
  };

  const handleTotalTypeChange = (index, totalType) => {
    if (onFieldUpdate) {
      onFieldUpdate(index, { totalType });
    }
  };

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
            <Card key={index} className="p-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="space-y-2">
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

                {isValueZone && (
                  <Select
                    value={field.aggregation || 'sum'}
                    onValueChange={(value) => handleAggregationChange(index, value)}
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
                )}

                {isRowZone && index > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        Hierárquico
                      </span>
                    </div>
                    <Switch
                      checked={field.hierarchical || false}
                      onCheckedChange={(checked) => handleToggle(index, 'hierarchical', checked)}
                    />
                  </div>
                )}

                {isValueZone && (
                  <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Percent className="w-3 h-3 text-slate-500" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Mostrar %
                        </span>
                      </div>
                      <Switch
                        checked={field.showPercentColumn || false}
                        onCheckedChange={(checked) => handleToggle(index, 'showPercentColumn', checked)}
                      />
                    </div>

                    {field.showPercentColumn && (
                      <Select
                        value={field.percentBaseField || 'column'}
                        onValueChange={(value) => handlePercentBaseChange(index, value)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="column" className="text-xs">
                            % da Coluna
                          </SelectItem>
                          <SelectItem value="row" className="text-xs">
                            % da Linha
                          </SelectItem>
                          <SelectItem value="total" className="text-xs">
                            % do Total (AV)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          vs. Coluna Anterior
                        </span>
                      </div>
                      <Switch
                        checked={field.showComparison || false}
                        onCheckedChange={(checked) => handleToggle(index, 'showComparison', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Sigma className="w-3 h-3 text-slate-500" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Mostrar Total
                        </span>
                      </div>
                      <Switch
                        checked={field.showTotal || false}
                        onCheckedChange={(checked) => handleToggle(index, 'showTotal', checked)}
                      />
                    </div>

                    {field.showTotal && (
                      <Select
                        value={field.totalType || 'absolute'}
                        onValueChange={(value) => handleTotalTypeChange(index, value)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="absolute" className="text-xs">
                            Valores Absolutos
                          </SelectItem>
                          <SelectItem value="real" className="text-xs">
                            Valores Reais
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
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