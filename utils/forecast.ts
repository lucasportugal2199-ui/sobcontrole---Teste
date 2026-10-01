/**
 * forecast.ts — Projeção de fim de mês (cartão "Projeção do Mês").
 *
 * Os lançamentos já registrados para o mês (inclusive os agendados para dias
 * futuros, recorrentes e parcelas) entram uma única vez. Por cima deles só
 * estimamos os gastos AVULSOS que ainda não foram lançados, pelo ritmo dos
 * avulsos já feitos — e só a partir do 7º dia, quando há histórico suficiente.
 *
 * Antes, o total do mês inteiro (com os agendados) era dividido pelos dias
 * já passados e multiplicado pelo mês: no dia 1 isso dava 31× as despesas.
 */

import { Transaction } from '../types';
import { formatDateToInput } from './helpers';

/** A partir de qual dia do mês o ritmo de gastos já é confiável para extrapolar */
export const MIN_DAYS_TO_EXTRAPOLATE = 7;

export interface MonthForecastInput {
  /** Lançamentos do mês exibido */
  transactions: Transaction[];
  totalReceitas: number;
  /** Total de despesas registradas no mês (inclui as agendadas) */
  totalDespesas: number;
  /** Saldo previsto para o fim do mês com o que já está registrado */
  saldoPrevisto: number;
  /** Mês exibido */
  currentDate: Date;
  /** Hoje (testes); padrão: agora */
  today?: Date;
}

export interface MonthForecast {
  isCurrentMonth: boolean;
  currentDay: number;
  daysInMonth: number;
  monthProgress: number;
  /** Gasto médio por dia até hoje */
  dailyRate: number;
  /** % da receita já gasto (até hoje, no mês atual) */
  budgetUsed: number;
  /** Despesas previstas no fim do mês */
  projectedExpenses: number;
  /** Saldo previsto no fim do mês */
  projectedBalance: number;
  /** Quanto da projeção é estimativa de gastos ainda não lançados */
  estimatedUnregistered: number;
}

const isScheduledKind = (tx: Transaction) => !!(tx.isRecurring || tx.recurrenceId || tx.installment);

export function computeMonthForecast(input: MonthForecastInput): MonthForecast {
  const { transactions, totalReceitas, totalDespesas, saldoPrevisto, currentDate } = input;
  const today = input.today ?? new Date();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();
  const isFutureMonth = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());
  const currentDay = isCurrentMonth ? today.getDate() : isFutureMonth ? 0 : daysInMonth;

  const todayStr = formatDateToInput(today);
  const expenses = transactions.filter(tx => tx.tipo === 'saida');
  const value = (tx: Transaction) => Number(tx.valor) || 0;

  const spentSoFar = isCurrentMonth
    ? expenses.filter(tx => tx.data <= todayStr).reduce((sum, tx) => sum + value(tx), 0)
    : isFutureMonth ? 0 : totalDespesas;

  let estimatedUnregistered = 0;
  if (isCurrentMonth && currentDay >= MIN_DAYS_TO_EXTRAPOLATE) {
    const pastVariable = expenses
      .filter(tx => tx.data <= todayStr && !isScheduledKind(tx))
      .reduce((sum, tx) => sum + value(tx), 0);
    const futureVariableRegistered = expenses
      .filter(tx => tx.data > todayStr && !isScheduledKind(tx))
      .reduce((sum, tx) => sum + value(tx), 0);
    const remainingDays = daysInMonth - currentDay;
    const expectedVariable = (pastVariable / currentDay) * remainingDays;
    // O que já foi lançado para os próximos dias conta como parte do esperado
    estimatedUnregistered = Math.max(0, expectedVariable - futureVariableRegistered);
  }

  return {
    isCurrentMonth,
    currentDay,
    daysInMonth,
    monthProgress: (currentDay / daysInMonth) * 100,
    dailyRate: currentDay > 0 ? spentSoFar / currentDay : 0,
    budgetUsed: totalReceitas > 0 ? (spentSoFar / totalReceitas) * 100 : 0,
    projectedExpenses: totalDespesas + estimatedUnregistered,
    projectedBalance: saldoPrevisto - estimatedUnregistered,
    estimatedUnregistered,
  };
}
