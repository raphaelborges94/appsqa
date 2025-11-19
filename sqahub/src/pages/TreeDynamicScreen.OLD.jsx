import React, { useState, useEffect } from "react";
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
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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

  const { data: screen, isLoading: screenLoading } = useQuery({
    queryKey: ['tree-screen', screenId],
    queryFn: async () => {
      const screens = await base44.entities.TreeScreenDefinition.filter({ id: screenId });
      return screens[0];
    },
    enabled: !!screenId,
  });

  const { data: fields = [] } = useQuery({
    queryKey: ['tree-fields', screenId],
    queryFn: () => base44.entities.FieldDefinition.filter({ screen_id: screenId }, 'ordem'),
    enabled: !!screenId,
  });

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['tree-data', screenId],
    queryFn: () => base44.entities.DynamicData.filter({ screen_id: screenId }),
    enabled: !!screenId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DynamicData.create({
      screen_id: screenId,
      table_name: screen.tabela_nome,
      data: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-data', screenId] });
      toast.success('Registro criado com sucesso!');
      handleCancel();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DynamicData.update(id, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-data', screenId] });
      toast.success('Registro atualizado com sucesso!');
      handleCancel();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DynamicData.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-data', screenId] });
      toast.success('Registro excluído com sucesso!');
      setSelectedNode(null);
    },
  });

  const buildTree = (records, parentId = null) => {
    return records
      .filter(r => r.data[screen.campo_pai] === parentId)
      .map(record => ({
        ...record,
        children: buildTree(records, record.id)
      }));
  };

  const treeData = React.useMemo(() => {
    if (!screen || !records) return [];
    return buildTree(records);
  }, [records, screen]);

  const getNextCode = (parentNode = null) => {
    if (!parentNode) {
      const rootCodes = treeData
        .map(r => r.data[screen.campo_codigo])
        .filter(Boolean)
        .map(c => parseInt(c.toString().split('.')[0]))
        .filter(n => !isNaN(n));
      
      const maxCode = rootCodes.length > 0 ? Math.max(...rootCodes) : 0;
      return (maxCode + 1).toString();
    } else {
      const parentCode = parentNode.data[screen.campo_codigo] || '';
      const siblings = records.filter(r => r.data[screen.campo_pai] === parentNode.id);
      
      const siblingCodes = siblings
        .map(r => r.data[screen.campo_codigo])
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

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

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
    setShowForm(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData(record.data);
    setShowForm(true);
  };

  const handleDelete = (record) => {
    if (confirm(`Tem certeza que deseja excluir "${record.data[screen.campo_nome]}"?`)) {
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

  const getParentCode = (parentId) => {
    if (!parentId) return null;
    const parent = records.find(r => r.id === parentId);
    return parent?.data[screen.campo_codigo] || null;
  };

  const renderNode = (node, level = 0) => {
    const isExpanded = expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode?.id === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded cursor-pointer hover:bg-slate-50 ${
            isSelected ? 'bg-emerald-50 border-l-2 border-emerald-500' : ''
          }`}
          style={{ marginLeft: `${level * 24}px` }}
          onClick={() => setSelectedNode(node)}
        >
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}
          
          <Network className="w-4 h-4 text-emerald-600" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {screen.campo_codigo && node.data[screen.campo_codigo] && (
                <span className="text-xs font-mono text-slate-500">
                  {node.data[screen.campo_codigo]}
                </span>
              )}
              <span className="text-sm font-medium text-slate-900 truncate">
                {node.data[screen.campo_nome]}
              </span>
            </div>
          </div>

          {isSelected && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); handleNew(node); }}
                className="h-7 w-7 p-0"
                title="Adicionar filho"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); handleEdit(node); }}
                className="h-7 w-7 p-0"
                title="Editar"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); handleDelete(node); }}
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                title="Excluir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (screenLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!screen) {
    return (
      <div className="p-8">
        <p className="text-slate-600">Tela não encontrada</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("treescreenbuilder"))}
              className="hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{screen.nome}</h1>
              {screen.descricao && (
                <p className="text-sm text-slate-600">{screen.descricao}</p>
              )}
            </div>
          </div>
          {!showForm && (
            <Button onClick={() => handleNew()} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Raiz
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="h-full max-w-6xl mx-auto">
          <div className="grid grid-cols-12 gap-6 h-full">
            <div className="col-span-5">
              <Card className="h-full flex flex-col border-none shadow-lg">
                <CardHeader className="border-b border-slate-100 bg-white">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Network className="w-5 h-5 text-emerald-600" />
                    Estrutura Hierárquica
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-auto">
                  {recordsLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : treeData.length === 0 ? (
                    <div className="text-center py-12">
                      <Network className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 mb-2">Nenhum registro encontrado</p>
                      <p className="text-sm text-slate-400">Adicione o primeiro item</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {treeData.map(node => renderNode(node))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="col-span-7">
              <Card className="h-full flex flex-col border-none shadow-lg">
                <CardHeader className="border-b border-slate-100 bg-white">
                  <CardTitle className="text-lg">
                    {showForm ? (editingRecord ? 'Editar Item' : 'Novo Item') : 'Detalhes'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex-1 overflow-auto">
                  {showForm ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {fields.filter(f => !f.somente_leitura && f.nome_campo !== screen.campo_pai).map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={field.nome_campo}>
                            {field.label}
                            {field.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <Input
                            id={field.nome_campo}
                            type={field.tipo === 'inteiro' ? 'number' : 'text'}
                            value={formData[field.nome_campo] || ''}
                            onChange={(e) => setFormData({ ...formData, [field.nome_campo]: e.target.value })}
                            placeholder={field.placeholder}
                            required={field.obrigatorio}
                          />
                        </div>
                      ))}
                      
                      <div className="flex gap-2 pt-4 border-t border-slate-200">
                        <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                          <Save className="w-4 h-4 mr-2" />
                          {editingRecord ? 'Atualizar' : 'Criar'}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancel}>
                          <X className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  ) : selectedNode ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">
                          {selectedNode.data[screen.campo_nome]}
                        </h3>
                        {fields.filter(f => f.nome_campo !== screen.campo_pai).map((field) => (
                          <div key={field.id} className="py-2 border-b border-slate-100">
                            <span className="text-xs text-slate-500">{field.label}</span>
                            <p className="text-sm text-slate-900">
                              {selectedNode.data[field.nome_campo] || '-'}
                            </p>
                          </div>
                        ))}
                        {selectedNode.data[screen.campo_pai] && (
                          <div className="py-2 border-b border-slate-100">
                            <span className="text-xs text-slate-500">Código Pai</span>
                            <p className="text-sm text-slate-900">
                              {getParentCode(selectedNode.data[screen.campo_pai]) || '-'}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-4 border-t border-slate-200">
                        <Button onClick={() => handleNew(selectedNode)} variant="outline" className="flex-1">
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Filho
                        </Button>
                        <Button onClick={() => handleEdit(selectedNode)} variant="outline" className="flex-1">
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button onClick={() => handleDelete(selectedNode)} variant="outline" className="flex-1 text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-slate-500">Selecione um item na árvore</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}