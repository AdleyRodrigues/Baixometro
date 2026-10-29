import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Baixômetro ErrorBoundary] Capturou erro na renderização:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[70vh] items-center justify-center p-4">
          <Card className="w-full max-w-md border-amber-500/25 bg-[#121215] shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <CardTitle className="mt-3 text-lg font-bold text-zinc-100">
                Algo Deu Errado na Interface
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Ocorreu uma falha inesperada durante a exibição desta tela. Fique tranquilo: todos os seus dados e notas fiscais continuam seguros.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="rounded-xl border border-[#27272a] bg-[#09090b] p-3 text-xs text-zinc-400">
                <p>
                  💡 <strong>O que fazer agora?</strong> Recarregue a página para reiniciar o aplicativo. Se o problema persistir, retorne ao início do painel.
                </p>
                {this.state.error && (
                  <p className="mt-2 truncate font-mono text-[10px] text-zinc-500">
                    Detalhe técnico: {this.state.error.message}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="w-full sm:flex-1 gap-2 bg-[#10b981] text-zinc-950 hover:bg-[#10b981]/90"
                onClick={this.handleReload}
              >
                <RefreshCw className="h-4 w-4" />
                <span>Recarregar Página</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full sm:flex-1 gap-2"
                onClick={this.handleGoHome}
              >
                <Home className="h-4 w-4" />
                <span>Ir para o Início</span>
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

