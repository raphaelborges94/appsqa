import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, X } from "lucide-react";
import DynamicTable from "./DynamicTable";
import DynamicForm from "./DynamicForm";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SubtablesTabs({ 
  parentScreen, 
  parentRecordId, 
  subtables,
}) {
  const [activeTab, setActiveTab] = useState(subtables[0]?.id || '');

  if (!subtables || subtables.length === 0) {
    return null;
  }

  return (
    <Card className="border-none shadow-lg">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-slate-100 p-1 h-12 rounded-t-lg rounded-b-none border-b border-slate-200">
          {subtables.map((subtable) => (
            <TabsTrigger 
              key={subtable.id} 
              value={subtable.id}
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4"
            >
              {subtable.nome}
            </TabsTrigger>
          ))}
        </TabsList>

        {subtables.map((subtable) => (
          <TabsContent key={subtable.id} value={subtable.id} className="mt-0">
            <SubtableContent
              subtable={subtable}
              parentScreen={parentScreen}
              parentRecordId={parentRecordId}
            />
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}

function SubtableContent({ subtable, parentScreen, parentRecordId }) {
  const queryClient = useQueryClient();
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Buscar campos da subtela
  const { data: fields = [] } = useQuery({
    queryKey: ['fields', subtable.id],
    queryFn: () => base44.entities.FieldDefinition.filter({ screen_id: subtable.id }, 'ordem'),
  });

  // Buscar registros da subtela filtrados pelo parent
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['subtable-data', subtable.id, parentRecordId],
    queryFn: async () => {
      const allRecords = await base44.entities.DynamicData.filter({ 
        screen_id: subtable.id 
      }, '-created_date');
      
      // Filtrar pelo FK do pai
      const fkFieldName = `${parentScreen.tabela_nome}_id`;
      return allRecords.filter(record => 
        record.data[fkFieldName] === parentRecordId
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
    mutationFn: (id) => base44.entities.DynamicData.delete(id),
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

  return (
    <div>
      {showForm ? (
        <div className="p-6 bg-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
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
            initialData={editingRecord?.data}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      ) : (
        <>
          {/* Barra de Ferramentas */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
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