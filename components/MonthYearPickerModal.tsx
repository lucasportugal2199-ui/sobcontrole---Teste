import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MESES_NOMES } from '../constants';
import { AllData } from '../types';
import { ArrowLeftIcon, ArrowRightIcon } from './icons';

interface MonthYearPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentDate: Date;
    allData: AllData;
    onSelectDate: (date: Date) => void;
}

const MonthYearPickerModal: React.FC<MonthYearPickerModalProps> = ({ isOpen, onClose, currentDate, allData, onSelectDate }) => {
    if (!isOpen) return null;

    const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());

    const availableYears = useMemo(() => {
        const years = new Set(Object.keys(allData).map(key => parseInt(key.split('-')[0], 10)));
        if (!years.has(new Date().getFullYear())) {
            years.add(new Date().getFullYear());
        }
        if (years.size === 0) return [new Date().getFullYear()];
        return Array.from(years).sort((a, b) => b - a);
    }, [allData]);

    const handleMonthSelect = (monthIndex: number) => {
        onSelectDate(new Date(pickerYear, monthIndex, 1));
        onClose();
    };

    const modalContent = (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 flex-col gap-4" onClick={onClose}>
            <div
                className="glass dark:glass rounded-[32px] p-6 w-full max-w-xs shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => setPickerYear(pickerYear - 1)}
                        className="p-3 rounded-2xl text-slate-400 hover:text-[#3B82F6] dark:hover:text-[#3B82F6] hover:bg-white/10 transition-all active:scale-75 disabled:opacity-20 disabled:cursor-not-allowed"
                        disabled={!availableYears.includes(pickerYear - 1)}
                        aria-label="Previous year"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <h3 className="text-xl font-black text-light-text dark:text-dark-text uppercase tracking-tighter">{pickerYear}</h3>
                    <button
                        onClick={() => setPickerYear(pickerYear + 1)}
                        className="p-3 rounded-2xl text-slate-400 hover:text-[#3B82F6] dark:hover:text-[#3B82F6] hover:bg-white/10 transition-all active:scale-75 disabled:opacity-20 disabled:cursor-not-allowed"
                        disabled={!availableYears.includes(pickerYear + 1)}
                        aria-label="Next year"
                    >
                        <ArrowRightIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {MESES_NOMES.map((month, index) => {
                        const isSelected = pickerYear === currentDate.getFullYear() && index === currentDate.getMonth();
                        return (
                            <button
                                key={month}
                                onClick={() => handleMonthSelect(index)}
                                className={`py-4 px-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all focus:outline-none active:scale-90 ${isSelected
                                    ? 'bg-[#3B82F6] text-white shadow-lg shadow-dark-accent/30'
                                    : 'bg-white/5 dark:bg-white/5 text-light-text-secondary dark:text-dark-text-secondary hover:bg-white/10 dark:hover:bg-white/10 border border-light-border dark:border-dark-card'
                                    }`}
                            >
                                {month.substring(0, 3)}
                            </button>
                        );
                    })}
                </div>
            </div>
            <button onClick={onClose} className="px-8 py-3 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white transition-all active:scale-95">
                Fechar
            </button>
        </div>
    );
    return createPortal(modalContent, document.body);
};

export default MonthYearPickerModal;
