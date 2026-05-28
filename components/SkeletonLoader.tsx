import React from 'react';

const SkeletonLoader: React.FC = () => {
    const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => (
        <div className={`bg-slate-200 dark:bg-dark-surface/80 rounded-md skeleton-pulse ${className}`} />
    );

    return (
        <div className="bg-slate-50 dark:bg-dark-bg p-4 h-full overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="w-8 h-8" />
                <SkeletonBlock className="w-40 h-7" />
                <SkeletonBlock className="w-8 h-8 rounded-full" />
            </div>

            {/* Month Selector */}
            <div className="flex items-center justify-between mt-4 bg-white dark:bg-dark-surface/50 rounded-xl p-2 w-full mb-6">
                <SkeletonBlock className="w-10 h-10 rounded-full" />
                <SkeletonBlock className="w-48 h-8" />
                <SkeletonBlock className="w-10 h-10 rounded-full" />
            </div>

            {/* Lancamento Form */}
            <div className="bg-white dark:bg-dark-surface/50 p-4 rounded-xl mb-6 space-y-4">
                <SkeletonBlock className="w-32 h-6 mb-4" />
                <SkeletonBlock className="w-full h-12" />
                <div className="grid grid-cols-2 gap-4">
                    <SkeletonBlock className="h-12" />
                    <SkeletonBlock className="h-12" />
                </div>
                <SkeletonBlock className="w-full h-12" />
                <SkeletonBlock className="w-full h-12" />
                <SkeletonBlock className="w-full h-12" />
            </div>

            {/* Daily History */}
            <div>
                <SkeletonBlock className="w-32 h-6 mb-4" />
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-dark-surface/50 p-3 rounded-lg flex items-center gap-4">
                            <SkeletonBlock className="w-9 h-9 rounded-full flex-shrink-0" />
                            <div className="flex-grow grid grid-cols-3 gap-2">
                                <SkeletonBlock className="h-8" />
                                <SkeletonBlock className="h-8" />
                                <SkeletonBlock className="h-8" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SkeletonLoader;