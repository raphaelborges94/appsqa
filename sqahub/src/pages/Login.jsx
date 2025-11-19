import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const { isAuthenticated, checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (isAuthenticated) {
      const returnUrl = searchParams.get('returnUrl') || '/';
      navigate(returnUrl);
    }
  }, [isAuthenticated, navigate, searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/api/auth/passwordless/request', { email });

      // Se for bypass (email de teste), fazer login direto
      if (response.bypass && response.token) {
        // Salvar token
        apiClient.setToken(response.token);

        // Atualizar o contexto de autenticação
        await checkUserAuth();

        // Redirecionar para a URL de retorno ou home
        const returnUrl = searchParams.get('returnUrl') || '/';
        navigate(returnUrl);
      } else {
        // Fluxo normal - mostrar tela de email enviado
        setEmailSent(true);
      }
    } catch (err) {
      setError(err.message || 'Erro ao enviar email. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Email enviado!</CardTitle>
            <CardDescription>
              Verifique sua caixa de entrada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Enviamos um link de acesso para <strong>{email}</strong>.
                Clique no link para fazer login.
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground text-center space-y-2">
              <p>O link é válido por 10 minutos.</p>
              <p>Não recebeu o email? Verifique sua pasta de spam.</p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
            >
              Enviar para outro email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="text-2xl font-bold text-white">SQA</span>
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao SQA HUB</CardTitle>
          <CardDescription>
            Digite seu email para fazer login sem senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading || !email}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar link de acesso
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Um link de acesso será enviado para seu email
              </p>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t">
            <div className="text-center text-sm text-muted-foreground">
              <p className="mb-2">Login seguro sem senha</p>
              <div className="flex items-center justify-center gap-4 text-xs">
                <span>✓ Sem senha para lembrar</span>
                <span>✓ Acesso rápido</span>
                <span>✓ Mais seguro</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
