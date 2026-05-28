import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '../icons';

export const FilterModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    incomeCategories: string[];
    expenseCategories: string[];
    selectedCategories: string[];
    onApply: (categories: string[]) => void;
}> = ({ isOpen, onClose, incomeCategories, expenseCategories, selectedCategories, onApply }) => {
    const [localSelection, setLocalSelection] = useState<string[]>(selectedCategories);

    useEffect(() => {
        if (isOpen) {
            setLocalSelection(selectedCategories);
        }
    }, [isOpen, selectedCategories]);

    if (!isOpen) return null;

    const toggleCategory = (type: 'entrada' | 'saida', cat: string) => {
        const id = `${type}:${cat}`;
        setLocalSelection(prev => 
            prev.includes(id) 
                ? prev.filter(c => c !== id) 
                : [...prev, id]
        );
    };

    const handleClear = () => {
        setLocalSelection([]);
    };

    const handleApply = () => {
        onApply(localSelection);
        onClose();
    };

    const renderCategoryButton = (type: 'entrada' | 'saida', cat: string) => {
        const id = `${type}:${cat}`;
        const isSelected = localSelection.includes(id);
        const activeClass = 'bg-light-accent border-light-accent text-white shadow-md shadow-light-accent/20';
        const inactiveClass = 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-light-accent dark:hover:border-dark-accent';

        return (
            <button
                key={id}
                onClick={() => toggleCategory(type, cat)}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold border transition-all duration-200 flex items-center justify-center text-center ${
                    isSelected ? activeClass : inactiveClass
                }`}
            >
                {cat}
            </button>
        );
    };

    const modalContent = (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
            <div 
                className="bg-white dark:bg-dark-surface w-full max-w-[340px] rounded-[32px] shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tighter">Filtrar</h3>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mt-0.5">Por Categorias</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors active:scale-90">
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="overflow-y-auto p-6 flex-grow space-y-8 no-scrollbar">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-[0.2em]">Receitas</h4>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                            {incomeCategories.map(cat => renderCategoryButton('entrada', cat))}
                            {incomeCategories.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-400 italic font-semibold">Nenhuma categoria.</p>}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></span>
                            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-[0.2em]">Despesas</h4>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                            {expenseCategories.map(cat => renderCategoryButton('saida', cat))}
                            {expenseCategories.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-400 italic font-semibold">Nenhuma categoria.</p>}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-dark-bg/50 flex gap-3 flex-shrink-0">
                    <button 
                        onClick={handleClear}
                        className="flex-1 px-4 py-3.5 rounded-2xl text-slate-500 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest active:bg-slate-200 dark:active:bg-slate-700 transition-colors"
                    >
                        Limpar
                    </button>
                    <button 
                        onClick={handleApply}
                        className="flex-[2] px-4 py-3.5 rounded-2xl bg-light-accent text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-light-accent/20 active:scale-95 transition-all"
                    >
                        Aplicar {localSelection.length > 0 ? `(${localSelection.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
    return createPortal(modalContent, document.body);
};