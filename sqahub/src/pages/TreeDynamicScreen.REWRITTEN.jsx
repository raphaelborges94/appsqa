import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Network,
  Save,
  X,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TreeDynamicScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const screenId = urlParams.get('screen_id');

  const [expandedNodes, setExpandedNodes] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({});

  // Buscar definição da tela (metadados)
  const { data: screen, isLoading: screenLoading } = useQuery({
    queryKey: ['tree-screen', screenId],
    queryFn: async () => {
      console.log('🌳 TreeDynamicScreen - Buscando screen:', screenId);
      const screen = await base44.entities.TreeScreenDefinition.get(screenId);
      console.log('✅ Screen encontrada:', screen);
      return screen;
    },
    enabled: !!screenId,
  });

  // Buscar campos da tela
  const { data: fields = [], isLoading: fieldsLoading } = useQuery({
    queryKey: ['tree-fields', screenId],
    queryFn: async () => {
      const fields = await base44.entities.FieldDefinition.listByScreen(screenId);
      return fields.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    },
    initialData: [],
    enabled: !!screenId,
  });

  // Buscar dados da tabela dinâmica
  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['tree-data', screenId, screen?.tabela_nome],
    queryFn: async () => {
      if (!screen?.tabela_nome) return [];
      console.log('🌳 Buscando registros da tabela:', screen.tabela_nome);
      const records = await base44.entities.list(screen.tabela_nome);
      console.log('✅ Registros encontrados:', records.length);
      return records;
    },
    initialData: [],
    enabled: !!screenId && !!screen?.tabela_nome,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => {
      if (!screen?.tabela_nome) throw new Error('Tabela não encontrada');
      return base44.entities.create(screen.tabela_nome, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-data', screenId] });
      toast.success('Registro criado com sucesso!');
      handleCancel();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      if (!screen?.tabela_nome) throw new Error('Tabela não encontrada');
      return base44.entities.update(screen.tabela_nome, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-data', screenId] });
      toast.success('Registro atualizado com sucesso!');
      handleCancel();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      if (!screen?.tabela_nome) throw new Error('Tabela não encontrada');
      return base44.entities.delete(screen.tabela_nome, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-data', screenId] });
      toast.success('Registro excluído com sucesso!');
      setSelectedNode(null);
    },
  });

  // Construir árvore hierárquica
  const buildTree = (records, parentId = null) => {
    if (!screen?.campo_pai) return [];

    return records
      .filter(r => {
        const paiValue = r[screen.campo_pai];
        // Raiz: quando pai_id é null, undefined, 0 ou ""
        if (parentId === null) {
          return !paiValue || paiValue === 0 || paiValue === '';
        }
        return paiValue === parentId;
      })
      .map(record => ({
        ...record,
        children: buildTree(records, record.id)
      }))
      .sort((a, b) => {
        // Ordenar por código se existir
        if (screen.campo_codigo) {
          const codeA = a[screen.campo_codigo] || '';
          const codeB = b[screen.campo_codigo] || '';
          return codeA.localeCompare(codeB);
        }
        return 0;
      });
  };

  const treeData = useMemo(() => {
    if (!screen || !records) return [];
    return buildTree(records);
  }, [records, screen]);

  // Gerar próximo código hierárquico
  const getNextCode = (parentNode = null) => {
    if (!screen?.campo_codigo) return '';

    if (!parentNode) {
      // Código raiz
      const rootCodes = treeData
        .map(r => r[screen.campo_codigo])
        .filter(Boolean)
        .map(c => parseInt(c.toString().split('.')[0]))
        .filter(n => !isNaN(n));

      const maxCode = rootCodes.length > 0 ? Math.max(...rootCodes) : 0;
      return (maxCode + 1).toString();
    } else {
      // Código filho
      const parentCode = parentNode[screen.campo_codigo] || '';
      const siblings = records.filter(r => r[screen.campo_pai] === parentNode.id);

      const siblingCodes = siblings
        .map(r => r[screen.campo_codigo])
        .filter(Boolean)
        .map(c => {
          const parts = c.toString().split('.');
          return parseInt(parts[parts.length - 1]);
        })
        .filter(n => !isNaN(n));

      const maxCode = siblingCodes.length > 0 ? Math.max(...siblingCodes) : 0;
      return `${parentCode}.${maxCode + 1}`;
    }
  };

  // Toggle expansão do nó
  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Handlers
  const handleNew = (parentNode = null) => {
    setEditingRecord(null);
    const newFormData = {};

    fields.forEach(field => {
      if (field.nome_campo === screen.campo_pai) {
        newFormData[field.nome_campo] = parentNode?.id || null;
      } else if (field.nome_campo === screen.campo_codigo) {
        newFormData[field.nome_campo] = getNextCode(parentNode);
      } else if (field.valor_padrao) {
        newFormData[field.nome_campo] = field.valor_padrao;
      }
    });

    setFormData(newFormData);
    setSelectedNode(parentNode);
    setShowForm(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    const editFormData = {};
    fields.forEach(field => {
      editFormData[field.nome_campo] = record[field.nome_campo];
    });
    setFormData(editFormData);
    setShowForm(true);
  };

  const handleDelete = (record) => {
    // Verificar se tem filhos
    const hasChildren = records.some(r => r[screen.campo_pai] === record.id);

    if (hasChildren) {
      toast.error('Não é possível excluir um nó que possui filhos');
      return;
    }

    const nome = record[screen.campo_nome] || 'este registro';
    if (confirm(`Tem certeza que deseja excluir "${nome}"?`)) {
      deleteMutation.mutate(record.id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRecord(null);
    setFormData({});
  };

  const handleBack = () => {
    navigate(createPageUrl("treescreenbuilder"));
  };

  // Renderizar nó da árvore
  const renderTreeNode = (node, level = 0) => {
    const isExpanded = expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const nodeName = node[screen.campo_nome] || 'Sem nome';
    const nodeCode = screen.campo_codigo ? node[screen.campo_codigo] : null;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`
            flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors
            ${selectedNode?.id === node.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
          `}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {/* Expand/Collapse button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleNode(node.id);
            }}
            className="w-5 h-5 flex items-center justify-center"
          >
            {hasChildren && (
              isExpanded ?
                <ChevronDown className="w-4 h-4 text-slate-600" /> :
                <ChevronRight className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Node info */}
          <div
            className="flex-1 flex items-center gap-2"
            onClick={() => setSelectedNode(node)}
          >
            <Network className="w-4 h-4 text-emerald-600" />
            {nodeCode && (
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {nodeCode}
              </span>
            )}
            <span className="font-medium text-slate-700">{nodeName}</span>
          </div>

          {/* Action buttons */}
          {selectedNode?.id === node.id && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNew(node);
                }}
                className="h-7 px-2"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(node);
                }}
                className="h-7 px-2"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(node);
                }}
                className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Renderizar formulário
  const renderForm = () => {
    const customFields = fields.filter(f =>
      f.nome_campo !== 'id' &&
      f.nome_campo !== 'dhinc' &&
      f.nome_campo !== 'dhalter'
    );

    return (
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {editingRecord ? 'Editar Nó' : 'Novo Nó'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {customFields.map(field => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.nome_campo}>
                  {field.label}
                  {field.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Input
                  id={field.nome_campo}
                  value={formData[field.nome_campo] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.nome_campo]: e.target.value })}
                  required={field.obrigatorio}
                  disabled={
                    field.nome_campo === screen.campo_pai ||
                    field.nome_campo === screen.campo_codigo ||
                    field.somente_leitura
                  }
                  placeholder={field.placeholder}
                />
                {field.hint && (
                  <p className="text-xs text-slate-500">{field.hint}</p>
                )}
              </div>
            ))}

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {editingRecord ? 'Atualizar' : 'Criar'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  };

  // Loading states
  if (!screenId) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>ID da tela não especificado</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (screenLoading || fieldsLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!screen) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Tela não encontrada</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Network className="w-6 h-6 text-emerald-600" />
              {screen.nome}
            </h1>
            {screen.descricao && (
              <p className="text-sm text-slate-600">{screen.descricao}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="h-full p-6 flex gap-6">
          {/* Tree View */}
          <div className="flex-1">
            <Card className="border-none shadow-lg h-full flex flex-col">
              <CardHeader className="border-b border-slate-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Estrutura Hierárquica</CardTitle>
                  <Button
                    onClick={() => handleNew(null)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Raiz
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-4">
                {recordsLoading ? (
                  <div className="space-y-2">
                    {Array(5).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : treeData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Network className="w-16 h-16 text-slate-200 mb-3" />
                    <p className="text-slate-500 mb-2">Nenhum nó encontrado</p>
                    <p className="text-sm text-slate-400">Clique em "Novo Raiz" para começar</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {treeData.map(node => renderTreeNode(node))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Form Panel */}
          {showForm && (
            <div className="w-96 flex-shrink-0">
              {renderForm()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
