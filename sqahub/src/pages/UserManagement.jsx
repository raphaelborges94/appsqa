import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  Edit,
  Trash2,
  X,
  Search,
  UserCheck,
  UserX,
  Download,
  FileText,
  FileSpreadsheet,
  FileType,
  Plus
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import apiClient from '../api/client';
import { format } from 'date-fns';

const UserManagement = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    cpf: '',
    grupo_id: null,
    active: true,
    phone: '',
    avatar_url: ''
  });

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get('/api/users');
      return response;
    }
  });

  // Fetch grupos de usuários
  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos'],
    queryFn: async () => {
      const response = await apiClient.get('/api/entities/sqausugru');
      return response;
    }
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (userData) => {
      return await apiClient.post('/api/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('Usuário criado com sucesso!');
      closeModal();
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao criar usuário');
    }
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await apiClient.put(`/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('Usuário atualizado com sucesso!');
      closeModal();
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao atualizar usuário');
    }
  });

  // Delete user mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await apiClient.delete(`/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('Usuário desativado com sucesso!');
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao desativar usuário');
    }
  });

  // Activate user mutation
  const activateMutation = useMutation({
    mutationFn: async (id) => {
      return await apiClient.post(`/api/users/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('Usuário ativado com sucesso!');
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao ativar usuário');
    }
  });

  const openModal = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        email: user.email || '',
        full_name: user.full_name || '',
        cpf: user.cpf || '',
        grupo_id: user.grupo_id || null,
        active: user.active ?? true,
        phone: user.phone || '',
        avatar_url: user.avatar_url || ''
      });
    } else {
      setSelectedUser(null);
      setFormData({
        email: '',
        full_name: '',
        cpf: '',
        grupo_id: null,
        active: true,
        phone: '',
        avatar_url: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setFormData({
      email: '',
      full_name: '',
      cpf: '',
      grupo_id: null,
      active: true,
      phone: '',
      avatar_url: ''
    });
  };

  // Função para aplicar máscara de CPF
  const formatCPF = (value) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');

    // Aplica a máscara XXX.XXX.XXX-XX
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    } else if (numbers.length <= 9) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    } else {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
    }
  };

  // Função para validar CPF
  const validateCPF = (cpf) => {
    const numbers = cpf.replace(/\D/g, '');

    if (numbers.length !== 11) {
      return false;
    }

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(numbers)) {
      return false;
    }

    // Validação dos dígitos verificadores
    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(numbers.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numbers.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(numbers.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numbers.substring(10, 11))) return false;

    return true;
  };

  const handleCPFChange = (value) => {
    const formatted = formatCPF(value);
    setFormData({ ...formData, cpf: formatted });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validar CPF antes de enviar
    if (!validateCPF(formData.cpf)) {
      toast.error('CPF inválido! Por favor, verifique o número digitado.');
      return;
    }

    if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = () => {
    if (selectedUsers.length === 1) {
      const user = users.find(u => u.id === selectedUsers[0]);
      openModal(user);
    }
  };

  const handleDelete = () => {
    if (selectedUsers.length > 0) {
      if (confirm(`Deseja realmente desativar ${selectedUsers.length} usuário(s)?`)) {
        selectedUsers.forEach(id => {
          deleteMutation.mutate(id);
        });
        setSelectedUsers([]);
      }
    }
  };

  const handleToggleActive = (user) => {
    if (user.active) {
      if (confirm(`Deseja realmente desativar o usuário ${user.full_name}?`)) {
        deleteMutation.mutate(user.id);
      }
    } else {
      activateMutation.mutate(user.id);
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };


  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return '-';
    }
  };

  const exportCSV = () => {
    const headers = ['Nome', 'Email', 'Perfil', 'Telefone', 'Último Acesso', 'Status'];
    const rows = filteredUsers.map(user => [
      user.full_name,
      user.email,
      user.role,
      user.phone || '',
      formatDate(user.last_login),
      user.active ? 'Ativo' : 'Inativo'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Arquivo CSV exportado com sucesso!');
  };

  const hasSelection = selectedUsers.length > 0;
  const isSingleSelection = selectedUsers.length === 1;
  const allSelected = filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top Bar - Estilo CRUD */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => openModal()}
            className="bg-slate-800 hover:bg-slate-900 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Incluir
          </Button>

          <Button
            size="sm"
            onClick={handleEdit}
            disabled={!isSingleSelection}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Edit className="w-4 h-4 mr-1.5" />
            Editar
          </Button>

          <Button
            size="sm"
            onClick={handleDelete}
            disabled={!hasSelection}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Excluir
          </Button>

          {hasSelection && (
            <span className="text-sm text-slate-600 ml-2">
              {selectedUsers.length} {selectedUsers.length === 1 ? 'selecionado' : 'selecionados'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar..."
              className="pl-9 pr-4 h-9 w-64 bg-slate-50 border-slate-200"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-300"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={exportCSV} className="cursor-pointer">
                <FileText className="w-4 h-4 mr-2 text-slate-600" />
                <div className="flex flex-col">
                  <span className="font-medium">Exportar CSV</span>
                  <span className="text-xs text-slate-500">Formato texto separado por vírgulas</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">
                Carregando usuários...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-12">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                        CPF
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Grupo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Telefone
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Último Acesso
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => handleSelectUser(user.id, checked)}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                <span className="text-slate-600 font-semibold text-sm">
                                  {user.full_name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="font-medium text-slate-900 text-sm">
                              {user.full_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                          {user.cpf || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                          {user.grupo_id ? (
                            grupos.find(g => g.id === user.grupo_id)?.nome || '-'
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                          {user.phone || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                          {formatDate(user.last_login)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {user.active ? (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                              <UserX className="w-3 h-3 mr-1" />
                              Inativo
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openModal(user)}
                              className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleActive(user)}
                              className={`h-8 w-8 p-0 ${
                                user.active
                                  ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              }`}
                            >
                              {user.active ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edição/Criação */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nome completo do usuário"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                type="text"
                required
                value={formData.cpf}
                onChange={(e) => handleCPFChange(e.target.value)}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grupo_id">Grupo de Usuário</Label>
              <select
                id="grupo_id"
                value={formData.grupo_id || ''}
                onChange={(e) => setFormData({ ...formData, grupo_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white text-sm"
              >
                <option value="">Selecione um grupo</option>
                {grupos.map((grupo) => (
                  <option key={grupo.id} value={grupo.id}>
                    {grupo.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar_url">URL do Avatar</Label>
              <Input
                id="avatar_url"
                type="url"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active" className="cursor-pointer">
                Usuário ativo
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={closeModal}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-slate-800 hover:bg-slate-900"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Salvando...'
                  : selectedUser
                  ? 'Atualizar'
                  : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
