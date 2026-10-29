import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from 'lucide-react';
import type { Category } from '@baixometro/shared-types';
import { api } from '../api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';

const PRESET_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

const PRESET_ICONS = ['🛒', '🥫', '🥦', '🥩', '🧀', '🥖', '🧴', '🧼', '🍺', '🐾'];

export default function SettingsCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de Criar / Editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#10b981');
  const [icon, setIcon] = useState('🛒');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal de Confirmação de Exclusão
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories().catch(() => {});
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setColor('#10b981');
    setIcon('🛒');
    setModalError(null);
    setDialogOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setColor(cat.color || '#10b981');
    setIcon(cat.icon || '🛒');
    setModalError(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError('Informe o nome da categoria.');
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, {
          name: name.trim(),
          color,
          icon: icon.trim() || '🛒',
        });
      } else {
        await api.createCategory({
          name: name.trim(),
          color,
          icon: icon.trim() || '🛒',
        });
      }
      setDialogOpen(false);
      await loadCategories();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Erro ao salvar categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setDeleting(true);
    try {
      await api.deleteCategory(deletingCategory.id);
      setDeletingCategory(null);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir categoria');
      setDeletingCategory(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription>
              Escolha o nome, o ícone e a cor de identificação para os itens das notas
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {modalError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="cat-name" className="block text-xs font-medium text-zinc-300">
                Nome da Categoria *
              </label>
              <Input
                id="cat-name"
                type="text"
                placeholder="Ex.: Laticínios, Padaria, Limpeza..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cat-icon" className="block text-xs font-medium text-zinc-300">
                Ícone (Emoji)
              </label>
              <div className="flex flex-wrap gap-1.5 pb-1">
                {PRESET_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-colors ${
                      icon === emoji
                        ? 'border-[#10b981] bg-[#10b981]/15'
                        : 'border-[#27272a] bg-[#09090b] hover:bg-zinc-800'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <Input
                id="cat-icon"
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cat-color" className="block text-xs font-medium text-zinc-300">
                Cor de Destaque
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setColor(hex)}
                    aria-label={`Cor ${hex}`}
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${
                      color.toLowerCase() === hex.toLowerCase()
                        ? 'scale-110 border-white'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <input
                  id="cat-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-[#27272a] bg-[#09090b] p-0.5"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>{editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => {
          if (!open) setDeletingCategory(null);
        }}
      >
        <DialogContent onClose={() => setDeletingCategory(null)}>
          <DialogHeader>
            <DialogTitle>Excluir Categoria</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a categoria{' '}
              <strong className="text-zinc-200">
                {deletingCategory?.icon} {deletingCategory?.name}
              </strong>
              ? Os itens das notas fiscais vinculados ficarão como "Sem categoria".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeletingCategory(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Confirmar Exclusão</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#10b981] hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar para Configurações</span>
            </Link>
            <div className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-[#10b981]" />
              <h1 className="text-xl font-bold tracking-tight text-zinc-50">
                Gerenciar Categorias
              </h1>
              {!loading && (
                <Badge variant="secondary">
                  {categories.length} {categories.length === 1 ? 'item' : 'itens'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              Crie, edite cores e ícones ou remova categorias de produtos
            </p>
          </div>

          <Button type="button" onClick={openCreateModal}>
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Nova Categoria</span>
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3, 4].map((idx) => (
              <Skeleton key={idx} className="h-[68px] w-full" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <Card className="py-10 text-center text-xs text-zinc-400">
            Nenhuma categoria cadastrada. Clique em "Nova Categoria" para criar a primeira.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {categories.map((cat) => (
              <Card key={cat.id} className="border-[#27272a]">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#27272a] text-lg"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      {cat.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-100">
                        {cat.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-mono">{cat.color}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditModal(cat)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeletingCategory(cat)}
                      aria-label={`Excluir ${cat.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
}

