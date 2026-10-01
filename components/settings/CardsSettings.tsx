import React, { useContext, useState } from 'react';
import { CreditCardIcon, BankIcon, EditIcon, TrashIcon, PlusIcon, WalletIcon, PiggyBankIcon, TrendingUpIcon, CalendarIcon } from '../icons';
import { AppContext } from '../../context/AppContext';
import { CreditCard, Account } from '../../types';
import { useTranslation } from '../../i18n';
import { formatCurrency, parseCurrency, formatCurrencyForInput, calculateAccountBalance, getSaldoLimitDate, formatDateToInput, getMonthKey } from '../../utils/helpers';
import Modal from '../Modal';
import Calendar from '../Calendar';
import ListPickerModal from '../ListPickerModal';
import { COLOR_PALETTE } from '../../constants';
import { POPULAR_BANKS } from '../BankLogo';

interface CardsSettingsProps {
    openCardModal: (card?: CreditCard) => void;
    setDeletingCardId: (id: string | null) => void;
    isAddChoiceOpen?: boolean;
    setIsAddChoiceOpen?: (open: boolean) => void;
}

const getAccountIcon = (type: string, className = "h-5 w-5") => {
    switch (type) {
        case 'Poupança':
            return <PiggyBankIcon className={className} />;
        case 'Dinheiro':
            return <WalletIcon className={className} />;
        case 'Investimento':
            return <TrendingUpIcon className={className} />;
        default:
            return <BankIcon className={className} />;
    }
};

const getBadgeInitials = (name?: string) => {
    if (!name) return 'CC';
    const clean = name.trim();
    if (clean.toLowerCase().includes('dinheiro') || clean.toLowerCase().includes('carteira') || clean.toLowerCase().includes('espécie')) {
        return '💵';
    }
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length === 1) {
        return clean.substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
};

const CardsSettings: React.FC<CardsSettingsProps> = ({ 
    openCardModal, 
    setDeletingCardId,
    isAddChoiceOpen: externalIsAddChoiceOpen,
    setIsAddChoiceOpen: externalSetIsAddChoiceOpen
}) => {
    const context = useContext(AppContext);
    if (!context) throw new Error("CardsSettings missing AppContext");

    const {
        accounts, creditCards, allTransactions, currentDate,
        handleCreateBankAccount, handleUpdateBankAccount, handleDeleteBankAccount,
        handleLancamentoSubmit
    } = context;

    const { t, locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';

    // State for Add Choice Modal (supports both internal and external control)
    const [internalIsAddChoiceOpen, setInternalIsAddChoiceOpen] = useState(false);
    const isAddChoiceOpen = externalIsAddChoiceOpen !== undefined ? externalIsAddChoiceOpen : internalIsAddChoiceOpen;
    const setIsAddChoiceOpen = externalSetIsAddChoiceOpen || setInternalIsAddChoiceOpen;

    // State for Account Modal
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
    const [accountForm, setAccountForm] = useState({
        bankName: '',
        balance: '',
        initialDate: formatDateToInput(new Date()),
        accountType: 'Corrente',
        color: COLOR_PALETTE[0]
    });
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
    const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
    const [isAccountTypePickerOpen, setIsAccountTypePickerOpen] = useState(false);

    const openAccountModal = (acc?: Account) => {
        setIsBankDropdownOpen(false);
        setIsColorDropdownOpen(false);
        setIsAccountTypePickerOpen(false);
        if (acc) {
            setEditingAccountId(acc.id);
            const dynamicBalance = calculateAccountBalance(acc.id, allTransactions, new Date());
            setAccountForm({
                bankName: acc.bankName,
                balance: formatCurrencyForInput(dynamicBalance.toFixed(2)),
                initialDate: acc.initialDate || formatDateToInput(new Date()),
                accountType: acc.accountType,
                color: acc.color
            });
        } else {
            setEditingAccountId(null);
            setAccountForm({
                bankName: '',
                balance: '',
                initialDate: formatDateToInput(new Date()),
                accountType: 'Corrente',
                color: COLOR_PALETTE[0]
            });
        }
        setIsAccountModalOpen(true);
    };

    const handleAccountSubmit = () => {
        if (!accountForm.bankName || !accountForm.balance) return;

        const accountData = {
            bankName: accountForm.bankName,
            balance: parseCurrency(accountForm.balance),
            initialDate: accountForm.initialDate,
            accountType: accountForm.accountType,
            color: accountForm.color,
            lastSync: new Date().toISOString()
        };

        if (editingAccountId) {
            handleUpdateBankAccount(editingAccountId, accountData);

            // Ajuste dinâmico de saldo
            const currentBalance = calculateAccountBalance(editingAccountId, allTransactions, new Date());
            const targetBalance = parseCurrency(accountForm.balance);
            const difference = targetBalance - currentBalance;

            if (Math.abs(difference) > 0.01 && handleLancamentoSubmit) {
                const f = {
                    valor: Math.abs(difference),
                    tipo: difference > 0 ? 'entrada' : 'saida',
                    categoria: difference > 0 ? 'Investimentos' : 'Outros',
                    paymentMethod: 'debito',
                    accountId: editingAccountId,
                    descricao: `${t('accountManager.balanceAdjustment') || 'Ajuste de Saldo'}: ${accountForm.bankName}`,
                    data: new Date().toISOString().split('T')[0],
                    isRecurring: false,
                    isInstallment: false
                };
                handleLancamentoSubmit({ preventDefault: () => {} } as any, f);
            }
        } else {
            handleCreateBankAccount(accountData);
        }
        setIsAccountModalOpen(false);
    };

    const getAccountSubtitle = (acc: Account) => {
        const type = acc.accountType?.toLowerCase() || '';
        if (type.includes('corrente')) return 'Conta Corrente Principal';
        if (type.includes('investimento')) return 'Conta Investimentos & Reserva';
        if (type.includes('dinheiro') || type.includes('carteira')) return 'Espécie em mãos';
        if (type.includes('poupança') || type.includes('poupanca')) return 'Conta Poupança';
        return acc.accountType || 'Conta Bancária';
    };

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-6">
            {/* SEÇÃO CONTAS & CARTEIRAS */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
                        Contas & Carteiras
                    </span>
                    {(() => {
                        const totalAccounts = accounts.reduce((acc, curr) => acc + calculateAccountBalance(curr.id, allTransactions, getSaldoLimitDate(currentDate)), 0);
                        return (
                            <span className={`text-[11px] font-semibold ${totalAccounts < 0 ? 'text-rose-500' : 'text-emerald-500 dark:text-emerald-400'}`}>
                                Total: {formatCurrency(totalAccounts, appLocale, appCurrency)}
                            </span>
                        );
                    })()}
                </div>

                <div className="flex flex-col gap-2.5">
                    {accounts.length === 0 ? (
                        <div 
                            onClick={() => openAccountModal()}
                            className="text-center py-8 px-4 bg-white dark:bg-dark-card border border-dashed border-slate-200 dark:border-white/[0.08] rounded-2xl cursor-pointer hover:border-blue-500/50 transition-all group"
                        >
                            <BankIcon className="h-10 w-10 mx-auto mb-2 text-slate-400 group-hover:text-blue-500 transition-colors" />
                            <p className="font-bold text-sm text-light-text dark:text-dark-text-secondary">Nenhuma conta cadastrada</p>
                            <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">Toque aqui para cadastrar sua primeira conta ou carteira</p>
                        </div>
                    ) : (
                        accounts.map(acc => {
                            const balance = calculateAccountBalance(acc.id, allTransactions, getSaldoLimitDate(currentDate));
                            const badgeText = getBadgeInitials(acc.bankName);
                            const badgeColor = acc.color || '#3B82F6';

                            return (
                                <div
                                    key={acc.id}
                                    onClick={() => openAccountModal(acc)}
                                    className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/[0.06] rounded-3xl p-4 flex items-center justify-between shadow-xl hover:border-lime-500/40 dark:hover:border-white/[0.12] transition-all cursor-pointer group active:scale-[0.99]"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-white text-sm shrink-0 shadow-sm"
                                            style={{ backgroundColor: badgeColor }}
                                        >
                                            {badgeText}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm sm:text-base font-bold text-light-text dark:text-dark-text leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {acc.bankName}
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate mt-0.5">
                                                {getAccountSubtitle(acc)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-3">
                                        <span 
                                            className="text-sm sm:text-base font-extrabold"
                                            style={{ color: balance < 0 ? '#F43F5E' : badgeColor }}
                                        >
                                            {formatCurrency(balance, appLocale, appCurrency)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* SEÇÃO CARTÕES DE CRÉDITO */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                        Cartões de Crédito
                    </span>
                    <span className="text-[11px] font-semibold text-rose-500 dark:text-rose-400">
                        {creditCards.length} {creditCards.length === 1 ? 'cartão' : 'cartões'}
                    </span>
                </div>

                <div className="flex flex-col gap-3">
                    {creditCards.length === 0 ? (
                        <div 
                            onClick={() => openCardModal()}
                            className="text-center py-8 px-4 bg-white dark:bg-dark-card border border-dashed border-slate-200 dark:border-white/[0.08] rounded-2xl cursor-pointer hover:border-rose-500/50 transition-all group"
                        >
                            <CreditCardIcon className="h-10 w-10 mx-auto mb-2 text-slate-400 group-hover:text-rose-500 transition-colors" />
                            <p className="font-bold text-sm text-light-text dark:text-dark-text-secondary">Nenhum cartão cadastrado</p>
                            <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">Toque aqui para adicionar seu primeiro cartão de crédito</p>
                        </div>
                    ) : (
                        creditCards.map(card => {
                            const currentMonthStr = getMonthKey(currentDate);
                            const cardTxs = allTransactions.filter(t => t.cardId === card.id && t.statementDate === currentMonthStr);
                            const invoiceTotal = cardTxs.reduce((sum, t) => {
                                if (t.tipo === 'saida') return sum + t.valor;
                                if (t.tipo === 'entrada') return sum - t.valor;
                                return sum;
                            }, 0);

                            const percentageUsed = card.limit > 0 ? Math.min(100, Math.max(0, (invoiceTotal / card.limit) * 100)) : 0;
                            const badgeText = getBadgeInitials(card.name);
                            const badgeColor = card.color || '#0047BB';

                            return (
                                <div
                                    key={card.id}
                                    className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/[0.06] rounded-3xl p-4 flex flex-col gap-3 shadow-xl hover:border-lime-500/40 dark:hover:border-white/[0.12] transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-white text-sm shrink-0 shadow-sm"
                                                style={{ backgroundColor: badgeColor }}
                                            >
                                                {badgeText}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm sm:text-base font-bold text-light-text dark:text-dark-text leading-tight truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                                    {card.name}
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate mt-0.5">
                                                    Fecha dia {card.closingDay} • Vence dia {card.dueDay}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right shrink-0 mr-1">
                                                <span className="text-sm sm:text-base font-extrabold text-[#F43F5E]">
                                                    {formatCurrency(invoiceTotal, appLocale, appCurrency)}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); openCardModal(card); }}
                                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                                                title="Editar Cartão"
                                            >
                                                <EditIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setDeletingCardId(card.id); }}
                                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                                                title="Excluir Cartão"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Barra de Progresso de Limite */}
                                    <div className="pt-2.5 border-t border-slate-100 dark:border-white/5 flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 dark:text-[#64748B] font-medium">
                                                Fatura Atual: {formatCurrency(invoiceTotal, appLocale, appCurrency)}
                                            </span>
                                            <span className="text-slate-600 dark:text-[#94A3B8] font-bold">
                                                Limite: {formatCurrency(card.limit, appLocale, appCurrency)}
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#F43F5E] to-[#E11D48]"
                                                style={{ width: `${percentageUsed}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modal Seletor de Tipo de Adição (Conta ou Cartão) */}
            <Modal isOpen={isAddChoiceOpen} onClose={() => setIsAddChoiceOpen(false)} verticalAlign="popup">
                <div className="space-y-4 p-2">
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-light-text dark:text-dark-text">O que você deseja adicionar?</h3>
                        <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">Escolha o tipo de item para cadastrar</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsAddChoiceOpen(false);
                                openAccountModal();
                            }}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-slate-100 dark:bg-dark-card border border-light-border dark:border-dark-elevated/50 hover:border-blue-500/50 active:scale-[0.98] transition-all text-left group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <BankIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-light-text dark:text-dark-text group-hover:text-blue-500 transition-colors">
                                    Nova Conta / Carteira
                                </h4>
                                <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                                    Conta corrente, poupança, dinheiro em espécie ou investimentos
                                </p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setIsAddChoiceOpen(false);
                                openCardModal();
                            }}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-slate-100 dark:bg-dark-card border border-light-border dark:border-dark-elevated/50 hover:border-rose-500/50 active:scale-[0.98] transition-all text-left group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                                <CreditCardIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-light-text dark:text-dark-text group-hover:text-rose-500 transition-colors">
                                    Novo Cartão de Crédito
                                </h4>
                                <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                                    Cartão com limite, faturas mensais e datas de fechamento
                                </p>
                            </div>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Conta (Criar/Editar) */}
            <Modal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)}>
                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                            <BankIcon className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-bold text-light-text dark:text-dark-text">
                            {editingAccountId ? t('accountManager.editAccount') || 'Editar Conta' : t('accountManager.newAccount') || 'Nova Conta / Carteira'}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {/* Seletor de Banco */}
                        <div className="relative">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                                {t('accountManager.labelBank') || 'Instituição / Banco'}
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                                className="w-full bg-slate-100 dark:bg-dark-bg rounded-2xl py-3.5 px-4 font-bold text-light-text dark:text-dark-text flex justify-between items-center transition hover:bg-slate-200/50 dark:hover:bg-dark-surface border border-transparent dark:border-white/5"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0"
                                        style={{ backgroundColor: accountForm.color || '#3B82F6' }}
                                    >
                                        {getBadgeInitials(accountForm.bankName)}
                                    </div>
                                    <span className="text-sm">{accountForm.bankName || 'Selecione ou digite o banco'}</span>
                                </div>
                                <span className="text-slate-400 text-xs">▼</span>
                            </button>

                            {isBankDropdownOpen && (
                                <div className="mt-2 bg-light-card-elevated dark:bg-dark-card border border-slate-200/60 dark:border-slate-800 p-3 rounded-2xl animate-fadeIn">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                        Bancos Populares
                                    </label>
                                    <div className="grid grid-cols-7 gap-2 justify-items-center mb-3">
                                        {POPULAR_BANKS.map(bank => {
                                            const isSelected = accountForm.bankName.toLowerCase().trim() === bank.name.toLowerCase();
                                            return (
                                                <button
                                                    key={bank.name}
                                                    type="button"
                                                    onClick={() => {
                                                        setAccountForm({
                                                            ...accountForm,
                                                            bankName: bank.name,
                                                            color: bank.color
                                                        });
                                                        setIsBankDropdownOpen(false);
                                                    }}
                                                    className={`transition-all duration-200 rounded-full p-0.5 border-2 active:scale-90 ${isSelected ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/20' : 'border-transparent opacity-85 hover:opacity-100 hover:scale-105'}`}
                                                >
                                                    {bank.logo("w-8 h-8")}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    <div className="border-t border-slate-200/50 dark:border-slate-800/80 pt-2.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                                            Ou digite outro nome
                                        </label>
                                        <input
                                            type="text"
                                            value={accountForm.bankName}
                                            onChange={e => setAccountForm({ ...accountForm, bankName: e.target.value })}
                                            placeholder="Ex: Nubank, Carteira em Mãos, Inter..."
                                            className="w-full bg-slate-100/80 dark:bg-dark-bg border-none rounded-xl py-2.5 px-3.5 font-bold text-xs text-light-text dark:text-dark-text"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Saldo */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                {t('accountManager.labelCurrentBalance') || 'Saldo Atual'}
                            </label>
                            <input
                                type="tel"
                                value={accountForm.balance}
                                onChange={e => setAccountForm({ ...accountForm, balance: formatCurrencyForInput(e.target.value) })}
                                placeholder="R$ 0,00"
                                className="w-full bg-slate-100 dark:bg-dark-bg border border-transparent dark:border-white/5 rounded-2xl py-3.5 px-4 font-bold text-emerald-500 text-base"
                            />
                        </div>

                        {/* Data Saldo Inicial se nova conta */}
                        {!editingAccountId && (
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                    Data de Início do Saldo
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsCalendarOpen(true)}
                                    className="w-full bg-slate-100 dark:bg-dark-bg border border-transparent dark:border-white/5 rounded-2xl py-3.5 px-4 font-bold text-light-text dark:text-dark-text flex justify-between items-center text-sm"
                                >
                                    <span>{new Date(accountForm.initialDate + 'T00:00:00').toLocaleDateString(appLocale)}</span>
                                    <CalendarIcon className="h-4 w-4 text-slate-400" />
                                </button>
                            </div>
                        )}

                        {/* Tipo de Conta */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                Tipo de Conta
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAccountTypePickerOpen(true);
                                    setIsBankDropdownOpen(false);
                                    setIsColorDropdownOpen(false);
                                }}
                                className="w-full bg-slate-100 dark:bg-dark-bg border border-transparent dark:border-white/5 rounded-2xl py-3.5 px-4 font-bold text-light-text dark:text-dark-text flex justify-between items-center text-sm"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="text-light-text-muted dark:text-dark-text-muted">
                                        {getAccountIcon(accountForm.accountType, "w-4 h-4")}
                                    </div>
                                    <span>{accountForm.accountType}</span>
                                </div>
                                <span className="text-slate-400 text-xs">▼</span>
                            </button>
                        </div>

                        {/* Seletor de Cor */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                Cor de Identificação
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                                className="w-full bg-slate-100 dark:bg-dark-bg rounded-2xl py-2.5 px-4 flex justify-between items-center border border-transparent dark:border-white/5"
                            >
                                <span className="text-xs font-bold text-slate-500">Personalizar cor</span>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-6 w-6 rounded-full border-2 border-white dark:border-slate-800 shadow-md"
                                        style={{ backgroundColor: accountForm.color }}
                                    />
                                    <span className="text-slate-400 text-xs">▼</span>
                                </div>
                            </button>

                            {isColorDropdownOpen && (
                                <div className="mt-2 bg-light-card-elevated dark:bg-dark-card border border-slate-200/60 dark:border-slate-800 p-3 rounded-2xl animate-fadeIn">
                                    <div className="grid grid-cols-6 gap-2 justify-items-center">
                                        {COLOR_PALETTE.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => {
                                                    setAccountForm({ ...accountForm, color: c });
                                                    setIsColorDropdownOpen(false);
                                                }}
                                                className={`h-7 w-7 rounded-full border-2 transition-transform active:scale-95 ${accountForm.color === c ? 'border-blue-500 shadow-lg scale-110' : 'border-transparent hover:scale-105'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-2">
                        <button
                            onClick={handleAccountSubmit}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs active:scale-95 transition-all shadow-md shadow-blue-500/20"
                        >
                            {editingAccountId ? 'Salvar Alterações' : 'Cadastrar Conta'}
                        </button>

                        {editingAccountId && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAccountModalOpen(false);
                                    setDeletingAccountId(editingAccountId);
                                }}
                                className="w-full py-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold uppercase tracking-wider text-xs active:scale-95 transition-all border border-rose-100 dark:border-rose-900/30 flex items-center justify-center gap-2"
                            >
                                <TrashIcon className="h-4 w-4" />
                                <span>Excluir Conta</span>
                            </button>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Modal Calendário da Conta */}
            <Modal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)}>
                <div className="text-center mb-4">
                    <h3 className="text-base font-bold text-light-text dark:text-dark-text uppercase tracking-tight">Data do Saldo Inicial</h3>
                </div>
                <Calendar
                    selectedDate={accountForm.initialDate}
                    onDateSelect={d => { setAccountForm({ ...accountForm, initialDate: d }); setIsCalendarOpen(false); }}
                    initialDisplayDate={new Date(accountForm.initialDate + 'T00:00:00')}
                />
            </Modal>

            {/* Modal de Exclusão de Conta */}
            <Modal isOpen={deletingAccountId !== null} onClose={() => setDeletingAccountId(null)} verticalAlign="popup">
                <div className="space-y-4 text-center p-1">
                    <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 mb-2">
                        <TrashIcon className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-light-text dark:text-dark-text uppercase tracking-tight">Excluir Conta?</h3>
                    <p className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium leading-relaxed">
                        Tem certeza que deseja excluir esta conta? As transações associadas a ela permanecerão no histórico.
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={() => setDeletingAccountId(null)}
                            className="w-full py-3 bg-slate-100 dark:bg-dark-bg text-light-text-secondary dark:text-dark-text-muted rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                if (deletingAccountId) {
                                    handleDeleteBankAccount(deletingAccountId);
                                    setDeletingAccountId(null);
                                }
                            }}
                            className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-500/10"
                        >
                            Excluir
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Picker Tipo de Conta */}
            <ListPickerModal
                isOpen={isAccountTypePickerOpen}
                onClose={() => setIsAccountTypePickerOpen(false)}
                title="Tipo de Conta"
                items={[
                    { id: 'Corrente', name: 'Conta Corrente', icon: <BankIcon className="h-5 w-5 text-slate-500" /> },
                    { id: 'Poupança', name: 'Poupança', icon: <PiggyBankIcon className="h-5 w-5 text-slate-500" /> },
                    { id: 'Investimento', name: 'Investimentos', icon: <TrendingUpIcon className="h-5 w-5 text-slate-500" /> },
                    { id: 'Dinheiro', name: 'Dinheiro / Carteira', icon: <WalletIcon className="h-5 w-5 text-slate-500" /> },
                    { id: 'Outros', name: 'Outros', icon: <BankIcon className="h-5 w-5 text-slate-500" /> }
                ]}
                selectedId={accountForm.accountType}
                onSelect={item => {
                    setAccountForm({ ...accountForm, accountType: item.id });
                    setIsAccountTypePickerOpen(false);
                }}
            />
        </div>
    );
};

export default CardsSettings;
