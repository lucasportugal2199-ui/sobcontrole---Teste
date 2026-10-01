import { Transaction, CreditCard } from '../types';
import { formatCurrency } from './helpers';

export interface InstallmentGroup {
    id: string;
    name: string;
    currentParcel: number;
    totalParcels: number;
    monthlyValue: number;
    cardId?: string;
    cardName: string;
    startDate: string;
    lastDate: string;
    totalRemaining: number;
    totalPaid: number;
    totalOriginal: number;
    paidParcelsCount: number;
    remainingParcelsCount: number;
    rawTransactions: Transaction[];
}

export interface FutureBurdenMonth {
    index: number;
    monthStr: string;
    label: string;
    fullMonthName: string;
    total: number;
    activeCount: number;
    isCurrent: boolean;
    heightPercent: number;
}

export interface FinancialReliefInsight {
    month: string;
    amountRelieved: number;
    percentDrop: number;
}

export const cleanServiceName = (rawDesc: string): string => {
    return (rawDesc || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
};

export const getServiceDetails = (name: string): { icon: string; bg: string } => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('netflix')) return { icon: '🎬', bg: '#E50914' };
    if (lower.includes('spotify')) return { icon: '🎵', bg: '#1DB954' };
    if (lower.includes('apple') || lower.includes('icloud')) return { icon: '🍎', bg: '#1E293B' };
    if (lower.includes('amazon') || lower.includes('prime')) return { icon: '📦', bg: '#00A8E1' };
    if (lower.includes('youtube')) return { icon: '▶️', bg: '#DC2626' };
    if (lower.includes('chatgpt') || lower.includes('openai')) return { icon: '🤖', bg: '#10B981' };
    if (lower.includes('disney')) return { icon: '🏰', bg: '#2563EB' };
    if (lower.includes('hbo') || lower.includes('max')) return { icon: '📺', bg: '#002BE7' };
    if (lower.includes('internet') || lower.includes('fibra') || lower.includes('claro') || lower.includes('vivo')) return { icon: '🌐', bg: '#0284C7' };
    if (lower.includes('luz') || lower.includes('energia') || lower.includes('enel') || lower.includes('copel')) return { icon: '⚡', bg: '#EAB308' };
    if (lower.includes('agua') || lower.includes('água') || lower.includes('sanepar') || lower.includes('sabesp')) return { icon: '💧', bg: '#06B6D4' };
    if (lower.includes('gym') || lower.includes('academia') || lower.includes('smart fit')) return { icon: '🏋️', bg: '#EA580C' };
    if (lower.includes('ifood') || lower.includes('delivery')) return { icon: '🍔', bg: '#EA1D2C' };
    if (lower.includes('google') || lower.includes('drive') || lower.includes('one')) return { icon: '☁️', bg: '#4285F4' };
    return { icon: '🔄', bg: '#6366F1' };
};

export const getCurrentMonthKey = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const getInstallmentList = (
    allTransactions: Transaction[],
    creditCards: CreditCard[],
    appLocale: string = 'pt-BR',
    currentMonthKey: string = getCurrentMonthKey(),
    selectedCardId: string = 'all'
): InstallmentGroup[] => {
    const list = allTransactions.filter(t => {
        // 1. Se foi marcado como recorrente ou id de recorrência 'rec-', é ASSINATURA/FIXO, NUNCA parcela!
        if (t.isRecurring || t.recurrenceId?.startsWith('rec-')) {
            return false;
        }

        // 2. Se for categoria Assinaturas ou o nome indicar assinatura, não é compra parcelada
        const lowerDesc = (t.descricao || '').toLowerCase();
        if (t.categoria === 'Assinaturas' || lowerDesc.startsWith('assinatura ') || lowerDesc === 'assinatura') {
            return false;
        }

        // 3. Se tem objeto installment válido com total > 1, é compra parcelada
        if (t.installment && t.installment.total > 1) {
            return true;
        }

        // 4. Se o recurrenceId for de parcelamento 'inst-'
        if (t.recurrenceId?.startsWith('inst-')) {
            return true;
        }

        // 5. Se tiver formato de parcela '(1/10)' no nome e não for assinatura
        if (/\(\d+\/\d+\)/.test(t.descricao)) {
            return true;
        }

        return false;
    });
    
    // Agrupa por recurrenceId ou por chave única de cartão + nome
    const groups = new Map<string, Transaction[]>();

    list.forEach(tx => {
        const cleanName = cleanServiceName(tx.descricao).toLowerCase();
        const groupKey = tx.recurrenceId || `${tx.cardId || 'nocard'}_${cleanName}`;
        if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(tx);
    });

    const result: InstallmentGroup[] = [];

    groups.forEach((txs) => {
        if (txs.length === 0) return;

        // Ordena as transações do parcelamento cronologicamente
        txs.sort((a, b) => a.data.localeCompare(b.data));

        const firstTx = txs[0];
        const name = cleanServiceName(firstTx.descricao);

        // Determina o total de parcelas
        let totalParcels = 0;
        txs.forEach(t => {
            if (t.installment?.total) totalParcels = Math.max(totalParcels, t.installment.total);
            const match = t.descricao.match(/\((\d+)\/(\d+)\)/);
            if (match) totalParcels = Math.max(totalParcels, parseInt(match[2], 10));
        });
        if (totalParcels === 0) totalParcels = txs.length;

        const card = creditCards.find(c => c.id === firstTx.cardId);
        const cardName = card ? card.name : (firstTx.paymentMethod === 'credito' ? 'Cartão de Crédito' : 'Outro');

        // Separa parcelas de meses passados (< currentMonthKey) das parcelas presentes e futuras (>= currentMonthKey)
        const pastTxs = txs.filter(t => t.data.substring(0, 7) < currentMonthKey);
        const currentAndFutureTxs = txs.filter(t => t.data.substring(0, 7) >= currentMonthKey);

        const paidParcelsCount = pastTxs.length;
        const remainingParcelsCount = currentAndFutureTxs.length;

        // Parcela atual: se houver parcelas pendentes, a primeira pendente é a atual.
        // Se todas já passaram, é a última.
        let currentParcel = 1;
        if (currentAndFutureTxs.length > 0) {
            const nextTx = currentAndFutureTxs[0];
            if (nextTx.installment?.current) {
                currentParcel = nextTx.installment.current;
            } else {
                const match = nextTx.descricao.match(/\((\d+)\/(\d+)\)/);
                currentParcel = match ? parseInt(match[1], 10) : (paidParcelsCount + 1);
            }
        } else {
            currentParcel = totalParcels;
        }

        const monthlyValue = firstTx.valor;
        const totalRemaining = currentAndFutureTxs.reduce((sum, t) => sum + t.valor, 0);
        const totalPaid = pastTxs.reduce((sum, t) => sum + t.valor, 0);
        const totalOriginal = totalPaid + totalRemaining;

        // Data da última parcela real do cronograma
        const lastTx = txs[txs.length - 1];
        let lastDateStr = '';
        if (lastTx?.data) {
            const [y, m] = lastTx.data.split('-').map(Number);
            const lastDateObj = new Date(y, m - 1, 1);
            lastDateStr = lastDateObj.toLocaleDateString(appLocale, { month: 'short', year: 'numeric' });
        }

        result.push({
            id: firstTx.id,
            name,
            currentParcel,
            totalParcels,
            monthlyValue,
            cardId: firstTx.cardId,
            cardName,
            startDate: firstTx.data,
            lastDate: lastDateStr,
            totalRemaining,
            totalPaid,
            totalOriginal,
            paidParcelsCount,
            remainingParcelsCount,
            rawTransactions: txs
        });
    });

    if (selectedCardId !== 'all') {
        return result.filter(item => item.cardId === selectedCardId);
    }
    return result;
};

export const getFutureBurdenChart = (
    installmentList: InstallmentGroup[],
    appLocale: string = 'pt-BR'
): FutureBurdenMonth[] => {
    const today = new Date();
    const months: Omit<FutureBurdenMonth, 'heightPercent'>[] = [];

    for (let i = 0; i < 8; i++) {
        const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const targetMonthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = targetDate.toLocaleDateString(appLocale, { month: 'short' }).replace('.', '').toUpperCase();
        const yearLabel = String(targetDate.getFullYear()).slice(-2);
        const fullMonthName = targetDate.toLocaleDateString(appLocale, { month: 'long' });
        
        let monthTotal = 0;
        let activeCount = 0;

        installmentList.forEach(item => {
            const txInMonth = item.rawTransactions.find(t => t.data.substring(0, 7) === targetMonthStr);
            if (txInMonth) {
                monthTotal += txInMonth.valor;
                activeCount++;
            }
        });

        months.push({
            index: i,
            monthStr: targetMonthStr,
            label: i > 0 && targetDate.getMonth() === 0 ? `${monthLabel}/${yearLabel}` : monthLabel,
            fullMonthName: fullMonthName.charAt(0).toUpperCase() + fullMonthName.slice(1),
            total: monthTotal,
            activeCount,
            isCurrent: i === 0
        });
    }

    const maxVal = Math.max(...months.map(m => m.total), 1);
    return months.map(m => ({
        ...m,
        heightPercent: Math.max(16, Math.round((m.total / maxVal) * 100))
    }));
};

export const getFinancialReliefInsight = (
    installmentList: InstallmentGroup[],
    totalThisMonth: number,
    futureBurdenChart: FutureBurdenMonth[]
): FinancialReliefInsight | null => {
    if (installmentList.length === 0 || totalThisMonth === 0) return null;
    
    for (let i = 1; i < futureBurdenChart.length; i++) {
        const drop = totalThisMonth - futureBurdenChart[i].total;
        if (drop > 0) {
            const percentDrop = Math.round((drop / totalThisMonth) * 100);
            return {
                month: futureBurdenChart[i].fullMonthName,
                amountRelieved: drop,
                percentDrop
            };
        }
    }
    return null;
};
