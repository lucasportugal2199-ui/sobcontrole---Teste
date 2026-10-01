import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import {
    ArrowLeftIcon, PlusIcon, InformationCircleIcon,
    ShieldCheckIcon, TrashIcon, EditIcon, CalendarIcon,
    BankIcon, PiggyBankIcon, WalletIcon, TrendingUpIcon, ChevronRightIcon
} from './icons';
import { formatCurrency, parseCurrency, formatCurrencyForInput, calculateAccountBalance, getSaldoLimitDate, formatDateToInput } from '../utils/helpers';
import Modal from './Modal';
import Calendar from './Calendar';
import ListPickerModal from './ListPickerModal';
import { COLOR_PALETTE } from '../constants';
import { BankLogoSVG, POPULAR_BANKS, getBankLogo } from './BankLogo';

interface AccountManagerProps {
    title?: string;
}

const getAccountIcon = (type: string, className = "h-6 w-6") => {
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

const AccountManager: React.FC<AccountManagerProps> = ({ title }) => {
    const context = useContext(AppContext);
    if (!context) throw new Error("AccountManager missing AppContext");

    const {
        userProfile, accounts, allTransactions, currentDate,
        handleCreateBankAccount, handleUpdateBankAccount, handleDeleteBankAccount,
        setCurrentView, goBackView, handleLancamentoSubmit, showToast
    } = context;

    const { t, locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';
    const displayTitle = title || t('accountManager.title');

    const getAccountTypeLabel = (type: string) => {
        const keyMap: { [key: string]: string } = {
            'corrente': 'accountManager.type.corrente',
            'poupança': 'accountManager.type.poupanca',
            'poupanca': 'accountManager.type.poupanca',
            'investimento': 'accountManager.type.investimento',
            'dinheiro': 'accountManager.type.dinheiro',
            'outros': 'accountManager.type.outros'
        };
        const key = keyMap[type.toLowerCase()];
        return key ? t(key) : type;
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
    const [form, setForm] = useState({
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

    const openModal = (acc?: any) => {
        setIsBankDropdownOpen(false);
        setIsColorDropdownOpen(false);
        setIsAccountTypePickerOpen(false);
        if (acc) {
            setEditingAccountId(acc.id);
            const dynamicBalance = calculateAccountBalance(acc.id, allTransactions, new Date());
            setForm({
                bankName: acc.bankName,
                balance: formatCurrencyForInput(dynamicBalance.toFixed(2)),
                initialDate: acc.initialDate || formatDateToInput(new Date()),
                accountType: acc.accountType,
                color: acc.color
            });
        } else {
            setEditingAccountId(null);
            setForm({
                bankName: '',
                balance: '',
                initialDate: formatDateToInput(new Date()),
                accountType: 'Corrente',
                color: COLOR_PALETTE[0]
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = () => {
        if (!form.bankName || !form.balance) return;

        const accountData = {
            bankName: form.bankName,
            balance: parseCurrency(form.balance),
            initialDate: form.initialDate,
            accountType: form.accountType,
            color: form.color,
            lastSync: new Date().toISOString()
        };

        if (editingAccountId) {
            handleUpdateBankAccount(editingAccountId, accountData);
            
            // Adjust balance dynamically
            const currentBalance = calculateAccountBalance(editingAccountId, allTransactions, new Date());
            const targetBalance = parseCurrency(form.balance);
            const difference = targetBalance - currentBalance;
            
            if (Math.abs(difference) > 0.01 && handleLancamentoSubmit) {
                const f = {
                    valor: Math.abs(difference),
                    tipo: difference > 0 ? 'entrada' : 'saida',
                    categoria: difference > 0 ? 'Investimentos' : 'Outros',
                    paymentMethod: 'debito',
                    accountId: editingAccountId,
                    descricao: `${t('accountManager.balanceAdjustment')}: ${form.bankName}`,
                    data: new Date().toISOString().split('T')[0],
                    isRecurring: false,
                    isInstallment: false
                };
                handleLancamentoSubmit({ preventDefault: () => {} } as any, f);
            }
        } else {
            handleCreateBankAccount(accountData);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="bg-light-card-elevated dark:bg-dark-bg h-full flex flex-col overflow-hidden text-light-text dark:text-dark-text">
            <header className="p-4 border-b border-light-border dark:border-dark-elevated bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between pt-[calc(1rem+var(--sat))]">
                <div className="flex items-center gap-4">
                    <button onClick={goBackView} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-dark-surface transition">
                        <ArrowLeftIcon className="h-6 w-6 " />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tighter uppercase">{displayTitle}</h1>
                        {(() => {
                            const totalAccountsBalance = accounts.reduce((acc, curr) => acc + calculateAccountBalance(curr.id, allTransactions, getSaldoLimitDate(currentDate)), 0);
                            return (
                                <span className={`text-[10px] font-black uppercase tracking-widest ${totalAccountsBalance < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {t('accountManager.totalBalance')}: {formatCurrency(totalAccountsBalance, appLocale, appCurrency)}
                                </span>
                            );
                        })()}
                    </div>
                </div>
                <button
                    onClick={() => openModal()}
                    className="p-2 bg-light-accent text-white rounded-full shadow-lg shadow-light-accent/20 active:scale-95 transition-all"
                >
                    <PlusIcon className="h-5 w-5" />
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-24">
                {accounts.length > 0 ? (
                    <div className="divide-y divide-light-border dark:divide-dark-elevated">
                        {accounts.map(acc => {
                            const accBal = calculateAccountBalance(acc.id, allTransactions, getSaldoLimitDate(currentDate));
                            return (
                                <div 
                                    key={acc.id} 
                                    onClick={() => openModal(acc)}
                                    className="flex items-center justify-between py-4 active:opacity-75 cursor-pointer transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        {getBankLogo(acc.bankName, "w-6 h-6 rounded-lg flex-shrink-0 overflow-hidden") || (
                                            <div style={{ color: acc.color }}>
                                                {getAccountIcon(acc.accountType, "h-6 w-6 flex-shrink-0")}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-base text-light-text dark:text-dark-text">{acc.bankName}</p>
                                            <p className="text-[10px] font-bold text-light-text-muted dark:text-dark-text-muted uppercase tracking-widest">{getAccountTypeLabel(acc.accountType)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <span className={`font-bold text-base ${accBal < 0 ? 'text-rose-500' : 'text-light-text dark:text-dark-text'}`}>
                                            {formatCurrency(accBal, appLocale, appCurrency)}
                                        </span>
                                        <ChevronRightIcon className="h-4 w-4 text-slate-400 dark:text-slate-600 flex-shrink-0" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-20 text-center px-8 border-2 border-dashed border-light-border dark:border-dark-elevated rounded-[40px] opacity-50">
                        <InformationCircleIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                        <h2 className="text-lg font-black uppercase tracking-tighter mb-2">{t('accountManager.noAccountsRegistered')}</h2>
                        <p className="text-sm font-bold text-slate-500 leading-snug">{t('accountManager.noAccountsDesc')}</p>
                    </div>
                )}

                <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 p-5 rounded-[32px] flex items-start gap-4">
                    <div className="p-2 bg-teal-100 dark:bg-teal-900/40 rounded-xl mt-1">
                        <ShieldCheckIcon className="h-5 w-5 text-light-accent dark:text-[#3B82F6]" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-light-accent dark:text-[#3B82F6] uppercase tracking-widest">{t('accountManager.centralizedBalance')}</p>
                        <p className="text-[11px] font-bold text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                            {t('accountManager.centralizedBalanceDesc')}
                        </p>
                    </div>
                </div>
            </main>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="space-y-6">
                    <h2 className="text-xl font-black uppercase tracking-tighter">
                        {editingAccountId ? t('accountManager.editAccount') : t('accountManager.newAccount')}
                    </h2>

                    <div className="space-y-4">
                        {/* Seletor de Banco Premium e Colapsável */}
                        <div className="relative">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{t('accountManager.labelBank')}</label>
                            <button
                                type="button"
                                onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                                className="w-full bg-slate-100 dark:bg-dark-bg rounded-2xl py-4 px-5 font-bold text-light-text dark:text-dark-text flex justify-between items-center transition hover:bg-slate-200/50 dark:hover:bg-dark-surface"
                            >
                                <div className="flex items-center gap-3">
                                    {getBankLogo(form.bankName, "w-6 h-6 rounded-full shadow-inner") || (
                                        <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-light-text-muted dark:text-dark-text-muted">
                                            🏦
                                        </div>
                                    )}
                                    <span>{form.bankName || t('accountManager.selectBank')}</span>
                                </div>
                                <svg className={`h-4 w-4 text-slate-400 transition-transform ${isBankDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                            </button>

                            {isBankDropdownOpen && (
                                <div className="mt-2 bg-light-card-elevated dark:bg-dark-card border border-slate-200/60 dark:border-slate-800 p-3 rounded-2xl animate-fadeIn">
                                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-2 block ml-1">{t('accountManager.labelPopularBanks')}</label>
                                    <div className="grid grid-cols-7 gap-2 justify-items-center">
                                        {POPULAR_BANKS.map(bank => {
                                            const isSelected = form.bankName.toLowerCase().trim() === bank.name.toLowerCase();
                                            return (
                                                <button
                                                    key={bank.name}
                                                    type="button"
                                                    onClick={() => {
                                                        setForm({
                                                            ...form,
                                                            bankName: bank.name,
                                                            color: bank.color
                                                        });
                                                        setIsBankDropdownOpen(false); // fecha o dropdown ao selecionar!
                                                    }}
                                                    className={`transition-all duration-200 rounded-full p-0.5 border-2 active:scale-90 ${isSelected ? 'border-light-accent scale-105 shadow-md shadow-light-accent/10' : 'border-transparent opacity-85 hover:opacity-100 hover:scale-105'}`}
                                                >
                                                    {bank.logo("w-9 h-9")}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Campo de texto livre caso não queira usar um banco popular ou queira personalizar o nome */}
                                    <div className="mt-3 border-t border-slate-200/50 dark:border-slate-800/80 pt-3">
                                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{t('accountManager.orTypeAnotherName')}</label>
                                        <input
                                            type="text"
                                            value={form.bankName}
                                            onChange={e => setForm({ ...form, bankName: e.target.value })}
                                            placeholder={t('accountManager.placeholderBank')}
                                            className="w-full bg-slate-100/80 dark:bg-dark-bg border-none rounded-xl py-3 px-4 font-bold text-sm text-light-text dark:text-dark-text"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">{t('accountManager.labelCurrentBalance')}</label>
                            <input
                                type="tel"
                                value={form.balance}
                                onChange={e => setForm({ ...form, balance: formatCurrencyForInput(e.target.value) })}
                                placeholder={t('accountManager.placeholderBalance')}
                                className="w-full bg-slate-100 dark:bg-dark-bg border-none rounded-2xl py-4 px-5 font-bold text-emerald-500"
                            />
                        </div>

                        {!editingAccountId && (
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">{t('accountManager.labelInitialBalanceDate')}</label>
                                <button
                                    type="button"
                                    onClick={() => setIsCalendarOpen(true)}
                                    className="w-full bg-slate-100 dark:bg-dark-bg border-none rounded-2xl py-4 px-5 font-bold text-light-text dark:text-dark-text flex justify-between items-center"
                                >
                                    <span>{new Date(form.initialDate + 'T00:00:00').toLocaleDateString(appLocale)}</span>
                                    <CalendarIcon className="h-4 w-4 text-slate-400" />
                                </button>
                            </div>
                        )}

                        {/* Seletor de Tipo de Conta */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{t('accountManager.labelAccountType')}</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAccountTypePickerOpen(true);
                                    setIsBankDropdownOpen(false);
                                    setIsColorDropdownOpen(false);
                                }}
                                className="w-full bg-slate-100 dark:bg-dark-bg border-none rounded-2xl py-4 px-5 font-bold text-light-text dark:text-dark-text flex justify-between items-center transition hover:bg-slate-200/50 dark:hover:bg-dark-surface"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-light-text-muted dark:text-dark-text-muted">
                                        {getAccountIcon(form.accountType, "w-5 h-5")}
                                    </div>
                                    <span>
                                        {form.accountType === 'Corrente' ? t('accountManager.type.corrente') :
                                         form.accountType === 'Poupança' ? t('accountManager.type.poupanca') :
                                         form.accountType === 'Investimento' ? t('accountManager.type.investimento') :
                                         form.accountType === 'Dinheiro' ? t('accountManager.type.dinheiro') : t('accountManager.type.outros')}
                                    </span>
                                </div>
                                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                            </button>
                        </div>

                        {/* Seletor de Cor Expansível */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{t('accountManager.labelAccountColor')}</label>
                            <button
                                type="button"
                                onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                                className="w-full bg-slate-100 dark:bg-dark-bg rounded-2xl py-3 px-5 flex justify-between items-center transition hover:bg-slate-200/50 dark:hover:bg-dark-surface"
                            >
                                <span className="text-sm font-bold text-light-text-muted dark:text-dark-text-muted">{t('accountManager.customizeColor')}</span>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-7 w-7 rounded-full border-2 border-white dark:border-slate-800 shadow-md"
                                        style={{ backgroundColor: form.color }}
                                    />
                                    <svg className={`h-4 w-4 text-slate-400 transition-transform ${isColorDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
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
                                                    setForm({ ...form, color: c });
                                                    setIsColorDropdownOpen(false); // fecha ao selecionar!
                                                }}
                                                className={`h-8 w-8 rounded-full border-2 transition-transform active:scale-95 ${form.color === c ? 'border-light-accent shadow-lg scale-110' : 'border-transparent hover:scale-105'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleSubmit}
                            className="w-full py-3 bg-teal-600 dark:bg-teal-700 text-white rounded-xl font-bold uppercase tracking-widest active:scale-95 transition-all shadow-md hover:bg-teal-700 dark:hover:bg-teal-600"
                        >
                            {editingAccountId ? t('accountManager.saveChanges') : t('accountManager.saveAccount')}
                        </button>

                        {editingAccountId && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setDeletingAccountId(editingAccountId);
                                }}
                                className="w-full py-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all border border-rose-100 dark:border-rose-900/30 flex items-center justify-center gap-2"
                            >
                                <TrashIcon className="h-4 w-4" />
                                <span>{t('accountManager.deleteAccount')}</span>
                            </button>
                        )}
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)}>
                <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-light-text dark:text-dark-text uppercase tracking-tight">{t('accountManager.labelInitialBalanceDate')}</h3>
                </div>
                <Calendar
                    selectedDate={form.initialDate}
                    onDateSelect={d => { setForm({ ...form, initialDate: d }); setIsCalendarOpen(false); }}
                    initialDisplayDate={new Date(form.initialDate + 'T00:00:00')}
                />
            </Modal>

            <Modal isOpen={deletingAccountId !== null} onClose={() => setDeletingAccountId(null)} verticalAlign="popup">
                <div className="space-y-4 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 mb-2">
                        <TrashIcon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-light-text dark:text-dark-text uppercase tracking-tight">{t('accountManager.confirmDeleteTitle')}</h3>
                    <p className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium leading-relaxed">
                        {t('accountManager.confirmDeleteDesc')}
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={() => setDeletingAccountId(null)}
                            className="w-full py-3 bg-slate-100 dark:bg-dark-bg text-light-text-secondary dark:text-dark-text-muted rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                        >
                            {t('common.cancel')}
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
                            {t('common.delete') || 'Excluir'}
                        </button>
                    </div>
                </div>
            </Modal>

            <ListPickerModal
                isOpen={isAccountTypePickerOpen}
                onClose={() => setIsAccountTypePickerOpen(false)}
                title={t('accountManager.labelAccountType')}
                items={[
                    { id: 'Corrente', name: t('accountManager.type.corrente'), icon: <BankIcon className="h-5 w-5 text-slate-500" /> },
                    { id: 'Poupança', name: t('accountManager.type.poupanca'), icon: <PiggyBankIcon className="h-5 w-5 text-slate-500" /> },
                    { id: 'Investimento', name: t('accountManager.type.investimento'), icon: <TrendingUpIcon className="h-5 w-5 text-slate-500" /> },
                    { id: 'Dinheiro', name: t('accountManager.type.dinheiro'), icon: <WalletIcon className="h-5 w-5 text-slate-500" /> },
                    { id: 'Outros', name: t('accountManager.type.outros'), icon: <BankIcon className="h-5 w-5 text-slate-500" /> }
                ]}
                selectedId={form.accountType}
                onSelect={item => {
                    setForm({ ...form, accountType: item.id });
                    setIsAccountTypePickerOpen(false);
                }}
            />
        </div>
    );
};

export default AccountManager;
