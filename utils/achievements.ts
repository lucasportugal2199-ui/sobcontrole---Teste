/**
 * achievements.ts — Regras das conquistas (badges).
 *
 * Função pura: recebe os dados do usuário e devolve as conquistas novas e as
 * que devem ser revogadas. Quem aplica no perfil e mostra o aviso é o App.
 */

import { Budgets, SavingsGoal, Transaction } from '../types';

export interface BadgeInput {
  currentBadges: string[];
  allTransactions: Transaction[];
  savingsGoals: SavingsGoal[];
  budgets: Budgets;
  currentStreak?: number;
  aiScansCount?: number;
  cfoInteractionsCount?: number;
  /** Data de referência (testes); padrão: agora */
  now?: Date;
}

export interface BadgeEvaluation {
  newBadges: string[];
  /** Conquistas de longevidade concedidas indevidamente (por lançamentos futuros) */
  revokedBadges: string[];
}

export function evaluateBadges(input: BadgeInput): BadgeEvaluation {
  const { allTransactions, savingsGoals, budgets } = input;
  const userProfile = {
    currentStreak: input.currentStreak,
    aiScansCount: input.aiScansCount,
    cfoInteractionsCount: input.cfoInteractionsCount,
  };
  const currentBadges = new Set(input.currentBadges);
  let newBadges: string[] = [];
  
  // Filtra as transações reais do usuário, desconsiderando "Saldo Inicial" automático
  const realTransactions = allTransactions.filter(tx => tx.categoria !== 'Saldo Inicial');

  // Lógica das Conquistas
  if (!currentBadges.has('iniciante') && realTransactions.length > 0) {
    newBadges.push('iniciante');
  }
  if (!currentBadges.has('metas_1') && savingsGoals.length > 0) {
    newBadges.push('metas_1');
  }
  if (!currentBadges.has('planejador') && Object.keys(budgets).length > 0) {
    newBadges.push('planejador');
  }

  // Conquistas de Streaks Diários
  const streak = userProfile.currentStreak || 0;
  if (!currentBadges.has('streak_3') && streak >= 3) {
    newBadges.push('streak_3');
  }
  if (!currentBadges.has('streak_7') && streak >= 7) {
    newBadges.push('streak_7');
  }
  if (!currentBadges.has('streak_30') && streak >= 30) {
    newBadges.push('streak_30');
  }
  if (!currentBadges.has('streak_90') && streak >= 90) {
    newBadges.push('streak_90');
  }

  // Conquistas de Metas
  if (!currentBadges.has('goal_completed_1') && savingsGoals.some(g => {
    const amount = allTransactions.filter(tx => tx.goalId === g.id).reduce((acc, t) => acc + t.valor, 0);
    return amount >= g.targetAmount && g.targetAmount > 0;
  })) {
    newBadges.push('goal_completed_1');
  }

  if (!currentBadges.has('goal_deposit_5') && allTransactions.filter(tx => tx.goalId).length >= 5) {
    newBadges.push('goal_deposit_5');
  }

  if (!currentBadges.has('goal_active_3') && savingsGoals.filter(g => {
    const amount = allTransactions.filter(tx => tx.goalId === g.id).reduce((acc, t) => acc + t.valor, 0);
    return amount < g.targetAmount;
  }).length >= 3) {
    newBadges.push('goal_active_3');
  }

  if (!currentBadges.has('saldo_1000')) {
    const totalSaved = savingsGoals.reduce((total, goal) => {
      return total + allTransactions.filter(tx => tx.goalId === goal.id).reduce((sum, t) => sum + t.valor, 0);
    }, 0);
    if (totalSaved >= 1000) newBadges.push('saldo_1000');
  }

  if (!currentBadges.has('ai_explorer') && (userProfile.aiScansCount || 0) >= 10) {
    newBadges.push('ai_explorer');
  }

  // --- LOGICA DOS BADGES NOVOS E PENDENTES ATIVOS ---

  const now = input.now ?? new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayDateStr = now.toISOString().slice(0, 10);

  // Apenas transações que já aconteceram ou pertencem ao mês corrente (NUNCA lançamentos futuros agendados/recorrentes)
  const pastAndCurrentTransactions = realTransactions.filter(tx => tx.data.substring(0, 7) <= currentMonthKey);

  const transacoesPorMes: { [mes: string]: Transaction[] } = {};
  pastAndCurrentTransactions.forEach(tx => {
    const mes = tx.data.substring(0, 7);
    if (!transacoesPorMes[mes]) transacoesPorMes[mes] = [];
    transacoesPorMes[mes].push(tx);
  });

  // --- LOGICA DOS BADGES NOVOS E PENDENTES ATIVOS ---

  // 1. zero_spend_weekend: Fim de semana (sábado e domingo) sem nenhuma despesa ('saida') que JÁ OCORREU
  if (!currentBadges.has('zero_spend_weekend') && pastAndCurrentTransactions.filter(tx => tx.tipo === 'saida').length >= 3) {
    let hasZeroSpendWeekend = false;
    for (const [mesKey, txs] of Object.entries(transacoesPorMes)) {
      const [year, month] = mesKey.split('-').map(Number);
      const date = new Date(year, month, 0);
      const totalDias = date.getDate();

      for (let dia = 1; dia < totalDias; dia++) {
        const d1 = new Date(year, month - 1, dia);
        const d2 = new Date(year, month - 1, dia + 1);

        if (d1.getDay() === 6 && d2.getDay() === 0) {
          const s1 = `${mesKey}-${String(dia).padStart(2, '0')}`;
          const s2 = `${mesKey}-${String(dia + 1).padStart(2, '0')}`;

          // Só valida fins de semana que já terminaram no mundo real
          if (s2 <= todayDateStr) {
            const temGasto = txs.some(tx => tx.tipo === 'saida' && (tx.data === s1 || tx.data === s2));
            if (!temGasto) {
              hasZeroSpendWeekend = true;
              break;
            }
          }
        }
      }
      if (hasZeroSpendWeekend) break;
    }
    if (hasZeroSpendWeekend) {
      newBadges.push('zero_spend_weekend');
    }
  }

  // 2. conscious_investor: >= 10% da receita alocada em Investimentos em algum mês
  if (!currentBadges.has('conscious_investor') && pastAndCurrentTransactions.length > 0) {
    let isConsciousInvestor = false;
    for (const txs of Object.values(transacoesPorMes)) {
      const receitaTotal = txs.filter(tx => tx.tipo === 'entrada').reduce((sum, tx) => sum + tx.valor, 0);
      const investimentoTotal = txs
        .filter(tx => tx.tipo === 'saida' && (tx.categoria?.toLowerCase() === 'investimentos' || tx.categoria === 'Investimentos'))
        .reduce((sum, tx) => sum + tx.valor, 0);

      if (receitaTotal > 0 && (investimentoTotal / receitaTotal) >= 0.10) {
        isConsciousInvestor = true;
        break;
      }
    }
    if (isConsciousInvestor) {
      newBadges.push('conscious_investor');
    }
  }

  // 3. emergency_ready: Metas possuem saldo >= média de gastos mensais ou R$ 1.500
  if (!currentBadges.has('emergency_ready') && pastAndCurrentTransactions.length > 0 && savingsGoals.length > 0) {
    const totalSaved = savingsGoals.reduce((total, goal) => {
      return total + allTransactions.filter(tx => tx.goalId === goal.id).reduce((sum, t) => sum + t.valor, 0);
    }, 0);

    const saidas = pastAndCurrentTransactions.filter(tx => tx.tipo === 'saida');
    const mesesSet = new Set(pastAndCurrentTransactions.map(tx => tx.data.substring(0, 7)));
    const qtdMeses = mesesSet.size || 1;
    const totalSaidas = saidas.reduce((sum, tx) => sum + tx.valor, 0);
    const mediaGastos = totalSaidas / qtdMeses;

    if (totalSaved >= 1500 || (mediaGastos > 0 && totalSaved >= mediaGastos)) {
      newBadges.push('emergency_ready');
    }
  }

  // 4. budget_master: Terminou um mês completo passado sem estourar nenhum limite de categoria
  if (!currentBadges.has('budget_master') && Object.keys(budgets).length > 0 && pastAndCurrentTransactions.length > 0) {
    let budgetMasterDesbloqueado = false;
    // Só avalia meses que já foram concluídos (anteriores ao mês atual)
    for (const [mesKey, txs] of Object.entries(transacoesPorMes)) {
      if (mesKey >= currentMonthKey) continue; // Mês corrente ou futuro ainda não terminou!

      const despesasSaida = txs.filter(tx => tx.tipo === 'saida');
      if (despesasSaida.length === 0) continue;

      let algumEstouro = false;
      let peloMenosUmGastoEmBudget = false;

      for (const [catName, limite] of Object.entries(budgets)) {
        const totalGastoCat = despesasSaida
          .filter(tx => tx.categoria === catName)
          .reduce((sum, tx) => sum + tx.valor, 0);

        if (totalGastoCat > 0) {
          peloMenosUmGastoEmBudget = true;
        }
        if (totalGastoCat > limite) {
          algumEstouro = true;
          break;
        }
      }
      if (peloMenosUmGastoEmBudget && !algumEstouro) {
        budgetMasterDesbloqueado = true;
        break;
      }
    }
    if (budgetMasterDesbloqueado) {
      newBadges.push('budget_master');
    }
  }

  // 5. save_ratio_50: Poupar >= 50% das receitas em um único mês já ocorrido
  if (!currentBadges.has('save_ratio_50') && pastAndCurrentTransactions.length > 0) {
    let saveRatio50Desbloqueado = false;
    for (const txs of Object.values(transacoesPorMes)) {
      const receitaTotal = txs.filter(tx => tx.tipo === 'entrada').reduce((sum, tx) => sum + tx.valor, 0);
      const despesaTotal = txs.filter(tx => tx.tipo === 'saida').reduce((sum, tx) => sum + tx.valor, 0);

      if (receitaTotal > 0 && despesaTotal > 0) {
        const poupado = receitaTotal - despesaTotal;
        if ((poupado / receitaTotal) >= 0.50) {
          saveRatio50Desbloqueado = true;
          break;
        }
      }
    }
    if (saveRatio50Desbloqueado) {
      newBadges.push('save_ratio_50');
    }
  }

  // 6. no_credit_spend: Passar um mês com >= 5 despesas sem usar o cartão de crédito (débito/dinheiro)
  if (!currentBadges.has('no_credit_spend') && pastAndCurrentTransactions.length > 0) {
    let noCreditSpendDesbloqueado = false;
    for (const txs of Object.values(transacoesPorMes)) {
      const despesas = txs.filter(tx => tx.tipo === 'saida');
      const temCredito = despesas.some(tx => tx.paymentMethod === 'credito');
      if (despesas.length >= 5 && !temCredito) {
        noCreditSpendDesbloqueado = true;
        break;
      }
    }
    if (noCreditSpendDesbloqueado) {
      newBadges.push('no_credit_spend');
    }
  }

  // 7. frequent_logger: Alcançar >= 15 lançamentos no app
  if (!currentBadges.has('frequent_logger') && realTransactions.length >= 15) {
    newBadges.push('frequent_logger');
  }

  // 8. cfo_consultant: Interagir pelo menos 5 vezes com o chat de IA
  if (!currentBadges.has('cfo_consultant') && (userProfile.cfoInteractionsCount || 0) >= 5) {
    newBadges.push('cfo_consultant');
  }

  // 9. Longevidade real: quantidade de meses CONSECUTIVOS usando o app sem falhar até o mês atual
  // Meses no futuro (gerados por compras parceladas ou assinaturas fixas) são expressamente ignorados.
  const activePastMonths = new Set(Object.keys(transacoesPorMes));
  let consecutiveMonths = 0;
  let checkDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;

  if (!activePastMonths.has(currentMonthStr)) {
    checkDate.setMonth(checkDate.getMonth() - 1);
  }

  while (true) {
    const mStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;
    if (activePastMonths.has(mStr)) {
      consecutiveMonths++;
      checkDate.setMonth(checkDate.getMonth() - 1);
    } else {
      break;
    }
  }

  // 🛡️ Auto-correção: Revoga badges de longevidade que foram concedidos indevidamente por lançamentos futuros
  const invalidLongevityBadges: string[] = [];
  if (currentBadges.has('usage_3m') && consecutiveMonths < 3) invalidLongevityBadges.push('usage_3m');
  if (currentBadges.has('usage_6m') && consecutiveMonths < 6) invalidLongevityBadges.push('usage_6m');
  if (currentBadges.has('usage_12m') && consecutiveMonths < 12) invalidLongevityBadges.push('usage_12m');

  if (invalidLongevityBadges.length > 0) {
    return { newBadges: [], revokedBadges: invalidLongevityBadges };
  }

  if (!currentBadges.has('usage_3m') && consecutiveMonths >= 3) {
    newBadges.push('usage_3m');
  }
  if (!currentBadges.has('usage_6m') && consecutiveMonths >= 6) {
    newBadges.push('usage_6m');
  }
  if (!currentBadges.has('usage_12m') && consecutiveMonths >= 12) {
    newBadges.push('usage_12m');
  }

  // 10. completionist: Obter >= 10 outras conquistas
  if (!currentBadges.has('completionist')) {
    const totalOutrasConquistadas = Array.from(currentBadges).filter(id => id !== 'completionist').length + newBadges.filter(id => id !== 'completionist').length;
    if (totalOutrasConquistadas >= 10) {
      newBadges.push('completionist');
    }
  }

  return { newBadges, revokedBadges: [] };
}
