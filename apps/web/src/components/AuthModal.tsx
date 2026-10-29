import { useEffect, useState, type FormEvent } from 'react';
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
import { useAuth, type AuthModalTab } from '../context/AuthContext';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

export default function AuthModal() {
  const {
    authModalOpen,
    authModalDefaultTab,
    closeAuthModal,
    completeAuthModal,
  } = useAuth();

  const [mode, setMode] = useState<AuthModalTab>(authModalDefaultTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authModalOpen) {
      setMode(authModalDefaultTab);
      setError(null);
    }
  }, [authModalOpen, authModalDefaultTab]);

  const handleModeSwitch = (nextMode: AuthModalTab) => {
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

      await completeAuthModal(response.token, response.user);
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
    <Dialog
      open={authModalOpen}
      onOpenChange={(open) => {
        if (!open) closeAuthModal();
      }}
    >
      <DialogContent onClose={closeAuthModal} className="max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#10b981]/30 bg-[#10b981]/15 text-[#10b981]">
              <TrendingDown className="h-4 w-4 stroke-[2.25]" />
            </div>
            <div>
              <DialogTitle className="text-base text-zinc-50">
                {mode === 'login'
                  ? 'Entrar no Baixômetro'
                  : 'Crie sua conta para salvar'}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                {mode === 'login'
                  ? 'Acesse seu histórico de notas e alertas de preços.'
                  : 'Salve suas notas fiscais e acompanhe a evolução de preços.'}
              </DialogDescription>
            </div>
          </div>

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
                'relative flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors',
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
                'relative flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors',
                mode === 'register'
                  ? 'bg-[#10b981] text-[#052e16] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Criar Conta</span>
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
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
                htmlFor="modal-auth-name"
                className="block text-xs font-medium text-zinc-300"
              >
                Seu nome
              </label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="modal-auth-name"
                  name="name"
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
              htmlFor="modal-auth-email"
              className="block text-xs font-medium text-zinc-300"
            >
              E-mail
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="modal-auth-email"
                name="email"
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
              htmlFor="modal-auth-password"
              className="block text-xs font-medium text-zinc-300"
            >
              Senha
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="modal-auth-password"
                name="password"
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
                <span>Entrar e Continuar</span>
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Criar Conta e Continuar</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-[#10b981]" />
            <span>Senhas criptografadas com Argon2id + sessão JWT segura</span>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
