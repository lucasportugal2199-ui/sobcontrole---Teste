import { describe, it, expect } from 'vitest';
import { fixOverflowedCardDueDates } from '../utils/migrations';
import { addMonthsToMonthKey } from '../utils/helpers';
import { smartMerge } from '../utils/syncEngine';
import { AllData, CreditCard, Transaction } from '../types';

const card31: CreditCard = { id: 'c31', name: 'Vence 31', closingDay: 20, dueDay: 31, limit: 1000, color: '#000' };
const card30: CreditCard = { id: 'c30', name: 'Vence 30', closingDay: 20, dueDay: 30, limit: 1000, color: '#000' };
const card5: CreditCard = { id: 'c5', name: 'Vence 5', closingDay: 25, dueDay: 5, limit: 1000, color: '#000' };

const credit = (id: string, data: string, over: Partial<Transaction> = {}): Transaction => ({
  id, data, descricao: id, valor: 10, tipo: 'saida', categoria: 'Lazer',
  paymentMethod: 'credito', cardId: 'c31', statementDate: data.slice(0, 7), ...over,
});

const byMonth = (txs: Transaction[]): AllData => {
  const out: AllData = {};
  for (const tx of txs) {
    const k = tx.data.slice(0, 7);
    out[k] = out[k] || { transactions: [], saldoFinal: 0 };
    out[k].transactions.push(tx);
  }
  return out;
};
const where = (data: AllData, id: string) =>
  Object.entries(data).flatMap(([k, m]) => m!.transactions.filter(t => t.id === id).map(t => ({ month: k, data: t.data, statementDate: t.statementDate })));

describe('addMonthsToMonthKey', () => {
  it('soma e vira o ano', () => {
    expect(addMonthsToMonthKey('2026-11', 3)).toBe('2027-02');
    expect(addMonthsToMonthKey('2026-01', -1)).toBe('2025-12');
  });
});

describe('fixOverflowedCardDueDates', () => {
  it('compra única: 01/05 (vence 31, fatura de abril) volta para 30/04', () => {
    const r = fixOverflowedCardDueDates(byMonth([credit('A', '2026-05-01')]), [card31]);
    expect(r.fixed).toBe(1);
    expect(where(r.allData, 'A')).toEqual([{ month: '2026-04', data: '2026-04-30', statementDate: '2026-04' }]);
    expect(r.allData['2026-05']!.transactions).toHaveLength(0);
    expect(r.firstMonth).toBe('2026-04');
  });

  it('fevereiro: vence 30 → 02/03 volta para 28/02', () => {
    const r = fixOverflowedCardDueDates(byMonth([credit('A', '2026-03-02', { cardId: 'c30' })]), [card30]);
    expect(where(r.allData, 'A')[0]).toMatchObject({ data: '2026-02-28', statementDate: '2026-02' });
  });

  it('parcelas: todas voltam para o vencimento do mês certo', () => {
    const inst = (i: number, data: string) => credit(`P${i}`, data, { recurrenceId: 'inst-1', installment: { current: i, total: 3 } });
    // Com o bug: 1ª parcela 01/05 (transbordo), demais copiadas no dia 1
    const r = fixOverflowedCardDueDates(byMonth([inst(1, '2026-05-01'), inst(2, '2026-06-01'), inst(3, '2026-07-01')]), [card31]);
    expect(r.fixed).toBe(3);
    expect(where(r.allData, 'P1')[0].data).toBe('2026-04-30');
    expect(where(r.allData, 'P2')[0].data).toBe('2026-05-31');
    expect(where(r.allData, 'P3')[0].data).toBe('2026-06-30');
  });

  it('é idempotente: rodar de novo não muda nada', () => {
    const once = fixOverflowedCardDueDates(byMonth([credit('A', '2026-05-01')]), [card31]);
    const twice = fixOverflowedCardDueDates(once.allData, [card31]);
    expect(twice.fixed).toBe(0);
    expect(twice.allData).toBe(once.allData);
  });

  it('não mexe em datas que não têm o padrão do bug', () => {
    const data = byMonth([
      credit('certo', '2026-04-30'),                                  // já correto
      credit('dia2', '2026-05-02'),                                   // 02/05 não é transbordo de 31 em abril
      credit('outroCartao', '2026-05-01', { cardId: 'c5' }),          // cartão que vence dia 5
      credit('debito', '2026-05-01', { paymentMethod: 'debito' }),    // não é cartão
      credit('faturaMovida', '2026-05-01', { statementDate: '2026-06' }), // fatura escolhida à mão
    ]);
    const r = fixOverflowedCardDueDates(data, [card31, card5]);
    expect(r.fixed).toBe(0);
    expect(r.allData).toBe(data);
  });

  it('não duplica se o lançamento já estiver no mês certo (veio de outro aparelho)', () => {
    const data: AllData = {
      '2026-04': { transactions: [credit('A', '2026-04-30')], saldoFinal: 0 },
      '2026-05': { transactions: [credit('A', '2026-05-01')], saldoFinal: 0 },
    };
    const r = fixOverflowedCardDueDates(data, [card31]);
    expect(where(r.allData, 'A')).toEqual([{ month: '2026-04', data: '2026-04-30', statementDate: '2026-04' }]);
  });
});

describe('smartMerge com lançamento que mudou de mês', () => {
  const user = (allData: AllData) => ({
    allData, categories: { entrada: [], saida: [] }, categoryColors: {}, creditCards: [], budgets: {}, savingsGoals: [],
    dashboardLayout: { order: [], visibility: {} } as any, userProfile: { name: 'U', email: '', badges: [] } as any,
    importHistory: [], theme: 'dark' as const,
  });

  it('não duplica: vale o mês do aparelho local', () => {
    const local = user({ '2026-04': { transactions: [credit('A', '2026-04-30')], saldoFinal: 0 } });
    const remote = user({ '2026-05': { transactions: [credit('A', '2026-05-01')], saldoFinal: 0 } });
    const merged = smartMerge(local, remote);
    expect(where(merged.allData, 'A')).toEqual([{ month: '2026-04', data: '2026-04-30', statementDate: '2026-04' }]);
  });
});
