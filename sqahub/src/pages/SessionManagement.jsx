import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Monitor,
  LogOut,
  Clock,
  User,
  Building2,
  Globe,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiClient from '../api/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SessionManagement = () => {
  const queryClient = useQueryClient();

  // Buscar sessões ativas
  const { data: sessions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await apiClient.get('/api/sessions');
      return response;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Mutation para encerrar sessão
  const terminateMutation = useMutation({
    mutationFn: async (sessionId) => {
      return await apiClient.post(`/api/sessions/${sessionId}/terminate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sessions']);
      toast.success('Sessão encerrada com sucesso');
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao encerrar sessão');
    }
  });

  // Formatar tempo
  const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '0s';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm:ss');
    } catch (error) {
      return '-';
    }
  };

  const handleTerminateSession = (sessionId) => {
    if (confirm('Tem certeza que deseja encerrar esta sessão?')) {
      terminateMutation.mutate(sessionId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-600 mx-auto mb-2" />
          <p className="text-slate-600">Carregando sessões...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600 mb-2">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-lg font-semibold">Erro ao carregar sessões</h2>
          </div>
          <p className="text-slate-600 mb-4">{error?.message || 'Erro desconhecido'}</p>
          <Button onClick={() => refetch()} className="w-full">
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Gestão de Sessões</h1>
            <p className="text-slate-600">
              Monitore e gerencie sessões ativas de usuários
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Monitor className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Sessões Ativas</p>
                <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Usuários Únicos</p>
                <p className="text-2xl font-bold text-slate-900">
                  {new Set(sessions.map(s => s.user_id)).size}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Última Atualização</p>
                <p className="text-sm font-medium text-slate-900">
                  {format(new Date(), 'HH:mm:ss')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        {sessions.length === 0 ? (
          <div className="p-12 text-center">
            <Monitor className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">Nenhuma sessão ativa no momento</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Grupo/Empresa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Hora de Login
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Tempo Logado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Tempo p/ Expirar
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    IP/Dispositivo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {sessions.map((session) => (
                  <tr
                    key={session.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {session.user_code?.substring(0, 8)}
                      </code>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                          <span className="text-slate-600 font-semibold text-sm">
                            {session.user_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">
                            {session.user_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {session.user_email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {session.grupo_nome || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                      {formatDateTime(session.login_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDuration(session.logged_time_seconds)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={
                          session.time_to_expire_seconds < 3600
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }
                      >
                        {formatDuration(session.time_to_expire_seconds)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span className="font-mono text-xs">
                            {session.ip_address || '-'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 max-w-xs truncate">
                          {session.user_agent?.substring(0, 50) || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTerminateSession(session.id)}
                        disabled={terminateMutation.isPending}
                        className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="w-3 h-3" />
                        Encerrar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SessionManagement;
