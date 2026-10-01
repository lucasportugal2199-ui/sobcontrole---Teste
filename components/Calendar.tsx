import React, { useState, useMemo } from 'react';
import { MESES_NOMES } from '../constants';
import { getDiasNoMes, formatDateToInput } from '../utils/helpers';
import { ArrowLeftIcon, ArrowRightIcon } from './icons';
import { Transaction } from '../types';
import { useTranslation } from '../i18n';

const Calendar: React.FC<{
  selectedDate: string;
  onDateSelect: (date: string) => void;
  initialDisplayDate: Date;
  transactions?: Transaction[]; // Optional transactions to show dots
}> = ({ selectedDate, onDateSelect, initialDisplayDate, transactions = [] }) => {
  const [displayDate, setDisplayDate] = useState(initialDisplayDate);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
  const { locale } = useTranslation();
  const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';

  const changeDisplayMonth = (direction: number) => {
    setDisplayDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  const changeDisplayYear = (direction: number) => {
    setDisplayDate(prev => new Date(prev.getFullYear() + direction, prev.getMonth(), 1));
  };

  const daysOfWeek = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(appLocale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2026, 6, 5 + i); // 5 de Julho de 2026 é Domingo
      const str = formatter.format(date).replace('.', '');
      return str.charAt(0).toUpperCase() + str.slice(1);
    });
  }, [appLocale]);

  const { calendarGrid, monthName, year } = useMemo(() => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const monthName = MESES_NOMES[month];

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = getDiasNoMes(year, month);

    const daysInPrevMonth = getDiasNoMes(year, month - 1);

    const grid: { day: number; isCurrentMonth: boolean; dateString: string; hasExpense: boolean; hasIncome: boolean }[] = [];

    // Previous month's days
    for (let i = 0; i < firstDayOfMonth; i++) {
      const day = daysInPrevMonth - firstDayOfMonth + 1 + i;
      const date = new Date(year, month - 1, day);
      const dateString = formatDateToInput(date);

      // Check transactions
      const dayTxs = transactions.filter(t => t.data === dateString);
      const hasExpense = dayTxs.some(t => t.tipo === 'saida');
      const hasIncome = dayTxs.some(t => t.tipo === 'entrada');

      grid.push({ day, isCurrentMonth: false, dateString, hasExpense, hasIncome });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateString = formatDateToInput(date);

      const dayTxs = transactions.filter(t => t.data === dateString);
      const hasExpense = dayTxs.some(t => t.tipo === 'saida');
      const hasIncome = dayTxs.some(t => t.tipo === 'entrada');

      grid.push({ day: i, isCurrentMonth: true, dateString, hasExpense, hasIncome });
    }

    // Next month's days
    const gridEndIndex = 42 - grid.length; // 6 rows * 7 days
    for (let i = 1; i <= gridEndIndex; i++) {
      const date = new Date(year, month + 1, i);
      const dateString = formatDateToInput(date);

      const dayTxs = transactions.filter(t => t.data === dateString);
      const hasExpense = dayTxs.some(t => t.tipo === 'saida');
      const hasIncome = dayTxs.some(t => t.tipo === 'entrada');

      grid.push({ day: i, isCurrentMonth: false, dateString, hasExpense, hasIncome });
    }

    return { calendarGrid: grid, monthName, year };
  }, [displayDate, transactions]);

  const todayString = formatDateToInput(new Date());

  const yearRange = useMemo(() => {
    const currentYear = displayDate.getFullYear();
    const startYear = Math.floor(currentYear / 12) * 12;
    return Array.from({ length: 12 }, (_, i) => startYear + i);
  }, [displayDate]);

  return (
    <div className="p-2 min-h-[340px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <button
          type="button"
          onClick={() => viewMode === 'days' ? changeDisplayMonth(-1) : viewMode === 'years' ? changeDisplayYear(-12) : changeDisplayYear(-1)}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition text-light-text dark:text-dark-text-secondary"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>

        <div className="flex gap-1 font-bold">
          <button
            onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
            className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-light-text dark:text-dark-text transition-colors"
          >
            {monthName}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
            className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-light-text dark:text-dark-text transition-colors"
          >
            {year}
          </button>
        </div>

        <button
          type="button"
          onClick={() => viewMode === 'days' ? changeDisplayMonth(1) : viewMode === 'years' ? changeDisplayYear(12) : changeDisplayYear(1)}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition text-light-text dark:text-dark-text-secondary"
        >
          <ArrowRightIcon className="h-5 w-5" />
        </button>
      </div>

      {viewMode === 'days' && (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-light-text-muted dark:text-dark-text-secondary mb-2">
            {daysOfWeek.map(day => <div key={day}>{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.map(({ day, isCurrentMonth, dateString, hasExpense, hasIncome }, index) => {
              const isSelected = dateString === selectedDate;
              const isToday = dateString === todayString;

              let buttonClass = "w-10 h-10 flex flex-col items-center justify-center rounded-full text-sm font-medium transition-colors relative ";
              if (isCurrentMonth) {
                if (isSelected) {
                  buttonClass += "bg-light-accent text-white";
                } else if (isToday) {
                  buttonClass += "bg-teal-100 dark:bg-teal-900/50 text-light-accent dark:text-[#3B82F6]";
                } else {
                  buttonClass += "text-light-text dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700";
                }
              } else {
                buttonClass += "text-slate-400 dark:text-slate-400";
              }

              return (
                <button
                  key={`${dateString}-${index}`}
                  type="button"
                  onClick={() => onDateSelect(dateString)}
                  className={buttonClass}
                >
                  <span className={hasExpense || hasIncome ? "mb-0.5" : ""}>{day}</span>
                  <div className="flex gap-0.5 h-1">
                    {hasIncome && <div className="w-1 h-1 rounded-full bg-emerald-500"></div>}
                    {hasExpense && <div className="w-1 h-1 rounded-full bg-red-500"></div>}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {viewMode === 'months' && (
        <div className="grid grid-cols-3 gap-2 flex-1 items-center">
          {MESES_NOMES.map((name, index) => (
            <button
              key={name}
              onClick={() => {
                setDisplayDate(new Date(displayDate.getFullYear(), index, 1));
                setViewMode('days');
              }}
              className={`py-4 rounded-xl font-bold text-sm transition-all ${displayDate.getMonth() === index ? 'bg-light-accent text-white shadow-lg shadow-light-accent/20' : 'bg-light-card-elevated dark:bg-dark-bg/50 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              {name.substring(0, 3)}
            </button>
          ))}
        </div>
      )}

      {viewMode === 'years' && (
        <div className="grid grid-cols-3 gap-2 flex-1 items-center">
          {yearRange.map((y) => (
            <button
              key={y}
              onClick={() => {
                setDisplayDate(new Date(y, displayDate.getMonth(), 1));
                setViewMode('days');
              }}
              className={`py-4 rounded-xl font-bold text-sm transition-all ${displayDate.getFullYear() === y ? 'bg-light-accent text-white shadow-lg shadow-light-accent/20' : 'bg-light-card-elevated dark:bg-dark-bg/50 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Calendar;