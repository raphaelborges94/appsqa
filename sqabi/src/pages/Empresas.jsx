import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Building2,
  Trash2,
  MoreVertical,
  Edit,
  FileText,
  Briefcase,
  Network,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

// Função para aplicar máscara de CNPJ
function formatCNPJ(value) {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');

  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
}

export default function Empresas() {
  const [open, setOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [cnpjValue, setCnpjValue] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState('');
  const [grupoEmpresarialSelecionado, setGrupoEmpresarialSelecionado] = useState('');
  const queryClient = useQueryClient();

  // Fetch empresas
  const { data: empresas = [], isLoading, error } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => base44.entities.Empresa.list({ order: '-created_date' }),
    select: (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.items)) return raw.items;
      if (Array.isArray(raw.data)) return raw.data;
      return [];
    },
  });

  // Fetch grupos empresariais (para o select)
  const { data: gruposEmpresariais = [] } = useQuery({
    queryKey: ['empresas', 'grupos'],
    queryFn: async () => {
      const response = await base44.entities.Empresa.list({ tipo: 'grupo_empresarial' });
      return response.items || [];
    },
  });

  // Create empresa mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log('📝 [Empresas] Criando empresa:', data);
      const empresa = await base44.entities.Empresa.create(data);
      console.log('✅ [Empresas] Empresa criada:', empresa);
      return empresa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      setOpen(false);
      setEditingEmpresa(null);
      setCnpjValue('');
    },
    onError: (error) => {
      console.error('❌ [Empresas] Erro ao criar:', error);
      alert('Erro ao criar empresa: ' + error.message);
    },
  });

  // Update empresa mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('📝 [Empresas] Atualizando empresa:', id, data);
      const empresa = await base44.entities.Empresa.update(id, data);
      console.log('✅ [Empresas] Empresa atualizada:', empresa);
      return empresa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      setOpen(false);
      setEditingEmpresa(null);
      setCnpjValue('');
    },
    onError: (error) => {
      console.error('❌ [Empresas] Erro ao atualizar:', error);
      alert('Erro ao atualizar empresa: ' + error.message);
    },
  });

  // Delete empresa mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => {
      console.log('🗑️ [Empresas] Deletando empresa:', id);
      return base44.entities.Empresa.delete(id);
    },
    onSuccess: () => {
      console.log('✅ [Empresas] Empresa deletada');
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
    },
    onError: (error) => {
      console.error('❌ [Empresas] Erro ao deletar:', error);
      alert('Erro ao deletar empresa: ' + error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
      nomeempresa: formData.get('nomeempresa'),
      numdoc: formData.get('numdoc'),
      grupoemp: grupoEmpresarialSelecionado || null,
      obs: formData.get('obs'),
      is_grupo_empresarial: tipoSelecionado === 'grupo_empresarial',
      is_empresa: tipoSelecionado === 'empresa',
    };

    if (editingEmpresa) {
      updateMutation.mutate({ id: editingEmpresa.codemp, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Resetar tipo quando abrir o diálogo
  useEffect(() => {
    if (open && editingEmpresa) {
      // Define o tipo baseado nas flags da empresa em edição
      if (editingEmpresa.is_grupo_empresarial) {
        setTipoSelecionado('grupo_empresarial');
      } else if (editingEmpresa.is_empresa) {
        setTipoSelecionado('empresa');
      } else {
        setTipoSelecionado('');
      }
      setGrupoEmpresarialSelecionado(editingEmpresa.grupoemp || '');
    } else if (!open) {
      setTipoSelecionado('');
      setGrupoEmpresarialSelecionado('');
    }
  }, [open, editingEmpresa]);

  const handleEdit = (empresa) => {
    setEditingEmpresa(empresa);
    setCnpjValue(empresa.numdoc || '');
    setOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta empresa?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) {
      setEditingEmpresa(null);
      setCnpjValue('');
    }
  };

  const handleCNPJChange = (e) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpjValue(formatted);
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400">
              Erro ao carregar empresas: {error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Cadastro de Empresas
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Gerencie as empresas do sistema
            </p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}
              </DialogTitle>
              <DialogDescription>
                {editingEmpresa
                  ? 'Atualize as informações da empresa abaixo.'
                  : 'Cadastre uma nova empresa no sistema.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Código da Empresa (exibir apenas em edição) */}
                {editingEmpresa && (
                  <div className="col-span-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Código da Empresa
                    </Label>
                    <Input
                      value={editingEmpresa.codemp}
                      disabled
                      className="mt-1.5 bg-slate-100 dark:bg-slate-800"
                    />
                  </div>
                )}

                {/* Nome da Empresa */}
                <div className="col-span-2">
                  <Label htmlFor="nomeempresa" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Nome da Empresa
                  </Label>
                  <Input
                    id="nomeempresa"
                    name="nomeempresa"
                    defaultValue={editingEmpresa?.nomeempresa}
                    placeholder="Ex: Empresa Exemplo Ltda"
                    required
                    className="mt-1.5"
                  />
                </div>

                {/* CNPJ */}
                <div className="col-span-2">
                  <Label htmlFor="numdoc" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    CNPJ
                  </Label>
                  <Input
                    id="numdoc"
                    name="numdoc"
                    value={cnpjValue}
                    onChange={handleCNPJChange}
                    placeholder="00.000.000/0000-00"
                    required
                    maxLength={18}
                    className="mt-1.5"
                  />
                </div>

                {/* Tipo de Empresa */}
                <div className="col-span-2">
                  <Label className="flex items-center gap-2 mb-1.5">
                    <Network className="w-4 h-4" />
                    Tipo de Empresa
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setTipoSelecionado(tipoSelecionado === 'grupo_empresarial' ? '' : 'grupo_empresarial')}
                      className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        tipoSelecionado === 'grupo_empresarial'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={tipoSelecionado === 'grupo_empresarial'}
                        onChange={() => {}}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Network className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium">Grupo Empresarial</span>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => setTipoSelecionado(tipoSelecionado === 'empresa' ? '' : 'empresa')}
                      className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        tipoSelecionado === 'empresa'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={tipoSelecionado === 'empresa'}
                        onChange={() => {}}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">Empresa</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grupo Empresarial - Apenas se NÃO for tipo "Grupo Empresarial" */}
                {tipoSelecionado !== 'grupo_empresarial' && (
                  <div className="col-span-2">
                    <Label htmlFor="grupoemp" className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Grupo Empresarial (Opcional)
                    </Label>
                    {gruposEmpresariais.length > 0 ? (
                      <div className="space-y-2">
                        <Select
                          value={grupoEmpresarialSelecionado || undefined}
                          onValueChange={setGrupoEmpresarialSelecionado}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Selecione um grupo empresarial (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {gruposEmpresariais.map((grupo) => (
                              <SelectItem key={grupo.codemp} value={grupo.nomeempresa}>
                                {grupo.nomeempresa}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {grupoEmpresarialSelecionado && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setGrupoEmpresarialSelecionado('')}
                            className="text-xs"
                          >
                            Limpar seleção
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1.5 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Nenhum grupo empresarial cadastrado. Cadastre primeiro um registro do tipo "Grupo Empresarial".
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Observações */}
                <div className="col-span-2">
                  <Label htmlFor="obs" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Observações
                  </Label>
                  <Textarea
                    id="obs"
                    name="obs"
                    defaultValue={editingEmpresa?.obs}
                    placeholder="Informações adicionais sobre a empresa"
                    rows={4}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Salvando...'
                    : editingEmpresa
                      ? 'Atualizar'
                      : 'Criar Empresa'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empresas Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Empresas Cadastradas</span>
            <Badge variant="outline" className="font-normal">
              {empresas.length} {empresas.length === 1 ? 'empresa' : 'empresas'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
                Carregando empresas...
              </p>
            </div>
          ) : empresas.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                Nenhuma empresa cadastrada
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Clique em "Nova Empresa" para começar
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome da Empresa</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Grupo Empresarial</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas.map((empresa) => (
                    <TableRow key={empresa.codemp}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">
                          #{empresa.codemp}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          {empresa.nomeempresa}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <FileText className="w-3 h-3" />
                          {empresa.numdoc}
                        </div>
                      </TableCell>
                      <TableCell>
                        {empresa.is_grupo_empresarial ? (
                          <Badge className="gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 hover:bg-purple-100">
                            <Network className="w-3 h-3" />
                            Grupo Empresarial
                          </Badge>
                        ) : empresa.is_empresa ? (
                          <Badge className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100">
                            <Building2 className="w-3 h-3" />
                            Empresa
                          </Badge>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {empresa.grupoemp ? (
                          <Badge variant="secondary" className="font-normal">
                            <Briefcase className="w-3 h-3 mr-1" />
                            {empresa.grupoemp}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                        {empresa.created_date
                          ? format(new Date(empresa.created_date), "dd/MM/yyyy", { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(empresa)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(empresa.codemp)}
                              className="text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
