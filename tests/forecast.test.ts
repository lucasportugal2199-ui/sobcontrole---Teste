import { describe, it, expect } from 'vitest';
import { computeMonthForecast } from '../utils/forecast';
import { Transaction } from '../types';

const tx = (data: string, valor: number, over: Partial<Transaction> = {}): Transaction => ({
  id: Math.random().toString(36).slice(2), data, descricao: 'x', valor,
  tipo: 'saida', categoria: 'Lazer', paymentMethod: 'debito', ...over,
});
const sum = (txs: Transaction[]) => txs.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0);
const outubro = new Date(2026, 9, 1);

describe('computeMonthForecast', () => {
  it('dia 1 com gastos agendados no mês: não multiplica por 31 (bug do -R$ 92 mil)', () => {
    const txs = [
      tx('2026-10-01', 5500, { tipo: 'entrada', categoria: 'Salário' }),
      tx('2026-10-02', 489.3),
      tx('2026-10-07', 1800, { isRecurring: true }),
      tx('2026-10-20', 917.7),
    ];
    const f = computeMonthForecast({
      transactions: txs, totalReceitas: 6700, totalDespesas: sum(txs), saldoPrevisto: 6483.1,
      currentDate: outubro, today: new Date(2026, 9, 1, 10),
    });
    expect(f.projectedExpenses).toBeCloseTo(3207, 2); // só o que está registrado
    expect(f.projectedBalance).toBeCloseTo(6483.1, 2); // igual ao "Projetado" do Resumo
    expect(f.dailyRate).toBe(0);    // nada gasto ainda no dia 1
    expect(f.budgetUsed).toBe(0);   // agendado não é "consumido"
  });

  it('antes do 7º dia não extrapola (pouco histórico)', () => {
    const f = computeMonthForecast({
      transactions: [tx('2026-10-02', 600)], totalReceitas: 5000, totalDespesas: 600, saldoPrevisto: 4400,
      currentDate: outubro, today: new Date(2026, 9, 5),
    });
    expect(f.estimatedUnregistered).toBe(0);
    expect(f.dailyRate).toBe(120);
  });

  it('a partir do 7º dia estima os avulsos ainda não lançados pelo ritmo', () => {
    // 10 dias, R$ 1.000 avulsos → R$ 100/dia × 21 dias restantes = R$ 2.100
    const txs = [tx('2026-10-03', 400), tx('2026-10-08', 600)];
    const f = computeMonthForecast({
      transactions: txs, totalReceitas: 5000, totalDespesas: 1000, saldoPrevisto: 4000,
      currentDate: outubro, today: new Date(2026, 9, 10),
    });
    expect(f.estimatedUnregistered).toBeCloseTo(2100, 2);
    expect(f.projectedExpenses).toBeCloseTo(3100, 2);
    expect(f.projectedBalance).toBeCloseTo(1900, 2);
  });

  it('recorrentes e parcelas não entram no ritmo (já estão agendados)', () => {
    const txs = [tx('2026-10-05', 1000, { recurrenceId: 'rec-1' }), tx('2026-10-06', 300, { installment: { current: 1, total: 3 } })];
    const f = computeMonthForecast({
      transactions: txs, totalReceitas: 5000, totalDespesas: 1300, saldoPrevisto: 3700,
      currentDate: outubro, today: new Date(2026, 9, 10),
    });
    expect(f.estimatedUnregistered).toBe(0);
  });

  it('avulsos já lançados para os próximos dias abatem a estimativa', () => {
    const txs = [tx('2026-10-05', 1000), tx('2026-10-25', 1500)];
    const f = computeMonthForecast({
      transactions: txs, totalReceitas: 5000, totalDespesas: 2500, saldoPrevisto: 2500,
      currentDate: outubro, today: new Date(2026, 9, 10),
    });
    // ritmo R$ 100/dia × 21 = 2.100; já há 1.500 lançados → estima mais 600
    expect(f.estimatedUnregistered).toBeCloseTo(600, 2);
  });

  it('mês passado: usa os números fechados', () => {
    const f = computeMonthForecast({
      transactions: [tx('2026-09-10', 900)], totalReceitas: 3000, totalDespesas: 900, saldoPrevisto: 2100,
      currentDate: new Date(2026, 8, 1), today: new Date(2026, 9, 10),
    });
    expect(f).toMatchObject({ isCurrentMonth: false, currentDay: 30, projectedExpenses: 900, projectedBalance: 2100 });
    expect(f.budgetUsed).toBe(30);
  });

  it('mês futuro: progresso zero e nada consumido', () => {
    const f = computeMonthForecast({
      transactions: [tx('2026-11-10', 900)], totalReceitas: 3000, totalDespesas: 900, saldoPrevisto: 2100,
      currentDate: new Date(2026, 10, 1), today: new Date(2026, 9, 10),
    });
    expect(f).toMatchObject({ currentDay: 0, monthProgress: 0, budgetUsed: 0, projectedExpenses: 900 });
  });
});
