import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
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
import { Skeleton } from '../components/ui/skeleton';
import { CategoryFormModal } from '../features/categories/components/CategoryFormModal';
import { DeleteCategoryModal } from '../features/categories/components/DeleteCategoryModal';
import { getErrorMessage } from '../lib/errorMessages';

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
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      const errInfo = getErrorMessage(err);
      setError(`${errInfo.message} ${errInfo.action || ''}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
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
    setColor(cat.color);
    setIcon(cat.icon);
    setModalError(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setModalError('O nome da categoria é obrigatório');
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, {
          name: trimmed,
          color,
          icon,
        });
      } else {
        await api.createCategory({
          name: trimmed,
          color,
          icon,
        });
      }
      setDialogOpen(false);
      await loadCategories();
    } catch (err) {
      const errInfo = getErrorMessage(err);
      setModalError(`${errInfo.message} ${errInfo.action || ''}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteCategory(deletingCategory.id);
      setDeletingCategory(null);
      await loadCategories();
    } catch (err) {
      const errInfo = getErrorMessage(err);
      setDeleteError(`${errInfo.message} ${errInfo.action || ''}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <CategoryFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingCategory={editingCategory}
        name={name}
        setName={setName}
        color={color}
        setColor={setColor}
        icon={icon}
        setIcon={setIcon}
        saving={saving}
        modalError={modalError}
        onSubmit={handleSave}
      />

      <DeleteCategoryModal
        category={deletingCategory}
        onClose={() => {
          setDeletingCategory(null);
          setDeleteError(null);
        }}
        deleting={deleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
      />

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
