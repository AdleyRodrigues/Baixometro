import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  TrendingDown,
  User as UserIcon,
  UserPlus,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleModeSwitch = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Informe seu nome para criar a conta.');
        return;
      }
      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
    }

    setLoading(true);
    try {
      const response =
        mode === 'login'
          ? await api.login({ email: trimmedEmail, password })
          : await api.register({
              name: name.trim(),
              email: trimmedEmail,
              password,
            });

      login(response.token, response.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível autenticar. Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="mx-auto flex min-h-[75vh] w-full max-w-md flex-col justify-center py-6"
    >
      {/* Hero / Branding */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#10b981]/30 bg-[#10b981]/15 text-[#10b981] shadow-[0_0_24px_rgba(16,185,129,0.18)]">
          <TrendingDown className="h-6 w-6 stroke-[2.25]" />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            Baixômetro
          </h1>
          <Badge variant="default" className="text-[10px] uppercase tracking-wider">
            Radar de Preços
          </Badge>
        </div>
        <p className="mt-1.5 max-w-xs text-xs text-zinc-400">
          Monitore preços reais de supermercado via NFC-e e descubra onde cada produto está mais barato.
        </p>
      </div>

      <Card className="border-[#27272a] bg-[#121215]/95 shadow-2xl">
        <CardHeader className="space-y-4 pb-4">
          {/* Segmented Control: Entrar / Criar Conta */}
          <div
            className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#27272a] bg-[#09090b] p-1"
            role="tablist"
            aria-label="Modo de autenticação"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => handleModeSwitch('login')}
              className={cn(
                'relative flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors',
                mode === 'login'
                  ? 'bg-[#10b981] text-[#052e16] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Entrar</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => handleModeSwitch('register')}
              className={cn(
                'relative flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors',
                mode === 'register'
                  ? 'bg-[#10b981] text-[#052e16] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Criar Conta</span>
            </button>
          </div>

          <div>
            <CardTitle className="text-base text-zinc-100">
              {mode === 'login'
                ? 'Acesse sua conta'
                : 'Crie sua conta gratuita'}
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs text-zinc-400">
              {mode === 'login'
                ? 'Entre com seu e-mail e senha para acessar seu histórico de notas e preços.'
                : 'Comece do zero importando suas notas fiscais (QR Code ou XML).'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-name"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Seu nome
                </label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="auth-name"
                    type="text"
                    placeholder="Ex.: Adley Rodrigues"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="auth-email"
                className="block text-xs font-medium text-zinc-300"
              >
                E-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium text-zinc-300"
              >
                Senha
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="auth-password"
                  type="password"
                  placeholder={
                    mode === 'register'
                      ? 'Mínimo de 6 caracteres'
                      : 'Sua senha secreta'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-semibold"
            >
              {loading ? (
                <span>Autenticando...</span>
              ) : mode === 'login' ? (
                <>
                  <span>Entrar no Baixômetro</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Criar Conta e Acessar</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-zinc-500">
              <ShieldCheck className="h-3.5 w-3.5 text-[#10b981]" />
              <span>Senhas criptografadas com Argon2id + sessão JWT segura</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

