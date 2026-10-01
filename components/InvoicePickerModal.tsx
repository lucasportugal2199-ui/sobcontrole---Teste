import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon } from './icons';
import { MESES_NOMES } from '../constants';

interface InvoicePickerItem {
    id: string;   // YYYY-MM
    name: string; // Ex: Janeiro 2024
}

interface InvoicePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedId: string; // YYYY-MM
    onSelect: (item: InvoicePickerItem) => void;
}

const InvoicePickerModal: React.FC<InvoicePickerModalProps> = ({
    isOpen,
    onClose,
    selectedId,
    onSelect
}) => {
    // Extrai o ano atual da seleção, ou usa o ano corrido
    const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

    // Sincroniza o ano correntemente selecionado ao abrir
    useEffect(() => {
        if (isOpen && selectedId) {
            const [year] = selectedId.split('-');
            if (year) {
                setCurrentYear(parseInt(year, 10));
            }
        }
    }, [isOpen, selectedId]);

    const handlePrevYear = () => setCurrentYear(prev => prev - 1);
    const handleNextYear = () => setCurrentYear(prev => prev + 1);

    const handleMonthSelect = (monthIndex: number) => {
        const monthString = String(monthIndex + 1).padStart(2, '0');
        const newId = `${currentYear}-${monthString}`;
        const newName = `${MESES_NOMES[monthIndex]} ${currentYear}`;

        onSelect({ id: newId, name: newName });
        setTimeout(onClose, 180);
    };

    // Helper to generate a list of months for the current year, similar to the original structure
    const generateMonthsForDisplay = () => {
        return MESES_NOMES.map((name, index) => {
            const monthString = String(index + 1).padStart(2, '0');
            return {
                id: `${currentYear}-${monthString}`,
                name: `${name} ${currentYear}`,
                monthIndex: index,
                shortName: name.substring(0, 3)
            };
        });
    };

    const months = generateMonthsForDisplay(); // Define months array

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col max-h-[70vh]">
                <header className="mb-6">
                    <h3 className="text-lg font-black text-light-text dark:text-dark-text uppercase tracking-tighter">Mês da Fatura</h3>
                </header>

                {/* Cabeçalho do Ano */}
                <div className="flex items-center justify-between mb-6 bg-light-card-elevated dark:bg-dark-card p-2 rounded-2xl border border-light-border dark:border-dark-elevated">
                    <button
                        onClick={handlePrevYear}
                        className="p-3 text-slate-500 hover:text-light-accent dark:text-slate-300 dark:hover:text-[#3B82F6] active:scale-90 transition-all rounded-xl"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <span className="text-xl font-black text-light-text dark:text-dark-text-secondary">
                        {currentYear}
                    </span>
                    <button
                        onClick={handleNextYear}
                        className="p-3 text-slate-500 hover:text-light-accent dark:text-slate-300 dark:hover:text-[#3B82F6] active:scale-90 transition-all rounded-xl"
                    >
                        <ArrowRightIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Grade de Meses */}
                <div className="grid grid-cols-3 gap-3">
                    {MESES_NOMES.map((nomeMes, index) => {
                        const monthString = String(index + 1).padStart(2, '0');
                        const isSelected = selectedId === `${currentYear}-${monthString}`;

                        return (
                            <button
                                key={index}
                                onClick={() => handleMonthSelect(index)}
                                className={`
                                    py-4 px-2 rounded-2xl text-center transition-all cursor-pointer font-bold text-sm
                                    ${isSelected
                                        ? 'bg-light-accent text-white shadow-lg shadow-light-accent/30 scale-105 border-0'
                                        : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-200 border border-light-border dark:border-dark-elevated hover:border-light-accent/50 dark:hover:border-dark-accent/50 active:scale-95'
                                    }
                                `}
                            >
                                {nomeMes.substring(0, 3)} {/* Ex: Jan, Fev, Mar */}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={onClose}
                    className="mt-8 py-3 w-full text-slate-400 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                    Cancelar
                </button>
            </div>
        </Modal>
    );
};

export default InvoicePickerModal;
