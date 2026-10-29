import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  GitMerge,
  Loader2,
  Package,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Product } from '@baixometro/shared-types';
import { api } from '../api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogHeader,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';

export default function SettingsProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal de Edição (Nome, Marca, GTIN)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editGtin, setEditGtin] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal de Mesclagem (Source -> Target)
  const [mergingSource, setMergingSource] = useState<Product | null>(null);
  const [targetProductId, setTargetProductId] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  // Modal de Exclusão (apenas quando observation_count === 0)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts().catch(() => {});
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.gtin && p.gtin.toLowerCase().includes(q)),
    );
  }, [products, searchQuery]);

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditBrand(product.brand ?? '');
    setEditGtin(product.gtin ?? '');
    setEditError(null);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editName.trim()) {
      setEditError('O nome do produto é obrigatório.');
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    setFeedback(null);
    try {
      await api.updateProduct(editingProduct.id, {
        name: editName.trim(),
        brand: editBrand.trim() || undefined,
        gtin: editGtin.trim() || undefined,
      });
      setEditingProduct(null);
      setFeedback(`Produto "${editName.trim()}" atualizado com sucesso.`);
      await loadProducts();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erro ao atualizar produto');
    } finally {
      setSavingEdit(false);
    }
  };

  const openMergeModal = (source: Product) => {
    const candidates = products.filter((p) => p.id !== source.id);
    setMergingSource(source);
    setTargetProductId(candidates[0]?.id ?? '');
    setMergeError(null);
  };

  const handleConfirmMerge = async (e: FormEvent) => {
    e.preventDefault();
    if (!mergingSource || !targetProductId) return;

    setMerging(true);
    setMergeError(null);
    setFeedback(null);
    try {
      const mergedTarget = await api.mergeProducts({
        source_product_id: mergingSource.id,
        target_product_id: targetProductId,
      });
      const sourceName = mergingSource.name;
      setMergingSource(null);
      setFeedback(
        `Histórico de "${sourceName}" mesclado com sucesso em "${mergedTarget.name}" (${mergedTarget.observation_count} observações no total).`,
      );
      await loadProducts();
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Erro ao mesclar produtos');
    } finally {
      setMerging(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setDeleting(true);
    setFeedback(null);
    try {
      await api.deleteProduct(deletingProduct.id);
      const deletedName = deletingProduct.name;
      setDeletingProduct(null);
      setFeedback(`Produto "${deletedName}" removido.`);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir produto');
      setDeletingProduct(null);
    } finally {
      setDeleting(false);
    }
  };

  const selectedTargetProduct = products.find((p) => p.id === targetProductId);

  return (
    <>
      {/* Modal de Edição de Produto */}
      <Dialog
        open={Boolean(editingProduct)}
        onOpenChange={(open) => {
          if (!open) setEditingProduct(null);
        }}
      >
        <DialogContent onClose={() => setEditingProduct(null)}>
          <DialogHeader>
            <DialogTitle>Editar Produto Canônico</DialogTitle>
            <DialogDescription>
              Atualize o nome de exibição, a marca ou o código de barras (GTIN/EAN)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="prod-name" className="block text-xs font-medium text-zinc-300">
                Nome do Produto *
              </label>
              <Input
                id="prod-name"
                type="text"
                placeholder="Ex.: Café Torrado e Moído 500g"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prod-brand" className="block text-xs font-medium text-zinc-300">
                Marca (opcional)
              </label>
              <Input
                id="prod-brand"
                type="text"
                placeholder="Ex.: Três Corações, Camil, Betânia..."
                value={editBrand}
                onChange={(e) => setEditBrand(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prod-gtin" className="block text-xs font-medium text-zinc-300">
                Código de Barras GTIN / EAN (opcional)
              </label>
              <Input
                id="prod-gtin"
                type="text"
                placeholder="Ex.: 7891000100103"
                value={editGtin}
                onChange={(e) => setEditGtin(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingProduct(null)}
                disabled={savingEdit}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Mesclagem de Produtos */}
      <Dialog
        open={Boolean(mergingSource)}
        onOpenChange={(open) => {
          if (!open) setMergingSource(null);
        }}
      >
        <DialogContent onClose={() => setMergingSource(null)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-[#10b981]" />
              <span>Mesclar Produtos Duplicados</span>
            </DialogTitle>
            <DialogDescription>
              Selecione o produto principal que receberá as compras e aliases
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmMerge} className="space-y-4">
            {mergeError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{mergeError}</span>
              </div>
            )}

            <div className="rounded-lg border border-[#27272a] bg-[#09090b] p-3 text-xs">
              <div className="text-zinc-400">Produto de origem (será mesclado e removido):</div>
              <div className="mt-1 font-semibold text-zinc-100">
                {mergingSource?.name}{' '}
                <span className="font-normal text-zinc-400">
                  ({mergingSource?.observation_count ?? 0} observações)
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="merge-target-select"
                className="block text-xs font-medium text-zinc-300"
              >
                Mover todo o histórico para o produto (Destino) *
              </label>
              <Select
                id="merge-target-select"
                wrapperClassName="w-full"
                value={targetProductId}
                onChange={(e) => setTargetProductId(e.target.value)}
                required
              >
                {products
                  .filter((p) => p.id !== mergingSource?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.observation_count} obs.)
                    </option>
                  ))}
              </Select>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <strong>Atenção:</strong> Isso vai mover todo o histórico do produto{' '}
                <strong>"{mergingSource?.name}"</strong> para o produto{' '}
                <strong>"{selectedTargetProduct?.name ?? 'selecionado'}"</strong> e excluir o
                cadastro duplicado.
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMergingSource(null)}
                disabled={merging}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={merging || !targetProductId}>
                {merging ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Mesclando...</span>
                  </>
                ) : (
                  <>
                    <GitMerge className="h-4 w-4" />
                    <span>Confirmar Mesclagem</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão de Produto sem observações */}
      <Dialog
        open={Boolean(deletingProduct)}
        onOpenChange={(open) => {
          if (!open) setDeletingProduct(null);
        }}
      >
        <DialogContent onClose={() => setDeletingProduct(null)}>
          <DialogHeader>
            <DialogTitle>Excluir Produto</DialogTitle>
            <DialogDescription>
              Deseja remover o produto{' '}
              <strong className="text-zinc-200">{deletingProduct?.name}</strong>? Ele não
              possui observações de preço registradas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeletingProduct(null)}
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
                  <span>Excluir Produto</span>
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
        <div className="space-y-1">
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#10b981] hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar para Configurações</span>
          </Link>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#10b981]" />
            <h1 className="text-xl font-bold tracking-tight text-zinc-50">
              Produtos Canônicos e Aliases
            </h1>
            {!loading && (
              <Badge variant="default">
                {products.length} {products.length === 1 ? 'produto' : 'produtos'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            Edite nomes, marcas e GTINs ou mescle produtos duplicados para unificar o histórico de preços
          </p>
        </div>

        {/* Barra de busca */}
        <Card className="p-3.5">
          <label
            htmlFor="product-search"
            className="mb-1.5 block text-xs font-medium text-zinc-400"
          >
            Buscar produto por nome, marca ou código GTIN
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              id="product-search"
              name="product-search"
              type="search"
              placeholder="Ex.: Arroz, Café, 7891000100103..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </Card>

        {feedback && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#10b981]/35 bg-[#10b981]/10 p-3.5 text-xs text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10b981]" />
            <span>{feedback}</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3, 4].map((idx) => (
              <Skeleton key={idx} className="h-[84px] w-full" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="py-10 text-center text-xs text-zinc-400">
            Nenhum produto encontrado para "{searchQuery}".
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredProducts.map((prod) => (
              <Card key={prod.id} className="border-[#27272a]">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/products/${prod.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-100 hover:text-[#10b981] transition-colors"
                      >
                        <span>{prod.name}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                      <Badge variant="default">
                        {prod.observation_count}{' '}
                        {prod.observation_count === 1 ? 'compra' : 'compras'}
                      </Badge>
                      {prod.brand && (
                        <Badge variant="secondary">{prod.brand}</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                      <span>
                        {prod.gtin ? (
                          <>
                            GTIN: <strong className="font-mono text-zinc-300">{prod.gtin}</strong>
                          </>
                        ) : (
                          'Sem GTIN cadastrado'
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditModal(prod)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </Button>

                    {products.length > 1 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => openMergeModal(prod)}
                      >
                        <GitMerge className="h-3.5 w-3.5 text-[#10b981]" />
                        <span>Mesclar</span>
                      </Button>
                    )}

                    {prod.observation_count === 0 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletingProduct(prod)}
                        aria-label={`Excluir ${prod.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
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

