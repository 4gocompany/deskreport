type TokenMeterProps = {
  used: number;
  budget: number;
  compact?: boolean;
};

// Verde até 50% do orçamento, amarelo até 60% e vermelho acima disso
function barColor(percent: number) {
  if (percent > 60) return 'bg-red-500';
  if (percent > 50) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function TokenMeter({ used, budget, compact = false }: TokenMeterProps) {
  const safeUsed = Math.max(0, used || 0);
  const safeBudget = Math.max(0, budget || 0);
  const percent = safeBudget > 0 ? (safeUsed / safeBudget) * 100 : 0;

  return (
    <div className={`space-y-1.5 ${compact ? 'min-w-28' : ''}`}>
      <div className='flex justify-between text-xs gap-2'>
        <span className='text-zinc-500'>Tokens</span>
        <span className='font-medium text-zinc-700 dark:text-zinc-300'>
          {safeUsed.toLocaleString('pt-BR')} / {safeBudget.toLocaleString('pt-BR')}
        </span>
      </div>
      <div className='h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden'>
        <div className={`h-full ${barColor(percent)} transition-[width]`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      {!compact && <div className='text-[11px] text-emerald-600 dark:text-emerald-400'>Custo no Free Tier: R$ 0,00</div>}
    </div>
  );
}
