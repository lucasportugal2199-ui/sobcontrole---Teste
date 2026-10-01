import React, { useContext } from 'react';
import { PlusIcon, HomeIcon, ClipboardListIcon, ChartBarIcon, CalendarIcon, TargetIcon } from './icons';
import { AppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';

const NavItem: React.FC<{
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
    id?: string;
}> = ({ label, icon: Icon, isActive, onClick, id }) => (
    <button
        id={id}
        onClick={onClick}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
        className="flex flex-col items-center justify-center w-full h-full transition-all duration-200 focus:outline-none active:scale-90 group"
    >
        <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-brand-accent-light-subtle dark:bg-brand-accent-dark-subtle' : ''}`}>
            <Icon className={`h-5 w-5 transition-colors duration-300 ${isActive ? 'text-brand-accent dark:text-brand-accent-hover' : 'text-slate-400 dark:text-[#666666]'}`} />
        </div>
        <span className={`text-[10px] font-bold transition-colors duration-300 mt-0.5 ${isActive ? 'text-brand-accent dark:text-brand-accent-hover' : 'text-slate-500 dark:text-[#8a8a8a]'}`}>{label}</span>
    </button>
);

/**
 * Barra de navegação: 5 abas (a tela inicial agora tem a própria aba) e o
 * botão "+" flutuante, que só cria lançamentos — de qualquer aba, sem trocar
 * de tela. Antes o "+" central também servia de "voltar ao início".
 */
const BottomNav: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("BottomNav must be used within an AppProvider");

    const { currentTab, setCurrentTab, setCurrentView, setIsNewTransactionOpen, setNewTransactionInitialType } = context;
    const { t } = useTranslation();

    const goTo = (tab: typeof currentTab) => {
        setCurrentView('main');
        setCurrentTab(tab);
    };

    const handleNewTransaction = (e: React.MouseEvent) => {
        e.preventDefault();
        setNewTransactionInitialType('saida');
        setIsNewTransactionOpen(true);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-[100] pb-[var(--sab)] px-3 pb-2">
            {/* Botão de novo lançamento (flutuante, acima da barra) */}
            <button
                id="tour-home"
                onClick={handleNewTransaction}
                className="group absolute right-5 -top-[68px] flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-accent hover:bg-brand-accent-hover text-white shadow-[0_6px_24px_rgba(234,88,12,0.45)] active:scale-90 transition-all duration-300"
                aria-label={t('nav.newTransaction')}
                title={t('nav.newTransaction')}
            >
                <PlusIcon className="h-7 w-7 flex-shrink-0 transition-transform duration-300 group-active:rotate-90" />
            </button>

            {/* Barra flutuante */}
            <nav
                aria-label={t('nav.menu')}
                className="floating-nav bg-white/95 dark:bg-[#111111]/95 backdrop-blur-xl border border-light-border dark:border-dark-border rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
            >
                <div className="grid grid-cols-5 items-center h-16 px-1">
                    <NavItem id="tour-inicio" label={t('nav.home')} icon={HomeIcon} isActive={currentTab === 'lancamento'} onClick={() => goTo('lancamento')} />
                    <NavItem label={t('nav.transactions')} icon={ClipboardListIcon} isActive={currentTab === 'transacoes'} onClick={() => goTo('transacoes')} />
                    <NavItem label={t('nav.finances')} icon={ChartBarIcon} isActive={currentTab === 'financas'} onClick={() => goTo('financas')} />
                    <NavItem id="tour-metas" label={t('nav.goals')} icon={TargetIcon} isActive={currentTab === 'metas'} onClick={() => goTo('metas')} />
                    <NavItem id="tour-horizonte-btn" label={t('nav.future')} icon={CalendarIcon} isActive={currentTab === 'horizonte'} onClick={() => goTo('horizonte')} />
                </div>
            </nav>
        </div>
    );
};

export { BottomNav };
export default BottomNav;
