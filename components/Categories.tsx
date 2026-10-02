import React, { useState, useContext } from 'react';
import { Category, TransactionType } from '../types';
import { PlusIcon, EditIcon, TrashIcon, ChevronRightIcon, TargetIcon, InformationCircleIcon, CrownIcon } from './icons';
import CategoryIcon from './CategoryIcon';
import { getCorPorCategoria, formatCurrency, formatCurrencyForInput, parseCurrency, getTranslatedCategoryName } from '../utils/helpers';
import { COLOR_PALETTE, CATEGORY_ICONS } from '../constants';
import { AppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import Modal from './Modal';

type ModalMode = 'addCat' | 'editCat' | 'deleteCat' | 'setBudget';

const Categories: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("Categories must be used within an AppProvider");

    const { t, locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';
    const curSymbol = appCurrency === 'USD' ? '$' : appCurrency === 'EUR' ? '€' : 'R$';

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
            if (!userProfile.isPremium && categorias[type].length >= 15) {
                showToast(
                    locale === 'en' ? 'Limit of 15 categories reached. Go PRO!' : locale === 'es' ? 'Límite de 15 categorías alcanzado. ¡Sé PRO!' : locale === 'fr' ? 'Limite de 15 catégories atteinte. Devenez PRO !' : locale === 'de' ? 'Limit von 15 Kategorien erreicht. Werden Sie PRO!' : 'Limite de 15 categorias atingido. Seja PRO!', 
                    'info'
                );
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
        if (!trimmedName && modalMode !== 'setBudget') { 
            setItemError(locale === 'en' ? 'Name cannot be empty.' : locale === 'es' ? 'El nombre no puede estar vacío.' : locale === 'fr' ? 'Le nom ne peut pas être vide.' : locale === 'de' ? 'Name darf nicht leer sein.' : 'O nome não pode ser vazio.'); 
            return; 
        }
        const type = activeTab === 'despesas' ? 'saida' : 'entrada';

        switch (modalMode) {
            case 'addCat':
                if (categorias[type].some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
                    setItemError(locale === 'en' ? 'This category already exists.' : locale === 'es' ? 'Esta categoría ya existe.' : locale === 'fr' ? 'Cette catégorie existe déjà.' : locale === 'de' ? 'Diese Kategorie existiert bereits.' : 'Esta categoria já existe.'); 
                    return;
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
                        setItemError(locale === 'en' ? 'This category already exists.' : locale === 'es' ? 'Esta categoría ya existe.' : locale === 'fr' ? 'Cette catégorie existe déjà.' : locale === 'de' ? 'Diese Kategorie existiert bereits.' : 'Esta categoria já existe.'); 
                        return;
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
            showToast(
                locale === 'en' ? 'Cannot delete categories in use.' : locale === 'es' ? 'No se pueden eliminar categorías en uso.' : locale === 'fr' ? 'Impossible de supprimer les catégories utilisées.' : locale === 'de' ? 'Kategorien in Verwendung können nicht gelöscht werden.' : 'Não é possível excluir categorias em uso.', 
                "error"
            );
            return;
        }

        const type = activeTab === 'despesas' ? 'saida' : 'entrada';
        handleDeleteCategory(type, currentItem.cat.name);
        closeModal();
    };

    const renderCategoryList = () => {
        const categories = activeTab === 'despesas' ? categorias.saida : categorias.entrada;
        
        if (categories.length === 0) {
            return (
                <div className="text-center py-12 px-4 bg-white dark:bg-dark-card border border-dashed border-slate-200 dark:border-white/[0.08] rounded-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3">
                        <PlusIcon className="h-6 w-6" />
                    </div>
                    <p className="font-semibold text-sm text-slate-800 dark:text-white">
                        {locale === 'en' ? 'No categories found' : 'Nenhuma categoria cadastrada'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
                        {locale === 'en' ? 'Create your first category to organize transactions.' : 'Toque no botão abaixo para adicionar sua primeira categoria.'}
                    </p>
                    <button
                        onClick={() => openModal('addCat')}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-95 inline-flex items-center gap-1.5"
                    >
                        <PlusIcon className="h-4 w-4" />
                        <span>{locale === 'en' ? 'Add Category' : 'Adicionar Categoria'}</span>
                    </button>
                </div>
            );
        }

        return (
            <ul className="space-y-2.5">
                {categories.map(cat => {
                    const budgetValue = budgets[cat.name] || 0;
                    const catColor = getCorPorCategoria(cat.name, categoryColors);

                    return (
                        <li key={cat.id} className="relative group overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm transition-all">
                            {/* Actions revealed underneath */}
                            <div
                                className={`absolute inset-y-0 right-0 flex rounded-r-2xl overflow-hidden transition-opacity duration-200 ${openSwipeId === cat.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                            >
                                {activeTab === 'despesas' && (
                                    <button
                                        onClick={() => { openModal('setBudget', { cat }); setOpenSwipeId(null); }}
                                        className="w-16 bg-emerald-600 hover:bg-emerald-700 text-white flex flex-col items-center justify-center transition-colors gap-1"
                                        title={locale === 'en' ? 'Goal' : 'Meta'}
                                    >
                                        <TargetIcon className="h-4 w-4" />
                                        <span className="text-[10px] font-semibold">
                                            {locale === 'en' ? 'Goal' : 'Meta'}
                                        </span>
                                    </button>
                                )}
                                <button
                                    onClick={() => { openModal('editCat', { cat }); setOpenSwipeId(null); }}
                                    className="w-16 bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center justify-center transition-colors gap-1"
                                    title={locale === 'en' ? 'Edit' : 'Editar'}
                                >
                                    <EditIcon className="h-4 w-4" />
                                    <span className="text-[10px] font-semibold">
                                        {locale === 'en' ? 'Edit' : 'Editar'}
                                    </span>
                                </button>
                                <button
                                    onClick={() => { openModal('deleteCat', { cat }); setOpenSwipeId(null); }}
                                    className="w-16 bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center transition-colors gap-1"
                                    title={locale === 'en' ? 'Delete' : 'Excluir'}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                    <span className="text-[10px] font-semibold">
                                        {locale === 'en' ? 'Delete' : 'Excluir'}
                                    </span>
                                </button>
                            </div>

                            {/* Main Content Layer */}
                            <div
                                className={`relative z-10 w-full bg-white dark:bg-dark-card transition-transform duration-300 ease-in-out cursor-pointer ${openSwipeId === cat.id
                                    ? (activeTab === 'despesas' ? '-translate-x-48' : '-translate-x-32')
                                    : 'translate-x-0'
                                    }`}
                                onClick={() => toggleActions(cat.id)}
                            >
                                <div className="w-full flex items-center py-3 px-3.5 text-left">
                                    <div
                                        className="mr-3 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-xs"
                                        style={{ backgroundColor: `${catColor}18`, color: catColor }}
                                    >
                                        {cat.icon ? (
                                            <CategoryIcon name={cat.icon} className="h-5 w-5" />
                                        ) : (
                                            <span className="font-bold text-sm">—</span>
                                        )}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className="font-semibold text-slate-800 dark:text-white leading-tight text-sm truncate">
                                                {getTranslatedCategoryName(cat.name, t)}
                                            </p>
                                            {activeTab === 'despesas' && cat.group && (
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium whitespace-nowrap ${
                                                    cat.group === 'Gastos Fixos' 
                                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' 
                                                        : cat.group === 'Gastos Variáveis'
                                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                }`}>
                                                    {cat.group === 'Gastos Fixos' 
                                                        ? 'Fixo (50%)' 
                                                        : cat.group === 'Gastos Variáveis'
                                                        ? 'Variáveis (30%)'
                                                        : 'Reserva (20%)'}
                                                </span>
                                            )}
                                        </div>
                                        {budgetValue > 0 && activeTab === 'despesas' ? (
                                            <p className="text-[11px] font-medium text-brand-accent dark:text-brand-accent-hover flex items-center gap-1 mt-0.5">
                                                <TargetIcon className="h-3 w-3 shrink-0" />
                                                <span>Meta: {formatCurrency(budgetValue, appLocale, appCurrency)}</span>
                                            </p>
                                        ) : (
                                            <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
                                                Toque para gerenciar
                                            </p>
                                        )}
                                    </div>
                                    <ChevronRightIcon className={`h-4 w-4 text-slate-400 dark:text-neutral-600 flex-shrink-0 ml-2 transition-transform duration-300 ${openSwipeId === cat.id ? 'rotate-180 text-blue-500' : ''}`} />
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        );
    };

    const currentCount = categorias[activeTab === 'despesas' ? 'saida' : 'entrada'].length;

    return (
        <div className="bg-transparent text-slate-800 dark:text-neutral-200 h-full flex flex-col p-4">
            {/* Barra de Status e Ações */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                        {currentCount} {currentCount === 1 ? 'categoria' : 'categorias'}
                    </span>
                    {!userProfile.isPremium && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <span>{currentCount}/15</span>
                            <CrownIcon className="h-2.5 w-2.5" />
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {activeTab === 'despesas' && (
                        <button 
                            onClick={() => setIsInfoModalOpen(true)} 
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/10 text-slate-600 dark:text-neutral-300 transition-all active:scale-95"
                            title={locale === 'en' ? '50/30/20 Rule Info' : 'Método 50/30/20'}
                        >
                            <InformationCircleIcon className="h-4 w-4 text-amber-500" />
                        </button>
                    )}
                    <button 
                        onClick={() => openModal('addCat')} 
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95 transition-all"
                    >
                        <PlusIcon className="h-3.5 w-3.5" />
                        <span>{locale === 'en' ? 'Add' : locale === 'es' ? 'Añadir' : 'Adicionar'}</span>
                    </button>
                </div>
            </div>

            {/* Abas Segmentadas */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl mb-4 flex-shrink-0">
                <button 
                    onClick={() => { setActiveTab('despesas'); setOpenSwipeId(null); }} 
                    className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        activeTab === 'despesas' 
                            ? 'bg-white dark:bg-dark-card text-rose-500 dark:text-rose-400 shadow-sm' 
                            : 'text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200'
                    }`}
                >
                    {locale === 'en' ? 'Expenses' : locale === 'es' ? 'Gastos' : 'Despesas'}
                </button>
                <button 
                    onClick={() => { setActiveTab('receitas'); setOpenSwipeId(null); }} 
                    className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        activeTab === 'receitas' 
                            ? 'bg-white dark:bg-dark-card text-brand-accent dark:text-brand-accent-hover shadow-sm' 
                            : 'text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200'
                    }`}
                >
                    {locale === 'en' ? 'Income' : locale === 'es' ? 'Ingresos' : 'Receitas'}
                </button>
            </div>

            <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-4">
                {renderCategoryList()}
            </main>

            <Modal isOpen={isModalOpen} onClose={closeModal} verticalAlign="top">
                <div className="text-left">
                    <h3 className="text-lg font-bold text-light-text dark:text-dark-text mb-4">
                        {modalMode === 'addCat' && (locale === 'en' ? 'Add Category' : locale === 'es' ? 'Añadir Categoría' : locale === 'fr' ? 'Ajouter une Catégorie' : locale === 'de' ? 'Kategorie Hinzufügen' : 'Adicionar Categoria')}
                        {modalMode === 'editCat' && (locale === 'en' ? 'Edit Category' : locale === 'es' ? 'Editar Categoría' : locale === 'fr' ? 'Modifier la Catégorie' : locale === 'de' ? 'Kategorie Bearbeiten' : 'Editar Categoria')}
                        {modalMode === 'deleteCat' && (locale === 'en' ? 'Delete Category' : locale === 'es' ? 'Eliminar Categoría' : locale === 'fr' ? 'Supprimer la Catégorie' : locale === 'de' ? 'Kategorie Löschen' : 'Excluir Categoria')}
                        {modalMode === 'setBudget' && (locale === 'en' ? 'Set Budget' : locale === 'es' ? 'Definir Presupuesto' : locale === 'fr' ? 'Définir le Budget' : locale === 'de' ? 'Budget Festlegen' : 'Definir Orçamento')}
                    </h3>

                    {(modalMode === 'addCat' || modalMode === 'editCat') && (
                        <div className="space-y-4">
                            <input 
                                type="text" 
                                value={itemName} 
                                onChange={(e) => {
                                    // Regex para remover emojis
                                    const noEmoji = e.target.value.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2B50}\u{231A}-\u{231B}\u{23E9}-\u{23EC}\u{23F0}\u{23F3}]/gu, '');
                                    setItemName(noEmoji);
                                }}
                                className="w-full p-3 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-sm font-medium focus:outline-none focus:border-blue-500 transition-all"
                                placeholder={locale === 'en' ? 'Name' : locale === 'es' ? 'Nombre' : locale === 'fr' ? 'Nom' : locale === 'de' ? 'Name' : 'Nome da Categoria'} 
                                autoFocus 
                            />
                            
                            {activeTab === 'despesas' && (
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-neutral-400">
                                        {locale === 'en' ? 'Expense Group (50/30/20)' : locale === 'es' ? 'Grupo de Gasto (50/30/20)' : 'Grupo da Despesa (Método 50/30/20)'}
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setItemGroup('Gastos Fixos')}
                                            className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all ${
                                                itemGroup === 'Gastos Fixos' 
                                                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm' 
                                                    : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-neutral-400 hover:border-slate-300 dark:hover:border-white/10'
                                            }`}
                                        >
                                            {locale === 'en' ? 'Fixed (50%)' : 'Fixos (50%)'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setItemGroup('Gastos Variáveis')}
                                            className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all ${
                                                itemGroup === 'Gastos Variáveis' 
                                                    ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm' 
                                                    : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-neutral-400 hover:border-slate-300 dark:hover:border-white/10'
                                            }`}
                                        >
                                            {locale === 'en' ? 'Variable (30%)' : 'Variáveis (30%)'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setItemGroup('Reserva Financeira')}
                                            className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all ${
                                                itemGroup === 'Reserva Financeira' 
                                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                                    : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-neutral-400 hover:border-slate-300 dark:hover:border-white/10'
                                            }`}
                                        >
                                            {locale === 'en' ? 'Savings (20%)' : 'Reserva (20%)'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Icon Picker */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-neutral-400">
                                    {locale === 'en' ? 'Category Icon' : 'Ícone da Categoria'}
                                </label>
                                <div className="max-h-[160px] overflow-y-auto no-scrollbar rounded-xl border border-slate-200 dark:border-white/[0.08] p-2 bg-slate-100 dark:bg-white/[0.02]">
                                    {/* Sem ícone */}
                                    <div className="mb-2">
                                        <button
                                            type="button"
                                            onClick={() => setItemIcon('')}
                                            className={`h-9 w-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all border ${
                                                itemIcon === '' ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-transparent bg-slate-200/50 dark:bg-white/5 text-slate-400'
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
                                                <p className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-1 ml-0.5">{groupName}</p>
                                                <div className="grid grid-cols-7 gap-1">
                                                    {icons.map(({ iconId, label }) => (
                                                        <button
                                                            key={iconId}
                                                            type="button"
                                                            title={label}
                                                            onClick={() => setItemIcon(iconId)}
                                                            className={`h-9 w-full flex items-center justify-center rounded-xl transition-all border ${
                                                                itemIcon === iconId ? 'border-blue-500 bg-blue-500/15 scale-105 text-blue-500' : 'border-transparent bg-slate-200/40 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-neutral-300'
                                                            }`}
                                                        >
                                                            <CategoryIcon name={iconId} className="h-4 w-4" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {/* Color Picker */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-neutral-400">
                                    {locale === 'en' ? 'Category Color' : 'Cor da Categoria'}
                                </label>
                                <div className="grid grid-cols-6 gap-3 px-1">
                                    {COLOR_PALETTE.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setItemColor(c)}
                                            className={`h-8 w-8 mx-auto rounded-full border-2 transition-all ${
                                                itemColor.toLowerCase() === c.toLowerCase()
                                                    ? 'border-blue-500 ring-4 ring-blue-500/20 scale-110 shadow-md'
                                                    : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                                            }`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {itemError && <p className="text-rose-500 dark:text-rose-400 text-xs font-medium">{itemError}</p>}
                            
                            <div className="flex justify-end gap-2.5 pt-2">
                                <button onClick={closeModal} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/10 text-slate-700 dark:text-neutral-300 font-semibold text-xs transition-all">{t('common.cancel') || 'Cancelar'}</button>
                                <button onClick={handleConfirm} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all">{t('common.saveChanges') || 'Salvar'}</button>
                            </div>
                        </div>
                    )}

                    {modalMode === 'setBudget' && (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-500 dark:text-neutral-400 font-normal leading-relaxed">
                                {locale === 'en' 
                                    ? `Set the monthly spending limit for the category "${itemName}".` 
                                    : `Defina o limite mensal de gastos para a categoria "${itemName}".`}
                            </p>
                            <input 
                                type="tel" 
                                value={itemBudget} 
                                onChange={(e) => setItemBudget(formatCurrencyForInput(e.target.value))}
                                className="w-full py-3 px-4 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white font-bold text-lg text-center outline-none focus:border-blue-500 transition-all"
                                placeholder={`${curSymbol} 0,00`} 
                                autoFocus 
                            />
                            <p className="text-[11px] text-slate-400 dark:text-neutral-500 italic">
                                {locale === 'en'
                                    ? 'You will receive a warning when you reach 80% of this value.'
                                    : 'Você receberá um aviso quando atingir 80% deste valor.'}
                            </p>
                            <div className="flex justify-end gap-2.5 pt-2">
                                <button onClick={closeModal} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/10 text-slate-700 dark:text-neutral-300 font-semibold text-xs transition-all">{t('common.cancel') || 'Cancelar'}</button>
                                <button onClick={handleConfirm} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all">
                                    {locale === 'en' ? 'Confirm' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {modalMode === 'deleteCat' && (
                        <div>
                            {currentItem?.cat && isCategoryInUse(currentItem.cat.name) ? (
                                <div className="space-y-4">
                                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
                                        <InformationCircleIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                                            {locale === 'en'
                                                ? 'This category cannot be deleted because it has recorded transactions.'
                                                : 'Esta categoria não pode ser excluída porque possui transações registradas.'}
                                        </p>
                                    </div>
                                    <p className="text-slate-500 dark:text-neutral-400 text-xs leading-relaxed">
                                        {locale === 'en'
                                            ? `To delete, you must first change the category of all entries that use "${currentItem?.cat?.name}".`
                                            : `Para excluir, você deve primeiro alterar a categoria de todas as transações que utilizam "${currentItem?.cat?.name}".`}
                                    </p>
                                    <div className="pt-2">
                                        <button onClick={closeModal} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all active:scale-95">
                                            {locale === 'en' ? 'Understood' : 'Entendido'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-slate-600 dark:text-neutral-300 text-xs sm:text-sm mb-6 leading-relaxed">
                                        {locale === 'en'
                                            ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
                                            : `Tem certeza que deseja excluir "${itemName}"? Esta ação não poderá ser desfeita.`}
                                    </p>
                                    <div className="flex justify-end gap-2.5">
                                        <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/10 text-slate-700 dark:text-neutral-300 font-semibold text-xs transition-all">{t('common.cancel') || 'Cancelar'}</button>
                                        <button onClick={handleDeleteConfirm} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all">
                                            {locale === 'en' ? 'Delete' : 'Excluir'}
                                        </button>
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
                        <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
                            <InformationCircleIcon className="h-5 w-5" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
                            {locale === 'en' ? '50/30/20 Rule' : 'Método 50/30/20'}
                        </h3>
                    </div>
                    
                    <div className="space-y-4 text-xs text-slate-600 dark:text-neutral-300 leading-relaxed font-normal">
                        <p>
                            {locale === 'en'
                                ? 'The 50/30/20 method is a simple way to organize your finances by dividing your expenses into 3 major groups:'
                                : 'O método 50/30/20 é uma metodologia prática para equilibrar seu orçamento dividindo seus gastos em 3 pilares:'}
                        </p>
                        
                        <div className="space-y-3 bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.06]">
                            <div className="flex gap-3 items-start">
                                <span className="font-bold text-blue-500 text-sm w-10 shrink-0">50%</span> 
                                <div>
                                    <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">
                                        {locale === 'en' ? 'Fixed Expenses' : 'Gastos Fixos (Necessidades)'}
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                                        {locale === 'en'
                                            ? 'Housing, basic bills, groceries, transport. The essential to live.'
                                            : 'Moradia, contas básicas, alimentação essencial e transporte.'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="h-px w-full bg-slate-200/80 dark:border-white/[0.06]"></div>
                            
                            <div className="flex gap-3 items-start">
                                <span className="font-bold text-rose-500 text-sm w-10 shrink-0">30%</span> 
                                <div>
                                    <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">
                                        {locale === 'en' ? 'Variable Expenses' : 'Gastos Variáveis (Estilo de Vida)'}
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                                        {locale === 'en'
                                            ? 'Leisure, restaurants, shopping, hobbies. Things you want, but are not essential.'
                                            : 'Lazer, restaurantes, passeios, compras e assinaturas de entretenimento.'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="h-px w-full bg-slate-200/80 dark:border-white/[0.06]"></div>
                            
                            <div className="flex gap-3 items-start">
                                <span className="font-bold text-brand-accent dark:text-brand-accent-hover text-sm w-10 shrink-0">20%</span> 
                                <div>
                                    <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">
                                        {locale === 'en' ? 'Savings & Investments' : 'Reserva Financeira (Futuro)'}
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                                        {locale === 'en'
                                            ? 'Investments, debt payment, and building an emergency fund.'
                                            : 'Investimentos, quitação de dívidas e reserva de emergência.'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-[11px] text-slate-400 dark:text-neutral-500">
                            {locale === 'en'
                                ? 'Classify your expense categories into these groups and we will generate a monthly infographic in the Finances tab!'
                                : 'Ao classificar suas categorias nestes grupos, o SobControle gera automaticamente gráficos e diagnósticos do seu mês!'}
                        </p>
                    </div>
                    
                    <button onClick={() => setIsInfoModalOpen(false)} className="mt-5 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-all active:scale-95 shadow-sm">
                        {locale === 'en' ? 'Understood' : 'Entendido'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Categories;