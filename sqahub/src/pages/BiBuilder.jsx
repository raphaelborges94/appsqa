/**
 * BiBuilder - Construtor de BI
 *
 * Página para redirecionar o usuário autenticado para o SQABI
 * usando autenticação SSO (Single Sign-On)
 *
 * @module pages/BiBuilder
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, BarChart3, ExternalLink, AlertCircle, Shield, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import apiClient from '@/api/client';

export default function BiBuilder() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  /**
   * Gera um token SSO e redireciona para o BI
   */
  const handleOpenBI = async () => {
    try {
      setLoading(true);
      setError(null);

      // Chamar endpoint de geração de token SSO
      const response = await apiClient.post('/api/sso/generate-token', {
        service: 'sqa-bi'
      });

      // O apiClient já retorna response.data diretamente
      // Então response já é o objeto {token, tokenId, expiresAt, ...}
      const { token, tokenId, redirectUrl, expiresAt, expiresIn, service, user: userData } = response.data;

      setTokenInfo({
        token,
        redirectUrl,
        expiresAt,
        user: userData
      });

      // Aguardar 1 segundo para mostrar informações
      setTimeout(() => {
        setRedirecting(true);
        // Abrir em nova janela
        window.open(redirectUrl, '_blank', 'noopener,noreferrer');
        setLoading(false);
        setRedirecting(false);
      }, 1000);

    } catch (err) {
      console.error('Erro ao abrir BI:', err);
      setError(err.response?.data?.message || err.message || 'Erro ao conectar com o BI');
      setLoading(false);
    }
  };

  /**
   * Auto-redirect ao carregar a página (opcional)
   * Descomente para ativar o redirecionamento automático
   */
  // useEffect(() => {
  //   if (user) {
  //     handleOpenBI();
  //   }
  // }, [user]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Construtor de BI</h1>
            <p className="text-slate-500 mt-1">
              Business Intelligence & Analytics Platform
            </p>
          </div>
        </div>
      </div>

      {/* Informações do usuário */}
      <Card className="mb-6 border-blue-100 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Autenticação SSO
          </CardTitle>
          <CardDescription>
            Você está conectado como <strong>{user?.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Nome:</span>
              <p className="font-medium text-slate-700">{user?.full_name || 'Não informado'}</p>
            </div>
            <div>
              <span className="text-slate-500">Função:</span>
              <p className="font-medium text-slate-700">
                {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card principal */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Acesso ao SQABI</CardTitle>
          <CardDescription>
            Clique no botão abaixo para abrir o Business Intelligence em uma nova janela.
            Você será autenticado automaticamente usando suas credenciais do HUB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recursos do BI */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold text-sm text-slate-700 mb-3">
              O que você pode fazer no SQABI:
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Criar e gerenciar fontes de dados personalizadas</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Construir dashboards interativos com gráficos e KPIs</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Criar matrizes pivot e análises multidimensionais</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Visualizar dados em tempo real com diversos tipos de gráficos</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Exportar relatórios e compartilhar insights</span>
              </li>
            </ul>
          </div>

          {/* Botão de ação */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <Button
              onClick={handleOpenBI}
              disabled={loading || redirecting}
              size="lg"
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {loading || redirecting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {redirecting ? 'Redirecionando...' : 'Autenticando...'}
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Abrir SQABI em Nova Janela
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              Uma nova janela será aberta com o SQABI já autenticado
            </p>
          </div>

          {/* Informações do token (se gerado) */}
          {tokenInfo && !error && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Token SSO Gerado</AlertTitle>
              <AlertDescription className="text-green-700 text-sm">
                Autenticação bem-sucedida! Você será redirecionado em instantes.
                <div className="mt-2 text-xs opacity-75">
                  Token válido até: {new Date(tokenInfo.expiresAt).toLocaleString('pt-BR')}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro na Autenticação</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Informações de segurança */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-500" />
            Segurança e Privacidade
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p>
            • <strong>SSO Seguro:</strong> Autenticação via tokens JWT criptografados com expiração de 5 minutos
          </p>
          <p>
            • <strong>One-Time Use:</strong> Cada token pode ser usado apenas uma vez
          </p>
          <p>
            • <strong>Auditoria:</strong> Todas as autenticações são registradas com IP e User-Agent
          </p>
          <p>
            • <strong>Sessão Unificada:</strong> Suas permissões do HUB são automaticamente aplicadas no BI
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
