import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Database, CheckCircle2, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

export default function DataSources() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [connectionType, setConnectionType] = useState('postgresql');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    ssl: false,
  });

  // >>> Sempre entregar array à UI, independente do formato do backend
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: () => base44.entities.Connection.list({ order: '-created_date' }),
    select: (raw) => {
      if (!raw) return []
      if (Array.isArray(raw)) return raw
      if (Array.isArray(raw.items)) return raw.items
      if (Array.isArray(raw.data)) return raw.data
      return []
    },
  })

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Connection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      setOpen(false);
      resetForm();
      toast.success('Conexão criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar conexão: ' + (error?.message || 'desconhecido'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Connection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Conexão excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + (error?.message || 'desconhecido'));
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      host: '',
      port: 5432,
      database: '',
      username: '',
      password: '',
      ssl: false,
    });
    setConnectionType('postgresql');
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      if (connectionType === 'mock') {
        await new Promise(resolve => setTimeout(resolve, 500))
        const ok = { success: true, message: 'Conexão de demonstração validada!' }
        setTestResult(ok)
        toast.success('Conexão válida!')
        return
      }

      toast.info('Conectando ao PostgreSQL...', { duration: 1200 })

      const payload = {
        type: connectionType,
        host: (formData.host || '').trim(),
        port: Number(formData.port) || 5432,
        database: (formData.database || '').trim(),
        username: (formData.username || '').trim(),
        password: formData.password || '',
        ssl: !!formData.ssl,
      }

      const resp = await base44.functions.invoke('testDatabaseConnection', payload)
      const result = resp?.result ?? resp?.data ?? resp

      setTestResult(result)

      if (result?.success) {
        toast.success('✅ Conexão estabelecida com sucesso!')
      } else {
        toast.error('❌ ' + (result?.message || 'Falha ao conectar'))
      }
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Erro inesperado'
      const errorResult = { success: false, message: 'Erro ao testar conexão: ' + msg }
      setTestResult(errorResult)
      toast.error(errorResult.message)
    } finally {
      setTesting(false)
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();

    if (!testResult?.success) {
      toast.error('⚠️ Teste a conexão antes de criar');
      return;
    }

    const connectionData = {
      name: formData.name,
      type: connectionType,
      config: connectionType === 'mock'
        ? {}
        : {
            host: formData.host,
            port: Number(formData.port) || 5432,
            database: formData.database,
            username: formData.username,
            password: formData.password,
            ssl: !!formData.ssl,
          },
      is_active: true,
    };

    createMutation.mutate(connectionData);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>

        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Conexão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Conexão</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <Label htmlFor="name">Nome da Conexão *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Produção"
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo de Conexão *</Label>
                <Select value={connectionType} onValueChange={setConnectionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="mock">Demonstração (Mock)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {connectionType === 'postgresql' && (
                <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-900 dark:text-white">
                    <Database className="w-4 h-4" />
                    Configurações PostgreSQL
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="host">Host / Servidor *</Label>
                      <Input
                        id="host"
                        value={formData.host}
                        onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                        placeholder="localhost"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="port">Porta *</Label>
                      <Input
                        id="port"
                        type="number"
                        value={formData.port}
                        onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                        placeholder="5432"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="database">Nome do Banco de Dados *</Label>
                      <Input
                        id="database"
                        value={formData.database}
                        onChange={(e) => setFormData(prev => ({ ...prev, database: e.target.value }))}
                        placeholder="postgres"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="username">Usuário *</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="postgres"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="password">Senha *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    <div className="col-span-2 flex items-center gap-2">
                      <Checkbox
                        id="ssl"
                        checked={!!formData.ssl}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({ ...prev, ssl: Boolean(checked) }))
                        }
                      />
                      <Label htmlFor="ssl" className="text-sm font-normal cursor-pointer">
                        Usar SSL/TLS (recomendado para produção)
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleTestConnection}
                disabled={
                  testing ||
                  (connectionType === 'postgresql' &&
                    (!formData.host || !formData.database || !formData.username || !formData.password))
                }
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testando Conexão Real...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Testar Conexão
                  </>
                )}
              </Button>

              {testResult && (
                <Alert className={testResult.success ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-red-500 bg-red-50 dark:bg-red-900/10'}>
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <AlertDescription className={testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
                        {testResult.message}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !testResult?.success}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Criar Conexão
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
            Minhas Conexões
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Nenhuma conexão configurada
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Crie sua primeira conexão com banco de dados
              </p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Conexão
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                      <Database className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                            {conn.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {conn.type?.toUpperCase?.() || 'POSTGRESQL'}
                            </Badge>
                            <Badge
                              variant={conn.is_active ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {conn.is_active ? '✓ Ativa' : 'Inativa'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {conn.type !== 'mock' && conn.config && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 mt-2">
                          <div><strong>Host:</strong> {conn.config.host}</div>
                          <div><strong>Banco:</strong> {conn.config.database}</div>
                          <div><strong>Usuário:</strong> {conn.config.username}</div>
                          {conn.config.ssl && <Badge variant="outline" className="text-xs">🔒 SSL</Badge>}
                        </div>
                      )}

                      {conn.created_date && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Criada em {format(new Date(conn.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir esta conexão?')) {
                          deleteMutation.mutate(conn.id);
                        }
                      }}
                      className="text-slate-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
