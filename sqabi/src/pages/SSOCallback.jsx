/**
 * SSOCallback - Callback de autenticação SSO
 *
 * Página que recebe o token SSO do SQAHUB e autentica o usuário no SQABI
 *
 * @module pages/SSOCallback
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SSOCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithSSO } = useAuth();

  const [status, setStatus] = useState('validating'); // validating, success, error
  const [message, setMessage] = useState('Validando autenticação...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setError('Token SSO não fornecido');
      setMessage('Token de autenticação não encontrado na URL');
      return;
    }

    // Validar token SSO
    const validateSSO = async () => {
      try {
        setStatus('validating');
        setMessage('Validando token SSO com SQAHUB...');

        // Chamar método de autenticação SSO do AuthContext
        await loginWithSSO(token);

        setStatus('success');
        setMessage('Autenticação bem-sucedida! Redirecionando...');

        // Redirecionar para dashboard após 1.5 segundos
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);

      } catch (err) {
        console.error('Erro na validação SSO:', err);
        setStatus('error');
        setError(err.response?.data?.message || err.message || 'Erro ao validar token SSO');
        setMessage('Falha na autenticação');
      }
    };

    validateSSO();
  }, [searchParams, loginWithSSO, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            {status === 'validating' && (
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            )}
            {status === 'error' && (
              <AlertCircle className="w-8 h-8 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'validating' && 'Autenticando...'}
            {status === 'success' && 'Autenticado!'}
            {status === 'error' && 'Erro na Autenticação'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'validating' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span>Conectando com SQAHUB...</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <span>Validando credenciais...</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span>Configurando sessão...</span>
              </div>
            </div>
          )}

          {status === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Conexão Segura Estabelecida</AlertTitle>
              <AlertDescription className="text-green-700 text-sm">
                Você está sendo redirecionado para o SQABI...
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Falha na Autenticação SSO</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4">
                <p className="font-semibold mb-2">Possíveis causas:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Token SSO expirado (válido por 5 minutos)</li>
                  <li>Token já foi utilizado anteriormente</li>
                  <li>Conexão com SQAHUB indisponível</li>
                  <li>Token inválido ou corrompido</li>
                </ul>
                <p className="mt-3 text-xs">
                  <strong>Solução:</strong> Retorne ao SQAHUB e gere um novo token de acesso.
                </p>
              </div>

              <button
                onClick={() => window.close()}
                className="w-full mt-4 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Fechar Janela
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
