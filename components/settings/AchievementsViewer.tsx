import React, { useContext } from 'react';
import { CheckCircleIcon } from '../icons';
import { AppContext } from '../../context/AppContext';
import { AVAILABLE_BADGES } from '../../constants';

const AchievementsViewer: React.FC = () => {
    const { userProfile } = useContext(AppContext);

    return (
        <div className="space-y-3 pb-6">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-4 ml-1">
                Progresso: {userProfile.badges?.length || 0}/{AVAILABLE_BADGES.length}
            </h3>
            {AVAILABLE_BADGES.map((badge: any) => {
                const isUnlocked = userProfile.badges?.includes(badge.id);
                return (
                    <div key={badge.id} className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${isUnlocked ? 'bg-white dark:bg-dark-surface border-amber-200 dark:border-amber-900/30 shadow-sm' : 'bg-slate-50 dark:bg-dark-bg border-slate-100 dark:border-slate-800 opacity-80'}`}>
                        <div className="flex items-start gap-4">
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0 ${isUnlocked ? 'bg-amber-100 dark:bg-amber-900/20' : 'bg-slate-200 dark:bg-dark-surface grayscale'}`}>
                                {badge.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className={`text-sm font-bold ${isUnlocked ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}>
                                        {badge.name}
                                    </h4>
                                    {isUnlocked && <CheckCircleIcon className="h-5 w-5 text-amber-500" />}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed font-medium">
                                    {badge.description}
                                </p>
                            </div>
                        </div>
                        {isUnlocked && (
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default AchievementsViewer;
