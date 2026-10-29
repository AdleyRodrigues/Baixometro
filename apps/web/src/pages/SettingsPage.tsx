import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  GitMerge,
  Heart,
  LogOut,
  Package,
  Palette,
  Settings,
  Tags,
  User as UserIcon,
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

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [catCount, setCatCount] = useState<number | null>(null);
  const [prodCount, setProdCount] = useState<number | null>(null);

  useEffect(() => {
    api
      .getCategories()
      .then((cats) => setCatCount(cats.length))
      .catch(() => {});
    api
      .getProducts()
      .then((prods) => setProdCount(prods.length))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-[#10b981]" />
          <h1 className="text-xl font-bold tracking-tight text-zinc-50">
            Configurações e Dados
          </h1>
        </div>
        <p className="text-xs text-zinc-400">
          Gerencie sua conta, catálogo de produtos canônicos, mescle itens duplicados e personalize categorias
        </p>
      </div>

      {/* Card da Conta Autenticada + Sair da Conta */}
      <Card className="border-[#27272a] bg-[#121215]/90">
        <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#10b981]/30 bg-[#10b981]/15 text-[#10b981]">
              <UserIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-zinc-100">
                  {user?.name || 'Usuário Autenticado'}
                </p>
                <Badge variant="default" className="text-[10px]">
                  Sessão Ativa
                </Badge>
              </div>
              <p className="truncate text-xs text-zinc-400">
                {user?.email || 'Conta protegida por JWT'}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="border-red-500/30 bg-red-500/10 text-red-300 hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-200"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair da Conta</span>
          </Button>
        </CardContent>
      </Card>

      {/* Cards de Navegação de Configurações */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Link to="/settings/products" className="group block">
          <Card className="h-full transition-all duration-150 group-hover:border-[#10b981]/50 group-hover:bg-[#18181b]/90">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#10b981]/30 bg-[#10b981]/15 text-[#10b981]">
                <Package className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                {prodCount !== null && (
                  <Badge variant="default">
                    {prodCount} {prodCount === 1 ? 'produto' : 'produtos'}
                  </Badge>
                )}
                <ArrowUpRight className="h-4 w-4 text-zinc-500 transition-all group-hover:translate-x-0.5 group-hover:text-[#10b981]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <CardTitle className="text-base group-hover:text-white">
                Produtos e Mesclagem
              </CardTitle>
              <CardDescription>
                Edite nomes, marcas e códigos GTIN, ou mescle produtos duplicados movendo todo o histórico de preços.
              </CardDescription>
              <div className="flex items-center gap-1.5 pt-1 text-xs font-medium text-[#10b981]">
                <GitMerge className="h-3.5 w-3.5" />
                <span>Abrir catálogo de produtos</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/settings/categories" className="group block">
          <Card className="h-full transition-all duration-150 group-hover:border-[#10b981]/50 group-hover:bg-[#18181b]/90">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#10b981]/30 bg-[#10b981]/15 text-[#10b981]">
                <Tags className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                {catCount !== null && (
                  <Badge variant="secondary">
                    {catCount} {catCount === 1 ? 'categoria' : 'categorias'}
                  </Badge>
                )}
                <ArrowUpRight className="h-4 w-4 text-zinc-500 transition-all group-hover:translate-x-0.5 group-hover:text-[#10b981]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <CardTitle className="text-base group-hover:text-white">
                Categorias de Compra
              </CardTitle>
              <CardDescription>
                Crie novas categorias, personalize cores e ícones ou remova categorias que não utiliza.
              </CardDescription>
              <div className="flex items-center gap-1.5 pt-1 text-xs font-medium text-[#10b981]">
                <Palette className="h-3.5 w-3.5" />
                <span>Gerenciar categorias</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 3: Apoie o Baixômetro (Doações / Open Source) */}
        <Link to="/settings/support" className="group block sm:col-span-2">
          <Card className="border-[#10b981]/30 bg-gradient-to-r from-[#10b981]/10 via-[#121215] to-[#121215] transition-all duration-150 group-hover:border-[#10b981]/60 group-hover:bg-[#18181b]/90">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#10b981]/30 bg-[#10b981]/15 text-[#10b981]">
                <Heart className="h-5 w-5 fill-[#10b981]/20" />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">Open Source</Badge>
                <ArrowUpRight className="h-4 w-4 text-zinc-500 transition-all group-hover:translate-x-0.5 group-hover:text-[#10b981]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <CardTitle className="text-base group-hover:text-white">
                Apoie o Baixômetro
              </CardTitle>
              <CardDescription>
                O Baixômetro é 100% gratuito e de código aberto. Contribua via Pix, GitHub Sponsors ou Ko-fi para ajudar na evolução do projeto.
              </CardDescription>
              <div className="flex items-center gap-1.5 pt-1 text-xs font-medium text-[#10b981]">
                <Heart className="h-3.5 w-3.5" />
                <span>Apoiar projeto</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </motion.div>
  );
}
