import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  GitMerge,
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
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { DeleteProductModal } from '../features/products/components/DeleteProductModal';
import { EditProductModal } from '../features/products/components/EditProductModal';
import { MergeProductModal } from '../features/products/components/MergeProductModal';

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
      setEditError('O nome do produto é obrigatório');
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    try {
      await api.updateProduct(editingProduct.id, {
        name: editName.trim(),
        brand: editBrand.trim() || undefined,
        gtin: editGtin.trim() || undefined,
      });
      setFeedback(`Produto "${editName.trim()}" atualizado com sucesso!`);
      setEditingProduct(null);
      await loadProducts();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erro ao salvar alterações');
    } finally {
      setSavingEdit(false);
    }
  };

  const openMergeModal = (product: Product) => {
    setMergingSource(product);
    const otherProducts = products.filter((p) => p.id !== product.id);
    setTargetProductId(otherProducts[0]?.id ?? '');
    setMergeError(null);
  };

  const handleConfirmMerge = async (e: FormEvent) => {
    e.preventDefault();
    if (!mergingSource) return;
    if (!targetProductId) {
      setMergeError('Selecione o produto de destino');
      return;
    }

    setMerging(true);
    setMergeError(null);
    try {
      const result = await api.mergeProducts({
        source_product_id: mergingSource.id,
        target_product_id: targetProductId,
      });
      setFeedback(
        `Produtos mesclados! O produto principal agora é "${result.name}" com ${result.observation_count} compras associadas.`,
      );
      setMergingSource(null);
      await loadProducts();
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Falha ao mesclar produtos');
    } finally {
      setMerging(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setDeleting(true);
    try {
      await api.deleteProduct(deletingProduct.id);
      setFeedback(`Produto "${deletingProduct.name}" excluído.`);
      setDeletingProduct(null);
      await loadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao excluir produto');
    } finally {
      setDeleting(false);
    }
  };

  const selectedTargetProduct = products.find((p) => p.id === targetProductId);

  return (
    <>
      <EditProductModal
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        name={editName}
        setName={setEditName}
        brand={editBrand}
        setBrand={setEditBrand}
        gtin={editGtin}
        setGtin={setEditGtin}
        saving={savingEdit}
        error={editError}
        onSubmit={handleSaveEdit}
      />

      <MergeProductModal
        mergingSource={mergingSource}
        onClose={() => setMergingSource(null)}
        targetProductId={targetProductId}
        setTargetProductId={setTargetProductId}
        products={products}
        selectedTargetProduct={selectedTargetProduct}
        merging={merging}
        error={mergeError}
        onSubmit={handleConfirmMerge}
      />

      <DeleteProductModal
        product={deletingProduct}
        onClose={() => setDeletingProduct(null)}
        deleting={deleting}
        onConfirm={handleConfirmDelete}
      />

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
            <h1 className="text-xl font-bold tracking-tight text-zinc-50">Catálogo de Produtos</h1>
            {!loading && (
              <Badge variant="secondary">
                {products.length} {products.length === 1 ? 'produto' : 'produtos'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            Consulte produtos cadastrados, edite nomes e marcas ou mescle duplicatas
          </p>
        </div>

        {feedback && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10b981]" />
              <span>{feedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Barra de Busca */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            type="text"
            placeholder="Buscar por nome, marca ou código GTIN/EAN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lista de Produtos */}
        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3, 4, 5].map((idx) => (
              <Skeleton key={idx} className="h-[72px] w-full" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="py-12 text-center text-xs text-zinc-400">
            {searchQuery
              ? `Nenhum produto encontrado para "${searchQuery}".`
              : 'Nenhum produto cadastrado ainda. Eles são criados automaticamente ao salvar notas.'}
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredProducts.map((p) => (
              <Card key={p.id} className="border-[#27272a] hover:border-zinc-700 transition-colors">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#27272a] bg-[#09090b] text-[#10b981]">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-zinc-100">
                          {p.name}
                        </span>
                        {p.brand && (
                          <Badge variant="secondary" className="text-[10px]">
                            {p.brand}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                        {p.gtin ? (
                          <span className="font-mono">EAN: {p.gtin}</span>
                        ) : (
                          <span className="italic text-zinc-500">Sem código GTIN</span>
                        )}
                        <span>•</span>
                        <span>
                          {p.observation_count}{' '}
                          {p.observation_count === 1 ? 'compra registrada' : 'compras registradas'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      to={`/products/${p.id}/history`}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#27272a] bg-[#18181b] px-2.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      <span>Histórico</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#10b981]" />
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditModal(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openMergeModal(p)}
                      title="Mesclar com outro produto duplicado"
                    >
                      <GitMerge className="h-3.5 w-3.5 text-[#10b981]" />
                      <span>Mesclar</span>
                    </Button>
                    {p.observation_count === 0 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletingProduct(p)}
                        aria-label={`Excluir ${p.name}`}
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
