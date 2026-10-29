import { formatCurrency } from '../../../format';

type CustomChartTooltipProps = {
  active?: boolean,
  payload?: Array<{
    value?: number | string,
  }>,
  label?: string,
  metricLabel: string,
};

export function CustomChartTooltip({
  active,
  payload,
  label,
  metricLabel,
}: CustomChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const rawValue = payload[0]?.value;
  const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0);

  return (
    <div className="rounded-lg border border-[#27272a] bg-[#121215] p-2.5 shadow-xl text-xs">
      {label && <div className="font-semibold text-zinc-200">{label}</div>}
      <div className="text-[#10b981] font-mono mt-0.5">
        {metricLabel}: {formatCurrency(numericValue)}
      </div>
    </div>
  );
}

