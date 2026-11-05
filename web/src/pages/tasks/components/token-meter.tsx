type TokenMeterProps = {
  used: number;
  budget: number;
};

// Verde até 50% do orçamento, amarelo até 60% e vermelho acima disso
function barColor(percent: number) {
  if (percent > 60) return 'bg-red-500';
  if (percent > 50) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function TokenMeter({ used, budget }: TokenMeterProps) {
  const percent = budget > 0 ? (used / budget) * 100 : 0;

  return (
    <div className='space-y-1.5'>
      <div className='flex justify-between text-xs'>
        <span className='text-zinc-500'>Tokens</span>
        <span className='font-medium text-zinc-700 dark:text-zinc-300'>
          {used.toLocaleString('pt-BR')} / {budget.toLocaleString('pt-BR')}
        </span>
      </div>
      <div className='h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden'>
        <div className={`h-full ${barColor(percent)}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}
