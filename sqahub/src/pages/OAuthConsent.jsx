import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, CheckCircle, Info } from 'lucide-react';

const SCOPE_DESCRIPTIONS = {
  openid: 'Identificação básica',
  profile: 'Acessar seu nome e informações do perfil',
  email: 'Acessar seu endereço de email',
  'bi.read': 'Visualizar dados e relatórios no BI',
  'bi.write': 'Criar e modificar relatórios no BI',
};

export default function OAuthConsent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientInfo, setClientInfo] = useState(null);

  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const responseType = searchParams.get('response_type');
  const scope = searchParams.get('scope');
  const state = searchParams.get('state');
  const nonce = searchParams.get('nonce');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');

  const scopes = scope ? scope.split(' ') : [];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    // Buscar informações do cliente
    fetchClientInfo();
  }, [isAuthenticated, clientId]);

  const fetchClientInfo = async () => {
    try {
      const response = await apiClient.get(`/api/oauth/clients/${clientId}`);
      setClientInfo(response);
    } catch (err) {
      setError('Cliente OAuth não encontrado');
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/oauth/consent', {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: responseType,
        scope,
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
        approved: true,
      });

      if (response.redirect) {
        window.location.href = response.redirect;
      }
    } catch (err) {
      setError(err.message || 'Erro ao autorizar aplicação');
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    setLoading(true);

    try {
      const response = await apiClient.post('/oauth/consent', {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: responseType,
        scope,
        state,
        approved: false,
      });

      if (response.redirect) {
        window.location.href = response.redirect;
      }
    } catch (err) {
      setError(err.message || 'Erro ao negar autorização');
      setLoading(false);
    }
  };

  if (!clientInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Autorizar Acesso</CardTitle>
          <CardDescription>
            <strong>{clientInfo.name}</strong> está solicitando permissão para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {clientInfo.description && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>{clientInfo.description}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium">Esta aplicação poderá:</p>
            <div className="space-y-2 bg-slate-50 rounded-lg p-4">
              {scopes.map((scopeName) => (
                <div key={scopeName} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {SCOPE_DESCRIPTIONS[scopeName] || scopeName}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Conectando como:</strong> {user?.name} ({user?.email})
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDeny}
              disabled={loading}
            >
              Negar
            </Button>
            <Button
              className="flex-1"
              onClick={handleApprove}
              disabled={loading}
            >
              {loading ? 'Autorizando...' : 'Autorizar'}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Você pode revogar este acesso a qualquer momento nas configurações da sua conta
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
