import React, { useState, useContext } from 'react';
import { Category, TransactionType } from '../types';
import { PlusIcon, EditIcon, TrashIcon, ChevronRightIcon, TargetIcon, InformationCircleIcon, CrownIcon } from './icons';
import CategoryIcon from './CategoryIcon';
import { getCorPorCategoria, formatCurrency, formatCurrencyForInput, parseCurrency } from '../utils/helpers';
import { COLOR_PALETTE, CATEGORY_ICONS } from '../constants';
import { AppContext } from '../context/AppContext';
import Modal from './Modal';

type ModalMode = 'addCat' | 'editCat' | 'deleteCat' | 'setBudget';

const Categories: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("Categories must be used within an AppProvider");

    const {
        categorias, handleAddCategory, handleEditCategory, handleDeleteCategory,
        categoryColors, handleUpdateCategoryColor, budgets, handleSetBudget,
        userProfile, setCurrentView, showToast, allTransactions
    } = context;

    type ActiveTab = 'despesas' | 'receitas';
    const [activeTab, setActiveTab] = useState<ActiveTab>('despesas');
    const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode | null>(null);
    const [currentItem, setCurrentItem] = useState<{ cat?: Category } | null>(null);
    const [itemName, setItemName] = useState('');
    const [itemColor, setItemColor] = useState(COLOR_PALETTE[0]);
    const [itemBudget, setItemBudget] = useState('');
    const [itemBucket, setItemBucket] = useState<'necessidades' | 'desejos' | 'futuro' | ''>('');
    const [itemGroup, setItemGroup] = useState<'Gastos Fixos' | 'Gastos Variáveis' | 'Reserva Financeira' | ''>('');
    const [itemIcon, setItemIcon] = useState<string>('');
    const [itemError, setItemError] = useState<string | null>(null);

    const isCategoryInUse = (name: string) => {
        return allTransactions.some(tx => tx.categoria === name);
    };

    const toggleActions = (id: string) => {
        setOpenSwipeId(openSwipeId === id ? null : id);
    };

    const openModal = (mode: ModalMode, item?: { cat?: Category }) => {
        if (mode === 'addCat') {
            const type = activeTab === 'despesas' ? 'saida' : 'entrada';
            if (!userProfile.isPremium && categorias[type].length >= 10) {
                showToast('Limite de 10 categorias atingido. Seja PRO!', 'info');
                setCurrentView('premium');
                return;
            }
        }

        setModalMode(mode);
        setCurrentItem(item || null);
        if (item?.cat) {
            setItemName(item.cat.name);
            setItemColor(getCorPorCategoria(item.cat.name, categoryColors));
            setItemIcon(item.cat.icon || '');
            if (mode === 'setBudget') {
                const currentBudget = budgets[item.cat.name] || 0;
                setItemBudget(currentBudget > 0 ? formatCurrencyForInput(String(Math.round(currentBudget * 100))) : '');
            }
            if (activeTab === 'despesas') {
                setItemBucket(item.cat.bucket || '');
                setItemGroup(item.cat.group || '');
            }
        } else {
            setItemBucket('');
            setItemGroup('');
            setItemIcon('');
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null);
            setCurrentItem(null);
            setItemName('');
            setItemColor(COLOR_PALETTE[0]);
            setItemBudget('');
            setItemBucket('');
            setItemGroup('');
            setItemIcon('');
            setItemError(null);
        }, 200);
    };

    const handleConfirm = () => {
        setItemError(null);
        const trimmedName = itemName.trim();
        if (!trimmedName && modalMode !== 'setBudget') { setItemError("O nome não pode ser vazio."); return; }
        const type = activeTab === 'despesas' ? 'saida' : 'entrada';

        switch (modalMode) {
            case 'addCat':
                if (categorias[type].some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
                    setItemError("Esta categoria já existe."); return;
                }
                handleAddCategory(
                    type,
                    trimmedName,
                    activeTab === 'despesas' && itemBucket ? itemBucket : undefined,
                    activeTab === 'despesas' && itemGroup ? itemGroup as any : undefined,
                    itemIcon || undefined
                );
                handleUpdateCategoryColor(trimmedName, itemColor);
                break;
            case 'editCat':
                if (currentItem?.cat && trimmedName !== currentItem.cat.name) {
                    if (categorias[type].some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
                        setItemError("Esta categoria já existe."); return;
                    }
                }
                if (currentItem?.cat) {
                    handleEditCategory(
                        type,
                        currentItem.cat.name,
                        trimmedName,
                        activeTab === 'despesas' && itemBucket ? itemBucket : undefined,
                        activeTab === 'despesas' && itemGroup ? itemGroup as any : undefined,
                        itemIcon || undefined
                    );
                }
                if (currentItem?.cat && itemColor !== getCorPorCategoria(currentItem.cat.name, categoryColors)) {
                    handleUpdateCategoryColor(trimmedName, itemColor);
                }
                break;
            case 'setBudget':
                if (currentItem?.cat) {
                    handleSetBudget(currentItem.cat.name, parseCurrency(itemBudget));
                }
                break;
        }
        closeModal();
    };

    const handleDeleteConfirm = () => {
        if (!currentItem || !currentItem.cat) return;

        if (isCategoryInUse(currentItem.cat.name)) {
            showToast("Não é possível excluir categorias em uso.", "error");
            return;
        }

        const type = activeTab === 'despesas' ? 'saida' : 'entrada';
        handleDeleteCategory(type, currentItem.cat.name);
        closeModal();
    };

    const renderCategoryList = () => {
        const categories = activeTab === 'despesas' ? categorias.saida : categorias.entrada;
        return (
            <ul className="space-y-3">
                {categories.map(cat => {
                    const budgetValue = budgets[cat.name] || 0;
                    return (
                        <li key={cat.id} className="relative group overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm transition-all duration-300">
                            {/* Actions revealed underneath */}
                            <div className={`absolute inset-y-0 right-0 flex transition-opacity duration-200 ${openSwipeId === cat.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                {activeTab === 'despesas' && (
                                    <button
                                        onClick={() => { openModal('setBudget', { cat }); setOpenSwipeId(null); }}
                                        className="w-16 bg-emerald-500 text-white flex flex-col items-center justify-center transition-colors hover:bg-emerald-600"
                                    >
                                        <TargetIcon className="h-5 w-5" />
                                        <span className="text-[10px] font-bold mt-1 uppercase">ALVO</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => { openModal('editCat', { cat }); setOpenSwipeId(null); }}
                                    className="w-16 bg-blue-500 text-white flex flex-col items-center justify-center transition-colors hover:bg-blue-600"
                                >
                                    <EditIcon className="h-5 w-5" />
                                    <span className="text-[10px] font-bold mt-1 uppercase">EDITAR</span>
                                </button>
                                <button
                                    onClick={() => { openModal('deleteCat', { cat }); setOpenSwipeId(null); }}
                                    className="w-16 bg-red-500 text-white flex flex-col items-center justify-center transition-colors hover:bg-red-600"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                    <span className="text-[10px] font-bold mt-1 uppercase">EXCLUIR</span>
                                </button>
                            </div>

                            {/* Main Content Layer */}
                            <div
                                className={`relative z-10 w-full bg-white dark:bg-dark-surface transition-transform duration-300 ease-in-out cursor-pointer ${openSwipeId === cat.id
                                    ? (activeTab === 'despesas' ? '-translate-x-48' : '-translate-x-32')
                                    : 'translate-x-0'
                                    }`}
                                onClick={() => toggleActions(cat.id)}
                            >
                            <div className="w-full flex items-center py-2.5 px-3 text-left">
                                    <div
                                        className="mr-3 flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: getCorPorCategoria(cat.name, categoryColors) + '33' }}
                                    >
                                        {cat.icon ? (
                                            <span className="flex items-center justify-center" style={{ color: getCorPorCategoria(cat.name, categoryColors) }}>
                                                <CategoryIcon name={cat.icon} className="h-5 w-5" />
                                            </span>
                                        ) : (
                                            <span className="font-bold text-sm" style={{ color: getCorPorCategoria(cat.name, categoryColors) }}>—</span>
                                        )}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <p className="font-semibold text-slate-800 dark:text-white leading-tight text-sm">{cat.name}</p>
                                            {activeTab === 'despesas' && cat.group && (
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase whitespace-nowrap ${
                                                    cat.group === 'Gastos Fixos' 
                                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                                                        : cat.group === 'Gastos Variáveis'
                                                        ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                                                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                }`}>
                                                    {cat.group === 'Gastos Fixos' ? '50%' : cat.group === 'Gastos Variáveis' ? '30%' : '20%'}
                                                </span>
                                            )}
                                            {activeTab === 'despesas' && !cat.group && (
                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[7px] font-bold text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 whitespace-nowrap">Sem Grupo</span>
                                            )}
                                        </div>
                                        {budgetValue > 0 && activeTab === 'despesas' && (
                                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight leading-none mt-0.5">Alvo: {formatCurrency(budgetValue)}</p>
                                        )}
                                    </div>
                                    <ChevronRightIcon className={`h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0 ml-2 transition-transform duration-300 ${openSwipeId === cat.id ? 'rotate-180' : ''}`} />
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-dark-bg text-slate-800 dark:text-slate-200 h-full flex flex-col p-4">
            <header className="flex justify-between items-center mb-6 flex-shrink-0">
                <button onClick={() => openModal('addCat')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full bg-white shadow-sm hover:bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors border border-slate-100 dark:border-slate-700">
                    <PlusIcon className="h-4 w-4" />
                    <span>Nova</span>
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Categorias</h1>
                    {!userProfile.isPremium && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Limite: {categorias[activeTab === 'despesas' ? 'saida' : 'entrada'].length}/10</span>
                            <CrownIcon className="h-2 w-2 text-amber-500" />
                        </div>
                    )}
                </div>
                <div className="w-16 flex justify-end">
                    <button onClick={() => setIsInfoModalOpen(true)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <InformationCircleIcon className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6 flex-shrink-0">
                <button onClick={() => { setActiveTab('despesas'); setOpenSwipeId(null); }} className={`flex-1 pb-3 text-sm font-semibold text-center transition-colors ${activeTab === 'despesas' ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white' : 'text-slate-500 dark:text-slate-300'}`}>
                    Despesas
                </button>
                <button onClick={() => { setActiveTab('receitas'); setOpenSwipeId(null); }} className={`flex-1 pb-3 text-sm font-semibold text-center transition-colors ${activeTab === 'receitas' ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white' : 'text-slate-500 dark:text-slate-300'}`}>
                    Receitas
                </button>
            </div>

            <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-4">
                {renderCategoryList()}
            </main>

            <Modal isOpen={isModalOpen} onClose={closeModal} verticalAlign="top">
                <div className="text-left">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                        {modalMode === 'addCat' && 'Adicionar Categoria'}
                        {modalMode === 'editCat' && 'Editar Categoria'}
                        {modalMode === 'deleteCat' && 'Excluir Categoria'}
                        {modalMode === 'setBudget' && 'Definir Orçamento'}
                    </h3>

                    {(modalMode === 'addCat' || modalMode === 'editCat') && (
                        <div className="space-y-4">
                            <input type="text" value={itemName} onChange={(e) => {
                                // Regex para remover emojis
                                const noEmoji = e.target.value.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2B50}\u{231A}-\u{231B}\u{23E9}-\u{23EC}\u{23F0}\u{23F3}]/gu, '');
                                setItemName(noEmoji);
                            }}
                                className="w-full p-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm"
                                placeholder="Nome" autoFocus />
                            
                            {activeTab === 'despesas' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 mb-2">Grupo da Despesa (50/30/20)</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setItemGroup('Gastos Fixos')}
                                                className={`flex-1 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg border transition-colors ${itemGroup === 'Gastos Fixos' ? 'bg-indigo-100 border-indigo-500 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-500 dark:text-indigo-300' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                                            >
                                                Fixos (50%)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setItemGroup('Gastos Variáveis')}
                                                className={`flex-1 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg border transition-colors ${itemGroup === 'Gastos Variáveis' ? 'bg-rose-100 border-rose-500 text-rose-700 dark:bg-rose-900/40 dark:border-rose-500 dark:text-rose-300' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                                            >
                                                Variáveis (30%)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setItemGroup('Reserva Financeira')}
                                                className={`flex-1 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg border transition-colors ${itemGroup === 'Reserva Financeira' ? 'bg-fuchsia-100 border-fuchsia-500 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:border-fuchsia-500 dark:text-fuchsia-300' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                                            >
                                                Reserva (20%)
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            )}

                            {(modalMode === 'editCat' || modalMode === 'addCat') && (
                                <div className="space-y-3">
                                    {/* Icon Picker */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 mb-2">Ícone da Categoria</label>
                                        <div className="max-h-[180px] overflow-y-auto no-scrollbar rounded-xl border border-slate-100 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-dark-bg/30">
                                            {/* Sem ícone */}
                                            <div className="mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setItemIcon('')}
                                                    className={`h-9 w-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all border-2 ${
                                                        itemIcon === '' ? 'border-light-accent bg-teal-50 dark:bg-teal-900/20 text-light-accent' : 'border-transparent bg-slate-100 dark:bg-slate-700 text-slate-400'
                                                    }`}
                                                >—</button>
                                            </div>
                                            {/* Ícones agrupados por seção */}
                                            {(() => {
                                                const groups: Record<string, typeof CATEGORY_ICONS> = {};
                                                CATEGORY_ICONS.forEach(icon => {
                                                    if (!groups[icon.group]) groups[icon.group] = [];
                                                    groups[icon.group].push(icon);
                                                });
                                                return Object.entries(groups).map(([groupName, icons]) => (
                                                    <div key={groupName} className="mb-2">
                                                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-0.5">{groupName}</p>
                                                        <div className="grid grid-cols-7 gap-1">
                                                            {icons.map(({ iconId, label }) => (
                                                                <button
                                                                    key={iconId}
                                                                    type="button"
                                                                    title={label}
                                                                    onClick={() => setItemIcon(iconId)}
                                                                    className={`h-9 w-full flex items-center justify-center rounded-lg transition-all border-2 ${
                                                                        itemIcon === iconId ? 'border-light-accent bg-teal-50 dark:bg-teal-900/20 scale-105 text-light-accent' : 'border-transparent bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300'
                                                                    }`}
                                                                >
                                                                    <CategoryIcon name={iconId} className="h-5 w-5" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>

                                    {/* Color Picker */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 mb-2">Cor da Categoria</label>
                                        <div className="grid grid-cols-6 gap-2 px-1">
                                            {COLOR_PALETTE.map(c => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setItemColor(c)}
                                                    className={`h-8 w-8 rounded-full transition-all shrink-0 ${itemColor.toLowerCase() === c.toLowerCase() ? 'ring-4 ring-light-accent/30 border-2 border-light-accent scale-110' : 'border-2 border-transparent'}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {itemError && <p className="text-red-500 dark:text-red-400 text-sm">{itemError}</p>}
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={closeModal} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white font-semibold text-sm">Cancelar</button>
                                <button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-light-accent text-white font-semibold text-sm">Salvar</button>
                            </div>
                        </div>
                    )}

                    {modalMode === 'setBudget' && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500 dark:text-slate-300 font-medium mb-2">Defina o limite mensal de gastos para a categoria <b>{itemName}</b>.</p>
                            <input type="tel" value={itemBudget} onChange={(e) => setItemBudget(formatCurrencyForInput(e.target.value))}
                                className="w-full py-2.5 px-4 bg-white dark:bg-dark-bg/50 border-2 border-emerald-500/20 dark:border-emerald-400/10 rounded-xl text-slate-900 dark:text-white font-bold text-base text-center outline-none focus:border-emerald-500 transition-all"
                                placeholder="R$ 0,00" autoFocus />
                            <p className="text-[10px] text-slate-400 dark:text-slate-400 italic">Você receberá um aviso quando atingir 80% deste valor.</p>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={closeModal} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white font-semibold text-sm">Cancelar</button>
                                <button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-sm">Confirmar</button>
                            </div>
                        </div>
                    )}

                    {modalMode === 'deleteCat' && (
                        <div>
                            {currentItem?.cat && isCategoryInUse(currentItem.cat.name) ? (
                                <div className="space-y-4">
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl flex items-start gap-3">
                                        <InformationCircleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                                        <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                                            Esta categoria não pode ser excluída porque possui transações registradas.
                                        </p>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-300 text-xs italic">
                                        Para excluir, você deve primeiro alterar a categoria de todos os lançamentos que usam "{currentItem.cat.name}".
                                    </p>
                                    <div className="flex justify-end pt-2">
                                        <button onClick={closeModal} className="w-full py-3 rounded-xl bg-light-accent text-white font-bold text-sm">Entendido</button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-slate-500 dark:text-slate-300 text-sm mb-6">
                                        Tem certeza que deseja excluir "{itemName}"? Esta ação não poderá ser desfeita.
                                    </p>
                                    <div className="flex justify-end gap-3">
                                        <button onClick={closeModal} className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-600 font-semibold text-sm">Cancelar</button>
                                        <button onClick={handleDeleteConfirm} className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm">Excluir</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>

            {/* Modal Informativo 50/30/20 */}
            <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)}>
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
                            <InformationCircleIcon className="h-6 w-6 text-light-accent dark:text-dark-accent" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Método 50/30/20</h3>
                    </div>
                    
                    <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        <p>
                            O método <strong className="text-slate-900 dark:text-white">50/30/20</strong> é uma forma simples de organizar suas finanças dividindo seus gastos em 3 grandes grupos:
                        </p>
                        
                        <div className="space-y-3 bg-slate-50 dark:bg-dark-surface/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex gap-3">
                                <span className="font-black text-indigo-500 w-10 shrink-0">50%</span> 
                                <div>
                                    <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Gastos Fixos</span>
                                    <span className="text-xs">Moradia, contas básicas, alimentação, transporte. O essencial para viver.</span>
                                </div>
                            </div>
                            
                            <div className="h-px w-full bg-slate-200 dark:bg-slate-700/50"></div>
                            
                            <div className="flex gap-3">
                                <span className="font-black text-rose-500 w-10 shrink-0">30%</span> 
                                <div>
                                    <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Gastos Variáveis</span>
                                    <span className="text-xs">Lazer, restaurantes, compras, hobbies. Coisas que você quer, mas não são essenciais.</span>
                                </div>
                            </div>
                            
                            <div className="h-px w-full bg-slate-200 dark:bg-slate-700/50"></div>
                            
                            <div className="flex gap-3">
                                <span className="font-black text-emerald-500 w-10 shrink-0">20%</span> 
                                <div>
                                    <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Reserva Financeira</span>
                                    <span className="text-xs">Investimentos, pagamento de dívidas e construção da reserva de emergência.</span>
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-xs text-slate-500">
                            Classifique suas categorias de despesa nestes grupos e nós geraremos um infográfico do seu mês na aba <strong className="text-slate-700 dark:text-slate-300">Finanças</strong>!
                        </p>
                    </div>
                    
                    <button onClick={() => setIsInfoModalOpen(false)} className="mt-6 w-full py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">
                        Entendido
                    </button>
                </div>
            </Modal>
        </div>
    )
}

export default Categories;