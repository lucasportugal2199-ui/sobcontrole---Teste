import React, { useState } from 'react';
import { CheckCircleIcon, LockIcon } from '../icons';
import { useAppContext } from '../../context/AppContext';
import { AVAILABLE_BADGES } from '../../constants';
import { useTranslation } from '../../i18n';

type BadgeFilter = 'all' | 'unlocked' | 'locked';

const AchievementsViewer: React.FC = () => {
    const { userProfile } = useAppContext();
    const { t, locale } = useTranslation();
    const [filter, setFilter] = useState<BadgeFilter>('all');

    const unlockedCount = userProfile.badges?.length || 0;
    const totalCount = AVAILABLE_BADGES.length;
    const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

    const filteredBadges = AVAILABLE_BADGES.filter((badge: any) => {
        const isUnlocked = userProfile.badges?.includes(badge.id);
        if (filter === 'unlocked') return isUnlocked;
        if (filter === 'locked') return !isUnlocked;
        return true;
    });

    return (
        <div className="space-y-4 max-w-lg mx-auto pb-8">
            {/* Hero Card de Progresso */}
            <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-2xl shrink-0">
                            🏆
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base leading-tight truncate">
                                {t('achievements.progress') || (locale === 'en' ? 'Achievements Progress' : 'Suas Conquistas')}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5 truncate font-normal">
                                {unlockedCount} de {totalCount} {locale === 'en' ? 'medals unlocked' : 'medalhas desbloqueadas'}
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 tabular-nums">
                            {Math.round(progressPercent)}%
                        </span>
                    </div>
                </div>

                {/* Barra de Progresso */}
                <div className="h-2 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Filtros Segmentados */}
            <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl">
                <button
                    onClick={() => setFilter('all')}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all text-center ${
                        filter === 'all'
                            ? 'bg-white dark:bg-dark-card text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200'
                    }`}
                >
                    {locale === 'en' ? 'All' : 'Todas'} ({totalCount})
                </button>
                <button
                    onClick={() => setFilter('unlocked')}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all text-center ${
                        filter === 'unlocked'
                            ? 'bg-white dark:bg-dark-card text-amber-600 dark:text-amber-400 shadow-sm'
                            : 'text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200'
                    }`}
                >
                    {locale === 'en' ? 'Unlocked' : 'Conquistadas'} ({unlockedCount})
                </button>
                <button
                    onClick={() => setFilter('locked')}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all text-center ${
                        filter === 'locked'
                            ? 'bg-white dark:bg-dark-card text-slate-700 dark:text-neutral-200 shadow-sm'
                            : 'text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200'
                    }`}
                >
                    {locale === 'en' ? 'Locked' : 'Bloqueadas'} ({totalCount - unlockedCount})
                </button>
            </div>

            {/* Lista de Medalhas */}
            <div className="space-y-2.5">
                {filteredBadges.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-white dark:bg-dark-card border border-dashed border-slate-200 dark:border-white/[0.08] rounded-2xl">
                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                            {filter === 'unlocked'
                                ? (locale === 'en' ? 'No achievements unlocked yet. Keep using the app!' : 'Nenhuma conquista desbloqueada ainda. Continue usando o app!')
                                : (locale === 'en' ? 'Congratulations! You unlocked all achievements!' : 'Parabéns! Você desbloqueou todas as medalhas!')}
                        </p>
                    </div>
                ) : (
                    filteredBadges.map((badge: any) => {
                        const isUnlocked = userProfile.badges?.includes(badge.id);
                        const translatedName = t(`badge.${badge.id}`) || badge.name;
                        const translatedDesc = t(`badge.${badge.id}.desc`) || badge.description;

                        return (
                            <div 
                                key={badge.id} 
                                className={`rounded-2xl border p-3.5 sm:p-4 flex items-start gap-3.5 transition-all shadow-xs ${
                                    isUnlocked 
                                        ? 'bg-white dark:bg-dark-card border-amber-500/30 dark:border-amber-500/20' 
                                        : 'bg-white/60 dark:bg-dark-card/60 border-slate-200/80 dark:border-white/[0.05] opacity-80 hover:opacity-95'
                                }`}
                            >
                                <div className={`relative h-11 w-11 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                                    isUnlocked 
                                        ? 'bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 shadow-xs' 
                                        : 'bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] text-slate-400 grayscale opacity-60'
                                }`}>
                                    <span>{badge.icon}</span>
                                    {!isUnlocked && (
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-200 dark:bg-neutral-800 rounded-full flex items-center justify-center border border-white dark:border-neutral-900 shadow-xs">
                                            <LockIcon className="h-2.5 w-2.5 text-slate-500 dark:text-neutral-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className={`text-sm font-semibold truncate ${isUnlocked ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-neutral-300'}`}>
                                            {translatedName}
                                        </h4>
                                        {isUnlocked ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-accent dark:text-brand-accent-hover bg-brand-accent-light-subtle dark:bg-brand-accent-dark-subtle border border-brand-accent/30 px-2 py-0.5 rounded-full shrink-0">
                                                <CheckCircleIcon className="h-3 w-3" />
                                                <span>{locale === 'en' ? 'Unlocked' : 'Conquistada'}</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-neutral-500 bg-slate-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-full shrink-0">
                                                <span>{locale === 'en' ? 'Locked' : 'Bloqueada'}</span>
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed mt-0.5 font-normal">
                                        {translatedDesc}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default AchievementsViewer;
