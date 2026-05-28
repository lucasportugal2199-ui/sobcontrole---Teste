import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import {
    ArrowLeftIcon, PlusIcon, InformationCircleIcon,
    ShieldCheckIcon, TrashIcon, EditIcon, CalendarIcon
} from './icons';
import { formatCurrency, parseCurrency, formatCurrencyForInput, calculateAccountBalance } from '../utils/helpers';
import Modal from './Modal';
import Calendar from './Calendar';
import { COLOR_PALETTE } from '../constants';
import { BankLogoSVG, POPULAR_BANKS, getBankLogo } from './BankLogo';

interface AccountManagerProps {
    title?: string;
}

const AccountManager: React.FC<AccountManagerProps> = ({ title = "Minhas Contas" }) => {
    const context = useContext(AppContext);
    if (!context) throw new Error("AccountManager missing AppContext");

    const {
        userProfile, accounts, allTransactions, currentDate,
        handleCreateBankAccount, handleUpdateBankAccount, handleDeleteBankAccount,
        setCurrentView, handleLancamentoSubmit, showToast
    } = context;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    const [form, setForm] = useState({
        bankName: '',
        balance: '',
        initialDate: new Date().toISOString().split('T')[0],
        accountType: 'Corrente',
        color: COLOR_PALETTE[0]
    });
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
    const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);

    const openModal = (acc?: any) => {
        setIsBankDropdownOpen(false);
        setIsColorDropdownOpen(false);
        if (acc) {
            setEditingAccountId(acc.id);
            const dynamicBalance = calculateAccountBalance(acc.id, allTransactions);
            setForm({
                bankName: acc.bankName,
                balance: formatCurrencyForInput(dynamicBalance.toFixed(2)),
                initialDate: acc.initialDate || new Date().toISOString().split('T')[0],
                accountType: acc.accountType,
                color: acc.color
            });
        } else {
            setEditingAccountId(null);
            setForm({
                bankName: '',
                balance: '',
                initialDate: new Date().toISOString().split('T')[0],
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
            const currentBalance = calculateAccountBalance(editingAccountId, allTransactions);
            const targetBalance = parseCurrency(form.balance);
            const difference = targetBalance - currentBalance;
            
            if (Math.abs(difference) > 0.01 && handleLancamentoSubmit) {
                const f = {
                    valor: Math.abs(difference),
                    tipo: difference > 0 ? 'entrada' : 'saida',
                    categoria: difference > 0 ? 'Investimentos' : 'Outros',
                    paymentMethod: 'debito',
                    accountId: editingAccountId,
                    descricao: `Ajuste de Saldo: ${form.bankName}`,
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
        <div className="bg-slate-50 dark:bg-dark-bg h-full flex flex-col overflow-hidden text-slate-900 dark:text-white">
            <header className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top))]">
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentView('menu')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-dark-surface transition">
                        <ArrowLeftIcon className="h-6 w-6 " />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tighter uppercase">{title}</h1>
                        <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Saldo Total: {formatCurrency(accounts.reduce((acc, curr) => acc + calculateAccountBalance(curr.id, allTransactions, currentDate), 0))}</span>
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
                    <div className="space-y-3">
                        {accounts.map(acc => (
                            <div key={acc.id} className="bg-white dark:bg-dark-surface p-5 rounded-[32px] border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    {getBankLogo(acc.bankName, "w-12 h-12 rounded-2xl shadow-inner") || (
                                        <div
                                            className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl text-white font-black shadow-inner"
                                            style={{ backgroundColor: acc.color }}
                                        >
                                            {acc.bankName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-black tracking-tight">{acc.bankName}</p>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{acc.accountType}</p>
                                        <p className="text-sm font-black text-emerald-500 mt-0.5">{formatCurrency(calculateAccountBalance(acc.id, allTransactions, currentDate))}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openModal(acc)}
                                        className="p-2 text-slate-400 hover:text-light-accent transition-colors"
                                    >
                                        <EditIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteBankAccount(acc.id)}
                                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center px-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px] opacity-50">
                        <InformationCircleIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                        <h2 className="text-lg font-black uppercase tracking-tighter mb-2">Sem contas registradas</h2>
                        <p className="text-sm font-bold text-slate-500 leading-snug">Adicione suas contas bancárias ou carteiras para ver seu saldo unificado.</p>
                    </div>
                )}

                <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 p-5 rounded-[32px] flex items-start gap-4">
                    <div className="p-2 bg-teal-100 dark:bg-teal-900/40 rounded-xl mt-1">
                        <ShieldCheckIcon className="h-5 w-5 text-light-accent dark:text-dark-accent" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-light-accent dark:text-dark-accent uppercase tracking-widest">Saldo Centralizado</p>
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                            O saldo total exibido aqui é a soma de todas as suas contas. Conforme você cadastra novas despesas ou receitas e vincula a uma conta, o valor é atualizado automaticamente.
                        </p>
                    </div>
                </div>
            </main>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="space-y-6">
                    <h2 className="text-xl font-black uppercase tracking-tighter">
                        {editingAccountId ? 'Editar Conta' : 'Nova Conta'}
                    </h2>

                    <div className="space-y-4">
                        {/* Seletor de Banco Premium e Colapsável */}
                        <div className="relative">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Instituição / Banco</label>
                            <button
                                type="button"
                                onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                                className="w-full bg-slate-100 dark:bg-dark-bg rounded-2xl py-4 px-5 font-bold text-slate-900 dark:text-white flex justify-between items-center transition hover:bg-slate-200/50 dark:hover:bg-dark-surface"
                            >
                                <div className="flex items-center gap-3">
                                    {getBankLogo(form.bankName, "w-6 h-6 rounded-full shadow-inner") || (
                                        <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                            🏦
                                        </div>
                                    )}
                                    <span>{form.bankName || "Selecionar seu Banco..."}</span>
                                </div>
                                <svg className={`h-4 w-4 text-slate-400 transition-transform ${isBankDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                            </button>

                            {isBankDropdownOpen && (
                                <div className="mt-2 bg-slate-50 dark:bg-dark-surface border border-slate-200/60 dark:border-slate-800 p-3 rounded-2xl animate-fadeIn">
                                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-2 block ml-1">Bancos Principais</label>
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
                                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Ou digite outro nome:</label>
                                        <input
                                            type="text"
                                            value={form.bankName}
                                            onChange={e => setForm({ ...form, bankName: e.target.value })}
                                            placeholder="Ex: Minha Carteira, Outro Banco..."
                                            className="w-full bg-slate-100/80 dark:bg-dark-bg border-none rounded-xl py-3 px-4 font-bold text-sm text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Saldo Atual</label>
                            <input
                                type="tel"
                                value={form.balance}
                                onChange={e => setForm({ ...form, balance: formatCurrencyForInput(e.target.value) })}
                                placeholder="R$ 0,00"
                                className="w-full bg-slate-100 dark:bg-dark-bg border-none rounded-2xl py-4 px-5 font-bold text-emerald-500"
                            />
                        </div>

                        {!editingAccountId && (
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Data do Saldo Inicial</label>
                                <button
                                    type="button"
                                    onClick={() => setIsCalendarOpen(true)}
                                    className="w-full bg-slate-100 dark:bg-dark-bg border-none rounded-2xl py-4 px-5 font-bold text-slate-900 dark:text-white flex justify-between items-center"
                                >
                                    <span>{new Date(form.initialDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                    <CalendarIcon className="h-4 w-4 text-slate-400" />
                                </button>
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Tipo de Conta</label>
                            <select
                                value={form.accountType}
                                onChange={e => setForm({ ...form, accountType: e.target.value })}
                                className="w-full bg-slate-100 dark:bg-dark-bg border-none rounded-2xl py-4 px-5 font-bold text-slate-900 dark:text-white appearance-none"
                            >
                                <option value="Corrente">Conta Corrente</option>
                                <option value="Poupança">Poupança</option>
                                <option value="Investimento">Investimento</option>
                                <option value="Dinheiro">Dinheiro Físico</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>

                        {/* Seletor de Cor Expansível */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Cor da Conta</label>
                            <button
                                type="button"
                                onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                                className="w-full bg-slate-100 dark:bg-dark-bg rounded-2xl py-3 px-5 flex justify-between items-center transition hover:bg-slate-200/50 dark:hover:bg-dark-surface"
                            >
                                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Personalizar Cor</span>
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
                                <div className="mt-2 bg-slate-50 dark:bg-dark-surface border border-slate-200/60 dark:border-slate-800 p-3 rounded-2xl animate-fadeIn">
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

                    <button
                        onClick={handleSubmit}
                        className="w-full py-4 bg-light-accent text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-light-accent/30 active:scale-95 transition-all"
                    >
                        Salvar Conta
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)}>
                <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Data do Saldo Inicial</h3>
                </div>
                <Calendar
                    selectedDate={form.initialDate}
                    onDateSelect={d => { setForm({ ...form, initialDate: d }); setIsCalendarOpen(false); }}
                    initialDisplayDate={new Date(form.initialDate + 'T00:00:00')}
                />
            </Modal>
        </div>
    );
};

export default AccountManager;
