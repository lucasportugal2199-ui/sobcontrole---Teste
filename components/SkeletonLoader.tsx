import React from 'react';
import { LogoIcon } from './icons';

interface SkeletonLoaderProps {
    message?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ message }) => {
    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white px-6 select-none transition-colors duration-300">
            {/* Glow sutil atrás do logo */}
            <div className="relative flex flex-col items-center">
                <div className="absolute -inset-6 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

                {/* Ícone oficial do app em tamanho e destaque nobre */}
                <div className="relative flex items-center justify-center">
                    <LogoIcon className="h-20 w-20 sm:h-24 sm:w-24 text-slate-900 dark:text-white drop-shadow-xl animate-pulse" />
                </div>

                {/* Nome do aplicativo com tipografia oficial */}
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-4">
                    Sob<span className="text-blue-600 dark:text-blue-400">Controle</span>
                </h1>

                {/* Indicador refinado e limpo de carregamento */}
                <div className="flex items-center gap-2.5 mt-6 px-3.5 py-1.5 rounded-full bg-slate-200/50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-white/20 border-t-blue-600 dark:border-t-blue-400 animate-spin shrink-0" />
                    <span className="text-xs font-medium text-slate-600 dark:text-neutral-300 tracking-normal">
                        {message || 'Carregando...'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default SkeletonLoader;