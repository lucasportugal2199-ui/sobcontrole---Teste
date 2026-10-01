import { describe, it, expect } from 'vitest';
import {
  addMonthsSafely,
  calculateCreditCardDueDate,
  calculateStatementDate,
  getEffectiveClosingDay,
  getStatementDueDate,
  calcularSaldoFinal,
  calculateAccountBalance,
  calculateDailyBalancesForMonth,
  getPreviousBalance,
  recalculateBalancesFrom,
  parseCurrency,
  formatCurrencyForInput,
  calculate502030,
  getMonthKey,
} from '../utils/helpers';
import { AllData, Categorias, CreditCard, Transaction } from '../types';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  data: '2026-09-10',
  descricao: 'x',
  valor: 0,
  tipo: 'saida',
  categoria: 'Lazer',
  paymentMethod: 'debito',
  ...over,
});

const card = (over: Partial<CreditCard>): CreditCard => ({
  id: 'c1', name: 'Cartão', closingDay: 25, dueDay: 5, limit: 1000, color: '#000', ...over,
});

describe('addMonthsSafely', () => {
  it('soma meses normalmente', () => {
    expect(addMonthsSafely('2026-01-15', 1)).toBe('2026-02-15');
  });
  it('dia 31 vira o último dia de meses menores', () => {
    expect(addMonthsSafely('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsSafely('2028-01-31', 1)).toBe('2028-02-29'); // bissexto
    expect(addMonthsSafely('2026-03-31', 1)).toBe('2026-04-30');
  });
  it('mantém o dia original nas parcelas seguintes', () => {
    expect(addMonthsSafely('2026-01-31', 2)).toBe('2026-03-31');
  });
  it('vira o ano', () => {
    expect(addMonthsSafely('2026-11-10', 3)).toBe('2027-02-10');
  });
  it('aceita meses negativos', () => {
    expect(addMonthsSafely('2026-01-10', -1)).toBe('2025-12-10');
  });
});

describe('calculateCreditCardDueDate (fecha dia 25, vence dia 5)', () => {
  const c = card({ closingDay: 25, dueDay: 5 });
  it('compra antes do fechamento vence no mês seguinte', () => {
    expect(calculateCreditCardDueDate('2026-01-10', c)).toBe('2026-02-05');
  });
  it('compra no dia do fechamento ou depois pula uma fatura', () => {
    expect(calculateCreditCardDueDate('2026-01-25', c)).toBe('2026-03-05');
    expect(calculateCreditCardDueDate('2026-01-26', c)).toBe('2026-03-05');
  });
  it('vira o ano', () => {
    expect(calculateCreditCardDueDate('2026-12-26', c)).toBe('2027-02-05');
  });
  it('chave da fatura é o mês do vencimento', () => {
    expect(calculateStatementDate('2026-01-10', c)).toBe('2026-02');
  });
});

describe('calculateCreditCardDueDate (fecha dia 3, vence dia 10)', () => {
  const c = card({ closingDay: 3, dueDay: 10 });
  it('vencimento no mesmo mês do fechamento', () => {
    expect(calculateCreditCardDueDate('2026-01-02', c)).toBe('2026-01-10');
    expect(calculateCreditCardDueDate('2026-01-05', c)).toBe('2026-02-10');
  });
});

describe('calculateCreditCardDueDate com vencimento no fim do mês', () => {
  it('vencimento dia 31 em mês de 30 dias cai no último dia do mês', () => {
    const c = card({ closingDay: 20, dueDay: 31 });
    // Compra 10/04 → fatura de abril, que só tem 30 dias
    expect(calculateCreditCardDueDate('2026-04-10', c)).toBe('2026-04-30');
  });
  it('vencimento dia 30 em fevereiro cai no último dia de fevereiro', () => {
    const c = card({ closingDay: 20, dueDay: 30 });
    expect(calculateCreditCardDueDate('2026-02-10', c)).toBe('2026-02-28');
  });
});

describe('getStatementDueDate', () => {
  it('vencimento da fatura do mês', () => {
    expect(getStatementDueDate('2026-03', 5)).toBe('2026-03-05');
  });
  it('dia 31 na fatura de abril vence 30/04, não 01/05', () => {
    expect(getStatementDueDate('2026-04', 31)).toBe('2026-04-30');
    expect(getStatementDueDate('2026-02', 30)).toBe('2026-02-28');
  });
});

describe('getEffectiveClosingDay', () => {
  it('fechamento fixo usa o dia cadastrado', () => {
    expect(getEffectiveClosingDay(card({ closingDay: 25 }), new Date(2026, 3, 1))).toBe(25);
  });
  it('fechamento dinâmico conta a partir do vencimento real do mês', () => {
    const c = card({ closingType: 'dynamic', closingDaysBefore: 7, dueDay: 31 });
    // Abril: vence 30/04 → fecha 23/04
    expect(getEffectiveClosingDay(c, new Date(2026, 3, 10))).toBe(23);
    // Maio: vence 31/05 → fecha 24/05
    expect(getEffectiveClosingDay(c, new Date(2026, 4, 10))).toBe(24);
  });
});

describe('calcularSaldoFinal', () => {
  it('soma entradas, subtrai saídas e ignora transferências', () => {
    const txs = [
      tx({ tipo: 'entrada', valor: 1000 }),
      tx({ tipo: 'saida', valor: 300 }),
      tx({ tipo: 'transferencia', valor: 500 }),
    ];
    expect(calcularSaldoFinal(txs, 100, 30)).toBe(800);
  });
  it('aceita valor salvo como texto', () => {
    expect(calcularSaldoFinal([tx({ tipo: 'entrada', valor: '50' as any })], 0, 30)).toBe(50);
  });
});

describe('calculateAccountBalance', () => {
  const txs = [
    tx({ tipo: 'entrada', valor: 1000, accountId: 'a', data: '2026-09-01' }),
    tx({ tipo: 'saida', valor: 200, accountId: 'a', data: '2026-09-05' }),
    tx({ tipo: 'transferencia', valor: 300, accountId: 'a', destinationAccountId: 'b', data: '2026-09-06' }),
    tx({ tipo: 'saida', valor: 50, accountId: 'b', data: '2026-09-20' }),
  ];
  it('considera entradas, saídas e transferências da conta', () => {
    expect(calculateAccountBalance('a', txs)).toBe(500);
    expect(calculateAccountBalance('b', txs)).toBe(250);
  });
  it('respeita a data limite', () => {
    expect(calculateAccountBalance('b', txs, new Date(2026, 8, 10))).toBe(300);
  });
});

describe('calculateDailyBalancesForMonth', () => {
  it('acumula o saldo dia a dia', () => {
    const days = calculateDailyBalancesForMonth([
      tx({ tipo: 'entrada', valor: 100, data: '2026-09-02' }),
      tx({ tipo: 'saida', valor: 30, data: '2026-09-05' }),
      tx({ tipo: 'saida', valor: 20, data: '2026-09-05', paymentMethod: 'credito' }),
    ], 10, 2026, 8);
    expect(days).toHaveLength(30);
    expect(days[0].saldo).toBe(10);
    expect(days[1].saldo).toBe(110);
    expect(days[4].saldo).toBe(60);
    expect(days[29].saldo).toBe(60);
  });
});

describe('saldos entre meses', () => {
  const allData: AllData = {
    '2026-07': { transactions: [tx({ tipo: 'entrada', valor: 1000 })], saldoFinal: 0 },
    '2026-09': { transactions: [tx({ tipo: 'saida', valor: 200 })], saldoFinal: 0 },
  };
  it('recalcula em cadeia e preenche meses vazios', () => {
    const r = recalculateBalancesFrom('2026-07', allData);
    expect(r['2026-07']!.saldoFinal).toBe(1000);
    expect(r['2026-08']!.saldoFinal).toBe(1000);
    expect(r['2026-09']!.saldoFinal).toBe(800);
  });
  it('getPreviousBalance pega o último mês anterior', () => {
    const r = recalculateBalancesFrom('2026-07', allData);
    expect(getPreviousBalance('2026-09', r)).toBe(1000);
    expect(getPreviousBalance('2026-07', r)).toBe(0);
  });
});

describe('moeda', () => {
  it('parseCurrency lê o valor digitado', () => {
    expect(parseCurrency('R$ 1.234,56')).toBe(1234.56);
    expect(parseCurrency('')).toBe(0);
  });
  it('formatCurrencyForInput formata enquanto digita', () => {
    expect(formatCurrencyForInput('4250')).toBe('R$ 42,50');
    expect(formatCurrencyForInput('5')).toBe('R$ 0,05');
    expect(formatCurrencyForInput('123456')).toBe('R$ 1.234,56');
  });
  it('ida e volta mantém o valor', () => {
    expect(parseCurrency(formatCurrencyForInput('99999'))).toBe(999.99);
  });
});

describe('calculate502030', () => {
  const categorias: Categorias = {
    entrada: [],
    saida: [
      { name: 'Moradia', group: 'Gastos Fixos' } as any,
      { name: 'Lazer', group: 'Gastos Variáveis' } as any,
      { name: 'Reserva', group: 'Reserva Financeira' } as any,
    ],
  };
  it('divide os gastos pelos grupos em % da receita', () => {
    const d = calculate502030([
      tx({ tipo: 'entrada', valor: 1000 }),
      tx({ categoria: 'Moradia', valor: 500 }),
      tx({ categoria: 'Lazer', valor: 300 }),
      tx({ categoria: 'Reserva', valor: 200 }),
    ], categorias);
    expect(d.percentuais['Gastos Fixos']).toBe(50);
    expect(d.percentuais['Gastos Variáveis']).toBe(30);
    expect(d.percentuais['Reserva Financeira']).toBe(20);
  });
  it('a reserva é o que sobra da receita (coerente com a taxa de poupança)', () => {
    const d = calculate502030([
      tx({ tipo: 'entrada', valor: 6700 }),
      tx({ categoria: 'Moradia', valor: 2152.9 }),
      tx({ categoria: 'Lazer', valor: 1054.1 }),
    ], categorias);
    expect(d['Reserva Financeira']).toBeCloseTo(3493, 2);
    expect(d.percentuais['Reserva Financeira']).toBeCloseTo(52.13, 1);
  });

  it('categoria sem grupo conta como gasto variável', () => {
    const d = calculate502030([tx({ tipo: 'entrada', valor: 1000 }), tx({ categoria: 'Sem grupo', valor: 100 })], categorias);
    expect(d['Gastos Variáveis']).toBe(100);
    expect(d['Reserva Financeira']).toBe(900);
  });

  it('sem receita, percentuais ficam em zero', () => {
    const d = calculate502030([tx({ categoria: 'Moradia', valor: 500 })], categorias);
    expect(d.percentuais['Gastos Fixos']).toBe(0);
  });
});

describe('getMonthKey', () => {
  it('formata com dois dígitos', () => {
    expect(getMonthKey(new Date(2026, 0, 5))).toBe('2026-01');
  });
});
