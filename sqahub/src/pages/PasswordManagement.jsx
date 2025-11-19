import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Key,
  Eye,
  EyeOff,
  Plus,
  Edit,
  Trash2,
  Building2,
  Globe,
  User,
  Copy,
  Shield,
  History,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import apiClient from '../api/client';
import { format } from 'date-fns';

const PasswordManagement = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPassword, setSelectedPassword] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [formData, setFormData] = useState({
    descricao: '',
    grupo_empresa_id: null,
    url: '',
    usuario: '',
    senha: '',
    observacoes: ''
  });

  // Fetch passwords
  const { data: passwords = [], isLoading } = useQuery({
    queryKey: ['passwords'],
    queryFn: async () => {
      const response = await apiClient.get('/api/passwords');
      return response;
    }
  });

  // Fetch grupos de empresas
  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos-empresas'],
    queryFn: async () => {
      const response = await apiClient.get('/api/entities/sqausugru');
      return response;
    }
  });

  // Create password mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await apiClient.post('/api/passwords', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['passwords']);
      toast.success('Senha salva com sucesso!');
      closeModal();
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao salvar senha');
    }
  });

  // Update password mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await apiClient.put(`/api/passwords/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['passwords']);
      toast.success('Senha atualizada com sucesso!');
      closeModal();
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao atualizar senha');
    }
  });

  // Delete password mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await apiClient.delete(`/api/passwords/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['passwords']);
      toast.success('Senha excluída com sucesso!');
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao excluir senha');
    }
  });

  // Reveal password mutation
  const revealMutation = useMutation({
    mutationFn: async (id) => {
      return await apiClient.post(`/api/passwords/${id}/reveal`);
    },
    onSuccess: (data, id) => {
      setRevealedPasswords(prev => ({ ...prev, [id]: data.senha }));
      setShowPassword(prev => ({ ...prev, [id]: true }));
      toast.success('Senha revelada');
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao revelar senha');
    }
  });

  const openModal = (password = null) => {
    if (password) {
      setSelectedPassword(password);
      setFormData({
        descricao: password.descricao || '',
        grupo_empresa_id: password.grupo_empresa_id || null,
        url: password.url || '',
        usuario: password.usuario || '',
        senha: '', // Não preencher senha por segurança
        observacoes: password.observacoes || ''
      });
    } else {
      setSelectedPassword(null);
      setFormData({
        descricao: '',
        grupo_empresa_id: null,
        url: '',
        usuario: '',
        senha: '',
        observacoes: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPassword(null);
    setFormData({
      descricao: '',
      grupo_empresa_id: null,
      url: '',
      usuario: '',
      senha: '',
      observacoes: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedPassword) {
      updateMutation.mutate({
        id: selectedPassword.id,
        data: formData
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir esta senha?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleRevealPassword = (id) => {
    if (revealedPasswords[id]) {
      // Toggle visibility
      setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
    } else {
      // Fetch password
      revealMutation.mutate(id);
    }
  };

  const handleCopyPassword = async (id) => {
    const senha = revealedPasswords[id];
    if (senha) {
      try {
        await navigator.clipboard.writeText(senha);
        toast.success('Senha copiada!');
      } catch (error) {
        toast.error('Erro ao copiar senha');
      }
    } else {
      toast.error('Revele a senha primeiro');
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (error) {
      return '-';
    }
  };

  const filteredPasswords = passwords.filter(p =>
    p.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.usuario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.grupo_empresa_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Gestão de Senhas</h1>
              <p className="text-slate-600">Cofre seguro de senhas da empresa</p>
            </div>
          </div>
          <Button
            onClick={() => openModal()}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nova Senha
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Input
              placeholder="Buscar por descrição, usuário, URL ou grupo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Lock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total de Senhas</p>
                <p className="text-2xl font-bold text-slate-900">{passwords.length}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        {filteredPasswords.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">
              {searchTerm ? 'Nenhuma senha encontrada' : 'Nenhuma senha cadastrada'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                    Grupo/Empresa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                    URL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                    Usuário
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                    Senha
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredPasswords.map((password) => (
                  <tr
                    key={password.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-900 text-sm">
                          {password.descricao}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {password.grupo_empresa_nome || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {password.url ? (
                        <a
                          href={password.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                        >
                          <Globe className="w-3 h-3" />
                          <span className="max-w-xs truncate">{password.url}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {password.usuario || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {showPassword[password.id] && revealedPasswords[password.id] ? (
                          <code className="text-sm bg-slate-100 px-2 py-1 rounded font-mono">
                            {revealedPasswords[password.id]}
                          </code>
                        ) : (
                          <span className="text-slate-400">••••••••</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevealPassword(password.id)}
                          className="h-7 px-2"
                        >
                          {showPassword[password.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        {revealedPasswords[password.id] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyPassword(password.id)}
                            className="h-7 px-2"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal(password)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(password.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedPassword ? 'Editar Senha' : 'Nova Senha'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                type="text"
                required
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Nome do sistema/acesso"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grupo_empresa_id">Grupo/Empresa</Label>
              <select
                id="grupo_empresa_id"
                value={formData.grupo_empresa_id || ''}
                onChange={(e) => setFormData({ ...formData, grupo_empresa_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
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
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usuario">Usuário</Label>
              <Input
                id="usuario"
                type="text"
                value={formData.usuario}
                onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                placeholder="Nome de usuário ou email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">
                Senha * {selectedPassword && '(deixe em branco para não alterar)'}
              </Label>
              <Input
                id="senha"
                type="password"
                required={!selectedPassword}
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                placeholder="Senha"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Informações adicionais"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
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
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Salvando...'
                  : selectedPassword
                  ? 'Atualizar'
                  : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PasswordManagement;
