import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Users as UsersIcon,
  Trash2,
  MoreVertical,
  Edit,
  Mail,
  Phone,
  User,
  Shield,
  CheckCircle,
  XCircle,
  IdCard,
  Building2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function Users() {
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [perfilSelecionado, setPerfilSelecionado] = useState('');
  const [cpf, setCpf] = useState('');
  const [empresaSelecionada, setEmpresaSelecionada] = useState('');
  const [buscaEmpresa, setBuscaEmpresa] = useState('');
  const queryClient = useQueryClient();

  // Função para formatar CPF
  function formatCPF(value) {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  }

  // Handler para mudança no campo CPF
  const handleCPFChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
  };

  // Fetch users
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list({ order: '-data_criacao' }),
    select: (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.items)) return raw.items;
      if (Array.isArray(raw.data)) return raw.data;
      return [];
    },
  });

  // Fetch empresas
  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => base44.entities.Empresa.list({ order: 'nomeempresa' }),
    select: (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.items)) return raw.items;
      if (Array.isArray(raw.data)) return raw.data;
      return [];
    },
  });

  // Filtrar empresas baseado na busca
  const empresasFiltradas = empresas.filter(emp => {
    if (!buscaEmpresa) return true;
    const busca = buscaEmpresa.toLowerCase();
    const codigo = emp.codemp?.toString() || '';
    const nome = emp.nomeempresa?.toLowerCase() || '';
    return codigo.includes(busca) || nome.includes(busca);
  });

  useEffect(() => {
    console.log('🔍 [Users] Estado atual:', {
      isLoading,
      error: error?.message,
      usersCount: users?.length,
      users: users?.map(u => ({ codusuario: u.codusuario, nome: u.nome, email: u.email }))
    });
  }, [isLoading, error, users]);

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log('📝 [Users] Criando usuário:', data);
      const user = await base44.entities.User.create(data);
      console.log('✅ [Users] Usuário criado:', user);
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
      setEditingUser(null);
    },
    onError: (error) => {
      console.error('❌ [Users] Erro ao criar:', error);
      alert('Erro ao criar usuário: ' + error.message);
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async ({ codusuario, data }) => {
      console.log('📝 [Users] Atualizando usuário:', codusuario, data);
      const user = await base44.entities.User.update(codusuario, data);
      console.log('✅ [Users] Usuário atualizado:', user);
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
      setEditingUser(null);
    },
    onError: (error) => {
      console.error('❌ [Users] Erro ao atualizar:', error);
      alert('Erro ao atualizar usuário: ' + error.message);
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => {
      console.log('🗑️ [Users] Deletando usuário:', id);
      return base44.entities.User.delete(id);
    },
    onSuccess: () => {
      console.log('✅ [Users] Usuário deletado');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('❌ [Users] Erro ao deletar:', error);
      alert('Erro ao deletar usuário: ' + error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      nome: formData.get('nome'),
      email: formData.get('email'),
      cpf: cpf.replace(/\D/g, ''), // Remove formatação do CPF
      telefone: formData.get('telefone'),
      perfil: perfilSelecionado,
      codemp: empresaSelecionada ? parseInt(empresaSelecionada) : null,
      ativo: formData.get('ativo') === 'on',
    };

    if (editingUser) {
      updateMutation.mutate({ codusuario: editingUser.codusuario, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Resetar campos quando abrir o diálogo
  useEffect(() => {
    if (open && editingUser) {
      setPerfilSelecionado(editingUser.perfil || 'Visualizador');
      setCpf(editingUser.cpf || '');
      setEmpresaSelecionada(editingUser.codemp?.toString() || '');
      setBuscaEmpresa('');
    } else if (!open) {
      setPerfilSelecionado('Visualizador');
      setCpf('');
      setEmpresaSelecionada('');
      setBuscaEmpresa('');
    }
  }, [open, editingUser]);

  const handleEdit = (user) => {
    setEditingUser(user);
    setOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja deletar este usuário?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) {
      setEditingUser(null);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400">
              Erro ao carregar usuários: {error.message}
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
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <UsersIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Gerenciamento de Usuários
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Gerencie os usuários do sistema
            </p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? 'Atualize as informações do usuário abaixo.'
                  : 'Cadastre um novo usuário. Um link de acesso será enviado por email.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Nome Completo */}
                <div className="col-span-2">
                  <Label htmlFor="nome" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nome Completo
                  </Label>
                  <Input
                    id="nome"
                    name="nome"
                    defaultValue={editingUser?.nome}
                    placeholder="Ex: João Silva"
                    required
                    className="mt-1.5"
                  />
                </div>

                {/* Email */}
                <div className="col-span-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingUser?.email}
                    placeholder="usuario@empresa.com"
                    required
                    className="mt-1.5"
                  />
                </div>

                {/* CPF */}
                <div>
                  <Label htmlFor="cpf" className="flex items-center gap-2">
                    <IdCard className="w-4 h-4" />
                    CPF <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cpf"
                    name="cpf"
                    value={cpf}
                    onChange={handleCPFChange}
                    placeholder="000.000.000-00"
                    required
                    maxLength={14}
                    className="mt-1.5"
                  />
                </div>

                {/* Empresa */}
                <div>
                  <Label htmlFor="empresa" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Empresa
                  </Label>
                  <div className="mt-1.5 space-y-2">
                    <Select
                      value={empresaSelecionada || undefined}
                      onValueChange={setEmpresaSelecionada}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma empresa">
                          {empresaSelecionada && empresas.find(e => e.codemp?.toString() === empresaSelecionada)
                            ? `${empresaSelecionada} - ${empresas.find(e => e.codemp?.toString() === empresaSelecionada)?.nomeempresa}`
                            : 'Selecione uma empresa'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            placeholder="Buscar por código ou nome..."
                            value={buscaEmpresa}
                            onChange={(e) => setBuscaEmpresa(e.target.value)}
                            className="mb-2"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {empresasFiltradas.length === 0 ? (
                          <div className="p-4 text-sm text-slate-500 text-center">
                            {buscaEmpresa ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
                          </div>
                        ) : (
                          empresasFiltradas.map((empresa) => (
                            <SelectItem key={empresa.codemp} value={empresa.codemp?.toString()}>
                              <span className="font-mono text-xs text-slate-500 mr-2">{empresa.codemp}</span>
                              <span>{empresa.nomeempresa}</span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {empresaSelecionada && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEmpresaSelecionada('')}
                        className="h-7 text-xs"
                      >
                        Limpar seleção
                      </Button>
                    )}
                  </div>
                </div>

                {/* Telefone */}
                <div>
                  <Label htmlFor="telefone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefone
                  </Label>
                  <Input
                    id="telefone"
                    name="telefone"
                    type="tel"
                    defaultValue={editingUser?.telefone}
                    placeholder="(11) 99999-9999"
                    className="mt-1.5"
                  />
                </div>

                {/* Perfil */}
                <div>
                  <Label htmlFor="perfil" className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Perfil
                  </Label>
                  <Select
                    value={perfilSelecionado}
                    onValueChange={setPerfilSelecionado}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Master">Master</SelectItem>
                      <SelectItem value="Administrador">Administrador</SelectItem>
                      <SelectItem value="Construtor">Construtor</SelectItem>
                      <SelectItem value="Visualizador">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Ativo */}
                <div className="col-span-2 flex items-center gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <input
                    type="checkbox"
                    id="ativo"
                    name="ativo"
                    defaultChecked={editingUser?.ativo ?? true}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <Label htmlFor="ativo" className="cursor-pointer">
                    Usuário ativo (pode acessar o sistema)
                  </Label>
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
                    : editingUser
                      ? 'Atualizar'
                      : 'Criar Usuário'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Usuários Cadastrados</span>
            <Badge variant="outline" className="font-normal">
              {users.length} {users.length === 1 ? 'usuário' : 'usuários'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
                Carregando usuários...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                Nenhum usuário cadastrado
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Clique em "Novo Usuário" para começar
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.codusuario}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          {user.nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.cpf ? (
                          <div className="flex items-center gap-2 text-sm">
                            <IdCard className="w-3 h-3" />
                            {formatCPF(user.cpf)}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.nomeempresa ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="w-3 h-3 text-purple-600" />
                            <span className="font-mono text-xs text-slate-500">{user.codemp}</span>
                            <span>{user.nomeempresa}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.telefone ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3" />
                            {user.telefone}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {user.perfil || 'Visualizador'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.ativo !== false ? (
                          <Badge className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100">
                            <CheckCircle className="w-3 h-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-slate-500">
                            <XCircle className="w-3 h-3" />
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                        {user.data_criacao
                          ? format(new Date(user.data_criacao), "dd/MM/yyyy", { locale: ptBR })
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
                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(user.codusuario)}
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
