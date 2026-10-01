import { describe, it, expect } from 'vitest';
import { smartMerge, collectIds, updateDeletedIds, sameSyncedContent, hasDeletedIds } from '../utils/syncEngine';
import { UserData } from '../types';

const tx = (id: string, valor = 10) =>
  ({ id, data: '2026-09-10', descricao: id, valor, tipo: 'saida', categoria: 'Lazer', paymentMethod: 'debito' }) as any;

const base = (txs: any[], extra: Partial<UserData> = {}): UserData => ({
  allData: { '2026-09': { transactions: txs, saldoFinal: 0 } },
  categories: { entrada: [{ name: 'Salário' } as any], saida: [{ name: 'Lazer' } as any] },
  categoryColors: {}, creditCards: [], budgets: {}, savingsGoals: [],
  dashboardLayout: { order: ['resumo'], visibility: {} } as any,
  userProfile: { name: 'U', email: '', badges: [] } as any,
  importHistory: [], theme: 'dark', assets: [], patrimonioHistory: [], accounts: [], subscriptions: [],
  lastUpdatedAt: '2026-09-30T10:00:00.000Z',
  ...extra,
});

const txIds = (d: UserData) => d.allData['2026-09']!.transactions.map(t => t.id);
const now = () => new Date().toISOString();

describe('exclusões (deletedIds)', () => {
  it('detecta o que sumiu desde a última persistência', () => {
    const del = updateDeletedIds(collectIds(base([tx('A'), tx('B')])), collectIds(base([tx('A')])), {});
    expect(del).toEqual({ 'tx:B': expect.any(String) });
  });

  it('não muda nada se nada sumiu', () => {
    expect(updateDeletedIds(collectIds(base([tx('A')])), collectIds(base([tx('A')])), {})).toBeNull();
  });

  it('item recriado sai da lista de excluídos', () => {
    const del = updateDeletedIds(collectIds(base([tx('A')])), collectIds(base([tx('A'), tx('B')])), { 'tx:B': now() });
    expect(del).toEqual({});
  });

  it('item excluído no celular não volta ao juntar com a nuvem', () => {
    const merged = smartMerge(base([tx('A')], { deletedIds: { 'tx:B': now() } }), base([tx('A'), tx('B')]));
    expect(txIds(merged)).toEqual(['A']);
    expect(merged.deletedIds?.['tx:B']).toBeDefined();
  });

  it('exclusão feita em outro aparelho remove o item daqui', () => {
    const merged = smartMerge(base([tx('A'), tx('B')]), base([tx('A')], { deletedIds: { 'tx:B': now() } }));
    expect(txIds(merged)).toEqual(['A']);
  });

  it('"Resetar dados" não é desfeito pela nuvem', () => {
    const before = base([tx('A'), tx('B')]);
    const after = base([]);
    const local = { ...after, deletedIds: updateDeletedIds(collectIds(before), collectIds(after), {})! };
    expect(hasDeletedIds(local)).toBe(true);
    expect(txIds(smartMerge(local, before))).toEqual([]);
  });

  it('categoria excluída não volta', () => {
    const before = base([], { categories: { entrada: [], saida: [{ name: 'Lazer' } as any, { name: 'Pet' } as any] } });
    const after = base([], { categories: { entrada: [], saida: [{ name: 'Lazer' } as any] } });
    const del = updateDeletedIds(collectIds(before), collectIds(after), {})!;
    const merged = smartMerge({ ...after, deletedIds: del }, before);
    expect(merged.categories.saida.map(c => c.name)).toEqual(['Lazer']);
  });

  it('exclusões com mais de 90 dias são esquecidas', () => {
    const old = new Date(Date.now() - 100 * 86400000).toISOString();
    const merged = smartMerge(base([tx('A')], { deletedIds: { 'tx:Z': old } }), base([tx('A')]));
    expect(merged.deletedIds?.['tx:Z']).toBeUndefined();
  });
});

describe('smartMerge', () => {
  it('mantém a ordem local e acrescenta no fim o que veio da nuvem', () => {
    expect(txIds(smartMerge(base([tx('B'), tx('A')]), base([tx('A'), tx('C')])))).toEqual(['B', 'A', 'C']);
  });

  it('nome vazio de um lado não apaga o nome do outro', () => {
    const local = base([tx('A')], { userProfile: { name: '', email: '', badges: [] } as any });
    const remote = base([tx('A')], { userProfile: { name: 'Lucas', email: 'l@x.com', badges: [] } as any });
    const merged = smartMerge(local, remote);
    expect(merged.userProfile.name).toBe('Lucas');
    expect(merged.userProfile.email).toBe('l@x.com');
  });

  it('edição local do mesmo lançamento vence', () => {
    const merged = smartMerge(base([tx('A', 99)]), base([tx('A', 10)]));
    expect(merged.allData['2026-09']!.transactions[0]!.valor).toBe(99);
  });

  it('é estável: juntar o resultado com ele mesmo não muda nada (sem loop de sync)', () => {
    const m1 = smartMerge(base([tx('B'), tx('A')], { deletedIds: { 'tx:X': now() } }), base([tx('A'), tx('C')]));
    const m2 = smartMerge({ ...m1, lastUpdatedAt: now() }, m1);
    expect(sameSyncedContent(m1, m2)).toBe(true);
  });
});

describe('sameSyncedContent', () => {
  const reverseKeys = (v: any): any =>
    Array.isArray(v) ? v.map(reverseKeys)
      : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).reverse().map(k => [k, reverseKeys(v[k])]))
        : v;

  it('ignora a ordem das chaves (o JSONB do Supabase reordena)', () => {
    const a = base([tx('A')]);
    expect(sameSyncedContent(a, reverseKeys(a))).toBe(true);
  });

  it('detecta mudança de valor', () => {
    expect(sameSyncedContent(base([tx('A', 10)]), base([tx('A', 11)]))).toBe(false);
  });
});
