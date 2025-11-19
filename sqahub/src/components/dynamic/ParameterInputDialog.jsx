import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Zap } from "lucide-react";

export default function ParameterInputDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  buttonName,
  parameters = [] 
}) {
  const [values, setValues] = useState(() => {
    const initial = {};
    parameters.forEach(param => {
      initial[param.nome] = param.valor_padrao || (param.tipo === 'checkbox' ? false : '');
    });
    return initial;
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    const newErrors = {};
    parameters.forEach(param => {
      if (param.obrigatorio && !values[param.nome]) {
        newErrors[param.nome] = 'Campo obrigatório';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(values);
    onClose();
  };

  const handleChange = (paramName, value) => {
    setValues(prev => ({ ...prev, [paramName]: value }));
    if (errors[paramName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[paramName];
        return newErrors;
      });
    }
  };

  const renderInput = (param) => {
    const hasError = errors[param.nome];

    switch (param.tipo) {
      case 'numero':
        return (
          <Input
            type="number"
            value={values[param.nome]}
            onChange={(e) => handleChange(param.nome, e.target.value)}
            placeholder={param.placeholder}
            className={hasError ? 'border-red-500' : ''}
          />
        );

      case 'data':
        return (
          <Input
            type="date"
            value={values[param.nome]}
            onChange={(e) => handleChange(param.nome, e.target.value)}
            className={hasError ? 'border-red-500' : ''}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label>{param.label}</Label>
              {param.ajuda && (
                <p className="text-xs text-slate-500 mt-1">{param.ajuda}</p>
              )}
            </div>
            <Switch
              checked={values[param.nome]}
              onCheckedChange={(checked) => handleChange(param.nome, checked)}
            />
          </div>
        );

      case 'select':
        return (
          <Select
            value={values[param.nome]}
            onValueChange={(value) => handleChange(param.nome, value)}
          >
            <SelectTrigger className={hasError ? 'border-red-500' : ''}>
              <SelectValue placeholder={param.placeholder || 'Selecione...'} />
            </SelectTrigger>
            <SelectContent>
              {param.opcoes?.map((opcao, idx) => (
                <SelectItem key={idx} value={opcao}>
                  {opcao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default: // texto
        return (
          <Input
            type="text"
            value={values[param.nome]}
            onChange={(e) => handleChange(param.nome, e.target.value)}
            placeholder={param.placeholder}
            className={hasError ? 'border-red-500' : ''}
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            {buttonName}
          </DialogTitle>
          <DialogDescription>
            Preencha os parâmetros necessários para executar esta ação
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {parameters.map((param) => (
            <div key={param.nome} className="space-y-2">
              {param.tipo !== 'checkbox' && (
                <>
                  <Label htmlFor={param.nome}>
                    {param.label}
                    {param.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {param.ajuda && (
                    <p className="text-xs text-slate-500">{param.ajuda}</p>
                  )}
                  {renderInput(param)}
                  {errors[param.nome] && (
                    <p className="text-xs text-red-500">{errors[param.nome]}</p>
                  )}
                </>
              )}
              {param.tipo === 'checkbox' && renderInput(param)}
            </div>
          ))}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Executar Ação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}