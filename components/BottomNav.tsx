import React, { useContext } from 'react';
import { PlusIcon, ClipboardListIcon, ChartBarIcon, CalendarIcon, TargetIcon, SparklesIcon } from './icons';
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
        className="flex flex-col items-center justify-center w-full h-full transition-all duration-200 focus:outline-none active:scale-90 group"
    >
        <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#FFEDD5] dark:bg-[#431407]' : ''}`}>
            <Icon className={`h-5 w-5 transition-colors duration-300 ${isActive ? 'text-[#EA580C] dark:text-[#F97316]' : 'text-slate-400 dark:text-[#666666]'}`} />
        </div>
        <span className={`text-[9px] font-black uppercase tracking-tighter transition-colors duration-300 mt-0.5 ${isActive ? 'text-[#EA580C] dark:text-[#F97316]' : 'text-slate-400 dark:text-[#666666]'}`}>{label}</span>
    </button>
);

const BottomNav: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("BottomNav must be used within an AppProvider");

    const { currentTab, setCurrentTab, setCurrentView, setIsTransactionMenuOpen, setCurrentDate, setIsNewTransactionOpen, setNewTransactionInitialType, userProfile } = context;
    const { t } = useTranslation();

    const handleCenterClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (currentTab === 'lancamento') {
            // Já está na planilha diária → abre a tela de nova transação diretamente com o tipo padrão 'saida'
            setNewTransactionInitialType('saida');
            setIsNewTransactionOpen(true);
        } else {
            // Fora da planilha → volta para planilha e centraliza no dia atual
            setCurrentView('main');
            setCurrentDate(new Date());
            setCurrentTab('lancamento');
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-[100] pb-[var(--sab)] px-3 pb-2">
            {/* Floating pill navigation */}
            <div className="floating-nav bg-white/95 dark:bg-[#111111]/95 backdrop-blur-xl border border-[#D7E0EB] dark:border-[#1F1F1F] rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
                <div className="grid grid-cols-5 items-center h-16 px-1">
                    <NavItem id="tour-metas" label={t('nav.goals')} icon={TargetIcon} isActive={currentTab === 'metas'} onClick={() => setCurrentTab('metas')} />
                    <NavItem label={t('nav.transactions')} icon={ClipboardListIcon} isActive={currentTab === 'transacoes'} onClick={() => setCurrentTab('transacoes')} />

                    {/* Botão Central — Acento Principal da Marca */}
                    <div className="flex items-center justify-center h-full">
                        <button
                            id="tour-home"
                            onClick={handleCenterClick}
                            className="group flex items-center justify-center h-12 w-12 rounded-2xl bg-[#EA580C] hover:bg-[#F97316] text-white shadow-[0_4px_20px_rgba(234,88,12,0.35)] active:scale-90 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
                            aria-label={t('nav.newTransaction')}
                        >
                            <PlusIcon className="h-6 w-6 flex-shrink-0 transition-transform duration-300 group-active:rotate-90 group-hover:rotate-45" />
                        </button>
                    </div>

                    <NavItem label={t('nav.finances')} icon={ChartBarIcon} isActive={currentTab === 'financas'} onClick={() => setCurrentTab('financas')} />
                    <NavItem id="tour-horizonte-btn" label={t('nav.future')} icon={CalendarIcon} isActive={currentTab === 'horizonte'} onClick={() => { setCurrentView('main'); setCurrentTab('horizonte'); }} />
                </div>
            </div>
        </div>
    );
};

export { BottomNav };
export default BottomNav;
