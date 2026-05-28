
import React, { useMemo, useState, useContext, useRef, useEffect } from 'react';
import { Transaction, PaymentMethod } from '../types';
import { formatCurrency, getMonthKey, formatarMesAno, formatCurrencyForInput, parseCurrency, calculateStatementDate, getPreviousBalance, getCorPorCategoria } from '../utils/helpers';
import {
    ArrowRightIcon, ArrowLeftIcon, EditIcon, TrashIcon, FilterIcon,
    RepeatIcon, ClipboardListIcon, CreditCardIcon, BankIcon,
    ChevronDownIcon, CalendarIcon, SearchIcon, TrendingUpIcon, TrendingDownIcon,
    WalletIcon, ArrowsRightLeftIcon, InformationCircleIcon
} from './icons';
import CategoryIcon from './CategoryIcon';
import { getBankLogo } from './BankLogo';
import { AppContext } from '../context/AppContext';
import MonthYearPickerModal from './MonthYearPickerModal';
import { FilterModal } from './management/FilterModal';
import Modal from './Modal';
import Calendar from './Calendar';
import ListPickerModal from './ListPickerModal';
import InvoicePickerModal from './InvoicePickerModal';
import { MESES_NOMES } from '../constants';

const formatDateForDisplay = (dateString: string): string => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const date = new Date(dateString + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    if (date.toDateString() === today.toDateString()) return `Hoje, ${date.toLocaleDateString('pt-BR', options)}`;
    if (date.toDateString() === yesterday.toDateString()) return `Ontem, ${date.toLocaleDateString('pt-BR', options)}`;
    return date.toLocaleDateString('pt-BR', options);
};

const PaymentMethodBadge: React.FC<{ method: PaymentMethod }> = ({ method }) => {
    const methods = {
        credito: { label: 'Crédito', icon: <CreditCardIcon className="h-3 w-3" /> },
        debito: { label: 'Débito', icon: <BankIcon className="h-3 w-3" /> },
    };

    const config = methods[method] || methods.debito;

    return (
        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-dark-surface px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
            {config.icon}
            {config.label}
        </span>
    );
};

const Management: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("Management missing context");
    const {
        allData, currentDate, changeMonth, allTransactions,
        handleStartEdit, handleDeleteTransaction, handleStartDeleteFuture,
        categorias, getSaldoColor, theme, creditCards, categoryColors,
        confirmingDeleteId, handleConfirmDelete, setConfirmingDeleteId,
        confirmingDeleteFutureTx, handleConfirmDeleteFuture, setConfirmingDeleteFutureTx,
        isEditModalOpen, setIsEditModalOpen, editingTxId, handleUpdateTransaction,
        setCurrentDate, setCurrentView, setCurrentTab, accounts,
        managementFilter, setManagementFilter
    } = context;

    const [isMonthYearPickerOpen, setIsMonthYearPickerOpen] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Infinite Scroll State
    const [visibleDaysCount, setVisibleDaysCount] = useState(10);
    const [filterMethod, setFilterMethod] = useState<PaymentMethod | 'all'>('all');
    const [filterCardId, setFilterCardId] = useState<string | 'all'>('all');
    const [filterAccountId, setFilterAccountId] = useState<string | 'all'>('all');

    useEffect(() => {
        if (managementFilter) {
            setFilterMethod(managementFilter.method);
            setFilterCardId(managementFilter.cardId);
            if (managementFilter.accountId) setFilterAccountId(managementFilter.accountId);
            // We clear the filter after consuming it so it doesn't persist on normal navigations
            setManagementFilter(null); 
        }
    }, [managementFilter, setManagementFilter]);
    const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
    const [detailsTxId, setDetailsTxId] = useState<string | null>(null);

    const detailsTx = useMemo(() => allTransactions.find(t => t.id === detailsTxId), [allTransactions, detailsTxId]);

    // Mapa de ícones de categorias para exibir nas transações
    const categoryIconMap = useMemo(() => {
        const map: Record<string, string> = {};
        [...categorias.entrada, ...categorias.saida].forEach(cat => {
            if (cat.icon) map[cat.name] = cat.icon;
        });
        return map;
    }, [categorias]);

    const touchStartRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const isSwipingRef = useRef(false);
    const isScrollRef = useRef(false);

    const handleItemTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        isSwipingRef.current = false;
        isScrollRef.current = false;
    };

    const handleItemTouchMove = (e: React.TouchEvent) => {
        e.stopPropagation();
        if (isScrollRef.current) return;
        const touch = e.touches[0];
        const deltaX = touchStartRef.current.x - touch.clientX;
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

        if (deltaY > 10 && !isSwipingRef.current) {
            isScrollRef.current = true;
            return;
        }

        if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > deltaY) {
            isSwipingRef.current = true;
            if (e.cancelable) {
                e.preventDefault();
            }
        }
    };

    const handleItemTouchEnd = (e: React.TouchEvent, txId: string) => {
        e.stopPropagation();
        if (isScrollRef.current || !isSwipingRef.current) {
            isSwipingRef.current = false;
            return;
        }
        const touch = e.changedTouches[0];
        const deltaX = touchStartRef.current.x - touch.clientX;
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > deltaY) {
            if (deltaX > 40) {
                setOpenSwipeId(txId);
            } else if (deltaX < -40) {
                setOpenSwipeId(null);
            }
        }

        setTimeout(() => {
            isSwipingRef.current = false;
        }, 50);
    };

    // Edit Form State
    const [editForm, setEditForm] = useState({
        descricao: '',
        valor: '',
        categoria: '',
        data: '',
        paymentMethod: 'debito' as PaymentMethod,
        cardId: '',
        accountId: '',
        statementDate: undefined as string | undefined
    });
    const [isInnerCalendarOpen, setIsInnerCalendarOpen] = useState(false);
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
    const [isCardPickerOpen, setIsCardPickerOpen] = useState(false);
    const [isStatementPickerOpen, setIsStatementPickerOpen] = useState(false);
    const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);

    // Modal para escopo de edição (recorrente)
    const [isEditScopeModalOpen, setIsEditScopeModalOpen] = useState(false);

    // Sincronizar formulário de edição quando abrir o modal
    useEffect(() => {
        if (isEditModalOpen && editingTxId) {
            const tx = allTransactions.find(t => t.id === editingTxId);
            if (tx) {
                setEditForm({
                    descricao: tx.descricao,
                    valor: formatCurrencyForInput(String(Math.round(tx.valor * 100))),
                    categoria: tx.categoria,
                    data: tx.compraData || tx.data, // Prioriza a data da compra no formulário
                    paymentMethod: tx.paymentMethod,
                    cardId: tx.cardId || '',
                    accountId: tx.accountId || '',
                    statementDate: tx.statementDate
                });
            }
        }
    }, [isEditModalOpen, editingTxId, allTransactions]);

    const selectedCard = creditCards.find(c => c.id === editForm.cardId);

    // Data padrão da fatura se não houver statementDate definido
    const defaultStatementDate = useMemo(() => {
        if (!selectedCard || !editForm.data) return '';
        return calculateStatementDate(editForm.data, selectedCard);
    }, [editForm.data, selectedCard]);

    // Gerar lista de meses para seleção de fatura (no modal de edição)
    const invoiceOptions = useMemo(() => {
        if (!selectedCard || !editForm.data) return [];
        // Base para o range é a data calculada "padrão" da fatura
        const baseStatement = calculateStatementDate(editForm.data, selectedCard);
        const baseDate = new Date(baseStatement + '-01T00:00:00');

        const months = [];
        // 12 meses antes e 12 meses depois
        for (let i = -12; i <= 12; i++) {
            const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
            const key = getMonthKey(d);
            const label = `${MESES_NOMES[d.getMonth()]} ${d.getFullYear()}`;
            months.push({ id: key, name: label });
        }
        return months;
    }, [editForm.data, selectedCard]);

    const currentStatementLabel = useMemo(() => {
        const key = editForm.statementDate || defaultStatementDate;
        if (!key) return 'Selecione';
        const [year, month] = key.split('-');
        return `${MESES_NOMES[parseInt(month) - 1]} ${year}`;
    }, [editForm.statementDate, defaultStatementDate]);

    const monthTransactions = useMemo(() => {
        const monthKey = getMonthKey(currentDate);

        // Base de transações: Procura em TUDO para filtrar por Impacto (vencimento do cartão ou data da transação)
        let txs = allTransactions.filter(tx => {
            const impactMonth = getMonthKey(new Date(tx.data + 'T00:00:00'));
            return impactMonth === monthKey;
        });

        // Filtro de Busca
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            txs = txs.filter(t =>
                t.descricao.toLowerCase().includes(q) ||
                t.categoria.toLowerCase().includes(q) ||
                formatCurrency(t.valor).includes(q)
            );
        }

        if (selectedCategories.length > 0) txs = txs.filter(tx => selectedCategories.includes(`${tx.tipo}:${tx.categoria}`));
        if (filterMethod !== 'all') txs = txs.filter(tx => tx.paymentMethod === filterMethod);
        if (filterCardId !== 'all') txs = txs.filter(tx => tx.cardId === filterCardId);
        if (filterAccountId !== 'all') txs = txs.filter(tx => tx.accountId === filterAccountId);

        return [...txs].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }, [allTransactions, currentDate, selectedCategories, filterMethod, filterCardId, filterAccountId, searchQuery]);

    const monthSummary = useMemo(() => {
        const monthKey = getMonthKey(currentDate);
        const hasFilters = selectedCategories.length > 0 || filterMethod !== 'all' || filterCardId !== 'all' || filterAccountId !== 'all' || searchQuery.trim() !== '';

        if (hasFilters) {
            let entradas = 0;
            let saidas = 0;
            monthTransactions.forEach(t => {
                if (t.tipo === 'entrada') {
                    if (t.paymentMethod === 'credito') saidas -= (Number(t.valor) || 0);
                    else entradas += (Number(t.valor) || 0);
                } else {
                    saidas += (Number(t.valor) || 0);
                }
            });
            return { entradas, saidas, total: entradas - saidas, isFiltered: true };
        }

        // Resumo baseado apenas no IMPACTO FINANCEIRO (o que de fato mexe no saldo deste mês)
        const relevantTxs = (allData[monthKey]?.transactions || []).filter(tx => !!tx);
        
        const entradas = relevantTxs
            .filter(t => t.tipo === 'entrada' && t.paymentMethod !== 'credito')
            .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
            
        const saidas = relevantTxs.reduce((acc, t) => {
            if (t.tipo === 'saida') return acc + (Number(t.valor) || 0);
            if (t.tipo === 'entrada' && t.paymentMethod === 'credito') return acc - (Number(t.valor) || 0);
            return acc;
        }, 0);

        // Busca o saldo anterior para mostrar o saldo acumulado total no cabeçalho
        const previousBalance = getPreviousBalance(monthKey, allData);

        return { entradas, saidas, total: previousBalance + entradas - saidas, isFiltered: false };
    }, [allData, currentDate, monthTransactions, selectedCategories, filterMethod, filterCardId, filterAccountId, searchQuery]);

    const dailyData = useMemo(() => {
        const grouped = new Map<string, { transactions: Transaction[], dayTotal: number, closingBalance?: number }>();
        let runningBalance = 0;

        // Agrupamento visual: usa a data que pertence ao mês sendo visualizado (impacto/vencimento)
        const getDisplayDate = (tx: Transaction) => {
            return tx.data;
        };

        if (selectedCategories.length === 0 && filterMethod === 'all' && filterCardId === 'all' && filterAccountId === 'all') {
            const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            runningBalance = allData[getMonthKey(prev)]?.saldoFinal || 0;
        }
        monthTransactions.forEach(tx => {
            const displayDate = getDisplayDate(tx);
            if (!grouped.has(displayDate)) grouped.set(displayDate, { transactions: [], dayTotal: 0 });
            const g = grouped.get(displayDate)!;
            g.transactions.push(tx);
            
            const monthKey = getMonthKey(currentDate);
            const impactMonth = getMonthKey(new Date(tx.data + 'T00:00:00'));
            
            if (impactMonth === monthKey) {
                g.dayTotal += tx.tipo === 'entrada' ? tx.valor : -tx.valor;
            }
        });
        if (selectedCategories.length === 0 && filterMethod === 'all' && filterCardId === 'all' && filterAccountId === 'all') {
            Array.from(grouped.keys()).sort().forEach(d => {
                const g = grouped.get(d)!;
                runningBalance += g.dayTotal;
                g.closingBalance = runningBalance;
            });
        }
        return Array.from(grouped.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    }, [monthTransactions, selectedCategories, filterMethod, filterCardId, filterAccountId, allData, currentDate]);

    // Reset pagination when data or filters change
    useEffect(() => {
        setVisibleDaysCount(10);
    }, [dailyData.length, currentDate, selectedCategories, filterMethod, filterCardId, filterAccountId]);

    // Scroll Handler for Infinite Scroll
    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        // Infinite scroll — only update if there are more days to show
        if (scrollHeight - scrollTop <= clientHeight + 200) {
            setVisibleDaysCount(prev => {
                const next = Math.min(prev + 5, dailyData.length);
                return next === prev ? prev : next; // Avoid unnecessary re-render
            });
        }
    };

    const toggleActions = (id: string) => {
        setOpenSwipeId(openSwipeId === id ? null : id);
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();

        // Verifica se é transação recorrente
        const tx = allTransactions.find(t => t.id === editingTxId);
        if (tx && tx.recurrenceId) {
            setIsEditScopeModalOpen(true);
        } else {
            submitEdit('single');
        }
    };

    const submitEdit = (scope: 'single' | 'future') => {
        const finalForm = {
            ...editForm,
            cardId: editForm.paymentMethod === 'credito' ? editForm.cardId : undefined
        };
        // Mock event object since we are calling it programmatically in some cases
        const e = { preventDefault: () => { } } as React.FormEvent;
        handleUpdateTransaction(e, finalForm as any, scope);
        setIsEditScopeModalOpen(false);
    };

    const currentTxType = useMemo(() => {
        const tx = allTransactions.find(t => t.id === editingTxId);
        return tx?.tipo || 'saida';
    }, [editingTxId, allTransactions]);

    // --- Lógica de Swipe (usando refs para evitar re-renders a cada touchMove) ---
    const globalTouchStartRef = useRef<{ x: number, y: number } | null>(null);
    const globalTouchEndRef = useRef<{ x: number, y: number } | null>(null);
    const minSwipeDistance = 50;

    const onTouchStartGlobal = (e: React.TouchEvent) => {
        globalTouchEndRef.current = null;
        globalTouchStartRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    };

    const onTouchMoveGlobal = (e: React.TouchEvent) => {
        globalTouchEndRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    };

    const onTouchEndGlobal = () => {
        const start = globalTouchStartRef.current;
        const end = globalTouchEndRef.current;
        if (!start || !end) return;
        const distanceX = start.x - end.x;
        const distanceY = start.y - end.y;
        
        // Exige um gesto predominantemente horizontal (3x maior que vertical) e distância mínima de 100px
        if (Math.abs(distanceX) > Math.abs(distanceY) * 3) {
            const isLeftSwipe = distanceX > 100;
            const isRightSwipe = distanceX < -100;

            if (isLeftSwipe) changeMonth(1);
            else if (isRightSwipe) changeMonth(-1);
        }
    };

    return (
        <div 
            className="bg-light-bg dark:bg-dark-bg text-slate-800 dark:text-slate-200 h-full flex flex-col transition-colors duration-300 relative"
            onTouchStart={onTouchStartGlobal}
            onTouchMove={onTouchMoveGlobal}
            onTouchEnd={onTouchEndGlobal}
        >
            <header className="px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-light-bg dark:bg-dark-bg z-20 border-b border-transparent">
                <div className="flex items-center justify-between">
                    <button onClick={() => { setCurrentView('main'); setCurrentTab('lancamento'); }} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-dark-surface border border-slate-200 dark:border-slate-800 transition active:scale-95">
                        <ArrowLeftIcon className="h-5 w-5 text-slate-500" />
                    </button>

                    <div className="flex flex-col items-center">
                        <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-light-accent dark:text-dark-accent mb-0.5">Gestão Financeira</h1>
                        <div className="flex items-center gap-3">
                            <button onClick={() => changeMonth(-1)} className="p-1 text-slate-300 hover:text-light-accent transition-colors"><ArrowLeftIcon className="h-4 w-4" /></button>
                            <span className="font-black text-sm tracking-tight">{MESES_NOMES[currentDate.getMonth()].toUpperCase()} {currentDate.getFullYear()}</span>
                            <button onClick={() => changeMonth(1)} className="p-1 text-slate-300 hover:text-light-accent transition-colors"><ArrowRightIcon className="h-4 w-4" /></button>
                        </div>
                    </div>

                    <button onClick={() => setIsMonthYearPickerOpen(true)} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-dark-surface border border-slate-200 dark:border-slate-800 text-slate-500 active:scale-95 transition-all">
                        <CalendarIcon className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto no-scrollbar pb-8" onScroll={handleScroll}>
                {/* Resumo do Mês */}
                <div className="px-4 mb-4">
                    <div className="grid grid-cols-3 gap-2">
                        <div className={`p-3 rounded-2xl border transition-colors ${monthSummary.isFiltered ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30' : 'bg-slate-100 dark:bg-dark-surface border-slate-200 dark:border-slate-800'}`}>
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{monthSummary.isFiltered ? 'Entradas (Filtro)' : 'Entradas'}</p>
                            <p className="text-xs font-black text-emerald-500 truncate">{formatCurrency(monthSummary.entradas)}</p>
                        </div>
                        <div className={`p-3 rounded-2xl border transition-colors ${monthSummary.isFiltered ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30' : 'bg-slate-100 dark:bg-dark-surface border-slate-200 dark:border-slate-800'}`}>
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{monthSummary.isFiltered ? 'Saídas (Filtro)' : 'Saídas'}</p>
                            <p className="text-xs font-black text-rose-500 truncate">{formatCurrency(monthSummary.saidas)}</p>
                        </div>
                        <div className={`p-3 rounded-2xl border transition-colors ${monthSummary.isFiltered ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50' : 'bg-slate-100 dark:bg-dark-surface border-light-accent/30 dark:border-dark-accent/30'}`}>
                            <p className={`text-[8px] font-black uppercase mb-1 ${monthSummary.isFiltered ? 'text-indigo-600 dark:text-indigo-400' : 'text-light-accent dark:text-dark-accent'}`}>{monthSummary.isFiltered ? 'Balanço' : 'Saldo'}</p>
                            <p className={`text-xs font-black truncate`} style={{ color: getSaldoColor(monthSummary.total, theme) }}>{formatCurrency(monthSummary.total)}</p>
                        </div>
                    </div>
                </div>

                {/* Filtros e Busca Fixos no Topo ao Rolar */}
                <div className="sticky top-0 z-20 bg-light-bg dark:bg-dark-bg px-4 pb-3 pt-1 border-b border-slate-100 dark:border-slate-800/50">
                    <div className="flex gap-2">
                        <div className="relative flex-grow">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar transação..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-dark-surface border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-medium outline-none focus:border-dark-accent transition-all placeholder:text-slate-400"
                            />
                        </div>
                        <button onClick={() => setIsFilterModalOpen(true)} className={`p-2.5 rounded-xl border transition active:scale-95 ${selectedCategories.length > 0 || filterMethod !== 'all' || filterCardId !== 'all' || filterAccountId !== 'all' ? 'bg-dark-accent border-dark-accent text-white shadow-lg' : 'bg-slate-50 dark:bg-dark-surface border-slate-100 dark:border-slate-800 text-slate-500'}`}>
                            <FilterIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Filtros Rápidos */}
                    <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
                        {[
                            { id: 'all', label: 'Todos', icon: <WalletIcon className="h-3 w-3" /> },
                            { id: 'debito', label: 'Débito', icon: <BankIcon className="h-3 w-3" /> },
                            { id: 'credito', label: 'Cartão', icon: <CreditCardIcon className="h-3 w-3" /> }
                        ].map(btn => (
                            <button
                                key={btn.id}
                                onClick={() => {
                                    setFilterMethod(btn.id as any);
                                    if (btn.id !== 'credito') setFilterCardId('all');
                                    if (btn.id !== 'debito') setFilterAccountId('all');
                                }}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide border transition-all whitespace-nowrap ${filterMethod === btn.id ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-800 dark:border-white shadow-md' : 'bg-slate-50 dark:bg-dark-surface/50 border-slate-200 dark:border-slate-700/50 text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-surface'}`}
                            >
                                {btn.icon}
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    {filterMethod === 'credito' && creditCards.length > 0 && (
                        <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar pb-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            <button
                                onClick={() => setFilterCardId('all')}
                                className={`px-3.5 py-1.5 rounded-xl text-[9px] font-bold uppercase border tracking-wider transition-all ${filterCardId === 'all' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50' : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800'}`}
                            >
                                Todos
                            </button>
                            {creditCards.map(card => (
                                <button
                                    key={card.id}
                                    onClick={() => setFilterCardId(card.id)}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[9px] font-bold uppercase border tracking-wider transition-all whitespace-nowrap ${filterCardId === card.id ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 shadow-sm' : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-800'}`}
                                >
                                    <div className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: card.color }} />
                                    {card.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {filterMethod === 'debito' && accounts && accounts.length > 0 && (
                        <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar pb-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            <button
                                onClick={() => setFilterAccountId('all')}
                                className={`px-3.5 py-1.5 rounded-xl text-[9px] font-bold uppercase border tracking-wider transition-all ${filterAccountId === 'all' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50' : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800'}`}
                            >
                                Todas
                            </button>
                            {accounts.map(account => (
                                <button
                                    key={account.id}
                                    onClick={() => setFilterAccountId(account.id)}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[9px] font-bold uppercase border tracking-wider transition-all whitespace-nowrap ${filterAccountId === account.id ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 shadow-sm' : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-800'}`}
                                >
                                    <div className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: account.color || '#3B82F6' }} />
                                    {account.bankName}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    {dailyData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-40">
                            <ClipboardListIcon className="h-16 w-16 mb-4" />
                            <p className="text-center font-medium">Nenhuma transação encontrada.</p>
                        </div>
                    ) : dailyData.slice(0, visibleDaysCount).map(([date, data]) => (
                        <div key={date} className="px-4 pt-4 first:pt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex justify-between items-end mb-3 px-1">
                            <h2 className="font-bold text-slate-900 dark:text-white">{formatDateForDisplay(date)}</h2>
                            {data.closingBalance !== undefined && (
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Saldo do Dia</p>
                                    <span className="font-bold text-sm" style={{ color: getSaldoColor(data.closingBalance || 0, theme) }}>
                                        {formatCurrency(data.closingBalance)}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            {data.transactions.map(tx => {
                                const card = tx.cardId ? creditCards.find(c => c.id === tx.cardId) : null;
                                const account = tx.accountId ? accounts.find(a => a.id === tx.accountId) : null;
                                return (
                                    <div key={tx.id} className="relative group overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm transition-all duration-300">
                                        <div className={`absolute inset-y-0 right-0 flex transition-opacity duration-200 ${openSwipeId === tx.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                            <button
                                                onClick={() => { setDetailsTxId(tx.id); setOpenSwipeId(null); }}
                                                className="w-16 bg-slate-600 text-white flex flex-col items-center justify-center transition-colors hover:bg-slate-700 border-r border-slate-700/30"
                                            >
                                                <InformationCircleIcon className="h-5 w-5" />
                                                <span className="text-[10px] font-bold mt-1 uppercase">DETALHES</span>
                                            </button>
                                            <button
                                                onClick={() => { handleStartEdit(tx); setOpenSwipeId(null); }}
                                                className="w-16 bg-blue-500 text-white flex flex-col items-center justify-center transition-colors hover:bg-blue-600 border-r border-blue-600/30"
                                            >
                                                <EditIcon className="h-5 w-5" />
                                                <span className="text-[10px] font-bold mt-1 uppercase">EDITAR</span>
                                            </button>
                                            <button
                                                onClick={() => { handleDeleteTransaction(tx); setOpenSwipeId(null); }}
                                                className="w-16 bg-red-500 text-white flex flex-col items-center justify-center transition-colors hover:bg-red-600"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                                <span className="text-[10px] font-bold mt-1 uppercase">EXCLUIR</span>
                                            </button>
                                            {tx.recurrenceId && (
                                                <button
                                                    onClick={() => { handleStartDeleteFuture(tx); setOpenSwipeId(null); }}
                                                    className="w-16 bg-slate-700 text-white flex flex-col items-center justify-center transition-colors hover:bg-slate-900 border-l border-slate-800/30"
                                                >
                                                    <RepeatIcon className="h-5 w-5" />
                                                    <span className="text-[8px] font-black mt-1 uppercase">SÉRIE</span>
                                                </button>
                                            )}
                                        </div>
                                        <div
                                            className={`relative z-10 bg-white dark:bg-dark-surface p-3 flex items-center transition-transform duration-300 ${openSwipeId === tx.id ? (tx.recurrenceId ? '-translate-x-64' : '-translate-x-48') : 'translate-x-0'} cursor-pointer`}
                                            onClick={() => {
                                                setOpenSwipeId(openSwipeId === tx.id ? null : tx.id);
                                            }}
                                        >
                                            {/* Ícone da Categoria ou do Banco */}
                                            {account && (tx.tipo === 'transferencia' || tx.descricao.toLowerCase().startsWith('ajuste de saldo')) && getBankLogo(account.bankName, "w-9 h-9 flex-shrink-0 mr-3") ? (
                                                getBankLogo(account.bankName, "w-9 h-9 flex-shrink-0 mr-3")
                                            ) : (
                                                <div
                                                    className="flex-shrink-0 mr-3 w-9 h-9 rounded-xl flex items-center justify-center text-white"
                                                    style={{ backgroundColor: getCorPorCategoria(tx.categoria, categoryColors) + '33', }}
                                                >
                                                    {categoryIconMap[tx.categoria] ? (
                                                        <span style={{ color: getCorPorCategoria(tx.categoria, categoryColors) }}>
                                                            <CategoryIcon name={categoryIconMap[tx.categoria]} className="h-5 w-5" />
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500 text-xs font-bold">—</span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{tx.descricao}</p>
                                                    {tx.isRecurring && <RepeatIcon className="h-3 w-3 text-dark-accent" />}
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-300 font-bold uppercase truncate max-w-[120px]">
                                                        {tx.tipo === 'transferencia' ? 'Transferência' : `${tx.categoria} ${tx.installment ? `(${tx.installment.current}/${tx.installment.total})` : ''}`}
                                                    </p>
                                                    {tx.compraData && tx.compraData !== tx.data && (
                                                        <span className="text-[8px] font-black text-dark-accent dark:text-dark-accent bg-blue-50 dark:bg-dark-accent/10 px-1.5 py-0.5 rounded border border-blue-100 dark:border-dark-accent/20 uppercase tracking-tight flex items-center gap-1">
                                                            <CalendarIcon className="h-2 w-2" />
                                                            Consumo (em {new Date(tx.compraData + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })})
                                                        </span>
                                                    )}

                                                    <PaymentMethodBadge method={tx.paymentMethod} />
                                                </div>
                                                {(account || card) && (
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        {account && (
                                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                                                                {getBankLogo(account.bankName, "w-3.5 h-3.5 rounded-full flex-shrink-0") || (
                                                                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: account.color || '#3B82F6' }} />
                                                                )}
                                                                {account.bankName}
                                                            </span>
                                                        )}
                                                        {card && (
                                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                                                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: card.color }} />
                                                                {card.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                {tx.tipo === 'transferencia' ? (
                                                    <span className="font-black text-sm text-slate-400 flex items-center justify-end gap-1">
                                                        <ArrowsRightLeftIcon className="h-4 w-4" /> {formatCurrency(tx.valor)}
                                                    </span>
                                                ) : (
                                                    <span className={`font-black text-sm ${tx.tipo === 'entrada' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {tx.tipo === 'entrada' ? '+' : '-'}{formatCurrency(tx.valor)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                </div>
                {/* Espaçador para garantir visibilidade do último item acima da BottomNav */}
                <div className="h-16 flex-shrink-0" aria-hidden="true" />
            </main>

            <MonthYearPickerModal isOpen={isMonthYearPickerOpen} onClose={() => setIsMonthYearPickerOpen(false)} currentDate={currentDate} allData={allData} onSelectDate={setCurrentDate} />
            <FilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} incomeCategories={categorias.entrada.map(c => c.name)} expenseCategories={categorias.saida.map(c => c.name)} selectedCategories={selectedCategories} onApply={setSelectedCategories} />

            {/* Modal de EDIÇÃO */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Editar Lançamento</h3>
                    <form onSubmit={handleSaveEdit} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">Valor</label>
                            <input
                                type="tel"
                                value={editForm.valor}
                                onChange={e => setEditForm({ ...editForm, valor: formatCurrencyForInput(e.target.value) })}
                                className="w-full py-3 px-4 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-dark-accent"
                                placeholder="R$ 0,00"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">Descrição</label>
                            <input
                                type="text"
                                value={editForm.descricao}
                                onChange={e => setEditForm({ ...editForm, descricao: e.target.value })}
                                className="w-full py-3 px-4 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-dark-accent"
                                placeholder="Ex: Mercado"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">Data</label>
                                <button type="button" onClick={() => setIsInnerCalendarOpen(true)} className="w-full py-3 px-4 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-xl text-left flex justify-between items-center font-bold text-xs">
                                    <span>{new Date(editForm.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                    <CalendarIcon className="h-4 w-4 text-dark-accent" />
                                </button>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">Categoria</label>
                                <button type="button" onClick={() => setIsCategoryPickerOpen(true)} className="w-full py-3 px-4 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-xl text-left flex justify-between items-center font-bold text-xs truncate">
                                    <div className="flex items-center gap-2.5 truncate">
                                        {(() => {
                                            const cat = categorias[currentTxType]?.find(c => c.name === editForm.categoria);
                                            return cat?.icon
                                                ? <div className="text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0"><CategoryIcon name={cat.icon} className="h-5 w-5" /></div>
                                                : <div className="h-3 w-3 rounded-full flex-shrink-0 border border-slate-200 dark:border-slate-700" style={{ backgroundColor: getCorPorCategoria(editForm.categoria, categoryColors) }} />;
                                        })()}
                                        <span className="truncate">{editForm.categoria}</span>
                                    </div>
                                    <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Banco / Conta Selection */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">Qual Banco / Conta?</label>
                            <button type="button" onClick={() => setIsAccountPickerOpen(true)} className="w-full py-3.5 px-4 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white rounded-xl text-left flex justify-between items-center font-bold text-sm border border-slate-100 dark:border-slate-800 transition-all">
                                <div className="flex items-center gap-2.5 truncate">
                                    {(() => {
                                        const account = accounts.find(a => a.id === editForm.accountId);
                                        if (!account) return <div className="h-3 w-3 rounded-full flex-shrink-0 bg-slate-400" />;
                                        const logo = getBankLogo(account.bankName, "w-5 h-5 rounded-full flex-shrink-0 overflow-hidden");
                                        return logo || <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: account.color || '#3B82F6' }} />;
                                    })()}
                                    <span className="truncate">{accounts.find(a => a.id === editForm.accountId)?.bankName || 'Nenhuma conta vinculada'}</span>
                                </div>
                                <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                            </button>
                        </div>

                        {/* Edição de Modo de Pagamento */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">Modo de Pagamento</label>
                            <div className="flex gap-2">
                                {[
                                    { id: 'debito', label: 'Débito', icon: <BankIcon /> },
                                    { id: 'credito', label: 'Crédito', icon: <CreditCardIcon /> },
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setEditForm({ ...editForm, paymentMethod: m.id as PaymentMethod })}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all ${editForm.paymentMethod === m.id ? 'bg-dark-accent border-dark-accent text-white shadow-md' : 'bg-slate-50 dark:bg-dark-bg border-slate-100 dark:border-slate-700 text-slate-400'}`}
                                    >
                                        {m.icon}
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Seletor de Cartão se for Crédito */}
                        {editForm.paymentMethod === 'credito' && creditCards.length > 0 && (
                            <div className="space-y-4">
                                <div className="animate-in slide-in-from-top-2 duration-300 space-y-1">
                                    <label className="text-[10px] font-bold text-purple-500 uppercase ml-1 tracking-tight">Qual Cartão?</label>
                                    <button type="button" onClick={() => setIsCardPickerOpen(true)} className="w-full py-3.5 px-4 bg-purple-50 dark:bg-purple-900/10 text-purple-900 dark:text-purple-100 rounded-xl text-left flex justify-between items-center border border-purple-200 dark:border-purple-900/30">
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedCard?.color || '#9333EA' }} />
                                            <span className="font-bold text-sm">
                                                {selectedCard?.name || 'Selecionar cartão...'}
                                            </span>
                                        </div>
                                        <ChevronDownIcon className="h-5 w-5 text-purple-400" />
                                    </button>
                                </div>

                                {/* Seletor de Fatura (Edição) */}
                                <div className="animate-in slide-in-from-top-2 duration-300 space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">Alterar Fatura</label>
                                    <button type="button" onClick={() => setIsStatementPickerOpen(true)} className="w-full py-3.5 px-4 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white rounded-xl text-left flex justify-between items-center border border-slate-100 dark:border-slate-700 focus:border-dark-accent transition-all">
                                        <span className="font-bold text-sm">{currentStatementLabel}</span>
                                        <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold text-xs uppercase tracking-widest">Cancelar</button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-dark-accent text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-dark-accent/20">Salvar</button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Modal de Calendário Interno (para Edição) */}
            <Modal isOpen={isInnerCalendarOpen} onClose={() => setIsInnerCalendarOpen(false)}>
                <Calendar
                    selectedDate={editForm.data}
                    onDateSelect={d => { setEditForm({ ...editForm, data: d }); setIsInnerCalendarOpen(false); }}
                    initialDisplayDate={new Date(editForm.data + 'T00:00:00')}
                    transactions={allTransactions}
                />
            </Modal>

            {/* Modal de Seletor de Categoria (para Edição) */}
            <ListPickerModal
                isOpen={isCategoryPickerOpen}
                onClose={() => setIsCategoryPickerOpen(false)}
                title="Escolha a categoria"
                items={categorias[currentTxType].map(c => ({ id: c.name, name: c.name, icon: c.icon }))}
                selectedId={editForm.categoria}
                onSelect={i => setEditForm({ ...editForm, categoria: i.id })}
            />

            {/* Modal de Seletor de Conta (para Edição) */}
            <ListPickerModal
                isOpen={isAccountPickerOpen}
                onClose={() => setIsAccountPickerOpen(false)}
                title="Selecione a Conta"
                items={accounts.map(a => ({ 
                    id: a.id, 
                    name: a.bankName,
                    icon: getBankLogo(a.bankName, "w-6 h-6") || '🏦'
                }))}
                selectedId={editForm.accountId}
                onSelect={i => setEditForm({ ...editForm, accountId: i.id })}
            />

            {/* Modal de Seletor de Cartão (para Edição) */}
            <ListPickerModal
                isOpen={isCardPickerOpen}
                onClose={() => setIsCardPickerOpen(false)}
                title="Selecione o Cartão"
                items={creditCards.map(c => ({ 
                    id: c.id, 
                    name: c.name,
                    icon: <CreditCardIcon className="h-5 w-5 text-purple-500" />
                }))}
                selectedId={editForm.cardId}
                onSelect={i => setEditForm({ ...editForm, cardId: i.id })}
            />

            {/* Modal de Seletor de Fatura (para Edição) */}
            <InvoicePickerModal
                isOpen={isStatementPickerOpen}
                onClose={() => setIsStatementPickerOpen(false)}
                selectedId={editForm.statementDate || defaultStatementDate}
                onSelect={i => setEditForm({ ...editForm, statementDate: i.id })}
            />

            {/* Modal de Confirmação de Exclusão Simples */}
            <Modal isOpen={!!confirmingDeleteId} onClose={() => setConfirmingDeleteId(null)}>
                <div className="text-center">
                    <div className="bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrashIcon className="h-8 w-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Excluir lançamento?</h3>
                    <p className="text-sm text-slate-500 mb-8">Esta ação não poderá ser desfeita.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmingDeleteId(null)} className="flex-1 p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold rounded-xl text-sm uppercase">Cancelar</button>
                        <button onClick={handleConfirmDelete} className="flex-1 p-3 bg-red-600 text-white font-bold rounded-xl text-sm uppercase shadow-lg shadow-red-500/20">Excluir</button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Confirmação de Exclusão de Série (Futuras) */}
            <Modal isOpen={!!confirmingDeleteFutureTx} onClose={() => setConfirmingDeleteFutureTx(null)}>
                <div className="text-center">
                    <div className="bg-orange-100 dark:bg-orange-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <RepeatIcon className="h-8 w-8 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Excluir série?</h3>
                    <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                        Deseja excluir este e <b>todos os próximos</b> lançamentos desta mesma série?
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmingDeleteFutureTx(null)} className="flex-1 p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold rounded-xl text-xs uppercase">Cancelar</button>
                        <button onClick={handleConfirmDeleteFuture} className="flex-1 p-3 bg-red-600 text-white font-bold rounded-xl text-xs uppercase shadow-lg shadow-dark-accent/20">Excluir Todos</button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Escopo de Edição (Recorrente) */}
            <Modal isOpen={isEditScopeModalOpen} onClose={() => setIsEditScopeModalOpen(false)}>
                <div className="text-center">
                    <div className="bg-blue-100 dark:bg-dark-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <RepeatIcon className="h-8 w-8 text-dark-accent" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Alteração em Série</h3>
                    <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                        Este é um lançamento recorrente. Como deseja aplicar as alterações?
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => submitEdit('single')} className="w-full p-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-xl text-sm uppercase transition-colors">
                            Apenas este
                        </button>
                        <button onClick={() => submitEdit('future')} className="w-full p-4 bg-dark-accent hover:bg-blue-700 text-white font-bold rounded-xl text-sm uppercase shadow-lg shadow-dark-accent/20 transition-colors">
                            Este e os próximos
                        </button>
                    </div>
                    <button onClick={() => setIsEditScopeModalOpen(false)} className="mt-4 text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                        Cancelar
                    </button>
                </div>
            </Modal>

            {/* Modal de Detalhes da Transação */}
            {detailsTx && (
                <Modal isOpen={!!detailsTxId} onClose={() => setDetailsTxId(null)}>
                    <div className="space-y-5">
                        {/* Cabeçalho: Valor + Tipo */}
                        <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
                            <span className={`text-3xl font-black ${detailsTx.tipo === 'entrada' ? 'text-emerald-500' : detailsTx.tipo === 'saida' ? 'text-rose-500' : 'text-slate-500'}`}>
                                {detailsTx.tipo === 'entrada' ? '+' : detailsTx.tipo === 'saida' ? '-' : ''}{formatCurrency(detailsTx.valor)}
                            </span>
                            <p className="font-bold text-base text-slate-900 dark:text-white mt-2">{detailsTx.descricao}</p>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                    detailsTx.tipo === 'entrada' 
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                                        : detailsTx.tipo === 'saida'
                                        ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}>
                                    {detailsTx.tipo === 'entrada' ? 'Receita' : detailsTx.tipo === 'saida' ? 'Despesa' : 'Transferência'}
                                </span>
                                {detailsTx.isRecurring && (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 flex items-center gap-1">
                                        <RepeatIcon className="h-2.5 w-2.5" /> Recorrente
                                    </span>
                                )}
                                {detailsTx.installment && (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
                                        {detailsTx.installment.current}/{detailsTx.installment.total}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Seção: Informações */}
                        <div className="bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Informações</p>
                            </div>
                            
                            {/* Categoria */}
                            <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100/70 dark:border-slate-800/50">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Categoria</span>
                                <span className="font-bold text-sm text-slate-900 dark:text-white">{detailsTx.categoria}</span>
                            </div>

                            {/* Data */}
                            <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100/70 dark:border-slate-800/50">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Data</span>
                                <span className="font-bold text-sm text-slate-900 dark:text-white">
                                    {new Date(detailsTx.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                            </div>

                            {/* Data da Compra (se diferente) */}
                            {detailsTx.compraData && detailsTx.compraData !== detailsTx.data && (
                                <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100/70 dark:border-slate-800/50">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Data da Compra</span>
                                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                                        {new Date(detailsTx.compraData + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            )}

                            {/* Método */}
                            <div className="px-4 py-3 flex justify-between items-center">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Método</span>
                                <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                                    {detailsTx.paymentMethod === 'credito' 
                                        ? <><CreditCardIcon className="h-3.5 w-3.5 text-purple-500" /> Crédito</>
                                        : <><BankIcon className="h-3.5 w-3.5 text-emerald-500" /> Débito</>
                                    }
                                </span>
                            </div>
                        </div>

                        {/* Seção: Pagamento (Conta / Cartão / Fatura) — só aparece se houver dados */}
                        {(detailsTx.accountId || detailsTx.cardId || (detailsTx.paymentMethod === 'credito' && detailsTx.statementDate)) && (
                            <div className="bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Pagamento</p>
                                </div>

                                {detailsTx.accountId && (
                                    <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100/70 dark:border-slate-800/50 last:border-b-0">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Conta</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: accounts.find(a => a.id === detailsTx.accountId)?.color || '#3B82F6' }} />
                                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                                                {accounts.find(a => a.id === detailsTx.accountId)?.bankName || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {detailsTx.cardId && (
                                    <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100/70 dark:border-slate-800/50 last:border-b-0">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cartão</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: creditCards.find(c => c.id === detailsTx.cardId)?.color || '#9333EA' }} />
                                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                                                {creditCards.find(c => c.id === detailsTx.cardId)?.name || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {detailsTx.paymentMethod === 'credito' && detailsTx.statementDate && (
                                    <div className="px-4 py-3 flex justify-between items-center">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Fatura</span>
                                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                                            {(() => {
                                                const [y, m] = detailsTx.statementDate.split('-');
                                                return `${MESES_NOMES[parseInt(m, 10) - 1]} ${y}`;
                                            })()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};
export default Management;
