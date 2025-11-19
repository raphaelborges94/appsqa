import React, { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, X, Settings } from "lucide-react";
import DynamicTable from "./DynamicTable";
import DynamicForm from "./DynamicForm";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SubtableContent({ subtable, parentScreen, parentRecordId }) {
  const queryClient = useQueryClient();
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Buscar campos da subtela
  const { data: fields = [], isLoading: fieldsLoading, error: fieldsError } = useQuery({
    queryKey: ['fields', subtable.id],
    queryFn: async () => {
      console.log('🔍 SubtableContent - Buscando campos da subtela:', subtable.id, subtable.nome);
      try {
        const fields = await base44.entities.FieldDefinition.filter({ screen_id: subtable.id }, 'ordem');
        console.log('✅ Campos encontrados:', fields.length, fields);
        return fields;
      } catch (error) {
        console.error('❌ Erro ao buscar campos:', error);
        throw error;
      }
    },
    retry: 1,
  });

  // Buscar registros da subtela filtrados pelo parent
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['subtable-data', subtable.id, parentRecordId],
    queryFn: async () => {
      const allRecords = await base44.entities.DynamicData.filter({
        screen_id: subtable.id
      }, '-id');

      // Filtrar pelo FK do pai
      const fkFieldName = `${parentScreen.tabela_nome}_id`;
      return allRecords.filter(record =>
        record[fkFieldName] == parentRecordId
      );
    },
    enabled: !!parentRecordId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      // Adicionar FK do pai automaticamente
      const fkFieldName = `${parentScreen.tabela_nome}_id`;
      return base44.entities.DynamicData.create({
        screen_id: subtable.id,
        table_name: subtable.tabela_nome,
        data: {
          ...data,
          [fkFieldName]: parentRecordId,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtable-data', subtable.id, parentRecordId] });
      toast.success('Registro criado com sucesso!');
      setShowForm(false);
      setEditingRecord(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      // Garantir que o FK do pai não seja alterado
      const fkFieldName = `${parentScreen.tabela_nome}_id`;
      return base44.entities.DynamicData.update(id, {
        table_name: subtable.tabela_nome,
        data: {
          ...data,
          [fkFieldName]: parentRecordId,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtable-data', subtable.id, parentRecordId] });
      toast.success('Registro atualizado com sucesso!');
      setShowForm(false);
      setEditingRecord(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DynamicData.delete(id, subtable.tabela_nome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtable-data', subtable.id, parentRecordId] });
      toast.success('Registro excluído com sucesso!');
      setSelectedRecords([]);
    },
  });

  const handleNew = () => {
    setEditingRecord(null);
    setShowForm(true);
  };

  const handleEdit = () => {
    if (selectedRecords.length === 1) {
      const record = records.find(r => r.id === selectedRecords[0]);
      setEditingRecord(record);
      setShowForm(true);
    }
  };

  const handleDelete = () => {
    if (selectedRecords.length === 0) return;

    const count = selectedRecords.length;
    if (confirm(`Tem certeza que deseja excluir ${count} ${count === 1 ? 'registro' : 'registros'}?`)) {
      selectedRecords.forEach(id => {
        deleteMutation.mutate(id);
      });
    }
  };

  const handleSubmit = (data) => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRecord(null);
    setSelectedRecords([]);
  };

  // Filtrar campos (remover o FK do pai da exibição no formulário, pois é automático)
  const fkFieldName = `${parentScreen.tabela_nome}_id`;
  const visibleFields = fields.filter(f => f.nome_campo !== fkFieldName);

  // Mostrar loading enquanto busca campos
  if (fieldsLoading) {
    return (
      <CardContent className="p-12 bg-slate-50">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
          <p className="text-sm text-slate-600">Carregando campos...</p>
        </div>
      </CardContent>
    );
  }

  // Mostrar erro se falhou ao buscar campos
  if (fieldsError) {
    return (
      <CardContent className="p-12 bg-slate-50">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">
              Erro ao carregar campos
            </h3>
            <p className="text-sm text-slate-600 max-w-md">
              {fieldsError.message || 'Ocorreu um erro ao buscar os campos desta subtela.'}
            </p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Recarregar Página
          </Button>
        </div>
      </CardContent>
    );
  }

  // Verificar se há campos configurados (excluindo campos padrão)
  const hasUserFields = visibleFields.filter(f =>
    !['id', 'dhinc', 'dhalter'].includes(f.nome_campo)
  ).length > 0;

  // Se não há campos configurados, mostrar mensagem de configuração
  if (!hasUserFields) {
    return (
      <CardContent className="p-12 bg-slate-50">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
            <Settings className="w-8 h-8 text-slate-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">
              Nenhum campo definido para esta tela
            </h3>
            <p className="text-sm text-slate-600 max-w-md">
              Esta subtela ainda não possui campos configurados. Adicione campos no Construtor de Telas CRUD para poder criar registros.
            </p>
          </div>
          <Button
            onClick={() => window.open(`/screen-builder?id=${subtable.id}`, '_blank')}
            className="bg-slate-800 hover:bg-slate-900"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar Campos
          </Button>
        </div>
      </CardContent>
    );
  }

  return (
    <div>
      {showForm ? (
        <CardContent className="p-6 bg-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">
              {editingRecord ? 'Editar Registro' : 'Novo Registro'}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DynamicForm
            fields={visibleFields}
            initialData={editingRecord}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </CardContent>
      ) : (
        <>
          {/* Barra de Ferramentas */}
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleNew}
                className="bg-slate-800 hover:bg-slate-900"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Incluir
              </Button>
              
              <Button
                size="sm"
                onClick={handleEdit}
                disabled={selectedRecords.length !== 1}
                variant="outline"
                className="border-slate-300"
              >
                <Edit className="w-4 h-4 mr-1.5" />
                Editar
              </Button>
              
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={selectedRecords.length === 0}
                variant="outline"
                className="border-slate-300"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Excluir
              </Button>

              {selectedRecords.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedRecords.length} selecionado{selectedRecords.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            <Badge variant="outline" className="text-slate-600">
              {records.length} {records.length === 1 ? 'registro' : 'registros'}
            </Badge>
          </div>

          {/* Tabela */}
          <div className="bg-white">
            <DynamicTable
              screen={subtable}
              fields={fields}
              records={records}
              isLoading={isLoading}
              selectedRecords={selectedRecords}
              onSelectionChange={setSelectedRecords}
              canEdit={true}
              canDelete={true}
            />
          </div>
        </>
      )}
    </div>
  );
}