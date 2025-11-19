import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  X, 
  Save, 
  Calculator, 
  Lightbulb,
  AlertCircle,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

const calculatedFieldTypes = [
  { value: 'number', label: 'Número' },
  { value: 'string', label: 'Texto' },
  { value: 'date', label: 'Data' },
  { value: 'boolean', label: 'Verdadeiro/Falso' },
];

const exampleFormulas = [
  {
    category: 'Matemática',
    examples: [
      { label: 'Soma de campos', formula: '[Campo1] + [Campo2]' },
      { label: 'Margem de lucro', formula: '([Receita] - [Custo]) / [Receita] * 100' },
      { label: 'Média de valores', formula: '([Valor1] + [Valor2] + [Valor3]) / 3' },
      { label: 'Valor absoluto', formula: 'ABS([Lucro])' },
      { label: 'Arredondar', formula: 'ROUND([Valor], 2)' },
    ]
  },
  {
    category: 'Condicionais',
    examples: [
      { label: 'Se valor positivo', formula: 'IF([Valor] > 0, "Positivo", "Negativo")' },
      { label: 'Faixa de valores', formula: 'IF([Valor] < 100, "Baixo", IF([Valor] < 500, "Médio", "Alto"))' },
      { label: 'Status baseado em meta', formula: 'IF([Vendas] >= [Meta], "Atingida", "Não Atingida")' },
      { label: 'Verificar nulo', formula: 'IF(ISNULL([Campo]), "Sem Dados", [Campo])' },
    ]
  },
  {
    category: 'Texto',
    examples: [
      { label: 'Concatenar campos', formula: 'CONCAT([Nome], " - ", [Sobrenome])' },
      { label: 'Maiúsculas', formula: 'UPPER([Nome])' },
      { label: 'Minúsculas', formula: 'LOWER([Email])' },
      { label: 'Extrair parte', formula: 'SUBSTRING([Codigo], 0, 3)' },
      { label: 'Substituir texto', formula: 'REPLACE([Texto], "antigo", "novo")' },
    ]
  },
  {
    category: 'Data',
    examples: [
      { label: 'Ano atual', formula: 'YEAR(NOW())' },
      { label: 'Extrair ano', formula: 'YEAR([DataVenda])' },
      { label: 'Extrair mês', formula: 'MONTH([DataVenda])' },
      { label: 'Diferença em dias', formula: 'DATEDIFF([DataFim], [DataInicio])' },
      { label: 'Adicionar dias', formula: 'DATEADD([Data], 30)' },
    ]
  }
];

const operatorButtons = [
  { label: '+', value: '+', type: 'operator' },
  { label: '-', value: '-', type: 'operator' },
  { label: '*', value: '*', type: 'operator' },
  { label: '/', value: '/', type: 'operator' },
  { label: '(', value: '(', type: 'parenthesis' },
  { label: ')', value: ')', type: 'parenthesis' },
  { label: '>', value: '>', type: 'comparison' },
  { label: '<', value: '<', type: 'comparison' },
  { label: '=', value: '=', type: 'comparison' },
  { label: '>=', value: '>=', type: 'comparison' },
  { label: '<=', value: '<=', type: 'comparison' },
  { label: '!=', value: '!=', type: 'comparison' },
];

const functions = [
  { name: 'IF', description: 'Condicional: IF(condição, se_verdadeiro, se_falso)' },
  { name: 'ROUND', description: 'Arredondar: ROUND(número, decimais)' },
  { name: 'ABS', description: 'Valor absoluto: ABS(número)' },
  { name: 'CONCAT', description: 'Concatenar: CONCAT(texto1, texto2, ...)' },
  { name: 'UPPER', description: 'Maiúsculas: UPPER(texto)' },
  { name: 'LOWER', description: 'Minúsculas: LOWER(texto)' },
  { name: 'SUBSTRING', description: 'Extrair texto: SUBSTRING(texto, início, tamanho)' },
  { name: 'REPLACE', description: 'Substituir: REPLACE(texto, antigo, novo)' },
  { name: 'YEAR', description: 'Extrair ano: YEAR(data)' },
  { name: 'MONTH', description: 'Extrair mês: MONTH(data)' },
  { name: 'DAY', description: 'Extrair dia: DAY(data)' },
  { name: 'DATEDIFF', description: 'Diferença de datas: DATEDIFF(data1, data2)' },
  { name: 'DATEADD', description: 'Adicionar dias: DATEADD(data, dias)' },
  { name: 'NOW', description: 'Data/hora atual: NOW()' },
  { name: 'ISNULL', description: 'Verificar nulo: ISNULL(campo)' },
  { name: 'MAX', description: 'Máximo: MAX(valor1, valor2, ...)' },
  { name: 'MIN', description: 'Mínimo: MIN(valor1, valor2, ...)' },
];

export default function CalculatedFieldManager({ 
  fields = [], 
  calculatedFields = [], 
  onCalculatedFieldsChange 
}) {
  const [localFields, setLocalFields] = useState(calculatedFields || []);
  const [editingIndex, setEditingIndex] = useState(null);
  const [newField, setNewField] = useState({
    name: '',
    displayName: '',
    type: 'number',
    formula: '',
    description: ''
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set(['Matemática']));

  const handleAddField = () => {
    if (!newField.name || !newField.formula) {
      return;
    }

    const fieldToAdd = {
      ...newField,
      displayName: newField.displayName || newField.name,
      isCalculated: true
    };

    if (editingIndex !== null) {
      const updated = [...localFields];
      updated[editingIndex] = fieldToAdd;
      setLocalFields(updated);
      setEditingIndex(null);
    } else {
      setLocalFields([...localFields, fieldToAdd]);
    }

    setNewField({
      name: '',
      displayName: '',
      type: 'number',
      formula: '',
      description: ''
    });
    setHasChanges(true);
  };

  const handleEditField = (index) => {
    setNewField(localFields[index]);
    setEditingIndex(index);
  };

  const handleRemoveField = (index) => {
    const updated = localFields.filter((_, i) => i !== index);
    setLocalFields(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    onCalculatedFieldsChange(localFields);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalFields(calculatedFields || []);
    setNewField({
      name: '',
      displayName: '',
      type: 'number',
      formula: '',
      description: ''
    });
    setEditingIndex(null);
    setHasChanges(false);
  };

  const insertIntoFormula = (text) => {
    setNewField(prev => ({
      ...prev,
      formula: prev.formula + text
    }));
  };

  const insertField = (fieldName) => {
    insertIntoFormula(`[${fieldName}]`);
  };

  const insertFunction = (funcName) => {
    insertIntoFormula(`${funcName}()`);
  };

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const applyExample = (formula) => {
    setNewField(prev => ({
      ...prev,
      formula: formula
    }));
  };

  return (
    <div className="space-y-4">
      {/* Campos Calculados Existentes */}
      {localFields.length > 0 && (
        <Card>
          <CardHeader className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Campos Calculados Criados</CardTitle>
              {hasChanges && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                    <Save className="w-3 h-3 mr-2" />
                    Salvar Alterações
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {localFields.map((field, index) => (
                <div 
                  key={index}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calculator className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          {field.displayName || field.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {field.type}
                        </Badge>
                        <Badge className="text-[10px] px-1.5 py-0 bg-purple-600">
                          Calculado
                        </Badge>
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded p-2 mb-2">
                        <code className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                          {field.formula}
                        </code>
                      </div>
                      {field.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {field.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditField(index)}
                      >
                        <Lightbulb className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveField(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Criador de Campo Calculado */}
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-600" />
            {editingIndex !== null ? 'Editar Campo Calculado' : 'Criar Novo Campo Calculado'}
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Crie campos personalizados usando fórmulas matemáticas, condições e funções de texto/data.
          </p>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Coluna Esquerda - Configuração */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Nome do Campo *</Label>
                <Input
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  placeholder="Ex: MargemLucro"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Nome de Exibição</Label>
                <Input
                  value={newField.displayName}
                  onChange={(e) => setNewField({ ...newField, displayName: e.target.value })}
                  placeholder="Ex: Margem de Lucro (%)"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Tipo de Resultado *</Label>
                <Select 
                  value={newField.type} 
                  onValueChange={(value) => setNewField({ ...newField, type: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {calculatedFieldTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  value={newField.description}
                  onChange={(e) => setNewField({ ...newField, description: e.target.value })}
                  placeholder="Descreva o que este campo calcula..."
                  className="mt-1 h-20"
                />
              </div>

              {/* Campos Disponíveis */}
              <div>
                <Label className="text-xs mb-2 block">Campos Disponíveis</Label>
                <ScrollArea className="h-32 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                  <div className="space-y-1">
                    {fields.map(field => (
                      <Button
                        key={field.name}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs h-7"
                        onClick={() => insertField(field.name)}
                      >
                        <Plus className="w-3 h-3 mr-2" />
                        {field.name}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Operadores */}
              <div>
                <Label className="text-xs mb-2 block">Operadores</Label>
                <div className="grid grid-cols-6 gap-1">
                  {operatorButtons.map(op => (
                    <Button
                      key={op.value}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => insertIntoFormula(op.value)}
                    >
                      {op.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Funções */}
              <div>
                <Label className="text-xs mb-2 block">Funções</Label>
                <ScrollArea className="h-48 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                  <div className="space-y-1">
                    {functions.map(func => (
                      <Button
                        key={func.name}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs h-auto py-2"
                        onClick={() => insertFunction(func.name)}
                      >
                        <div className="text-left">
                          <div className="font-semibold">{func.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {func.description}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Coluna Direita - Editor de Fórmula + Exemplos */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Fórmula *</Label>
                <Textarea
                  value={newField.formula}
                  onChange={(e) => setNewField({ ...newField, formula: e.target.value })}
                  placeholder="Digite ou construa sua fórmula..."
                  className="mt-1 h-40 font-mono text-xs"
                />
                <Alert className="mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-[10px]">
                    Use <strong>[NomeDoCampo]</strong> para referenciar campos.
                    Use funções e operadores para criar cálculos complexos.
                  </AlertDescription>
                </Alert>
              </div>

              {/* Exemplos de Fórmulas */}
              <div>
                <Label className="text-xs mb-2 block flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Exemplos de Fórmulas
                </Label>
                <ScrollArea className="h-[calc(100vh-600px)] border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="p-2 space-y-2">
                    {exampleFormulas.map((category, idx) => (
                      <div key={idx} className="border-b border-slate-200 dark:border-slate-700 last:border-0 pb-2">
                        <button
                          onClick={() => toggleCategory(category.category)}
                          className="w-full flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded"
                        >
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {category.category}
                          </span>
                          {expandedCategories.has(category.category) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        
                        {expandedCategories.has(category.category) && (
                          <div className="space-y-1 mt-1 pl-2">
                            {category.examples.map((example, exIdx) => (
                              <div
                                key={exIdx}
                                className="p-2 rounded bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                onClick={() => applyExample(example.formula)}
                              >
                                <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                  {example.label}
                                </div>
                                <code className="text-[9px] text-slate-600 dark:text-slate-400 font-mono">
                                  {example.formula}
                                </code>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Button
                onClick={handleAddField}
                disabled={!newField.name || !newField.formula}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {editingIndex !== null ? 'Atualizar Campo' : 'Adicionar Campo Calculado'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}