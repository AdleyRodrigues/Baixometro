import { Trash2 } from 'lucide-react';
import type { Category, Product } from '@baixometro/shared-types';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import type { DraftItem } from '../types';

interface ReceiptItemRowProps {
  item: DraftItem;
  index: number;
  totalItems: number;
  categories: Category[];
  products: Product[];
  onUpdate: (key: number, field: keyof Omit<DraftItem, 'key' | 'gtin'>, value: string) => void;
  onRemove: (key: number) => void;
}

export function ReceiptItemRow({
  item,
  index,
  totalItems,
  categories,
  products,
  onUpdate,
  onRemove,
}: ReceiptItemRowProps) {
  return (
    <div className="space-y-3 rounded-xl border border-[#27272a] bg-[#09090b]/70 p-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="font-mono text-[11px]">
          ITEM #{index + 1}
        </Badge>
        {totalItems > 1 && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onRemove(item.key)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Remover</span>
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          className="block text-xs font-medium text-zinc-300"
          htmlFor={`item-desc-${item.key}`}
        >
          Descrição do Produto *
        </label>
        <Input
          id={`item-desc-${item.key}`}
          name={`item-desc-${item.key}`}
          type="text"
          placeholder="Ex.: Arroz Branco Tipo 1 5kg"
          value={item.description}
          onChange={(e) => onUpdate(item.key, 'description', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label
            className="block text-xs font-medium text-zinc-300"
            htmlFor={`item-price-${item.key}`}
          >
            Preço Unitário (R$) *
          </label>
          <Input
            id={`item-price-${item.key}`}
            name={`item-price-${item.key}`}
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={item.unit_price}
            onChange={(e) => onUpdate(item.key, 'unit_price', e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label
            className="block text-xs font-medium text-zinc-300"
            htmlFor={`item-qty-${item.key}`}
          >
            Quantidade *
          </label>
          <Input
            id={`item-qty-${item.key}`}
            name={`item-qty-${item.key}`}
            type="number"
            step="0.001"
            min="0.001"
            value={item.quantity}
            onChange={(e) => onUpdate(item.key, 'quantity', e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label
            className="block text-xs font-medium text-zinc-300"
            htmlFor={`item-unit-${item.key}`}
          >
            Unidade
          </label>
          <Select
            id={`item-unit-${item.key}`}
            name={`item-unit-${item.key}`}
            wrapperClassName="w-full"
            value={item.unit}
            onChange={(e) => onUpdate(item.key, 'unit', e.target.value)}
          >
            <option value="UN">UN (Unidade)</option>
            <option value="KG">KG (Quilo)</option>
            <option value="L">L (Litro)</option>
            <option value="CX">CX (Caixa)</option>
            <option value="PCT">PCT (Pacote)</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            className="block text-xs font-medium text-zinc-300"
            htmlFor={`item-cat-${item.key}`}
          >
            Categoria
          </label>
          <Select
            id={`item-cat-${item.key}`}
            name={`item-cat-${item.key}`}
            wrapperClassName="w-full"
            value={item.category_id}
            onChange={(e) => onUpdate(item.key, 'category_id', e.target.value)}
          >
            <option value="">Sem categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label
            className="block text-xs font-medium text-zinc-300"
            htmlFor={`item-prod-${item.key}`}
          >
            Produto Canônico (Histórico de Preços)
          </label>
          <Select
            id={`item-prod-${item.key}`}
            name={`item-prod-${item.key}`}
            wrapperClassName="w-full"
            value={item.product_id}
            onChange={(e) => onUpdate(item.key, 'product_id', e.target.value)}
          >
            <option value="">Criar novo produto com este nome</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.brand ? `(${p.brand})` : ''}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}

