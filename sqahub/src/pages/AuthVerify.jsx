import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setError('Token inválido ou ausente');
      return;
    }

    verifyToken(token);
  }, [searchParams]);

  const verifyToken = async (token) => {
    try {
      const response = await apiClient.post('/api/auth/passwordless/verify', { token });

      if (response.token) {
        // Token JWT recebido, salvar
        apiClient.setToken(response.token);
        setStatus('success');

        // Atualizar contexto de autenticação
        await checkUserAuth();

        // Redirecionar após 2 segundos
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Token inválido ou expirado');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-md">
        {status === 'verifying' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <CardTitle>Verificando...</CardTitle>
              <CardDescription>Aguarde enquanto validamos seu acesso</CardDescription>
            </CardHeader>
          </>
        )}

        {status === 'success' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>Login realizado!</CardTitle>
              <CardDescription>Redirecionando para o sistema...</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Você foi autenticado com sucesso. Aguarde...
                </AlertDescription>
              </Alert>
            </CardContent>
          </>
        )}

        {status === 'error' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle>Erro na autenticação</CardTitle>
              <CardDescription>Não foi possível fazer login</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => navigate('/login')}
                >
                  Solicitar novo link
                </Button>

                <p className="text-sm text-center text-muted-foreground">
                  Os links de acesso expiram em 10 minutos
                </p>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
