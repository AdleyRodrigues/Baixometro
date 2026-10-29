import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Coffee,
  Copy,
  Heart,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button, buttonVariants } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { cn } from '../lib/utils';

const PIX_KEY_PLACEHOLDER = 'chave-pix@exemplo.com';
const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/AdleyRodrigues';
const KOFI_URL = 'https://ko-fi.com/adleyrodrigues';

export default function SettingsSupportPage() {
  const [copied, setCopied] = useState(false);

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY_PLACEHOLDER);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <div className="space-y-1">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#10b981] hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar para Configurações</span>
        </Link>
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 fill-[#10b981]/20 text-[#10b981]" />
          <h1 className="text-xl font-bold tracking-tight text-zinc-50">
            Apoie o Baixômetro
          </h1>
          <Badge variant="default" className="gap-1">
            <Sparkles className="h-3 w-3" />
            <span>Open Source</span>
          </Badge>
        </div>
        <p className="text-xs text-zinc-400">
          Ajude a manter o projeto livre, gratuito e sem anúncios para toda a comunidade
        </p>
      </div>

      {/* Sobre o Projeto */}
      <Card className="border-[#10b981]/30 bg-gradient-to-br from-[#10b981]/10 via-[#121215] to-[#121215]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-[#10b981]" />
            <span>Por que apoiar?</span>
          </CardTitle>
          <CardDescription>
            Transparência de preços feita de consumidores para consumidores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5 text-xs leading-relaxed text-zinc-300">
          <p>
            O <strong>Baixômetro</strong> é um projeto 100% <strong>Open Source e gratuito</strong>,
            criado para ajudar famílias e consumidores a acompanharem a variação real dos preços nos
            supermercados através das notas fiscais (NFC-e).
          </p>
          <p>
            Sua contribuição ajuda a custear infraestrutura, testes com portais estaduais da SEFAZ e
            o desenvolvimento contínuo de novos recursos.
          </p>
        </CardContent>
      </Card>

      {/* Apoio via Pix (Chave + QR Code Placeholder) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4 w-4 text-[#10b981]" />
            <span>Doação Rápida via Pix</span>
          </CardTitle>
          <CardDescription>
            Copie a chave Pix abaixo ou escaneie o QR Code no aplicativo do seu banco
          </CardDescription>
        </CardHeader>

        <CardContent className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_180px]">
          <div className="space-y-3">
            <div className="rounded-xl border border-[#27272a] bg-[#09090b] p-3.5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Chave Pix (E-mail / Aleatória)
              </div>
              <div className="mt-1 break-all font-mono text-sm font-semibold text-zinc-100">
                {PIX_KEY_PLACEHOLDER}
              </div>
            </div>

            <Button type="button" onClick={handleCopyPix} className="w-full sm:w-auto">
              {copied ? (
                <>
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span>Chave Pix Copiada!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copiar Chave Pix</span>
                </>
              )}
            </Button>
          </div>

          {/* Área reservada para imagem do QR Code Pix */}
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#27272a] bg-[#09090b]/80 p-4 text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-[#27272a] bg-[#121215] text-[#10b981]">
              <QrCode className="h-14 w-14 stroke-[1.5]" />
            </div>
            <span className="text-[11px] text-zinc-400">
              QR Code Pix
              <br />
              <span className="text-[10px] text-zinc-500">(Substitua por `/pix-qr.png`)</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Plataformas Internacionais (GitHub Sponsors & Ko-fi) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Outras Formas de Apoiar</CardTitle>
          <CardDescription>
            Apoie recorrentemente ou pague um café pelo GitHub Sponsors ou Ko-fi
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-wrap gap-3">
          <a
            href={GITHUB_SPONSORS_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            <Heart className="h-4 w-4" />
            <span>GitHub Sponsors</span>
            <ArrowUpRight className="h-4 w-4" />
          </a>

          <a
            href={KOFI_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: 'secondary' }))}
          >
            <Coffee className="h-4 w-4 text-[#10b981]" />
            <span>Apoiar no Ko-fi</span>
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </CardContent>
      </Card>
    </motion.div>
  );
}

