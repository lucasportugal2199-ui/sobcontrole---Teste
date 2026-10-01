import React, { useState, useEffect } from 'react';
import { ToastMessage } from '../types';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from './icons';

export const Toast: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 200);
    }, Math.min(6000, 2500 + toast.message.length * 25)); // textos longos ficam mais tempo
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const iconMap = {
    success: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
    error: <XCircleIcon className="h-5 w-5 text-red-500" />,
    info: <InformationCircleIcon className="h-5 w-5 text-blue-500" />,
  };

  return (
    <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[100] w-max max-w-[calc(100vw-2rem)] px-5 py-3.5 bg-white dark:bg-dark-elevated rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-200/80 dark:border-white/10 transition-all duration-200 ${isExiting ? 'opacity-0 scale-95 translate-y-2' : 'opacity-100 scale-100 translate-y-0'}`}>
      <div className="flex-shrink-0">{iconMap[toast.type] || iconMap.info}</div>
      <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{toast.message}</p>
    </div>
  );
};
