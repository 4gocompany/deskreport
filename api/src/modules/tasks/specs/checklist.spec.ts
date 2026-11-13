import {
  applyStage,
  defaultChecklist,
  editChecklist,
  nextStep,
  specChecklist,
} from '../checklist';

describe('checklist', () => {
  it('a spec só vale com itens de engineering, review e qa', () => {
    expect(
      specChecklist([
        { role: 'engineering', text: 'a' },
        { role: 'review', text: 'b' },
      ]),
    ).toBeNull();
    const list = specChecklist([
      { role: 'engineering', text: 'a' },
      { role: 'review', text: 'b' },
      { role: 'qa', text: 'c' },
    ]);
    expect(list?.items.map((item) => item.id)).toEqual([
      'eng-1',
      'rev-1',
      'qa-1',
    ]);
  });

  it('para a esteira com item sem marcar ou não feito sem motivo', () => {
    const list = defaultChecklist('bugfix');
    expect(
      applyStage(list, 'engineering', {}, 'claude').haltedReason,
    ).toContain('sem marcar');
    const updates = [
      { id: 'eng-1', status: 'done' },
      { id: 'eng-2', status: 'not_done' },
    ];
    expect(
      applyStage(list, 'engineering', { checklistUpdates: updates }, 'claude')
        .haltedReason,
    ).toContain('sem marcar');
  });

  it('engenharia com item não feito para a esteira, e com tudo feito segue para a revisão', () => {
    const list = defaultChecklist('feature');
    const failed = applyStage(
      list,
      'engineering',
      {
        checklistUpdates: [
          { id: 'eng-1', status: 'done' },
          { id: 'eng-2', status: 'not_done', reason: 'sem build' },
        ],
      },
      'claude',
    );
    expect(failed.haltedReason).toContain('não feito');

    const ok = applyStage(
      list,
      'engineering',
      {
        checklistUpdates: [
          { id: 'eng-1', status: 'done' },
          { id: 'eng-2', status: 'conflict', reason: 'trecho da spec' },
        ],
      },
      'claude',
    );
    expect(ok.haltedReason).toBe('');
    expect(nextStep(ok.checklist, 'implement')).toBe('review');
  });

  it('revisão reabre o item original e devolve para a engenharia', () => {
    const list = applyStage(
      defaultChecklist('feature'),
      'engineering',
      {
        checklistUpdates: [
          { id: 'eng-1', status: 'done' },
          { id: 'eng-2', status: 'done' },
        ],
      },
      'claude',
    ).checklist;
    const reviewed = applyStage(
      list,
      'review',
      {
        checklistUpdates: [
          { id: 'rev-1', status: 'done' },
          { id: 'rev-2', status: 'done' },
        ],
        reopenItems: [{ id: 'eng-1', reason: 'falta teste' }],
        newItems: [{ role: 'engineering', text: 'novo' }],
      },
      'antigravity',
    );
    expect(
      reviewed.checklist.items.find((item) => item.id === 'eng-1'),
    ).toMatchObject({ status: 'pending', reason: 'falta teste' });
    expect(reviewed.checklist.items.some((item) => item.id === 'eng-3')).toBe(
      true,
    );
    expect(nextStep(reviewed.checklist, 'review')).toBe('rework');
  });

  it('a pessoa edita itens e a parada some quando nada está pendente', () => {
    const list = {
      ...specChecklist([
        { role: 'engineering', text: 'a' },
        { role: 'review', text: 'b' },
        { role: 'qa', text: 'c' },
      ])!,
      haltedReason: 'parou',
    };
    const added = editChecklist(
      list,
      { addItem: { role: 'qa', text: 'novo' } },
      'Rodrigo',
    );
    expect(added.items).toHaveLength(4);
    expect(added.haltedReason).toBe('parou');
    expect(() =>
      editChecklist(
        added,
        { updateItem: { id: 'qa-1', status: 'conflict' } },
        'Rodrigo',
      ),
    ).toThrow('motivo');
  });
});
