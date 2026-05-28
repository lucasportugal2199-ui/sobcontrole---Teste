
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import {
    ArrowLeftIcon, SparklesIcon, LockIcon, PlusIcon,
    TrendingUpIcon, WalletIcon, ChartBarIcon, TrashIcon
} from './icons';
import { Asset, AssetType } from '../types';
import { formatCurrency } from '../utils/helpers';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Modal from './Modal';

const InvestmentModule: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("InvestmentModule missing AppContext");

    const {
        setCurrentView, userProfile, theme, assets, patrimonioHistory,
        handleAddAsset, handleDeleteAsset, triggerHaptic
    } = context;

    const isPremium = userProfile.isPremium;
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form state
    const [newName, setNewName] = useState('');
    const [newValue, setNewValue] = useState('');
    const [newType, setNewType] = useState<AssetType>('acao');
    const [newColor, setNewColor] = useState('#14B8A6');

    const totalPatrimonio = useMemo(() => {
        return assets.reduce((sum, asset) => sum + asset.value, 0);
    }, [assets]);

    const assetTypeLabels: Record<AssetType, string> = {
        acao: 'Ações/BDRs',
        crypto: 'Criptoativos',
        fixa: 'Renda Fixa',
        fisico: 'Bens Físicos',
        outros: 'Outros'
    };

    const handleSaveAsset = () => {
        if (!newName || !newValue) return;
        handleAddAsset({
            name: newName,
            value: parseFloat(newValue),
            type: newType,
            color: newColor,
            lastUpdated: new Date().toISOString()
        });
        setIsAddModalOpen(false);
        setNewName('');
        setNewValue('');
    };

    if (!isPremium) {
        return (
            <div className="bg-slate-50 dark:bg-dark-bg h-full flex flex-col items-center justify-center p-8 text-center transition-all duration-500 animate-in fade-in">
                <button onClick={() => setCurrentView('main')} className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-dark-surface transition">
                    <ArrowLeftIcon className="h-6 w-6 text-slate-700 dark:text-white" />
                </button>
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-8 rounded-[40px] mb-8 shadow-inner shadow-emerald-200/50 dark:shadow-none animate-bounce">
                    <LockIcon className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter">Patrimônio & Investimentos</h1>
                <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-xs mx-auto font-semibold leading-relaxed">
                    Acompanhe sua evolução patrimonial, ativos reais e cripto com gráficos avançados de longo prazo.
                </p>
                <button
                    onClick={() => setCurrentView('premium')}
                    className="w-full max-w-xs bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-600/30 active:scale-95 transition-all"
                >
                    Desbloquear Agora
                </button>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-dark-bg h-full flex flex-col overflow-hidden text-slate-900 dark:text-white">
            <header className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top))]">
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentView('main')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-dark-surface transition">
                        <ArrowLeftIcon className="h-6 w-6 " />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tighter uppercase">Meu Patrimônio</h1>
                        <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Calculado agora</span>
                    </div>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="p-3 bg-light-accent text-white rounded-2xl shadow-lg shadow-light-accent/20 active:scale-90 transition-transform"
                >
                    <PlusIcon className="h-5 w-5" />
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-24">
                {/* Total Wealth Display */}
                <div className="bg-white dark:bg-dark-bg p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Patrimônio Líquido Total</p>
                    <h2 className="text-4xl font-black tracking-tighter mb-2 animate-in zoom-in duration-500">
                        {formatCurrency(totalPatrimonio)}
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest">
                        <TrendingUpIcon className="h-4 w-4" />
                        <span>Crescimento Real</span>
                    </div>
                </div>

                {/* Wealth Chart */}
                <div className="bg-white dark:bg-dark-bg p-5 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm h-64">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <ChartBarIcon className="h-4 w-4" /> Evolução do Patrimônio
                    </h3>
                    {patrimonioHistory.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={patrimonioHistory}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                                <XAxis dataKey="monthKey" hide />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(v: any) => formatCurrency(v)}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="totalValue"
                                    stroke="#14B8A6"
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2">
                            <WalletIcon className="h-10 w-10" />
                            <p className="text-[10px] font-black uppercase">Histórico em construção...</p>
                        </div>
                    )}
                </div>

                {/* Assets List */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 px-2">Meus Ativos</h3>
                    {assets.length > 0 ? (
                        assets.map(asset => (
                            <div
                                key={asset.id}
                                className="bg-white dark:bg-dark-bg p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm animate-in slide-in-from-right duration-300"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${asset.color}15` }}>
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.color }}></div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-black tracking-tight">{asset.name}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{assetTypeLabels[asset.type]}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-sm font-black">{formatCurrency(asset.value)}</p>
                                        <p className="text-[9px] font-bold text-emerald-500 uppercase">Ativo</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteAsset(asset.id)}
                                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center opacity-20">
                            <WalletIcon className="h-16 w-16 mx-auto mb-4" />
                            <p className="text-sm font-black uppercase tracking-widest">Nenhum ativo registrado</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal de Adição */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
                <div className="space-y-6">
                    <h3 className="text-xl font-black uppercase tracking-tight text-center">Novo Ativo</h3>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nome do Ativo</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Ex: Bitcoin, NuBank CDB, Apto Floripa"
                                className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold outline-none ring-offset-2 focus:ring-2 focus:ring-light-accent"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Valor Atual (R$)</label>
                            <input
                                type="number"
                                value={newValue}
                                onChange={e => setNewValue(e.target.value)}
                                placeholder="0,00"
                                className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold outline-none ring-offset-2 focus:ring-2 focus:ring-light-accent"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tipo de Ativo</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(Object.entries(assetTypeLabels) as [AssetType, string][]).map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={() => setNewType(key)}
                                        className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${newType === key ? 'bg-light-accent border-light-accent text-white shadow-lg shadow-light-accent/20' : 'bg-white dark:bg-dark-surface border-slate-100 dark:border-slate-700 text-slate-500'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Cor de Destaque</label>
                            <div className="flex gap-2">
                                {['#14B8A6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setNewColor(c)}
                                        className={`w-10 h-10 rounded-full border-4 ${newColor === c ? 'border-slate-300 dark:border-slate-600 shadow-lg' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveAsset}
                        className="w-full py-5 bg-light-accent text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-light-accent/30 active:scale-95 transition-all"
                    >
                        Salvar Ativo
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default InvestmentModule;
