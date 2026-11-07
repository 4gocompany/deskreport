import { applySanityCheck, triageTask } from '../complexity';

describe('applySanityCheck', () => {
  it('promove low com termo de segurança para high', () => {
    expect(applySanityCheck('low', { title: 'Ajustar token da Meta' }).complexity).toBe('high');
  });

  it('promove low com banco ou interface para medium', () => {
    expect(applySanityCheck('low', { title: 'Nova migration do prisma' }).complexity).toBe('medium');
    expect(applySanityCheck('low', { description: 'Modal de tarefas' }).complexity).toBe('medium');
  });

  it('promove medium com termo crítico para high', () => {
    expect(applySanityCheck('medium', { title: 'Isolamento multi-tenant nas rotas' }).complexity).toBe('high');
  });

  it('mantém low em documentação pura', () => {
    expect(applySanityCheck('low', { title: 'Corrigir typo no README' }).complexity).toBe('low');
  });
});

describe('triageTask', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
    jest.restoreAllMocks();
  });

  it('sem chave usa a regra por texto sem chamar a rede', async () => {
    delete process.env.JEV_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    const fetchSpy = jest.spyOn(global, 'fetch');
    expect((await triageTask({ title: 'Corrigir typo no README' })).complexity).toBe('low');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('com chave usa o Jev e sobe um tier quando a confiança é baixa', async () => {
    process.env.JEV_API_KEY = 'chave';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ answers: { complexity: { choice: 'low', confidence: 0.4 } } }),
    } as Response);
    expect((await triageTask({ title: 'Revisar texto do rodapé' })).complexity).toBe('medium');
  });

  it('com falha do Jev cai na regra por texto', async () => {
    process.env.JEV_API_KEY = 'chave';
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('rede'));
    expect((await triageTask({ title: 'Corrigir typo no README' })).complexity).toBe('low');
  });
});
