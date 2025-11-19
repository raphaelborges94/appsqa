// src/pages/DataSets.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Table,   // ícone para 'table'
  Eye,     // ícone para 'view'
  Code,    // ícone para 'query'
  Trash2,
  Database,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Pencil,
  Save,
  X as CloseIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Gerenciadores de campos
import FieldAliasManager from "../components/bi/dataset/FieldAliasManager";
import CalculatedFieldManager from "../components/bi/dataset/CalculatedFieldManager";

/* =========================================================
   Cliente HTTP self-hosted (sem SDK externo)
   ========================================================= */
const rawBase = import.meta.env.VITE_API_BASE || "/api";
const API_BASE = /^https?:\/\//i.test(rawBase)
  ? (rawBase.endsWith("/api") ? rawBase : rawBase.replace(/\/$/, "") + "/api")
  : rawBase;

const http = axios.create({
  baseURL: API_BASE, // ex.: "/api" (proxy do Vite) ou "http://localhost:5174/api"
  withCredentials: false,
});

// CRUD genérico em /api/entities/:resource
const makeEntity = (resource) => ({
  async list(params = {}) {
    const r = await http.get(`/entities/${resource}`, { params });
    return r.data; // costuma vir { items, total } ou array
  },
  async create(data) {
    const r = await http.post(`/entities/${resource}`, data);
    return r.data;
  },
  async get(id) {
    const r = await http.get(`/entities/${resource}/${id}`);
    return r.data;
  },
  async update(id, data) {
    const r = await http.put(`/entities/${resource}/${id}`, data);
    return r.data;
  },
  async delete(id) {
    const r = await http.delete(`/entities/${resource}/${id}`);
    return r.data;
  },
});

const api = {
  entities: {
    Connection: makeEntity("Connection"),
    DataSource: makeEntity("DataSource"),
  },
  functions: {
    async listDatabaseObjects(payload) {
      const r = await http.post("/db/list-objects", payload);
      return r.data; // { success, tables, views, ... }
    },
    async validateDatasetQuery(payload) {
      const r = await http.post("/dataset/validate", payload);
      return r.data; // { success, fields, preview, row_count, message }
    },
  },
  async health() {
    const r = await http.get("/health");
    return r.data;
  },
};

/* =========================================================
   Helpers
   ========================================================= */
// Normaliza respostas em {items,total} → array para UI
const normalizeList = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.data)) return raw.data;
  }
  return [];
};

// Tipos de fonte
const sourceTypes = {
  table: { label: "Tabela", icon: Table, color: "text-blue-600" },
  view: { label: "View", icon: Eye, color: "text-green-600" },
  query: { label: "Query SQL", icon: Code, color: "text-purple-600" },
};

export default function DataSets() {
  const queryClient = useQueryClient();

  // Dialogs/edição
  const [open, setOpen] = useState(false);
  const [editingDataset, setEditingDataset] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Estado do formulário de criação
  const [sourceType, setSourceType] = useState("table");
  const [selectedConnection, setSelectedConnection] = useState("");
  const [formName, setFormName] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");

  // Validação
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // Objetos de BD (tabelas/views)
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [availableViews, setAvailableViews] = useState([]);

  // Evitar múltiplas chamadas quando troca conexão
  const lastConnectionRef = useRef(null);

  /* ========== Queries ========== */
  const {
    data: connections = [],
    isLoading: loadingConnections,
    error: connectionsError,
  } = useQuery({
    queryKey: ["connections"],
    queryFn: () => api.entities.Connection.list({ order: "-created_date" }),
    select: normalizeList,
  });

  const {
    data: datasets = [],
    isLoading: loadingDatasets,
    error: datasetsError,
  } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => api.entities.DataSource.list({ order: "-updated_date" }),
    select: normalizeList,
  });

  /* ========== Reações a troca de conexão ========== */
  useEffect(() => {
    if (selectedConnection && selectedConnection !== lastConnectionRef.current) {
      lastConnectionRef.current = selectedConnection;
      loadDatabaseObjects(selectedConnection);
      setValidationResult(null);
      setSelectedTable("");
      setSqlQuery("");
    } else if (!selectedConnection && lastConnectionRef.current) {
      lastConnectionRef.current = null;
      setAvailableTables([]);
      setAvailableViews([]);
      setValidationResult(null);
      setSelectedTable("");
      setSqlQuery("");
    }
  }, [selectedConnection]);

  /* ========== Utilidades de API ========== */
  const loadDatabaseObjects = async (connectionId) => {
    setLoadingObjects(true);
    setAvailableTables([]);
    setAvailableViews([]);

    try {
      const connection = connections.find(
        (c) => String(c.id) === String(connectionId)
      );
      if (!connection) throw new Error("Conexão não encontrada");

      // Modo "mock" (opcional para demos)
      if (connection.type === "mock") {
        await new Promise((r) => setTimeout(r, 500));
        setAvailableTables([
          "vendas",
          "clientes",
          "produtos",
          "funcionarios",
          "pedidos",
        ]);
        setAvailableViews([
          "vw_vendas_mensal",
          "vw_top_clientes",
          "vw_estoque_baixo",
        ]);
        toast.success("✅ Dados de demonstração carregados", { duration: 1500 });
        return;
      }

      toast.info("🔍 Buscando tabelas e views...", { duration: 1800 });

      const result = await api.functions.listDatabaseObjects({
        connection_id: connectionId,
      });

      if (result?.success) {
        setAvailableTables(result.tables || []);
        setAvailableViews(result.views || []);
        toast.success(
          `✅ Encontradas ${result.tables?.length || 0} tabelas e ${
            result.views?.length || 0
          } views`,
          { duration: 2200 }
        );
      } else {
        throw new Error(result?.error || "Erro ao buscar objetos do banco");
      }
    } catch (err) {
      console.error("[list-objects] erro:", err);
      toast.error(
        "❌ Erro: " + (err.response?.data?.error || err.message || String(err)),
        { duration: 5000 }
      );
      setAvailableTables([]);
      setAvailableViews([]);
    } finally {
      setLoadingObjects(false);
    }
  };

  const handleValidate = async (e) => {
    e.preventDefault();

    const connectionId = selectedConnection;
    if (!connectionId) return toast.error("⚠️ Selecione uma conexão");

    if (sourceType !== "query" && !selectedTable)
      return toast.error("⚠️ Selecione uma tabela ou view");

    if (sourceType === "query" && !sqlQuery)
      return toast.error("⚠️ Digite uma query SQL");

    setValidating(true);
    setValidationResult(null);

    try {
      // opção de “mock”
      const connection = connections.find(
        (c) => String(c.id) === String(connectionId)
      );
      if (connection?.type === "mock") {
        await new Promise((r) => setTimeout(r, 800));
        setValidationResult({
          success: true,
          fields: [
            { name: "id", type: "number", aggregable: false },
            { name: "nome", type: "string", aggregable: false },
            { name: "valor", type: "number", aggregable: true },
            { name: "data", type: "date", aggregable: false },
          ],
          preview: [
            { id: 1, nome: "Produto A", valor: 150.5, data: "2024-01-01" },
            { id: 2, nome: "Produto B", valor: 280.0, data: "2024-01-02" },
            { id: 3, nome: "Produto C", valor: 75.2, data: "2024-01-03" },
          ],
          row_count: 12345,
          message: "Query validada (mock).",
        });
        toast.success("✅ Validação mock concluída!", { duration: 1500 });
        return;
      }

      toast.info("🔍 Validando dataset...", { duration: 1800 });

      const result = await api.functions.validateDatasetQuery({
        connection_id: connectionId,
        source_type: sourceType,
        table_name: sourceType !== "query" ? selectedTable : null,
        sql_query: sourceType === "query" ? sqlQuery : null,
      });

      if (result?.success) {
        setValidationResult(result);
        toast.success(
          `✅ Dataset validado! ${result.fields?.length || 0} campos encontrados.`,
          { duration: 2500 }
        );
      } else {
        throw new Error(result?.message || "Erro na validação");
      }
    } catch (err) {
      console.error("[validate] erro:", err);
      toast.error("❌ Erro: " + (err.message || String(err)), {
        duration: 5000,
      });
      setValidationResult({ success: false, message: err.message });
    } finally {
      setValidating(false);
    }
  };

  /* ========== Mutations (CRUD DataSource) ========== */
  const createMutation = useMutation({
    mutationFn: async (data) => api.entities.DataSource.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      toast.success("✅ Dataset criado com sucesso!", { duration: 3000 });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("❌ Erro ao criar dataset: " + error.message, {
        duration: 5000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => api.entities.DataSource.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      toast.success("✅ Dataset atualizado com sucesso!", { duration: 3000 });
      setEditDialogOpen(false);
      setEditingDataset(null);
    },
    onError: (error) => {
      toast.error("❌ Erro ao atualizar dataset: " + error.message, {
        duration: 5000,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.entities.DataSource.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      toast.success("✅ Dataset excluído!", { duration: 2000 });
    },
    onError: (error) => {
      toast.error("❌ Erro ao excluir dataset: " + error.message, {
        duration: 5000,
      });
    },
  });

  /* ========== Ações UI ========== */
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validationResult?.success) {
      toast.error("⚠️ Valide o dataset antes de criar", { duration: 3000 });
      return;
    }

    await createMutation.mutateAsync({
      connection_id: selectedConnection,
      name: formName,
      source_type: sourceType,
      table_name: sourceType !== "query" ? selectedTable : null,
      sql_query: sourceType === "query" ? sqlQuery : null,
      fields: validationResult.fields,
      sample_data: validationResult.preview,
      row_count: validationResult.row_count || 0,
      last_validated: new Date().toISOString(),
      field_aliases: {},
      calculated_fields: [],
    });
  };

  const handleEdit = (dataset) => {
    setEditingDataset({
      ...dataset,
      field_aliases: dataset.field_aliases || {},
      calculated_fields: dataset.calculated_fields || [],
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingDataset) return;
    await updateMutation.mutateAsync({
      id: editingDataset.id,
      data: {
        name: editingDataset.name,
        field_aliases: editingDataset.field_aliases || {},
        calculated_fields: editingDataset.calculated_fields || [],
      },
    });
  };

  const resetForm = () => {
    setSourceType("table");
    setSelectedConnection("");
    setValidationResult(null);
    setAvailableTables([]);
    setAvailableViews([]);
    setFormName("");
    setSelectedTable("");
    setSqlQuery("");
    lastConnectionRef.current = null;
  };

  /* ========== UI ========== */
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>

        </div>

        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Dataset
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Criar Novo Dataset
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Dataset *</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Vendas 2024"
                  required
                />
              </div>

              <div>
                <Label htmlFor="connection">Conexão *</Label>
                <Select
                  value={selectedConnection}
                  onValueChange={setSelectedConnection}
                  required
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingConnections
                          ? "Carregando..."
                          : "Selecione uma conexão..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.length === 0 ? (
                      <div className="p-2 text-xs text-slate-500 text-center">
                        Nenhuma conexão disponível
                      </div>
                    ) : (
                      connections
                        .filter((c) => (c.is_active ?? c.active ?? true))
                        .map((conn) => (
                          <SelectItem key={conn.id} value={String(conn.id)}>
                            <div className="flex items-center gap-2">
                              <Database className="w-3 h-3" />
                              <span>{conn.name}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {conn.type}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>

                {selectedConnection && loadingObjects && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Buscando objetos do banco...
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-3 block">Tipo de Fonte de Dados *</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {Object.entries(sourceTypes).map(([type, config]) => {
                    const Icon = config.icon;
                    const active = sourceType === type;
                    return (
                      <Button
                        key={type}
                        type="button"
                        variant={active ? "default" : "outline"}
                        onClick={() => {
                          setSourceType(type);
                          setValidationResult(null);
                          setSelectedTable("");
                          setSqlQuery("");
                        }}
                        className="h-auto py-3"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Icon
                            className={`w-5 h-5 ${
                              active ? "text-white" : config.color
                            }`}
                          />
                          <span className="text-xs">{config.label}</span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {sourceType !== "query" && (
                <div>
                  <Label htmlFor="table_name">
                    {sourceType === "table" ? "Tabela" : "View"} *
                  </Label>
                  <Select
                    value={selectedTable}
                    onValueChange={setSelectedTable}
                    required
                    disabled={loadingObjects || !selectedConnection}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !selectedConnection
                            ? "Selecione uma conexão primeiro"
                            : loadingObjects
                            ? "Carregando..."
                            : `Selecione ${
                                sourceType === "table" ? "uma tabela" : "uma view"
                              }...`
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceType === "table" ? (
                        availableTables.length === 0 ? (
                          <div className="p-2 text-xs text-slate-500 text-center">
                            {loadingObjects
                              ? "Carregando..."
                              : "Nenhuma tabela encontrada"}
                          </div>
                        ) : (
                          availableTables.map((table) => (
                            <SelectItem key={table} value={table}>
                              <div className="flex items-center gap-2">
                                <Table className="w-3 h-3 text-blue-600" />
                                {table}
                              </div>
                            </SelectItem>
                          ))
                        )
                      ) : availableViews.length === 0 ? (
                        <div className="p-2 text-xs text-slate-500 text-center">
                          {loadingObjects
                            ? "Carregando..."
                            : "Nenhuma view encontrada"}
                        </div>
                      ) : (
                        availableViews.map((view) => (
                          <SelectItem key={view} value={view}>
                            <div className="flex items-center gap-2">
                              <Eye className="w-3 h-3 text-green-600" />
                              {view}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {sourceType === "query" && (
                <div>
                  <Label htmlFor="sql_query">Query SQL *</Label>
                  <Textarea
                    id="sql_query"
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder={`SELECT
  p.nome as produto,
  SUM(v.quantidade) as total_vendas,
  SUM(v.valor) as valor_total
FROM vendas v
JOIN produtos p ON v.produto_id = p.id
GROUP BY p.nome
ORDER BY total_vendas DESC`}
                    rows={6}
                    className="font-mono text-xs"
                    required
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleValidate}
                  disabled={
                    validating ||
                    !selectedConnection ||
                    (sourceType !== "query" && !selectedTable) ||
                    (sourceType === "query" && !sqlQuery)
                  }
                  className="flex-1"
                >
                  {validating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Validar Dataset
                    </>
                  )}
                </Button>
              </div>

              {validationResult && (
                <Alert
                  className={
                    validationResult.success
                      ? "bg-green-50 dark:bg-green-900/10 border-green-500"
                      : "bg-red-50 dark:bg-red-900/10 border-red-500"
                  }
                >
                  {validationResult.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <AlertDescription
                    className={
                      validationResult.success
                        ? "text-green-800 dark:text-green-200"
                        : "text-red-800 dark:text-red-200"
                    }
                  >
                    {validationResult.success ? (
                      <>
                        <strong>✅ Validação bem-sucedida!</strong>
                        <br />
                        {validationResult.fields?.length || 0} campos
                        detectados, ~
                        {validationResult.row_count?.toLocaleString("pt-BR") ||
                          0}{" "}
                        registros encontrados.
                      </>
                    ) : (
                      <>
                        <strong>❌ Erro na validação:</strong>
                        <br />
                        {validationResult.message}
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {validationResult?.success &&
                validationResult.fields &&
                validationResult.preview?.length > 0 && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Preview dos Dados Reais (primeiras{" "}
                        {validationResult.preview.length} linhas)
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                          <tr>
                            {Object.keys(validationResult.preview[0]).map(
                              (key) => (
                                <th
                                  key={key}
                                  className="px-4 py-2 text-left font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700"
                                >
                                  {key}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {validationResult.preview.map((row, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                            >
                              {Object.values(row).map((value, vIdx) => (
                                <td
                                  key={vIdx}
                                  className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                >
                                  {value === null ? (
                                    <span className="text-slate-400 italic">
                                      null
                                    </span>
                                  ) : typeof value === "boolean" ? (
                                    value ? (
                                      "✓"
                                    ) : (
                                      "✗"
                                    )
                                  ) : (
                                    String(value)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || !validationResult?.success
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Criar Dataset
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog de Edição */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(isOpen) => {
          setEditDialogOpen(isOpen);
          if (!isOpen) setEditingDataset(null);
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Editar Dataset: {editingDataset?.name}
            </DialogTitle>
          </DialogHeader>

          {editingDataset && (
            <Tabs defaultValue="aliases" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="aliases">Apelidos de Campos</TabsTrigger>
                <TabsTrigger value="calculated">Campos Calculados</TabsTrigger>
                <TabsTrigger value="info">Informações</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4 px-2">
                <TabsContent value="aliases" className="mt-0">
                  <FieldAliasManager
                    fields={editingDataset.fields || []}
                    aliases={editingDataset.field_aliases || {}}
                    onAliasesChange={(aliases) =>
                      setEditingDataset((prev) => ({
                        ...prev,
                        field_aliases: aliases,
                      }))
                    }
                  />
                </TabsContent>

                <TabsContent value="calculated" className="mt-0">
                  <CalculatedFieldManager
                    fields={editingDataset.fields || []}
                    calculatedFields={editingDataset.calculated_fields || []}
                    onCalculatedFieldsChange={(fields) =>
                      setEditingDataset((prev) => ({
                        ...prev,
                        calculated_fields: fields,
                      }))
                    }
                  />
                </TabsContent>

                <TabsContent value="info" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Informações do Dataset
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Nome do Dataset</Label>
                        <Input
                          value={editingDataset.name}
                          onChange={(e) =>
                            setEditingDataset((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Tipo de Fonte</Label>
                        <div className="mt-1">
                          <Badge variant="secondary">
                            {sourceTypes[editingDataset.source_type]?.label ||
                              editingDataset.source_type}
                          </Badge>
                        </div>
                      </div>

                      {editingDataset.table_name && (
                        <div>
                          <Label>Tabela/View</Label>
                          <div className="mt-1 text-sm font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded">
                            {editingDataset.table_name}
                          </div>
                        </div>
                      )}

                      {editingDataset.sql_query && (
                        <div>
                          <Label>Query SQL</Label>
                          <Textarea
                            value={editingDataset.sql_query}
                            readOnly
                            className="mt-1 font-mono text-xs h-32 resize-none"
                          />
                        </div>
                      )}

                      <div>
                        <Label>Campos Originais</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {editingDataset.fields?.map((field) => (
                            <Badge key={field.name} variant="outline">
                              {field.name}{" "}
                              <span className="ml-1 text-[10px]">
                                ({field.type})
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <Label className="text-xs text-slate-500">
                            Registros
                          </Label>
                          <div className="text-2xl font-bold">
                            {editingDataset.row_count?.toLocaleString("pt-BR") ||
                              0}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">
                            Última Validação
                          </Label>
                          <div className="text-sm">
                            {editingDataset.last_validated
                              ? format(
                                  new Date(editingDataset.last_validated),
                                  "dd/MM/yyyy 'às' HH:mm",
                                  { locale: ptBR }
                                )
                              : "Nunca"}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          )}

          <div className="flex gap-2 pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEditingDataset(null);
              }}
              className="flex-1"
            >
              <CloseIcon className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lista de Datasets */}
      <Card className="shadow-lg">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5" />
            Meus DataSets
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingDatasets ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : datasets.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Nenhum dataset ainda
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Crie seu primeiro dataset para começar
              </p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Dataset
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {datasets.map((dataset) => {
                const Icon = sourceTypes[dataset.source_type]?.icon || Database;
                const hasAliases =
                  dataset.field_aliases &&
                  Object.keys(dataset.field_aliases).length > 0;
                const hasCalculatedFields =
                  dataset.calculated_fields &&
                  dataset.calculated_fields.length > 0;

                return (
                  <div
                    key={dataset.id}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                            {dataset.name}
                          </h3>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {sourceTypes[dataset.source_type]?.label}
                          </Badge>
                          {hasAliases && (
                            <Badge className="text-xs bg-blue-600 text-white">
                              {Object.keys(dataset.field_aliases).length} apelidos
                            </Badge>
                          )}
                          {hasCalculatedFields && (
                            <Badge className="text-xs bg-purple-600 text-white">
                              {dataset.calculated_fields.length} calculados
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                          <span>{dataset.fields?.length || 0} campos</span>
                          <span>•</span>
                          <span>
                            ~{dataset.row_count?.toLocaleString("pt-BR") || 0} registros
                          </span>
                          <span>•</span>
                          <span>
                            {dataset.source_type === "query"
                              ? "Query customizada"
                              : dataset.table_name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(dataset)}
                          aria-label="Editar dataset"
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (
                              confirm("Tem certeza que deseja excluir este dataset?")
                            ) {
                              deleteMutation.mutate(dataset.id);
                            }
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          aria-label="Excluir dataset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
