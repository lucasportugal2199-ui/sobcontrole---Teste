import { describe, it, expect } from 'vitest';
import { evaluateBadges, BadgeInput } from '../utils/achievements';
import { Transaction } from '../types';

const now = new Date(2026, 8, 30, 12); // 30/09/2026
const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2), data: '2026-09-10', descricao: 'x', valor: 10,
  tipo: 'saida', categoria: 'Lazer', paymentMethod: 'debito', ...over,
});
const input = (over: Partial<BadgeInput> = {}): BadgeInput => ({
  currentBadges: [], allTransactions: [], savingsGoals: [], budgets: {}, now, ...over,
});

describe('evaluateBadges', () => {
  it('usuário novo sem dados não ganha nada', () => {
    expect(evaluateBadges(input())).toEqual({ newBadges: [], revokedBadges: [] });
  });

  it('primeiro lançamento → iniciante (Saldo Inicial não conta)', () => {
    expect(evaluateBadges(input({ allTransactions: [tx({ categoria: 'Saldo Inicial', tipo: 'entrada' })] })).newBadges).not.toContain('iniciante');
    expect(evaluateBadges(input({ allTransactions: [tx({})] })).newBadges).toContain('iniciante');
  });

  it('não repete conquista que já tem', () => {
    expect(evaluateBadges(input({ currentBadges: ['iniciante'], allTransactions: [tx({})] })).newBadges).not.toContain('iniciante');
  });

  it('sequência de dias', () => {
    const r = evaluateBadges(input({ currentStreak: 7 }));
    expect(r.newBadges).toEqual(expect.arrayContaining(['streak_3', 'streak_7']));
    expect(r.newBadges).not.toContain('streak_30');
  });

  it('meta concluída e R$ 1.000 guardados', () => {
    const r = evaluateBadges(input({
      savingsGoals: [{ id: 'g1', name: 'Viagem', targetAmount: 1000 } as any],
      allTransactions: [tx({ goalId: 'g1', valor: 1200 })],
    }));
    expect(r.newBadges).toEqual(expect.arrayContaining(['metas_1', 'goal_completed_1', 'saldo_1000']));
  });

  it('orçamento definido → planejador', () => {
    expect(evaluateBadges(input({ budgets: { Lazer: 300 } as any })).newBadges).toContain('planejador');
  });

  it('10 outras conquistas → completionist', () => {
    const ten = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    expect(evaluateBadges(input({ currentBadges: ten })).newBadges).toContain('completionist');
  });

  it('revoga longevidade concedida indevidamente (sem meses de uso reais)', () => {
    const r = evaluateBadges(input({ currentBadges: ['usage_3m'] }));
    expect(r).toEqual({ newBadges: [], revokedBadges: ['usage_3m'] });
  });
});
