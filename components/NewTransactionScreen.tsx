
import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import Calendar from './Calendar';
import {
    ArrowLeftIcon, LoaderIcon, SparklesIcon, CalendarIcon, ChevronDownIcon, CameraIcon,
    CreditCardIcon, BankIcon, ViewGridIcon, CalculatorIcon
} from './icons';
import CategoryIcon from './CategoryIcon';
import {
    formatCurrencyForInput, parseCurrency, formatDateToInput,
    suggestCategory, formatCurrency, fileToBase64, analyzeReceipt,
    calculateStatementDate, getMonthKey, formatarMesAno, getCorPorCategoria
} from '../utils/helpers';
import { TransactionType, PaymentMethod } from '../types';
import { INITIAL_CATEGORIAS, MESES_NOMES } from '../constants';
import Modal from './Modal';
import ListPickerModal from './ListPickerModal';
import InvoicePickerModal from './InvoicePickerModal';
import { getBankLogo } from './BankLogo';

type LaunchMode = 'single' | 'installment' | 'recurring';

const NewTransactionScreen: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("NewTransactionScreen must be used within an AppProvider");

    const {
        categorias, handleLancamentoSubmit, showToast,
        creditCards, setIsNewTransactionOpen, isNewTransactionOpen, allTransactions,
        setCurrentView, setMenuSubView, incrementAiScans, accounts,
        newTransactionInitialType, setNewTransactionInitialType, categoryColors
    } = context;

    const initialTipo = newTransactionInitialType === 'entrada' ? 'entrada' : newTransactionInitialType === 'transferencia' ? 'transferencia' : 'saida';
    const initialPaymentMethod = newTransactionInitialType === 'credito' ? 'credito' : 'debito';

    // Form states
    const [formValor, setFormValor] = useState('');
    const [formTipo, setFormTipo] = useState<TransactionType>(initialTipo);
    const [formCategoria, setFormCategoria] = useState(initialTipo === 'transferencia' ? 'Transferência' : INITIAL_CATEGORIAS[initialTipo]?.[0]?.name || 'Outros');
    const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>(initialPaymentMethod);
    const [formData, setFormData] = useState(formatDateToInput(new Date()));
    const [formDescricao, setFormDescricao] = useState('');
    const [formCardId, setFormCardId] = useState<string>(creditCards[0]?.id || '');
    const [formAccountId, setFormAccountId] = useState<string>(accounts[0]?.id || '');
    const [formDestinationAccountId, setFormDestinationAccountId] = useState<string>(''); // For transfers
    const [customStatementDate, setCustomStatementDate] = useState<string | null>(null); // YYYY-MM
    const [error, setError] = useState<string | null>(null);

    // UI states
    const [activePicker, setActivePicker] = useState<'category' | 'card' | 'statement' | 'account' | 'destinationAccount' | null>(null);
    const [launchMode, setLaunchMode] = useState<LaunchMode>(initialPaymentMethod === 'credito' ? 'installment' : 'single');
    const [recurrenceQuantity, setRecurrenceQuantity] = useState('12');
    const [installmentCount, setInstallmentCount] = useState('2');

    const [isCategorizing, setIsCategorizing] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isScanSourceModalOpen, setIsScanSourceModalOpen] = useState(false);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [calcExpression, setCalcExpression] = useState('');
    const [calcResult, setCalcResult] = useState<number | null>(null);

    const handleCalcKey = (key: string) => {
        const ops = ['+', '-', '×', '÷'];
        if (key === 'DEL') {
            setCalcExpression(prev => prev.slice(0, -1));
            setCalcResult(null);
            return;
        }
        if (key === '=') {
            try {
                const expr = calcExpression.replace(/,/g, '.').replace(/÷/g, '/').replace(/×/g, '*');
                // eslint-disable-next-line no-new-func
                const r = new Function(`return (${expr})`)() as number;
                if (typeof r === 'number' && isFinite(r)) setCalcResult(r);
            } catch {}
            return;
        }
        if (calcResult !== null && !ops.includes(key)) {
            setCalcExpression(key === ',' ? '0,' : key);
            setCalcResult(null);
            return;
        }
        if (calcResult !== null && ops.includes(key)) {
            setCalcExpression(String(Math.round(calcResult * 100) / 100).replace('.', ',') + key);
            setCalcResult(null);
            return;
        }
        setCalcResult(null);
        const lastChar = calcExpression.slice(-1);
        if (ops.includes(key) && (ops.includes(lastChar) || calcExpression === '')) return;
        setCalcExpression(prev => prev + key);
    };

    const handleCalcApply = () => {
        let value: number | null = calcResult;
        if (value === null && calcExpression) {
            try {
                const expr = calcExpression.replace(/,/g, '.').replace(/÷/g, '/').replace(/×/g, '*');
                // eslint-disable-next-line no-new-func
                const r = new Function(`return (${expr})`)() as number;
                if (typeof r === 'number' && isFinite(r)) value = r;
            } catch {}
        }
        if (value !== null && value > 0) {
            setFormValor(formatCurrencyForInput(String(Math.round(value * 100))));
        }
        setIsCalculatorOpen(false);
        setCalcExpression('');
        setCalcResult(null);
    };

    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const selectedCard = creditCards.find(c => c.id === formCardId);

    // Reseta a fatura personalizada ao trocar data ou cartão para garantir consistência inicial,
    // mas não queremos impedir o usuario de mudar manualmente depois.
    useEffect(() => {
        setCustomStatementDate(null);
    }, [formData, formCardId, formPaymentMethod]);

    useEffect(() => {
        if (formTipo === 'transferencia') return; // Transfer doesn't have categories
        const categoryList = categorias[formTipo]?.map(c => c.name) || [];
        if (!categoryList.includes(formCategoria)) {
            setFormCategoria(categoryList[0] || '');
        }
    }, [formTipo, categorias]);

    useEffect(() => {
        if (isNewTransactionOpen) {
            const initialTipoComputed = newTransactionInitialType === 'entrada' ? 'entrada' : newTransactionInitialType === 'transferencia' ? 'transferencia' : 'saida';
            const initialPaymentMethodComputed = newTransactionInitialType === 'credito' ? 'credito' : 'debito';
            
            setFormTipo(initialTipoComputed);
            setFormPaymentMethod(initialPaymentMethodComputed);
            setFormValor('');
            setFormDescricao('');
            setFormData(formatDateToInput(new Date()));
            // Reset to first category of the new type
            setFormCategoria(initialTipoComputed === 'transferencia' ? 'Transferência' : INITIAL_CATEGORIAS[initialTipoComputed]?.[0]?.name || 'Outros');
            setLaunchMode(initialPaymentMethodComputed === 'credito' ? 'installment' : 'single');
        }
    }, [isNewTransactionOpen, newTransactionInitialType]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const valorNumerico = parseCurrency(formValor);

        if (valorNumerico <= 0) { setError('Insira um valor válido.'); return; }
        if (formPaymentMethod === 'credito' && !formCardId) { setError('Selecione um cartão de crédito.'); return; }
        if (formTipo === 'transferencia') {
            if (!formAccountId || !formDestinationAccountId) { setError('Selecione as contas de origem e destino.'); return; }
            if (formAccountId === formDestinationAccountId) { setError('A conta de destino deve ser diferente da origem.'); return; }
        }

        handleLancamentoSubmit(e, {
            valor: valorNumerico,
            tipo: formTipo,
            categoria: formCategoria,
            data: formData,
            paymentMethod: formPaymentMethod,
            descricao: formTipo === 'transferencia' ? formDescricao || 'Transferência entre Contas' : formDescricao || (formTipo === 'saida' ? 'Nova Despesa' : 'Nova Receita'),
            cardId: formPaymentMethod === 'credito' ? formCardId : undefined,
            accountId: formAccountId,
            destinationAccountId: formTipo === 'transferencia' ? formDestinationAccountId : undefined,
            isRecurring: launchMode === 'recurring',
            isInstallment: launchMode === 'installment',
            installmentCount: launchMode === 'installment' ? installmentCount : undefined,
            recurrenceQuantity: launchMode === 'recurring' ? recurrenceQuantity : undefined,
            customStatementDate: formPaymentMethod === 'credito' ? customStatementDate : undefined,
        });

        setIsNewTransactionOpen(false);
    };

    const handleManualAiCategorize = async (overrideDesc?: string) => {
        const desc = overrideDesc || formDescricao;
        if (!desc.trim()) return;
        setIsCategorizing(true);
        try {
            const result = await suggestCategory(desc, formTipo, categorias);
            setFormCategoria(result);
            showToast("IA sugeriu uma categoria!", "success");
        } catch (err: any) {
            console.error("AI Category Error:", err);
        } finally {
            setIsCategorizing(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setIsScanSourceModalOpen(false);
        setError(null);

        try {
            const base64 = await fileToBase64(file);
            const result = await analyzeReceipt(base64, file.type, categorias);

            setFormValor(formatCurrencyForInput(String(Math.round(result.valor * 100))));
            setFormDescricao(result.descricao);
            setFormData(result.data);
            setFormCategoria(result.categoria);
            setFormTipo('saida');
            setFormPaymentMethod('debito');

            incrementAiScans();
            showToast("Recibo processado com sucesso!", "success");

        } catch (err: any) {
            setError(err.message || "Erro ao escanear recibo.");
            showToast("Falha ao ler recibo", "error");
        } finally {
            setIsScanning(false);
            if (cameraInputRef.current) cameraInputRef.current.value = '';
            if (galleryInputRef.current) galleryInputRef.current.value = '';
        }
    };

    const handleGoToCardRegistration = () => {
        setIsNewTransactionOpen(false);
        setMenuSubView('cards');
        setCurrentView('menu');
    };

    const installmentValue = useMemo(() => {
        const total = parseCurrency(formValor);
        const count = parseInt(installmentCount, 10) || 1;
        return count > 0 ? total / count : 0;
    }, [formValor, installmentCount]);

    const paymentMethods: { id: PaymentMethod, label: string, icon: React.ReactNode }[] = [
        { id: 'debito', label: 'Débito', icon: <BankIcon /> },
        { id: 'credito', label: 'Crédito', icon: <CreditCardIcon /> },
    ];

    // Data padrão da fatura baseada na data da compra e fechamento do cartão
    const defaultStatementDate = useMemo(() => {
        if (!selectedCard) return getMonthKey(new Date(formData + 'T00:00:00'));
        return calculateStatementDate(formData, selectedCard);
    }, [formData, selectedCard]);



    const currentStatementLabel = useMemo(() => {
        const key = customStatementDate || defaultStatementDate;
        const [year, month] = key.split('-');
        return `${MESES_NOMES[parseInt(month) - 1]} ${year}`;
    }, [customStatementDate, defaultStatementDate]);

    // Cores contextuais por tipo de transação
    const labelColor = newTransactionInitialType === 'entrada' ? 'text-emerald-500'
        : newTransactionInitialType === 'credito' ? 'text-purple-500'
        : newTransactionInitialType === 'transferencia' ? 'text-blue-500' : 'text-rose-500';

    const headerBorder = newTransactionInitialType === 'entrada' ? 'border-b-emerald-500'
        : newTransactionInitialType === 'credito' ? 'border-b-purple-500'
        : newTransactionInitialType === 'transferencia' ? 'border-b-blue-500' : 'border-b-rose-500';

    const submitBtn = newTransactionInitialType === 'entrada'
        ? { text: 'Registrar Receita', cls: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' }
        : newTransactionInitialType === 'credito'
        ? { text: 'Lançar no Cartão', cls: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20' }
        : newTransactionInitialType === 'transferencia'
        ? { text: 'Transferir', cls: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' }
        : { text: 'Registrar Despesa', cls: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' };

    return (
        <div className="bg-slate-50 dark:bg-dark-bg h-full flex flex-col overflow-hidden text-slate-900 dark:text-white transition-colors duration-300">
            <header className={`p-4 border-b-2 ${headerBorder} bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between gap-4 pt-[calc(1rem+env(safe-area-inset-top))] transition-colors duration-300`}>
                <button onClick={() => setIsNewTransactionOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-dark-surface transition">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h1 className="text-lg font-bold text-center flex-grow text-slate-900 dark:text-white uppercase tracking-tight">
                    {newTransactionInitialType === 'entrada' ? 'Nova Receita' : newTransactionInitialType === 'saida' ? 'Nova Despesa' : newTransactionInitialType === 'credito' ? 'Cartão de Crédito' : newTransactionInitialType === 'transferencia' ? 'Transferência' : 'Novo Lançamento'}
                </h1>
                <div className="w-10"></div>
            </header>

            <main className="p-3 space-y-3 overflow-y-auto no-scrollbar pb-6">
                {/* Scanner - apenas para despesas e crédito (#6) */}
                {(newTransactionInitialType === 'saida' || newTransactionInitialType === 'credito') && (
                    <div className="bg-white dark:bg-dark-surface p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => setIsScanSourceModalOpen(true)}
                            disabled={isScanning}
                            className="w-full flex items-center justify-center gap-3 py-2 border-2 border-dashed border-dark-accent/30 dark:border-dark-accent/20 rounded-xl hover:bg-dark-accent/5 transition-all active:scale-[0.99]"
                        >
                            {isScanning ? (
                                <>
                                    <LoaderIcon className="h-5 w-5 animate-spin text-dark-accent" />
                                    <span className="text-sm font-bold text-dark-accent uppercase tracking-widest">Lendo Recibo...</span>
                                </>
                            ) : (
                                <>
                                    <CameraIcon className="h-6 w-6 text-dark-accent" />
                                    <span className="text-sm font-bold text-dark-accent uppercase tracking-widest">Escanear Recibo</span>
                                </>
                            )}
                        </button>

                        <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
                        <input type="file" ref={galleryInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    </div>
                )}

                {/* Hidden file inputs quando scanner não está visível */}
                {!(newTransactionInitialType === 'saida' || newTransactionInitialType === 'credito') && (
                    <>
                        <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
                        <input type="file" ref={galleryInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    </>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    {newTransactionInitialType === 'credito' && (
                        <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-dark-bg p-1 rounded-xl">
                            <button type="button" onClick={() => setFormTipo('saida')} className={`py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${formTipo === 'saida' ? 'bg-white dark:bg-dark-surface text-red-500 shadow-sm' : 'text-slate-400'}`}>Despesa</button>
                            <button type="button" onClick={() => setFormTipo('entrada')} className={`py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${formTipo === 'entrada' ? 'bg-white dark:bg-dark-surface text-emerald-500 shadow-sm' : 'text-slate-400'}`}>Reembolso</button>
                        </div>
                    )}

                    {/* Valor - Hero (#1) */}
                    <div className="text-center py-3 bg-white dark:bg-dark-surface rounded-2xl border border-slate-100 dark:border-slate-800">
                        <label className={`text-[9px] font-black uppercase tracking-[0.2em] ${labelColor} mb-1 block`}>Valor</label>
                        <div className="relative flex items-center justify-center">
                            <input
                                type="tel"
                                value={formValor}
                                onChange={e => setFormValor(formatCurrencyForInput(e.target.value))}
                                className="w-full text-center text-3xl font-black bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 px-12"
                                placeholder="R$ 0,00"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => { setCalcExpression(formValor ? parseCurrency(formValor).toString().replace('.', ',') : ''); setCalcResult(null); setIsCalculatorOpen(true); }}
                                className="absolute right-3 p-2 text-slate-400 hover:text-dark-accent active:scale-90 transition-all"
                                title="Abrir calculadora"
                            >
                                <CalculatorIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Data */}
                    <div className="space-y-1">
                        <label className={`text-[10px] font-bold ${labelColor} uppercase ml-1 tracking-tight`}>Quando?</label>
                        <button type="button" onClick={() => setIsCalendarOpen(true)} className="w-full py-2.5 px-4 bg-white dark:bg-dark-surface text-slate-900 dark:text-white rounded-xl text-left flex justify-between items-center font-bold text-sm border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-dark-bg transition-all">
                            <span>{new Date(formData + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                            <CalendarIcon className="h-4 w-4 text-dark-accent" />
                        </button>
                    </div>

                        {formPaymentMethod !== 'credito' && (
                            <>
                                <div className="space-y-1">
                                <label className={`text-[10px] font-bold ${labelColor} uppercase ml-1 tracking-tight`}>
                                        {formTipo === 'transferencia' ? 'Conta de Origem' : 'Qual Banco / Conta?'}
                                    </label>
                                    {accounts.length > 0 ? (
                                        <button type="button" onClick={() => setActivePicker('account')} className="w-full py-2.5 px-4 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white rounded-xl text-left flex justify-between items-center font-bold text-sm border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-dark-bg transition-all">
                                            <div className="flex items-center gap-2.5 truncate">
                                                {(() => {
                                                    const account = accounts.find(a => a.id === formAccountId);
                                                    if (!account) return <div className="h-3 w-3 rounded-full flex-shrink-0 bg-slate-400" />;
                                                    const logo = getBankLogo(account.bankName, "w-5 h-5 rounded-full flex-shrink-0 overflow-hidden");
                                                    return logo || <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: account.color || '#3B82F6' }} />;
                                                })()}
                                                <span className="truncate">{accounts.find(a => a.id === formAccountId)?.bankName || 'Selecionar conta...'}</span>
                                            </div>
                                            <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => { setIsNewTransactionOpen(false); setCurrentView('openfinance'); }}
                                            className="w-full py-2.5 px-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-center font-bold text-[10px] border border-rose-100 dark:border-rose-900/30 uppercase tracking-widest"
                                        >
                                            Cadastrar Conta Primeiro
                                        </button>
                                    )}
                                </div>
                                {formTipo === 'transferencia' && (
                                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                                        <label className={`text-[10px] font-bold ${labelColor} uppercase ml-1 tracking-tight`}>
                                            Conta de Destino
                                        </label>
                                        {accounts.length > 1 ? (
                                            <button type="button" onClick={() => setActivePicker('destinationAccount')} className="w-full py-2.5 px-4 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white rounded-xl text-left flex justify-between items-center font-bold text-sm border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-dark-bg transition-all focus:border-blue-500">
                                                <div className="flex items-center gap-2.5 truncate">
                                                    {(() => {
                                                        const account = accounts.find(a => a.id === formDestinationAccountId);
                                                        if (!account) return <div className="h-3 w-3 rounded-full flex-shrink-0 bg-slate-400" />;
                                                        const logo = getBankLogo(account.bankName, "w-5 h-5 rounded-full flex-shrink-0 overflow-hidden");
                                                        return logo || <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: account.color || '#94A3B8' }} />;
                                                    })()}
                                                    <span className={`truncate ${formDestinationAccountId ? '' : 'opacity-50'}`}>{accounts.find(a => a.id === formDestinationAccountId)?.bankName || 'Selecionar conta de destino...'}</span>
                                                </div>
                                                <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                                            </button>
                                        ) : (
                                            <p className="text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">Você precisa de pelo menos 2 contas para transferir.</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {formPaymentMethod === 'credito' && (
                            creditCards.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="animate-in slide-in-from-top-2 duration-300 space-y-1">
                                        <label className="text-[10px] font-bold text-purple-500 uppercase ml-1 tracking-tight">Qual Cartão?</label>
                                        <button type="button" onClick={() => setActivePicker('card')} className="w-full py-2.5 px-4 bg-purple-50 dark:bg-purple-900/10 text-purple-900 dark:text-purple-100 rounded-xl text-left flex justify-between items-center border border-purple-200 dark:border-purple-900/30">
                                            <div className="flex items-center gap-3">
                                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedCard?.color || '#9333EA' }} />
                                                <span className="font-bold text-sm">
                                                    {selectedCard?.name || 'Selecionar cartão...'}
                                                </span>
                                            </div>
                                            <ChevronDownIcon className="h-5 w-5 text-purple-400" />
                                        </button>
                                    </div>

                                    <div className="animate-in slide-in-from-top-2 duration-300 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">Mês da Fatura</label>
                                        <button type="button" onClick={() => setActivePicker('statement')} className="w-full py-2.5 px-4 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white rounded-xl text-left flex justify-between items-center border border-slate-100 dark:border-slate-800 focus:border-dark-accent transition-all">
                                            <span className="font-bold text-sm">{currentStatementLabel}</span>
                                            <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-in fade-in duration-500 py-6 px-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
                                    <div className="bg-white dark:bg-dark-surface h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                        <CreditCardIcon className="h-6 w-6 text-slate-400" />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Nenhum cartão cadastrado</h4>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-300 font-medium leading-relaxed mb-4 px-2">Para lançar despesas no crédito, você precisa primeiro configurar um cartão.</p>
                                    <button
                                        type="button"
                                        onClick={handleGoToCardRegistration}
                                        className="w-full py-3 bg-white dark:bg-dark-surface text-dark-accent font-black text-[10px] uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm active:scale-95 transition-all"
                                    >
                                        Cadastrar Meu Primeiro Cartão
                                    </button>
                                </div>
                            )
                        )}

                        <div className="space-y-1">
                            <label className={`text-[10px] font-bold ${labelColor} uppercase ml-1 tracking-tight`}>Descrição</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Ex: Aluguel, Mercado..."
                                    value={formDescricao}
                                    onChange={(e) => setFormDescricao(e.target.value)}
                                    className="w-full py-2.5 pl-4 pr-12 bg-white dark:bg-dark-surface text-slate-900 dark:text-white rounded-xl font-bold text-sm border border-slate-100 dark:border-slate-800 focus:border-dark-accent focus:ring-1 focus:ring-dark-accent outline-none transition-all"
                                    maxLength={30}
                                />
                                <button type="button" onClick={() => handleManualAiCategorize()} disabled={isCategorizing} className="absolute inset-y-0 right-0 flex items-center justify-center w-12 text-dark-accent active:scale-90 transition-transform">
                                    {isCategorizing ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5 opacity-70 hover:opacity-100" />}
                                </button>
                            </div>
                        </div>

                        {formTipo !== 'transferencia' && (
                            <div className="space-y-1">
                                <label className={`text-[10px] font-bold ${labelColor} uppercase ml-1 tracking-tight`}>Categoria</label>
                                <button type="button" onClick={() => setActivePicker('category')} className="w-full py-2.5 px-4 bg-white dark:bg-dark-surface text-slate-900 dark:text-white rounded-xl text-left flex justify-between items-center font-bold text-sm border border-slate-100 dark:border-slate-800 focus:border-dark-accent transition-all">
                                    <div className="flex items-center gap-2.5">
                                        {(() => {
                                            const cat = categorias[formTipo as 'entrada' | 'saida']?.find(c => c.name === formCategoria);
                                            return cat?.icon
                                                ? <div className="text-slate-700 dark:text-slate-300 flex items-center justify-center"><CategoryIcon name={cat.icon} className="h-5 w-5" /></div>
                                                : <div className="h-3 w-3 rounded-full flex-shrink-0 border border-slate-200 dark:border-slate-700" style={{ backgroundColor: getCorPorCategoria(formCategoria, categoryColors) }} />;
                                        })()
                                        }
                                        <span>{formCategoria}</span>
                                    </div>
                                    <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                                </button>
                            </div>
                        )}

                        {formTipo !== 'transferencia' && (
                            <div className="bg-white dark:bg-dark-surface p-3 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800">
                                <label className={`text-[9px] font-black ${labelColor} uppercase tracking-[0.15em] block`}>Tipo de Lançamento</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button type="button" onClick={() => setLaunchMode('single')} className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${launchMode === 'single' ? 'bg-dark-accent text-white shadow-md' : 'bg-slate-50 dark:bg-dark-bg text-slate-400'}`}>Único</button>
                                    <button type="button" onClick={() => setLaunchMode('installment')} className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${launchMode === 'installment' ? 'bg-dark-accent text-white shadow-md' : 'bg-slate-50 dark:bg-dark-bg text-slate-400'}`}>Parcelado</button>
                                    <button type="button" onClick={() => setLaunchMode('recurring')} className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${launchMode === 'recurring' ? 'bg-dark-accent text-white shadow-md' : 'bg-slate-50 dark:bg-dark-bg text-slate-400'}`}>Fixo</button>
                                </div>

                                {launchMode === 'installment' && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                        <div className="space-y-1">
                                            <label className={`text-[10px] font-bold ${labelColor} uppercase ml-1 tracking-tight`}>Parcelas</label>
                                            <div className="flex items-center gap-0 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                                <button type="button" onClick={() => setInstallmentCount(String(Math.max(2, (parseInt(installmentCount) || 2) - 1)))} className="px-3 py-3.5 bg-slate-50 dark:bg-dark-bg text-slate-500 font-black text-lg hover:bg-slate-100 dark:hover:bg-dark-surface transition-colors">−</button>
                                                <input type="number" min="2" max="60" inputMode="numeric" value={installmentCount} onChange={e => setInstallmentCount(e.target.value)} className="flex-1 py-3.5 bg-white dark:bg-dark-surface text-slate-900 dark:text-white font-black text-sm text-center outline-none" />
                                                <button type="button" onClick={() => setInstallmentCount(String(Math.min(60, (parseInt(installmentCount) || 2) + 1)))} className="px-3 py-3.5 bg-slate-50 dark:bg-dark-bg text-slate-500 font-black text-lg hover:bg-slate-100 dark:hover:bg-dark-surface transition-colors">+</button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className={`text-[10px] font-bold ${labelColor} uppercase ml-1 tracking-tight`}>Mensalidade</label>
                                            <div className="py-3.5 px-4 bg-dark-accent/10 font-bold text-sm text-dark-accent rounded-xl text-center border border-dark-accent/20 flex items-center justify-center gap-1">
                                                {formatCurrency(installmentValue)}<span className="text-[9px] text-dark-accent/60 font-medium">/mês</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {launchMode === 'recurring' && (
                                    <div className="animate-in fade-in slide-in-from-top-1">
                                        <div className="space-y-1">
                                            <label className={`text-[10px] font-bold ${labelColor} uppercase ml-1 tracking-tight`}>Repetir por quantos meses?</label>
                                            <div className="flex items-center gap-0 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                                <button type="button" onClick={() => setRecurrenceQuantity(String(Math.max(2, (parseInt(recurrenceQuantity) || 12) - 1)))} className="px-3 py-3.5 bg-slate-50 dark:bg-dark-bg text-slate-500 font-black text-lg hover:bg-slate-100 dark:hover:bg-dark-surface transition-colors">−</button>
                                                <input type="number" min="2" max="120" inputMode="numeric" value={recurrenceQuantity} onChange={e => setRecurrenceQuantity(e.target.value)} className="flex-1 py-3.5 bg-white dark:bg-dark-surface text-slate-900 dark:text-white font-black text-sm text-center outline-none" />
                                                <button type="button" onClick={() => setRecurrenceQuantity(String(Math.min(120, (parseInt(recurrenceQuantity) || 12) + 1)))} className="px-3 py-3.5 bg-slate-50 dark:bg-dark-bg text-slate-500 font-black text-lg hover:bg-slate-100 dark:hover:bg-dark-surface transition-colors">+</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button type="submit" className={`w-full ${submitBtn.cls} text-white py-4 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all uppercase tracking-widest text-sm`}>{submitBtn.text}</button>
                        {error && <p className="text-red-500 text-[11px] text-center font-semibold bg-red-50 dark:bg-red-900/20 py-2 rounded-lg border border-red-100 dark:border-red-900/30 uppercase">{error}</p>}
                    </form>
            </main>

            <Modal isOpen={isScanSourceModalOpen} onClose={() => setIsScanSourceModalOpen(false)}>
                {/* ... (Modal content for scanner remains same) ... */}
                <div className="flex flex-col">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1 text-center">Origem do Recibo</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-300 font-bold uppercase tracking-widest mb-6 text-center">Como deseja capturar?</p>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => cameraInputRef.current?.click()}
                            className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 transition-all active:scale-95"
                        >
                            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
                                <CameraIcon className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase">Câmera</span>
                        </button>

                        <button
                            onClick={() => galleryInputRef.current?.click()}
                            className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-slate-50 dark:bg-dark-surface border border-slate-100 dark:border-slate-700 transition-all active:scale-95"
                        >
                            <div className="p-3 bg-slate-600 dark:bg-slate-500 rounded-xl shadow-lg shadow-slate-600/20">
                                <ViewGridIcon className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">Galeria</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setIsScanSourceModalOpen(false)}
                        className="mt-6 py-3 text-slate-400 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest"
                    >
                        Cancelar
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)}>
                <Calendar selectedDate={formData} onDateSelect={d => { setFormData(d); setIsCalendarOpen(false); }} initialDisplayDate={new Date(formData + 'T00:00:00')} transactions={allTransactions} />
            </Modal>

            <ListPickerModal isOpen={activePicker === 'category'} onClose={() => setActivePicker(null)} title="Escolha uma categoria" items={categorias[formTipo as 'entrada' | 'saida']?.map(c => ({ id: c.name, name: c.name, icon: c.icon })) || []} selectedId={formCategoria} onSelect={i => setFormCategoria(i.id)} />
            <ListPickerModal 
                isOpen={activePicker === 'card'} 
                onClose={() => setActivePicker(null)} 
                title="Selecione o Cartão" 
                items={creditCards.map(c => ({ 
                    id: c.id, 
                    name: c.name,
                    icon: <CreditCardIcon className="h-5 w-5 text-purple-500" />
                }))} 
                selectedId={formCardId} 
                onSelect={i => setFormCardId(i.id)} 
            />
            <ListPickerModal 
                isOpen={activePicker === 'account'} 
                onClose={() => setActivePicker(null)} 
                title="Selecione a Conta" 
                items={accounts.map(a => ({ 
                    id: a.id, 
                    name: a.bankName,
                    icon: getBankLogo(a.bankName, "w-6 h-6") || '🏦'
                }))} 
                selectedId={formAccountId} 
                onSelect={i => setFormAccountId(i.id)} 
            />
            <ListPickerModal 
                isOpen={activePicker === 'destinationAccount'} 
                onClose={() => setActivePicker(null)} 
                title="Conta de Destino" 
                items={accounts.map(a => ({ 
                    id: a.id, 
                    name: a.bankName,
                    icon: getBankLogo(a.bankName, "w-6 h-6") || '🏦'
                }))} 
                selectedId={formDestinationAccountId} 
                onSelect={i => setFormDestinationAccountId(i.id)} 
            />
            <InvoicePickerModal isOpen={activePicker === 'statement'} onClose={() => setActivePicker(null)} selectedId={customStatementDate || defaultStatementDate} onSelect={i => setCustomStatementDate(i.id)} />

            {/* Calculadora — popup compacto centralizado */}
            {isCalculatorOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
                    onClick={() => setIsCalculatorOpen(false)}
                >
                    <div
                        className="w-full max-w-[320px] bg-[#1C1C1E] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Display */}
                        <div className="px-5 pt-5 pb-3 flex flex-col items-end min-h-[72px] justify-end">
                            <p className="text-white/80 text-2xl font-light tracking-tight text-right break-all leading-tight">
                                {calcExpression || '0'}
                            </p>
                            {calcResult !== null && (
                                <p className="text-blue-400 text-base font-medium mt-0.5">= {formatCurrency(calcResult)}</p>
                            )}
                        </div>

                        {/* Numpad */}
                        <div className="grid grid-cols-4 border-t border-white/10">
                            {[
                                { label: '7', cls: 'text-white' }, { label: '8', cls: 'text-white' }, { label: '9', cls: 'text-white' }, { label: 'DEL', cls: 'text-red-400 text-sm font-bold' },
                                { label: '4', cls: 'text-white' }, { label: '5', cls: 'text-white' }, { label: '6', cls: 'text-white' }, { label: '÷', cls: 'text-blue-400 text-xl' },
                                { label: '1', cls: 'text-white' }, { label: '2', cls: 'text-white' }, { label: '3', cls: 'text-white' }, { label: '×', cls: 'text-blue-400 text-xl' },
                                { label: ',', cls: 'text-white' }, { label: '0', cls: 'text-white' }, { label: '+', cls: 'text-blue-400 text-xl' }, { label: '-', cls: 'text-blue-400 text-xl' },
                            ].map(({ label, cls }) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleCalcKey(label)}
                                    className={`h-13 py-3.5 flex items-center justify-center text-lg border-b border-r border-white/5 active:bg-white/10 transition-colors ${cls}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Linha de = e Usar */}
                        <div className="grid grid-cols-2 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => handleCalcKey('=')}
                                className="py-4 text-xl font-bold text-blue-400 border-r border-white/10 active:bg-white/10 transition-colors"
                            >=</button>
                            <button
                                type="button"
                                onClick={handleCalcApply}
                                className={`py-4 text-sm font-black uppercase tracking-widest text-white active:opacity-70 transition-opacity ${submitBtn.cls.split(' ')[0]}`}
                            >Usar</button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default NewTransactionScreen;
