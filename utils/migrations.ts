/**
 * migrations.ts — Correções únicas nos dados já salvos dos usuários.
 */

import { AllData, CreditCard, Transaction } from '../types';
import { getDiasNoMes, getMonthKey, getStatementDueDate, addMonthsToMonthKey } from './helpers';

/**
 * Até a versão 1.9.1, cartões com vencimento dia 29/30/31 tinham a data de
 * vencimento "transbordada" para o mês seguinte quando a fatura caía num mês
 * mais curto (ex.: vence 31, fatura de abril → 01/05 em vez de 30/04).
 * Nas compras parceladas, a 1ª parcela errada era copiada para as demais
 * (todas no dia 1 do mês seguinte ao certo).
 *
 * Só corrige o que tem exatamente esse padrão, para não mexer em datas que o
 * usuário ajustou à mão:
 * - compra única: a data é o "transbordo" exato do mês anterior;
 * - parcelas/recorrências (mesmo recurrenceId): a parcela mais antiga tem
 *   esse padrão — aí todas do grupo voltam para o vencimento do mês anterior.
 * Rodar de novo não muda nada (é idempotente).
 */
export function fixOverflowedCardDueDates(
  allData: AllData,
  creditCards: CreditCard[]
): { allData: AllData; fixed: number; firstMonth: string | null } {
  const cards = new Map(creditCards.filter(c => c.dueDay >= 29).map(c => [c.id, c]));
  if (cards.size === 0) return { allData, fixed: 0, firstMonth: null };

  // A data é o transbordo exato do vencimento do mês anterior? (ex.: dia 31 → 01/05)
  const isOverflowOfPreviousMonth = (date: string, dueDay: number): boolean => {
    const [y, m, d] = date.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    const daysInPrev = getDiasNoMes(prev.getFullYear(), prev.getMonth());
    return dueDay > daysInPrev && d === dueDay - daysInPrev;
  };

  const candidates: Transaction[] = [];
  for (const month of Object.values(allData)) {
    for (const tx of month?.transactions || []) {
      if (tx.paymentMethod !== 'credito' || !tx.cardId || !cards.has(tx.cardId)) continue;
      // O bug gravava a fatura no mesmo mês da data errada
      if (tx.statementDate && tx.statementDate !== tx.data.slice(0, 7)) continue;
      candidates.push(tx);
    }
  }

  // Agrupa parcelas/recorrências; compras únicas ficam sozinhas
  const groups = new Map<string, Transaction[]>();
  for (const tx of candidates) {
    const key = tx.recurrenceId ? `${tx.cardId}|${tx.recurrenceId}` : `single|${tx.id}|${tx.data}`;
    groups.set(key, [...(groups.get(key) || []), tx]);
  }

  // Chave id|data: o mesmo lançamento pode aparecer duplicado (certo e errado) vindo de outro aparelho
  const correctionKey = (tx: Transaction) => `${tx.id}|${tx.data}`;
  const corrections = new Map<string, { data: string; statementDate: string }>();
  for (const group of groups.values()) {
    const dueDay = cards.get(group[0].cardId!)!.dueDay;
    const first = [...group].sort((a, b) => a.data.localeCompare(b.data))[0];
    if (!isOverflowOfPreviousMonth(first.data, dueDay)) continue;
    for (const tx of group) {
      const statementDate = addMonthsToMonthKey(tx.data.slice(0, 7), -1);
      corrections.set(correctionKey(tx), { data: getStatementDueDate(statementDate, dueDay), statementDate });
    }
  }

  if (corrections.size === 0) return { allData, fixed: 0, firstMonth: null };

  // Remonta allData movendo as transações corrigidas para o mês certo
  const result: AllData = {};
  const moved: Transaction[] = [];
  for (const [monthKey, month] of Object.entries(allData)) {
    const keep: Transaction[] = [];
    for (const tx of month?.transactions || []) {
      const fix = corrections.get(correctionKey(tx));
      if (fix) moved.push({ ...tx, ...fix });
      else keep.push(tx);
    }
    result[monthKey] = { ...month, transactions: keep };
  }
  let firstMonth: string | null = null;
  for (const tx of moved) {
    const monthKey = getMonthKey(new Date(tx.data + 'T00:00:00'));
    const month = result[monthKey] || { transactions: [], saldoFinal: 0 };
    // Evita duplicar se o mesmo lançamento já estiver no mês certo (ex.: veio de outro aparelho)
    if (!month.transactions.some(t => t.id === tx.id)) {
      result[monthKey] = { ...month, transactions: [...month.transactions, tx] };
    }
    if (!firstMonth || monthKey < firstMonth) firstMonth = monthKey;
  }

  return { allData: result, fixed: moved.length, firstMonth };
}
