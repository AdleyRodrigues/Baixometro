import type { ImportedItem, Product } from '@baixometro/shared-types';
import type { DraftItem } from './types';

export function todayLocalISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isoToLocalDate(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return todayLocalISO();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createEmptyDraftItem(key = 1): DraftItem {
  return {
    key,
    description: '',
    quantity: '1',
    unit: 'UN',
    unit_price: '',
    category_id: '',
    product_id: '',
  };
}

export function mapPreviewToDraftItems(
  items: ImportedItem[],
  productCatalog: Product[],
): DraftItem[] {
  return items.map((item, index) => {
    const matchedProduct = productCatalog.find(
      (p) =>
        (item.gtin && p.gtin === item.gtin) ||
        p.name.toLowerCase() === item.description.trim().toLowerCase(),
    );
    return {
      key: index + 1,
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit || 'UN',
      unit_price: String(item.unit_price),
      category_id: '',
      product_id: matchedProduct?.id ?? '',
      gtin: item.gtin ?? undefined,
    };
  });
}

export function parseReceiptFormItems(items: DraftItem[]) {
  return items.map((item, idx) => {
    const description = item.description.trim();
    if (!description) {
      throw new Error(`Informe a descrição do item #${idx + 1}.`);
    }
    const quantity = Number.parseFloat(item.quantity.replace(',', '.'));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Quantidade inválida para "${description}".`);
    }
    const unit_price = Number.parseFloat(item.unit_price.replace(',', '.'));
    if (!Number.isFinite(unit_price) || unit_price < 0) {
      throw new Error(`Preço unitário inválido para "${description}".`);
    }

    return {
      description,
      quantity,
      unit: item.unit.trim().toUpperCase() || 'UN',
      unit_price,
      category_id: item.category_id || undefined,
      product_id: item.product_id || undefined,
      gtin: item.gtin || undefined,
    };
  });
}
