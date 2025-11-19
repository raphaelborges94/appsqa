
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Lock, Zap } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import DynamicForm from "../components/dynamic/DynamicForm";
import DynamicTable from "../components/dynamic/DynamicTable";
import CrudTopBar from "../components/dynamic/CrudTopBar";
import SubtableContent from "../components/dynamic/SubtableContent";
import ParameterInputDialog from "../components/dynamic/ParameterInputDialog";
import { usePermissions } from "../components/access/PermissionChecker";

export default function DynamicScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const screenId = urlParams.get('screen_id');
  const recordId = urlParams.get('record_id');

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("main");
  const [parameterDialogOpen, setParameterDialogOpen] = useState(false);
  const [selectedButton, setSelectedButton] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: screen, isLoading: screenLoading } = useQuery({
    queryKey: ['screen', screenId],
    queryFn: async () => {
      console.log('🔍 DynamicScreen - Buscando screen:', screenId);
      const screen = await base44.entities.ScreenDefinition.get(screenId);
      console.log('✅ Screen encontrada:', screen);
      return screen;
    },
    enabled: !!screenId,
  });

  const { data: subtables = [] } = useQuery({
    queryKey: ['subtables', screenId, 'v2'], // v2 para invalidar cache
    queryFn: async () => {
      const allScreens = await base44.entities.ScreenDefinition.list();
      console.log('🔍 DynamicScreen - Buscando subtables para screen:', screenId);
      console.log('📋 Todas as screens retornadas:', allScreens.length);
      const filtered = allScreens
        .filter(s => s.parent_screen_id === screenId && s.is_subtable);
      console.log('✅ Subtables encontradas:', filtered.length, filtered.map(s => s.nome));
      return filtered.sort((a, b) => (a.ordem_aba || 0) - (b.ordem_aba || 0));
    },
    enabled: !!screenId && !screen?.is_subtable,
  });

  const { data: fields, isLoading: fieldsLoading } = useQuery({
    queryKey: ['fields', screenId],
    queryFn: async () => {
      const fields = await base44.entities.FieldDefinition.listByScreen(screenId);
      return fields.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    },
    initialData: [],
    enabled: !!screenId,
  });

  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['dynamic-data', screenId, screen?.tabela_nome],
    queryFn: async () => {
      if (!screen?.tabela_nome) return [];
      console.log('🔍 DynamicScreen - Buscando registros da tabela:', screen.tabela_nome);
      const records = await base44.entities.list(screen.tabela_nome);
      console.log('✅ Registros encontrados:', records.length);
      return records;
    },
    initialData: [],
    enabled: !!screenId && !!screen?.tabela_nome,
  });

  const { data: actionButtons = [] } = useQuery({
    queryKey: ['action-buttons', screenId],
    queryFn: async () => {
      const buttons = await base44.entities.ActionButton.listByScreen(screenId);
      return buttons
        .filter(b => b.ativo)
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    },
    initialData: [],
    enabled: !!screenId,
  });

  const { checkPermission } = usePermissions(screenId, currentUser);

  const createMutation = useMutation({
    mutationFn: (data) => {
      if (!screen?.tabela_nome) throw new Error('Tabela não encontrada');
      return base44.entities.create(screen.tabela_nome, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-data', screenId] });
      toast.success('Registro criado com sucesso!');
      setShowForm(false);
      setEditingRecord(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      if (!screen?.tabela_nome) throw new Error('Tabela não encontrada');
      return base44.entities.update(screen.tabela_nome, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-data', screenId] });
      toast.success('Registro atualizado com sucesso!');
      setShowForm(false);
      setEditingRecord(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      if (!screen?.tabela_nome) throw new Error('Tabela não encontrada');
      return base44.entities.delete(screen.tabela_nome, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-data', screenId] });
      toast.success('Registro excluído com sucesso!');
      setSelectedRecords([]);
    },
  });

  useEffect(() => {
    if (recordId && records.length > 0) {
      const record = records.find(r => r.id === recordId);
      if (record) {
        setEditingRecord(record);
        setShowForm(true);
      }
    }
  }, [recordId, records]);

  const handleSubmit = (data) => {
    if (editingRecord) {
      if (!checkPermission('alterar')) {
        toast.error('Você não tem permissão para alterar registros');
        return;
      }
      updateMutation.mutate({ id: editingRecord.id, data });
    } else {
      if (!checkPermission('incluir')) {
        toast.error('Você não tem permissão para incluir registros');
        return;
      }
      createMutation.mutate(data);
    }
  };

  const handleNew = () => {
    if (!checkPermission('incluir')) {
      toast.error('Você não tem permissão para incluir registros');
      return;
    }
    setEditingRecord(null);
    setShowForm(true);
  };

  const handleEdit = () => {
    if (!checkPermission('alterar')) {
      toast.error('Você não tem permissão para alterar registros');
      return;
    }
    if (selectedRecords.length === 1) {
      const record = records.find(r => r.id === selectedRecords[0]);
      setEditingRecord(record);
      setShowForm(true);
    }
  };

  const handleDelete = () => {
    if (!checkPermission('excluir')) {
      toast.error('Você não tem permissão para excluir registros');
      return;
    }
    
    if (selectedRecords.length === 0) return;

    const count = selectedRecords.length;
    if (confirm(`Tem certeza que deseja excluir ${count} ${count === 1 ? 'registro' : 'registros'}?`)) {
      selectedRecords.forEach(id => {
        deleteMutation.mutate(id);
      });
    }
  };

  const executeActionButton = async (button, parametros = {}) => {
    if (button.condicao_visibilidade) {
      try {
        const isVisible = new Function('record', 'fields', 'user', `return ${button.condicao_visibilidade}`)(
          editingRecord,
          fields,
          currentUser
        );
        if (!isVisible) {
          toast.error('Este botão não está disponível no momento');
          return;
        }
      } catch (error) {
        console.error('Erro ao avaliar condição de visibilidade:', error);
      }
    }

    if (button.exibir_modal_confirmacao) {
      const mensagem = button.mensagem_confirmacao || 'Tem certeza que deseja executar esta ação?';
      if (!confirm(mensagem)) {
        return;
      }
    }

    try {
      const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['dynamic-data', screenId] });
      };

      const executeCode = new Function(
        'record',
        'fields', 
        'user',
        'parametros',
        'toast',
        'navigate',
        'refresh',
        'selectedRecords',
        'records',
        'base44',
        'screenId',
        `
        return (async () => {
          ${button.codigo_js}
        })();
        `
      );

      await executeCode(
        editingRecord,
        fields,
        currentUser,
        parametros,
        toast,
        navigate,
        refresh,
        selectedRecords,
        records,
        base44,
        screenId
      );
    } catch (error) {
      console.error('Erro ao executar botão de ação:', error);
      toast.error('Erro ao executar ação: ' + error.message);
    }
  };

  const handleActionButtonClick = (button) => {
    // Se tem parâmetros, abre modal primeiro
    if (button.parametros && button.parametros.length > 0) {
      setSelectedButton(button);
      setParameterDialogOpen(true);
    } else {
      // Executa direto
      executeActionButton(button, {});
    }
  };

  const handleParameterSubmit = (parametros) => {
    if (selectedButton) {
      executeActionButton(selectedButton, parametros);
      setParameterDialogOpen(false); // Close dialog on submit
      setSelectedButton(null);
    }
  };

  const getButtonsByPosition = (position) => {
    return actionButtons.filter(btn => btn.posicao === position);
  };

  const renderActionButtonsMenu = (buttons, position) => {
    if (buttons.length === 0) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-300 hover:bg-slate-50"
          >
            <Zap className="w-4 h-4 mr-2" />
            Ações
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Ações Disponíveis</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {buttons.map((button) => (
            <DropdownMenuItem
              key={button.id}
              onClick={() => handleActionButtonClick(button)}
              className="cursor-pointer"
            >
              <div 
                className="w-2 h-2 rounded-full mr-3"
                style={{ backgroundColor: button.cor }}
              />
              <span>{button.nome}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const customFields = fields.filter(f => 
    f.nome_campo !== 'id' && 
    f.nome_campo !== 'dhinc' && 
    f.nome_campo !== 'dhalter'
  );

  const formatValueForExport = (value, field) => {
    if (value === null || value === undefined) return '-';

    switch (field.tipo) {
      case 'data':
        try {
          return format(new Date(value), 'dd/MM/yyyy');
        } catch {
          return value;
        }
      case 'datetime':
        try {
          return format(new Date(value), 'dd/MM/yyyy HH:mm');
        } catch {
          return value;
        }
      case 'checkbox':
        return value === true || value === 'true' ? 'Sim' : 'Não';
      case 'decimal':
        return typeof value === 'number' ? value.toFixed(2) : value;
      default:
        return value;
    }
  };

  const handleExportCSV = () => {
    const dataToExport = filteredRecords.map(record => {
      const row = {
        'ID': String(record.id).substring(0, 8) + '...',
      };
      
      customFields.forEach(field => {
        row[field.label] = formatValueForExport(record[field.nome_campo], field);
      });

      row['Data Inclusão'] = format(new Date(record.dhinc), 'dd/MM/yyyy HH:mm');
      row['Data Alteração'] = format(new Date(record.dhalter), 'dd/MM/yyyy HH:mm');
      
      return row;
    });

    if (dataToExport.length === 0) {
      toast.error('Nenhum registro para exportar');
      return;
    }

    const headers = Object.keys(dataToExport[0]);
    const csv = [
      headers.join(','),
      ...dataToExport.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${screen.tabela_nome}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso!');
  };

  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map(record => {
      const row = {
        'ID': String(record.id).substring(0, 8) + '...',
      };
      
      customFields.forEach(field => {
        row[field.label] = formatValueForExport(record[field.nome_campo], field);
      });

      row['Data Inclusão'] = format(new Date(record.dhinc), 'dd/MM/yyyy HH:mm');
      row['Data Alteração'] = format(new Date(record.dhalter), 'dd/MM/yyyy HH:mm');
      
      return row;
    });

    if (dataToExport.length === 0) {
      toast.error('Nenhum registro para exportar');
      return;
    }

    const headers = Object.keys(dataToExport[0]);
    const tsv = [
      headers.join('\t'),
      ...dataToExport.map(row => 
        headers.map(header => row[header]).join('\t')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${screen.tabela_nome}_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Excel exportado com sucesso!');
  };

  const handleExportPDF = () => {
    const dataToExport = filteredRecords.map(record => {
      const row = {
        'ID': String(record.id).substring(0, 8) + '...',
      };
      
      customFields.forEach(field => {
        row[field.label] = formatValueForExport(record[field.nome_campo], field);
      });

      row['Data Inclusão'] = format(new Date(record.dhinc), 'dd/MM/yyyy HH:mm');
      row['Data Alteração'] = format(new Date(record.dhalter), 'dd/MM/yyyy HH:mm');
      
      return row;
    });

    if (dataToExport.length === 0) {
      toast.error('Nenhum registro para exportar');
      return;
    }

    const headers = Object.keys(dataToExport[0]);
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${screen.nome} - Relatório</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 1cm;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 10px;
              color: #333;
            }
            h1 {
              text-align: center;
              color: #1e40af;
              font-size: 18px;
              margin-bottom: 5px;
            }
            .subtitle {
              text-align: center;
              color: #64748b;
              font-size: 11px;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background-color: #f1f5f9;
              color: #1e293b;
              padding: 8px;
              text-align: left;
              border: 1px solid #cbd5e1;
              font-weight: 600;
              font-size: 9px;
              text-transform: uppercase;
            }
            td {
              padding: 6px 8px;
              border: 1px solid #e2e8f0;
              font-size: 9px;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            tr:hover {
              background-color: #f1f5f9;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <h1>${screen.nome}</h1>
          <div class="subtitle">
            Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} | Total de registros: ${dataToExport.length}
          </div>
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${dataToExport.map(row => `
                <tr>
                  ${headers.map(h => `<td>${row[h]}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            ${screen.tabela_nome} - Documento gerado automaticamente pelo Sistema
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };

    toast.success('PDF aberto para impressão!');
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRecord(null);
    setSelectedRecords([]);
    setActiveTab("main");
    if (recordId) {
      navigate(`${createPageUrl("dynamicscreen")}?screen_id=${screenId}`);
    }
  };

  const handleBack = () => {
    if (showForm) {
      handleCancel();
    } else {
      navigate(createPageUrl("screenbuilder"));
    }
  };

  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return fields.some(field => {
      const value = record[field.nome_campo];
      if (!value) return false;
      return String(value).toLowerCase().includes(searchLower);
    });
  });

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

  if (!screen.ativa) {
    return (
      <div className="p-8">
        <Alert>
          <Lock className="h-4 h-4" />
          <AlertDescription>Esta tela está inativa no momento</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!checkPermission('visualizar')) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <Lock className="h-4 h-4" />
          <AlertDescription>
            Você não tem permissão para visualizar esta tela
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const toolbarButtons = getButtonsByPosition('toolbar');
  const formTopButtons = getButtonsByPosition('form_top');
  const formBottomButtons = getButtonsByPosition('form_bottom');

  return (
    <div className="flex flex-col h-full">
      {/* Modal de Parâmetros */}
      <ParameterInputDialog
        isOpen={parameterDialogOpen}
        onClose={() => {
          setParameterDialogOpen(false);
          setSelectedButton(null);
        }}
        onSubmit={handleParameterSubmit}
        buttonName={selectedButton?.nome}
        parameters={selectedButton?.parametros || []}
      />

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
            <h1 className="text-2xl font-bold text-slate-900">
              {screen.nome}
              {showForm && (
                <span className="text-base font-normal text-slate-600 ml-3">
                  • {editingRecord ? 'Editando' : 'Novo Registro'}
                </span>
              )}
            </h1>
            {screen.descricao && !showForm && (
              <p className="text-sm text-slate-600">{screen.descricao}</p>
            )}
          </div>
        </div>
      </div>

      {/* Barra CRUD + Menu de Ações */}
      {!showForm && (
        <div className="flex-shrink-0 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex-1">
              <CrudTopBar
                onNew={handleNew}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSearch={setSearchTerm}
                onExportCSV={() => {}}
                onExportExcel={() => {}}
                onExportPDF={() => {}}
                searchTerm={searchTerm}
                selectedRecords={selectedRecords}
                canIncluir={checkPermission('incluir')}
                canAlterar={checkPermission('alterar')}
                canExcluir={checkPermission('excluir')}
                canExportar={checkPermission('exportar')}
              />
            </div>
            {renderActionButtonsMenu(toolbarButtons, 'toolbar')}
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-1 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        {showForm ? (
          <div className="p-6 h-full overflow-auto">
            <div className="max-w-6xl mx-auto">
              <Card className="border-none shadow-lg">
                <CardHeader className="border-b border-slate-200 bg-white pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-lg">
                      {editingRecord ? 'Editar Registro' : 'Novo Registro'}
                    </CardTitle>
                    {renderActionButtonsMenu(formTopButtons, 'form_top')}
                  </div>
                  
                  {editingRecord && subtables.length > 0 ? (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="w-full justify-start bg-slate-50 border-b border-slate-200 rounded-none h-12 p-0">
                        <TabsTrigger 
                          value="main"
                          className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none px-6 py-3"
                        >
                          Dados Principais
                        </TabsTrigger>
                        {subtables.map((subtable) => (
                          <TabsTrigger 
                            key={subtable.id}
                            value={subtable.id}
                            className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none px-6 py-3"
                          >
                            {subtable.nome}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      
                      <TabsContent value="main" className="mt-0">
                        <CardContent className="p-6">
                          <DynamicForm
                            fields={fields}
                            initialData={editingRecord}
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                            isLoading={createMutation.isPending || updateMutation.isPending}
                          />
                          {formBottomButtons.length > 0 && editingRecord && (
                            <div className="flex items-center justify-end mt-4 pt-4 border-t border-slate-200">
                              {renderActionButtonsMenu(formBottomButtons, 'form_bottom')}
                            </div>
                          )}
                        </CardContent>
                      </TabsContent>

                      {subtables.map((subtable) => (
                        <TabsContent key={subtable.id} value={subtable.id} className="mt-0">
                          <SubtableContent
                            subtable={subtable}
                            parentScreen={screen}
                            parentRecordId={editingRecord.id}
                          />
                        </TabsContent>
                      ))}
                    </Tabs>
                  ) : (
                    <div className="border-b border-slate-200 h-1"></div>
                  )}
                </CardHeader>
                
                {(!editingRecord || subtables.length === 0) && (
                  <CardContent className="p-6">
                    <DynamicForm
                      fields={fields}
                      initialData={editingRecord}
                      onSubmit={handleSubmit}
                      onCancel={handleCancel}
                      isLoading={createMutation.isPending || updateMutation.isPending}
                    />
                    {formBottomButtons.length > 0 && editingRecord && (
                      <div className="flex items-center justify-end mt-4 pt-4 border-t border-slate-200">
                        {renderActionButtonsMenu(formBottomButtons, 'form_bottom')}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
        ) : (
          <div className="h-full p-6">
            <DynamicTable
              screen={screen}
              fields={fields}
              records={filteredRecords}
              isLoading={recordsLoading}
              selectedRecords={selectedRecords}
              onSelectionChange={setSelectedRecords}
              canEdit={checkPermission('alterar')}
              canDelete={checkPermission('excluir')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
