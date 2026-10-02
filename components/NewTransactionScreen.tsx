
import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import Calendar from './Calendar';
import {
    ArrowLeftIcon, LoaderIcon, SparklesIcon, CalendarIcon, ChevronDownIcon, CameraIcon,
    CreditCardIcon, BankIcon, ViewGridIcon, CalculatorIcon, AiAgentIcon, WalletIcon
} from './icons';
import CategoryIcon from './CategoryIcon';
import {
    formatCurrencyForInput, parseCurrency, formatDateToInput,
    suggestCategory, suggestCategoryWithAgent, formatCurrency, fileToBase64, analyzeReceipt,
    calculateStatementDate, getMonthKey, formatarMesAno, getCorPorCategoria,
    getTranslatedCategoryName,
    getCategoriesForType,
} from '../utils/helpers';
import { TransactionType, PaymentMethod } from '../types';
import { INITIAL_CATEGORIAS, MESES_NOMES } from '../constants';
import Modal from './Modal';
import ListPickerModal from './ListPickerModal';
import InvoicePickerModal from './InvoicePickerModal';
import { getBankLogo } from './BankLogo';
import { useTranslation } from '../i18n';
import { AiLimitError } from '../utils/aiClient';

type LaunchMode = 'single' | 'installment' | 'recurring';

const NewTransactionScreen: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("NewTransactionScreen must be used within an AppProvider");
    const { t, locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';

    const getValidationErrorMessage = (key: string) => {
        if (locale === 'en') {
            if (key === 'valor') return "Please enter a value.";
            if (key === 'categoria') return "Please select a category.";
            if (key === 'cardId') return "Please select a credit card.";
            if (key === 'accountId') return "Please select an account.";
            if (key === 'originAccount') return "Please select the source account.";
            if (key === 'destinationAccountId') return "Please select the destination account.";
            if (key === 'sameAccount') return "Source and destination accounts must be different.";
            if (key === 'transferDesc') return "Transfer between Accounts";
            if (key === 'newExpense') return "New Expense";
            if (key === 'newIncome') return "New Income";
            if (key === 'aiCategory') return "AI suggested a category!";
            if (key === 'scanSuccess') return "Receipt processed successfully!";
            if (key === 'scanFail') return "Failed to read receipt.";
            if (key === 'scanError') return "Error scanning receipt.";
        }
        if (locale === 'es') {
            if (key === 'valor') return "Por favor ingrese un valor.";
            if (key === 'categoria') return "Por favor seleccione una categoría.";
            if (key === 'cardId') return "Por favor seleccione una tarjeta de crédito.";
            if (key === 'accountId') return "Por favor seleccione una cuenta.";
            if (key === 'originAccount') return "Por favor seleccione la cuenta de origen.";
            if (key === 'destinationAccountId') return "Por favor seleccione la cuenta de destino.";
            if (key === 'sameAccount') return "Las cuentas de origen y destino deben ser diferentes.";
            if (key === 'transferDesc') return "Transferencia entre Cuentas";
            if (key === 'newExpense') return "Nueva Gasto";
            if (key === 'newIncome') return "Nueva Ingreso";
            if (key === 'aiCategory') return "¡IA sugirió una categoría!";
            if (key === 'scanSuccess') return "¡Recibo procesado con éxito!";
            if (key === 'scanFail') return "Error al leer el recibo.";
            if (key === 'scanError') return "Error al escanear el recibo.";
        }
        if (locale === 'fr') {
            if (key === 'valor') return "Veuillez entrer une valeur.";
            if (key === 'categoria') return "Veuillez sélectionner une catégorie.";
            if (key === 'cardId') return "Veuillez sélectionner une carte de crédit.";
            if (key === 'accountId') return "Veuillez sélectionner un compte.";
            if (key === 'originAccount') return "Veuillez sélectionner le compte d'origine.";
            if (key === 'destinationAccountId') return "Veuillez sélectionner le compte de destination.";
            if (key === 'sameAccount') return "Les comptes d'origine et de destination doivent être différents.";
            if (key === 'transferDesc') return "Transfert entre Comptes";
            if (key === 'newExpense') return "Nouvelle Dépense";
            if (key === 'newIncome') return "Nouveau Revenu";
            if (key === 'aiCategory') return "L'IA a suggéré une catégorie !";
            if (key === 'scanSuccess') return "Reçu traité avec succès !";
            if (key === 'scanFail') return "Échec de la lecture du reçu.";
            if (key === 'scanError') return "Erreur lors de la numérisation du reçu.";
        }
        if (locale === 'de') {
            if (key === 'valor') return "Bitte geben Sie einen Wert ein.";
            if (key === 'categoria') return "Bitte wählen Sie eine Kategorie.";
            if (key === 'cardId') return "Bitte wählen Sie eine Kreditkarte.";
            if (key === 'accountId') return "Bitte wählen Sie ein Konto.";
            if (key === 'originAccount') return "Bitte wählen Sie das Herkunftskonto.";
            if (key === 'destinationAccountId') return "Bitte wählen Sie das Zielkonto.";
            if (key === 'sameAccount') return "Herkunfts- und Zielkonto müssen unterschiedlich sein.";
            if (key === 'transferDesc') return "Überweisung zwischen Konten";
            if (key === 'newExpense') return "Neue Ausgabe";
            if (key === 'newIncome') return "Neue Einnahme";
            if (key === 'aiCategory') return "KI hat eine Kategorie vorgeschlagen!";
            if (key === 'scanSuccess') return "Beleg erfolgreich verarbeitet!";
            if (key === 'scanFail') return "Beleg konnte nicht gelesen werden.";
            if (key === 'scanError') return "Fehler beim Scannen des Belegs.";
        }
        // fallback pt
        if (key === 'valor') return "Informe o valor";
        if (key === 'categoria') return "Selecione uma categoria";
        if (key === 'cardId') return "Selecione um cartão";
        if (key === 'accountId') return "Selecione uma conta";
        if (key === 'originAccount') return "Selecione a conta de origem";
        if (key === 'destinationAccountId') return "Selecione a conta de destino";
        if (key === 'sameAccount') return "A conta de destino deve ser diferente da origem";
        if (key === 'transferDesc') return "Transferência entre Contas";
        if (key === 'newExpense') return "Nova Despesa";
        if (key === 'newIncome') return "Nova Receita";
        if (key === 'aiCategory') return "IA sugeriu uma categoria!";
        if (key === 'scanSuccess') return "Recibo processado com sucesso!";
        if (key === 'scanFail') return "Falha ao ler recibo";
        if (key === 'scanError') return "Erro ao escanear recibo.";
        return "";
    };

    // Helper para buscar nome do mês traduzido
    const getMonthName = (monthIndex: number) => {
        const keys = [
            'month.january', 'month.february', 'month.march', 'month.april',
            'month.may', 'month.june', 'month.july', 'month.august',
            'month.september', 'month.october', 'month.november', 'month.december'
        ];
        return t(keys[monthIndex]) || keys[monthIndex];
    };

    const {
        categorias, handleLancamentoSubmit, showToast, handleAddCategory,
        creditCards, setIsNewTransactionOpen, isNewTransactionOpen, allTransactions,
        setCurrentView, setMenuSubView, incrementAiScans, accounts,
        newTransactionInitialType, setNewTransactionInitialType, categoryColors,
        triggerHaptic, userProfile, handleCreateBankAccount
    } = context;

    const initialTipo = newTransactionInitialType === 'entrada' ? 'entrada' : newTransactionInitialType === 'transferencia' ? 'transferencia' : 'saida';
    const initialPaymentMethod = newTransactionInitialType === 'credito' ? 'credito' : 'debito';

    // Form states
    const [formValor, setFormValor] = useState('');
    const [formTipo, setFormTipo] = useState<TransactionType>(initialTipo);
    const [formCategoria, setFormCategoria] = useState('');
    const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>(initialPaymentMethod);
    const [formData, setFormData] = useState(formatDateToInput(new Date()));
    const [formDescricao, setFormDescricao] = useState('');
    const [formCardId, setFormCardId] = useState<string>('');
    const [formAccountId, setFormAccountId] = useState<string>('');
    const [formDestinationAccountId, setFormDestinationAccountId] = useState<string>(''); // For transfers
    const [customStatementDate, setCustomStatementDate] = useState<string | null>(null); // YYYY-MM
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<{
        valor?: boolean;
        descricao?: boolean;
        categoria?: boolean;
        accountId?: boolean;
        cardId?: boolean;
        destinationAccountId?: boolean;
    }>({});

    // UI states
    const [activePicker, setActivePicker] = useState<'category' | 'card' | 'statement' | 'account' | 'destinationAccount' | null>(null);
    const [launchMode, setLaunchMode] = useState<LaunchMode>('single');
    const [recurrenceQuantity, setRecurrenceQuantity] = useState('12');
    const [installmentCount, setInstallmentCount] = useState('2');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [isCategorizing, setIsCategorizing] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isScanSourceModalOpen, setIsScanSourceModalOpen] = useState(false);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [calcExpression, setCalcExpression] = useState('');
    const [calcResult, setCalcResult] = useState<number | null>(null);

    const livePreview = useMemo(() => {
        if (!calcExpression) return null;
        const ops = ['+', '-', '×', '÷'];
        const hasOp = ops.some(op => calcExpression.includes(op));
        if (!hasOp) return null;
        const lastChar = calcExpression.slice(-1);
        const exprToEval = ops.includes(lastChar) ? calcExpression.slice(0, -1) : calcExpression;
        if (!exprToEval || ops.some(op => exprToEval.endsWith(op))) return null;
        try {
            const expr = exprToEval.replace(/,/g, '.').replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-');
            // eslint-disable-next-line no-new-func
            const r = new Function(`return (${expr})`)() as number;
            if (typeof r === 'number' && isFinite(r)) return r;
        } catch {}
        return null;
    }, [calcExpression]);

    // Auto-dismiss de erros de validação após 3 segundos
    useEffect(() => {
        if (Object.keys(validationErrors).length > 0) {
            const timer = setTimeout(() => {
                setValidationErrors({});
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [validationErrors]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handleCalcKey = (key: string) => {
        const ops = ['+', '-', '×', '÷'];
        if (key === 'C') {
            setCalcExpression('');
            setCalcResult(null);
            return;
        }
        if (key === 'DEL' || key === '⌫' || key === 'BACKSPACE') {
            setCalcExpression(prev => prev.slice(0, -1));
            setCalcResult(null);
            return;
        }
        if (key === '=') {
            try {
                const expr = calcExpression.replace(/,/g, '.').replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-');
                // eslint-disable-next-line no-new-func
                const r = new Function(`return (${expr})`)() as number;
                if (typeof r === 'number' && isFinite(r)) setCalcResult(r);
            } catch {}
            return;
        }
        if (calcResult !== null && !ops.includes(key)) {
            setCalcExpression(key === ',' ? '0,' : key);
            setCalcResult(null);
            return;
        }
        if (calcResult !== null && ops.includes(key)) {
            setCalcExpression(String(Math.round(calcResult * 100) / 100).replace('.', ',') + key);
            setCalcResult(null);
            return;
        }
        setCalcResult(null);
        const lastChar = calcExpression.slice(-1);
        if (ops.includes(key) && (ops.includes(lastChar) || calcExpression === '')) return;
        setCalcExpression(prev => prev + key);
    };

    const handleCalcApply = () => {
        let value: number | null = calcResult;
        if (value === null && calcExpression) {
            try {
                const expr = calcExpression.replace(/,/g, '.').replace(/÷/g, '/').replace(/×/g, '*');
                // eslint-disable-next-line no-new-func
                const r = new Function(`return (${expr})`)() as number;
                if (typeof r === 'number' && isFinite(r)) value = r;
            } catch {}
        }
        if (value !== null && value > 0) {
            setFormValor(formatCurrencyForInput(String(Math.round(value * 100))));
            setValidationErrors(prev => ({ ...prev, valor: false }));
        }
        setIsCalculatorOpen(false);
        setCalcExpression('');
        setCalcResult(null);
    };

    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const selectedCard = creditCards.find(c => c.id === formCardId);

    // Reseta a fatura personalizada ao trocar data ou cartão para garantir consistência inicial,
    // mas não queremos impedir o usuario de mudar manualmente depois.
    useEffect(() => {
        setCustomStatementDate(null);
    }, [formData, formCardId, formPaymentMethod]);

    useEffect(() => {
        if (formTipo === 'transferencia') return; // Transfer doesn't have categories
        const categoryList = categorias[formTipo]?.map(c => c.name) || [];
        if (!formCategoria || !categoryList.includes(formCategoria)) {
            setFormCategoria(categoryList[0] || '');
        }
    }, [formTipo, categorias]);

    useEffect(() => {
        if (isNewTransactionOpen) {
            const initialData = context.newTransactionInitialData;
            const initialTipoComputed = initialData?.tipo || (newTransactionInitialType === 'entrada' ? 'entrada' : newTransactionInitialType === 'transferencia' ? 'transferencia' : 'saida');
            const initialPaymentMethodComputed = initialData?.paymentMethod || (newTransactionInitialType === 'credito' ? 'credito' : 'debito');
            
            setFormTipo(initialTipoComputed);
            setFormPaymentMethod(initialPaymentMethodComputed);
            
            if (initialData?.valor) {
                setFormValor(formatCurrencyForInput(initialData.valor.toFixed(2)));
            } else {
                setFormValor('');
            }

            if (initialData?.descricao) {
                setFormDescricao(initialData.descricao);
            } else {
                setFormDescricao('');
            }

            setFormCardId('');
            setFormAccountId('');
            setFormDestinationAccountId('');
            setFormData(formatDateToInput(new Date()));
            setValidationErrors({});
            // Reset to first category of the new type
            setFormCategoria(initialTipoComputed === 'transferencia' ? 'Transferência' : INITIAL_CATEGORIAS[initialTipoComputed]?.[0]?.name || 'Outros');
            setLaunchMode('single');
            setShowAdvanced(false);
        }
    }, [isNewTransactionOpen, newTransactionInitialType, context.newTransactionInitialData]);

    // Usuário novo, sem conta: em vez de bloquear o lançamento ("cadastre uma conta
    // primeiro"), cria uma Carteira automaticamente ao registrar.
    const willCreateWallet = accounts.length === 0 && formPaymentMethod !== 'credito' && formTipo !== 'transferencia';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setValidationErrors({});
        const valorNumerico = parseCurrency(formValor);

        const errors: typeof validationErrors = {};
        const errorMessages: string[] = [];

        if (valorNumerico <= 0) {
            errors.valor = true;
            errorMessages.push(getValidationErrorMessage('valor'));
        }

        if (formTipo !== 'transferencia' && !formCategoria) {
            errors.categoria = true;
            errorMessages.push(getValidationErrorMessage('categoria'));
        }
        
        if (formPaymentMethod === 'credito') {
            if (!formCardId) {
                errors.cardId = true;
                errorMessages.push(getValidationErrorMessage('cardId'));
            }
            if (!formAccountId) {
                errors.accountId = true;
                errorMessages.push(getValidationErrorMessage('accountId'));
            }
        } else {
            if (!formAccountId && !willCreateWallet) {
                errors.accountId = true;
                errorMessages.push(formTipo === 'transferencia' ? getValidationErrorMessage('originAccount') : getValidationErrorMessage('accountId'));
            }
        }
        
        if (formTipo === 'transferencia') {
            if (!formDestinationAccountId) {
                errors.destinationAccountId = true;
                errorMessages.push(getValidationErrorMessage('destinationAccountId'));
            }
            if (formAccountId && formDestinationAccountId && formAccountId === formDestinationAccountId) {
                errors.destinationAccountId = true;
                errorMessages.push(getValidationErrorMessage('sameAccount'));
            }
        }

        if (errorMessages.length > 0) {
            setValidationErrors(errors);
            setError(errorMessages.join('; '));
            try { triggerHaptic(); } catch {}
            return;
        }

        let accountId = formAccountId;
        if (willCreateWallet) {
            accountId = handleCreateBankAccount({
                bankName: t('newTx.defaultWallet'),
                accountType: 'Dinheiro',
                balance: 0,
                color: '#10B981',
                initialDate: formData,
            });
        }

        handleLancamentoSubmit(e, {
            valor: valorNumerico,
            tipo: formTipo,
            categoria: formCategoria,
            data: formData,
            paymentMethod: formPaymentMethod,
            descricao: formTipo === 'transferencia' ? formDescricao || getValidationErrorMessage('transferDesc') : formDescricao || (formTipo === 'saida' ? getValidationErrorMessage('newExpense') : getValidationErrorMessage('newIncome')),
            cardId: formPaymentMethod === 'credito' ? formCardId : undefined,
            accountId,
            destinationAccountId: formTipo === 'transferencia' ? formDestinationAccountId : undefined,
            isRecurring: launchMode === 'recurring',
            isInstallment: launchMode === 'installment',
            installmentCount: launchMode === 'installment' ? installmentCount : undefined,
            recurrenceQuantity: launchMode === 'recurring' ? recurrenceQuantity : undefined,
            customStatementDate: formPaymentMethod === 'credito' ? customStatementDate : undefined,
        });

        setIsNewTransactionOpen(false);
    };

    const handleManualAiCategorize = async (overrideDesc?: string) => {
        // Transferência não tem categoria
        if (formTipo === 'transferencia') return;
        const desc = overrideDesc || formDescricao;
        if (!desc.trim()) {
            showToast(
                locale === 'en' ? 'Type a description first so the AI Agent can analyze!' : 'Digite uma descrição para o Agente IA analisar!',
                'info'
            );
            return;
        }
        setIsCategorizing(true);
        try {
            const result = await suggestCategoryWithAgent(desc, formTipo, categorias);
            
            if (result.action === 'create' && result.newCategory) {
                // Verificação estrita do limite do plano gratuito (15 categorias por tipo)
                const typeCategories = getCategoriesForType(categorias, formTipo);
                const isAtCategoryLimit = !userProfile.isPremium && typeCategories.length >= 15;
                
                if (isAtCategoryLimit) {
                    // Limite PRO atingido: não cria para não exceder o limite!
                    const fallbackCat = typeCategories.find(c => c.name.toLowerCase().includes('outro'))
                        || typeCategories[0];
                    const fallbackName = fallbackCat ? fallbackCat.name : 'Outros';
                    
                    setFormCategoria(fallbackName);
                    showToast(
                        locale === 'en' 
                            ? `Limit of 15 free categories reached! Defined as "${fallbackName}". Go PRO to create unlimited categories!`
                            : `Limite de 15 categorias gratuitas atingido! Definida como "${fallbackName}". Seja PRO para criar ilimitadas!`,
                        'info'
                    );
                } else {
                    // Usuário é PRO ou possui limite disponível (< 15)
                    const newCat = result.newCategory;
                    const newCatName = newCat.name.trim();
                    
                    handleAddCategory(
                        formTipo,
                        newCatName,
                        newCat.bucket || 'desejos',
                        newCat.group || 'Gastos Variáveis',
                        newCat.icon || 'tag'
                    );
                    setFormCategoria(newCatName);
                    showToast(
                        locale === 'en'
                            ? `🤖 AI Agent created category "${newCatName}"!`
                            : `🤖 Agente IA criou a categoria "${newCatName}"!`,
                        'success'
                    );
                }
            } else {
                // Correspondência com categoria existente
                setFormCategoria(result.categoryName);
                showToast(
                    locale === 'en' 
                        ? `🤖 AI classified as "${result.categoryName}"` 
                        : `🤖 Agente IA definiu "${result.categoryName}"`, 
                    'success'
                );
            }
        } catch (err: any) {
            console.error("AI Category Error:", err);
            showToast(
                locale === 'en' ? 'Could not categorize with AI right now.' : 'Não foi possível classificar com o Agente IA agora.',
                'error'
            );
        } finally {
            setIsCategorizing(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!userProfile.isPremium) {
            setIsNewTransactionOpen(false);
            showToast(locale === 'en' ? 'Receipt Scanner with AI is a PRO feature!' : locale === 'es' ? '¡El escáner de recibos con IA es una función PRO!' : locale === 'fr' ? 'Le scanner de reçus avec IA est une fonctionnalité PRO !' : locale === 'de' ? 'Der Beleg-Scanner mit KI ist eine PRO-Funktion!' : 'O Scanner de comprovantes com IA é um recurso exclusivo PRO!', 'info');
            setCurrentView('premium');
            return;
        }

        setIsScanning(true);
        setIsScanSourceModalOpen(false);
        setError(null);

        try {
            const base64 = await fileToBase64(file);
            const result = await analyzeReceipt(base64, file.type, categorias);

            setFormValor(formatCurrencyForInput(String(Math.round(result.valor * 100))));
            setFormDescricao(result.descricao);
            setFormData(result.data);
            setFormCategoria(result.categoria);
            setFormTipo('saida');
            setFormPaymentMethod('debito');

            incrementAiScans();
            showToast(getValidationErrorMessage('scanSuccess'), "success");

        } catch (err: any) {
            if (err instanceof AiLimitError) {
                setError(t('aichat.limitReached'));
                showToast(t('aichat.limitReached'), "info");
                return;
            }
            setError(err.message || getValidationErrorMessage('scanError'));
            showToast(getValidationErrorMessage('scanFail'), "error");
        } finally {
            setIsScanning(false);
            if (cameraInputRef.current) cameraInputRef.current.value = '';
            if (galleryInputRef.current) galleryInputRef.current.value = '';
        }
    };

    const handleGoToCardRegistration = () => {
        setIsNewTransactionOpen(false);
        setMenuSubView('cards');
        setCurrentView('menu');
    };

    const installmentValue = useMemo(() => {
        const total = parseCurrency(formValor);
        const count = parseInt(installmentCount, 10) || 1;
        return count > 0 ? total / count : 0;
    }, [formValor, installmentCount]);

    const paymentMethods: { id: PaymentMethod, label: string, icon: React.ReactNode }[] = [
        { id: 'debito', label: 'Débito', icon: <BankIcon /> },
        { id: 'credito', label: 'Crédito', icon: <CreditCardIcon /> },
    ];

    // Data padrão da fatura baseada na data da compra e fechamento do cartão
    const defaultStatementDate = useMemo(() => {
        if (!selectedCard) return getMonthKey(new Date(formData + 'T00:00:00'));
        return calculateStatementDate(formData, selectedCard);
    }, [formData, selectedCard]);



    const currentStatementLabel = useMemo(() => {
        const key = customStatementDate || defaultStatementDate;
        const [year, month] = key.split('-');
        return `${getMonthName(parseInt(month) - 1)} ${year}`;
    }, [customStatementDate, defaultStatementDate, locale]);

    // Cores contextuais dinâmicas baseadas na aba ativa
    const currentTabActive = formPaymentMethod === 'credito' ? 'credito'
        : formTipo === 'entrada' ? 'entrada'
        : formTipo === 'transferencia' ? 'transferencia' : 'saida';

    const labelColor = 'text-xs font-medium text-slate-600 dark:text-neutral-400';

    const headerBorder = currentTabActive === 'entrada' ? 'border-b-emerald-500/20'
        : currentTabActive === 'credito' ? 'border-b-purple-500/20'
        : currentTabActive === 'transferencia' ? 'border-b-blue-500/20' : 'border-b-rose-500/20';

    const submitBtn = currentTabActive === 'entrada'
        ? { text: locale === 'en' ? 'Register Income' : locale === 'es' ? 'Registrar Ingreso' : locale === 'fr' ? 'Enregistrer le Revenu' : locale === 'de' ? 'Einnahme Registrieren' : 'Registrar Receita', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' }
        : currentTabActive === 'credito'
        ? { text: locale === 'en' ? 'Charge to Card' : locale === 'es' ? 'Cargar a la Tarjeta' : locale === 'fr' ? 'Débiter de la Carte' : locale === 'de' ? 'Karte Belasten' : 'Lançar no Cartão', cls: 'bg-purple-600 hover:bg-purple-700 text-white shadow-md' }
        : currentTabActive === 'transferencia'
        ? { text: locale === 'en' ? 'Transfer' : locale === 'es' ? 'Transferir' : locale === 'fr' ? 'Transférer' : locale === 'de' ? 'Überweisen' : 'Transferir', cls: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' }
        : { text: locale === 'en' ? 'Register Expense' : locale === 'es' ? 'Registrar Gasto' : locale === 'fr' ? 'Enregistrer la Dépense' : locale === 'de' ? 'Ausgabe Registrieren' : 'Registrar Despesa', cls: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md' };

    // Handler para alterar a aba ativa na NewTransactionScreen
    const handleTabChange = (tab: 'saida' | 'entrada' | 'transferencia' | 'credito') => {
        if (tab === 'saida') {
            setFormTipo('saida');
            setFormPaymentMethod('debito');
            setLaunchMode('single');
            setFormCategoria(categorias['saida']?.[0]?.name || 'Outros');
        } else if (tab === 'entrada') {
            setFormTipo('entrada');
            setFormPaymentMethod('debito');
            setLaunchMode('single');
            setFormCategoria(categorias['entrada']?.[0]?.name || 'Outros');
        } else if (tab === 'transferencia') {
            setFormTipo('transferencia');
            setFormPaymentMethod('debito');
            setLaunchMode('single');
            setFormCategoria('Transferência');
        } else if (tab === 'credito') {
            setFormTipo('saida');
            setFormPaymentMethod('credito');
            setLaunchMode('single');
            setFormCategoria(categorias['saida']?.[0]?.name || 'Outros');
        }
        setError(null);
    };

    return (
        <div className="bg-light-card-elevated dark:bg-dark-bg h-full flex flex-col overflow-hidden text-light-text dark:text-dark-text transition-colors duration-300 animate-in fade-in slide-in-from-bottom-6 duration-300">
            <header className={`p-4 border-b-2 ${headerBorder} bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md sticky top-0 z-20 flex flex-col gap-3 pt-[calc(1rem+env(safe-area-inset-top))] transition-colors duration-300`}>
                <div className="flex items-center justify-between gap-4 w-full">
                    <button onClick={() => setIsNewTransactionOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-dark-surface transition">
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h1 className="text-base font-semibold text-center flex-grow text-light-text dark:text-dark-text tracking-tight">
                        {currentTabActive === 'entrada' ? (locale === 'en' ? 'New Income' : locale === 'es' ? 'Nueva Ingreso' : locale === 'fr' ? 'Nouveau Revenu' : locale === 'de' ? 'Neue Einnahme' : 'Nova Receita') 
                        : currentTabActive === 'saida' ? (locale === 'en' ? 'New Expense' : locale === 'es' ? 'Nuevo Gasto' : locale === 'fr' ? 'Nouvelle Dépense' : locale === 'de' ? 'Neue Ausgabe' : 'Nova Despesa') 
                        : currentTabActive === 'credito' ? (locale === 'en' ? 'Credit Card' : locale === 'es' ? 'Tarjeta de Crédito' : locale === 'fr' ? 'Carte de Crédit' : locale === 'de' ? 'Kreditkarte' : 'Cartão de Crédito') 
                        : currentTabActive === 'transferencia' ? (locale === 'en' ? 'Transfer' : locale === 'es' ? 'Transferencia' : locale === 'fr' ? 'Transfert' : locale === 'de' ? 'Überweisung' : 'Transferência') 
                        : (locale === 'en' ? 'New Transaction' : locale === 'es' ? 'Nueva Transacción' : locale === 'fr' ? 'Nouvelle Transaction' : locale === 'de' ? 'Neue Transaktion' : 'Novo Lançamento')}
                    </h1>
                    <div className="w-10"></div>
                </div>

                {/* Seletor de 4 opções superior (Abas) */}
                <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-dark-card p-1 rounded-2xl w-full">
                    <button
                        type="button"
                        onClick={() => handleTabChange('saida')}
                        className={`py-2 rounded-xl font-medium text-xs transition-all duration-200 ${currentTabActive === 'saida' ? 'bg-rose-600/90 text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white'}`}
                    >
                        {locale === 'en' ? 'Expense' : locale === 'es' ? 'Gasto' : locale === 'fr' ? 'Dépense' : locale === 'de' ? 'Ausgabe' : 'Despesa'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange('entrada')}
                        className={`py-2 rounded-xl font-medium text-xs transition-all duration-200 ${currentTabActive === 'entrada' ? 'bg-emerald-600/90 text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white'}`}
                    >
                        {locale === 'en' ? 'Income' : locale === 'es' ? 'Ingreso' : locale === 'fr' ? 'Revenu' : locale === 'de' ? 'Einnahme' : 'Receita'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange('transferencia')}
                        className={`py-2 rounded-xl font-medium text-xs transition-all duration-200 ${currentTabActive === 'transferencia' ? 'bg-blue-600/90 text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white'}`}
                    >
                        {locale === 'en' ? 'Transfer' : locale === 'es' ? 'Transf.' : locale === 'fr' ? 'Transf.' : locale === 'de' ? 'Überw.' : 'Transf.'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange('credito')}
                        className={`py-2 rounded-xl font-medium text-xs transition-all duration-200 ${currentTabActive === 'credito' ? 'bg-purple-600/90 text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white'}`}
                    >
                        {locale === 'en' ? 'Card' : locale === 'es' ? 'Tarjeta' : locale === 'fr' ? 'Carte' : locale === 'de' ? 'Karte' : 'Cartão'}
                    </button>
                </div>
            </header>

            <main className="p-3 space-y-3 overflow-y-auto no-scrollbar pb-6">
                {/* Scanner - apenas para despesas e crédito */}
                {(currentTabActive === 'saida' || currentTabActive === 'credito') && (
                    <div className="bg-white dark:bg-dark-card p-2 rounded-2xl shadow-sm border border-light-border dark:border-dark-elevated">
                        <button
                            type="button"
                            onClick={() => {
                                if (!userProfile.isPremium) {
                                    setIsNewTransactionOpen(false);
                                    showToast(locale === 'en' ? 'Receipt Scanner with AI is a PRO feature!' : locale === 'es' ? '¡El escáner de recibos con IA es una función PRO!' : locale === 'fr' ? 'Le scanner de reçus avec IA est une fonctionnalité PRO !' : locale === 'de' ? 'Der Beleg-Scanner mit KI ist eine PRO-Funktion!' : 'O Scanner de comprovantes com IA é um recurso exclusivo PRO!', 'info');
                                    setCurrentView('premium');
                                    return;
                                }
                                setIsScanSourceModalOpen(true);
                            }}
                            disabled={isScanning}
                            className="w-full flex items-center justify-center gap-2.5 py-2.5 border-2 border-dashed border-dark-accent/30 dark:border-dark-accent/20 rounded-xl hover:bg-[#3B82F6]/5 transition-all active:scale-[0.99]"
                        >
                            {isScanning ? (
                                <>
                                    <LoaderIcon className="h-4 w-4 animate-spin text-[#3B82F6]" />
                                    <span className="text-xs font-semibold text-[#3B82F6]">
                                        {locale === 'en' ? 'Scanning Receipt...' : locale === 'es' ? 'Escaneando Recibo...' : locale === 'fr' ? 'Numérisation du Reçu...' : locale === 'de' ? 'Beleg Scannen...' : 'Lendo Recibo...'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <CameraIcon className="h-5 w-5 text-[#3B82F6]" />
                                    <span className="text-xs font-semibold text-[#3B82F6]">
                                        {locale === 'en' ? 'Scan Receipt' : locale === 'es' ? 'Escanear Recibo' : locale === 'fr' ? 'Scanner le Reçu' : locale === 'de' ? 'Beleg Scannen' : 'Escanear Recibo'}
                                    </span>
                                    {!userProfile.isPremium && (
                                        <span className="bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded ml-1">
                                            PRO
                                        </span>
                                    )}
                                </>
                            )}
                        </button>

                        <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
                        <input type="file" ref={galleryInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    </div>
                )}

                {/* Hidden file inputs quando scanner não está visível */}
                {!(newTransactionInitialType === 'saida' || newTransactionInitialType === 'credito') && (
                    <>
                        <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
                        <input type="file" ref={galleryInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    </>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {formPaymentMethod === 'credito' && (
                        <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-dark-bg p-1 rounded-xl">
                            <button type="button" onClick={() => setFormTipo('saida')} className={`py-2 rounded-lg font-medium text-xs transition-all ${formTipo === 'saida' ? 'bg-white dark:bg-dark-card text-red-500 font-semibold shadow-sm' : 'text-slate-500 dark:text-neutral-400'}`}>
                                {locale === 'en' ? 'Expense' : locale === 'es' ? 'Gasto' : locale === 'fr' ? 'Dépense' : locale === 'de' ? 'Ausgabe' : 'Despesa'}
                            </button>
                            <button type="button" onClick={() => setFormTipo('entrada')} className={`py-2 rounded-lg font-medium text-xs transition-all ${formTipo === 'entrada' ? 'bg-white dark:bg-dark-card text-emerald-500 font-semibold shadow-sm' : 'text-slate-500 dark:text-neutral-400'}`}>
                                {locale === 'en' ? 'Refund' : locale === 'es' ? 'Reembolso' : locale === 'fr' ? 'Remboursement' : locale === 'de' ? 'Rückerstattung' : 'Reembolso'}
                            </button>
                        </div>
                    )}

                    {/* Valor - Hero (#1) */}
                    <div className={`text-center py-3 bg-white dark:bg-dark-card rounded-2xl border transition-all duration-200 ${validationErrors.valor ? 'border-red-500/80 dark:border-red-500/60 animate-shake shadow-lg shadow-red-500/5' : 'border-light-border dark:border-dark-elevated'}`}>
                        <label className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1 block">{t('newTx.value')}</label>
                        <div className="relative flex items-center justify-center">
                            <input
                                type="tel"
                                value={formValor}
                                onChange={e => {
                                    setFormValor(formatCurrencyForInput(e.target.value));
                                    setValidationErrors(prev => ({ ...prev, valor: false }));
                                }}
                                className="w-full text-center text-3xl font-extrabold bg-transparent outline-none text-light-text dark:text-dark-text placeholder:text-slate-300 dark:placeholder:text-slate-700 px-12 tabular-nums font-mono"
                                placeholder={formatCurrency(0, appLocale, appCurrency)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => { setCalcExpression(formValor ? parseCurrency(formValor).toString().replace('.', ',') : ''); setCalcResult(null); setIsCalculatorOpen(true); }}
                                className="absolute right-3 p-2 text-slate-400 hover:text-[#3B82F6] active:scale-90 transition-all"
                                title={locale === 'en' ? 'Open calculator' : locale === 'es' ? 'Abrir calculadora' : locale === 'fr' ? 'Ouvrir la calculatrice' : locale === 'de' ? 'Taschenrechner öffnen' : 'Abrir calculadora'}
                            >
                                <CalculatorIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Linha 1: Data e Conta/Cartão */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Data */}
                        <div className="space-y-1">
                            <label className={labelColor}>
                                {locale === 'en' ? 'When?' : locale === 'es' ? '¿Cuándo?' : locale === 'fr' ? 'Quand?' : locale === 'de' ? 'Wann?' : 'Quando?'}
                            </label>
                            <button type="button" onClick={() => setIsCalendarOpen(true)} className="w-full py-2.5 px-3 bg-white dark:bg-dark-card text-light-text dark:text-dark-text rounded-xl text-left flex justify-between items-center font-medium text-xs border border-light-border dark:border-dark-elevated hover:bg-slate-50 dark:hover:bg-dark-bg transition-all">
                                <span>{new Date(formData + 'T00:00:00').toLocaleDateString(appLocale, { day: '2-digit', month: '2-digit' })}</span>
                                <CalendarIcon className="h-4 w-4 text-[#3B82F6]" />
                            </button>
                        </div>

                        {/* Conta (se não for crédito) ou Cartão (se for crédito) */}
                        {formPaymentMethod !== 'credito' ? (
                            <div className="space-y-1">
                                <label className={labelColor}>
                                    {formTipo === 'transferencia' ? (locale === 'en' ? 'Source' : locale === 'es' ? 'Origen' : locale === 'fr' ? 'Source' : locale === 'de' ? 'Quelle' : 'Origem') : t('newTx.whichAccount')}
                                </label>
                                {accounts.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setActivePicker('account')}
                                        className={`w-full py-2.5 px-3 bg-white dark:bg-dark-card text-light-text dark:text-dark-text rounded-xl text-left flex justify-between items-center font-medium text-xs border hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 ${
                                            validationErrors.accountId 
                                                ? 'border-red-500/80 dark:border-red-500/60 animate-shake' 
                                                : 'border-light-border dark:border-dark-elevated'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            {(() => {
                                                const account = accounts.find(a => a.id === formAccountId);
                                                if (!account) return <div className="h-3 w-3 rounded-full flex-shrink-0 bg-slate-400" />;
                                                const logo = getBankLogo(account.bankName, "w-5 h-5 rounded-full flex-shrink-0 overflow-hidden");
                                                return logo || <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: account.color || '#3B82F6' }} />;
                                            })()}
                                            <span className={`truncate text-xs ${formAccountId ? '' : 'opacity-65'}`}>{accounts.find(a => a.id === formAccountId)?.bankName || (locale === 'en' ? 'Select...' : locale === 'es' ? 'Selec...' : 'Selecionar...')}</span>
                                        </div>
                                        <ChevronDownIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    </button>
                                ) : willCreateWallet ? (
                                    <div className="w-full py-2 px-3 bg-white dark:bg-dark-card text-light-text dark:text-dark-text rounded-xl border border-light-border dark:border-dark-elevated flex items-center gap-2">
                                        <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0">
                                            <WalletIcon className="h-3 w-3" />
                                        </span>
                                        <div className="min-w-0 leading-tight">
                                            <p className="text-xs font-medium truncate">{t('newTx.defaultWallet')}</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{t('newTx.defaultWalletHint')}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => { setIsNewTransactionOpen(false); setCurrentView('openfinance'); }}
                                        className="w-full py-2.5 px-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-center font-bold text-[10px] border border-rose-100 dark:border-rose-900/30 tracking-tight"
                                    >
                                        {t('newTx.addAccountFirst')}
                                    </button>
                                )}
                            </div>
                        ) : (
                            /* Cartão de Crédito */
                            <div className="space-y-1">
                                <label className={labelColor}>{t('newTx.whichCard')}</label>
                                {creditCards.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setActivePicker('card')}
                                        className={`w-full py-2.5 px-3 bg-purple-50/70 dark:bg-purple-950/20 text-purple-900 dark:text-purple-100 rounded-xl text-left flex justify-between items-center border transition-all duration-200 ${
                                            validationErrors.cardId 
                                                ? 'border-red-500/80 dark:border-red-500/60 animate-shake' 
                                                : 'border-purple-200/80 dark:border-purple-800/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedCard?.color || '#9333EA' }} />
                                            <span className={`font-medium text-xs truncate ${formCardId ? '' : 'opacity-65'}`}>
                                                {selectedCard?.name || t('newTx.selectCard')}
                                            </span>
                                        </div>
                                        <ChevronDownIcon className="h-4 w-4 text-purple-400 flex-shrink-0" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleGoToCardRegistration}
                                        className="w-full py-2 px-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-center font-medium text-xs border border-rose-100 dark:border-rose-900/30 tracking-tight"
                                    >
                                        {locale === 'en' ? 'Add card' : 'Adicionar cartão'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Caso Crédito: Linha 2 com Fatura e Débito */}
                    {formPaymentMethod === 'credito' && creditCards.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                            {/* Fatura */}
                            <div className="space-y-1">
                                <label className={labelColor}>{t('newTx.changeInvoice')}</label>
                                <button type="button" onClick={() => setActivePicker('statement')} className="w-full py-2.5 px-3 bg-white dark:bg-dark-card text-light-text dark:text-dark-text rounded-xl text-left flex justify-between items-center border border-light-border dark:border-dark-elevated focus:border-dark-accent transition-all">
                                    <span className="font-medium text-xs truncate">{currentStatementLabel}</span>
                                    <ChevronDownIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                </button>
                            </div>

                            {/* Débito */}
                            <div className="space-y-1">
                                <label className={labelColor}>{t('newTx.invoiceDebitAccount')}</label>
                                {accounts.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setActivePicker('account')}
                                        className={`w-full py-2.5 px-3 bg-white dark:bg-dark-card text-light-text dark:text-dark-text rounded-xl text-left flex justify-between items-center font-medium text-xs border hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 ${
                                            validationErrors.accountId 
                                                ? 'border-red-500/80 dark:border-red-500/60 animate-shake' 
                                                : 'border-light-border dark:border-dark-elevated'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            {(() => {
                                                const account = accounts.find(a => a.id === formAccountId);
                                                if (!account) return <div className="h-3 w-3 rounded-full flex-shrink-0 bg-slate-400" />;
                                                const logo = getBankLogo(account.bankName, "w-5 h-5 rounded-full flex-shrink-0 overflow-hidden");
                                                return logo || <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: account.color || '#3B82F6' }} />;
                                            })()}
                                            <span className={`truncate text-xs ${formAccountId ? '' : 'opacity-65'}`}>{accounts.find(a => a.id === formAccountId)?.bankName || (locale === 'en' ? 'Select...' : 'Débito...')}</span>
                                        </div>
                                        <ChevronDownIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => { setIsNewTransactionOpen(false); setCurrentView('openfinance'); }}
                                        className="w-full py-2.5 px-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-center font-bold text-[10px] border border-rose-100 dark:border-rose-900/30 uppercase tracking-tight"
                                    >
                                        {t('newTx.addAccountFirst')}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Caso Transferência: Conta Destino */}
                    {formTipo === 'transferencia' && (
                        <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                            <label className={`${labelColor} ml-1`}>
                                {locale === 'en' ? 'Destination Account' : locale === 'es' ? 'Cuenta de Destino' : locale === 'fr' ? 'Compte Destinataire' : locale === 'de' ? 'Zielkonto' : 'Conta de Destino'}
                            </label>
                            {accounts.length > 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setActivePicker('destinationAccount')}
                                    className={`w-full py-2.5 px-4 bg-white dark:bg-dark-card text-light-text dark:text-dark-text rounded-xl text-left flex justify-between items-center font-semibold text-sm border hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 ${
                                        validationErrors.destinationAccountId 
                                            ? 'border-red-500/80 dark:border-red-500/60 animate-shake' 
                                            : 'border-light-border dark:border-dark-elevated focus:border-blue-500'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 truncate">
                                        {(() => {
                                            const account = accounts.find(a => a.id === formDestinationAccountId);
                                            if (!account) return <div className="h-3 w-3 rounded-full flex-shrink-0 bg-slate-400" />;
                                            const logo = getBankLogo(account.bankName, "w-5 h-5 rounded-full flex-shrink-0 overflow-hidden");
                                            return logo || <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: account.color || '#94A3B8' }} />;
                                        })()}
                                        <span className={`truncate ${formDestinationAccountId ? '' : 'opacity-50'}`}>{accounts.find(a => a.id === formDestinationAccountId)?.bankName || (locale === 'en' ? 'Select destination account...' : 'Selecionar conta de destino...')}</span>
                                    </div>
                                    <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                                </button>
                            ) : (
                                <p className="text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                                    {locale === 'en' ? 'You need at least 2 accounts to transfer.' : locale === 'es' ? 'Necesitas al menos 2 cuentas para transferir.' : locale === 'fr' ? "Vous avez besoin d'au menos 2 comptes pour transférer." : locale === 'de' ? 'Sie benötigen mindestens 2 Konten für eine Überweisung.' : 'Você precisa de pelo menos 2 contas para transferir.'}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Descrição e Categoria Lado a Lado (Exceto Transferência) */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Descrição */}
                        <div className="space-y-1">
                            <label className={`${labelColor} ml-1`}>{t('newTx.description')}</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={locale === 'en' ? 'Ex: Rent...' : 'Ex: Aluguel...'}
                                    value={formDescricao}
                                    onChange={(e) => {
                                        setFormDescricao(e.target.value);
                                        setValidationErrors(prev => ({ ...prev, descricao: false }));
                                    }}
                                    className={`w-full py-2.5 pl-3 pr-14 bg-white dark:bg-dark-card text-light-text dark:text-dark-text rounded-xl font-medium text-sm border outline-none transition-all duration-200 ${
                                        validationErrors.descricao 
                                            ? 'border-red-500/80 dark:border-red-500/60 animate-shake' 
                                            : 'border-light-border dark:border-dark-elevated focus:border-dark-accent'
                                    }`}
                                    maxLength={30}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleManualAiCategorize()}
                                    disabled={isCategorizing}
                                    title={
                                        formDescricao.trim()
                                            ? (locale === 'en' ? 'Ask AI Agent to classify or create category' : 'Pedir ao Agente IA para classificar ou criar categoria')
                                            : (locale === 'en' ? 'Type a description for AI Agent to analyze' : 'Digite uma descrição para o Agente IA analisar')
                                    }
                                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-1 rounded-lg border transition-all duration-200 active:scale-90 ${
                                        isCategorizing
                                            ? 'bg-blue-500/15 border-blue-500/30 text-blue-500 animate-pulse'
                                            : formDescricao.trim()
                                            ? 'bg-brand-accent-light-subtle dark:bg-brand-accent-dark-subtle hover:bg-brand-accent-light-subtle/80 border-brand-accent/40 text-brand-accent dark:text-brand-accent-hover shadow-sm shadow-brand-accent/10 hover:scale-105'
                                            : 'bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] border-slate-200 dark:border-white/10 text-slate-400 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-white'
                                    }`}
                                >
                                    {isCategorizing ? (
                                        <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <>
                                            <AiAgentIcon className="h-3.5 w-3.5" active={!!formDescricao.trim()} />
                                            <span className="text-[10px] font-semibold tracking-wide">IA</span>
                                            {formDescricao.trim() && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent dark:bg-brand-accent-hover animate-pulse" />
                                            )}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Categoria */}
                        {formTipo !== 'transferencia' ? (
                            <div className="space-y-1">
                                <label className={`${labelColor} ml-1`}>{t('newTx.category')}</label>
                                <button
                                    type="button"
                                    onClick={() => setActivePicker('category')}
                                    className={`w-full py-2.5 px-3 bg-white dark:bg-dark-card text-light-text dark:text-dark-text rounded-xl text-left flex justify-between items-center font-medium text-sm border transition-all duration-200 ${
                                        validationErrors.categoria 
                                            ? 'border-red-500/80 dark:border-red-500/60 animate-shake' 
                                            : 'border-light-border dark:border-dark-elevated'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        {(() => {
                                            const cat = categorias[formTipo as 'entrada' | 'saida']?.find(c => c.name === formCategoria);
                                            return cat?.icon
                                                ? <div className="text-light-text-secondary dark:text-dark-text-secondary flex items-center justify-center"><CategoryIcon name={cat.icon} className="h-4 w-4" /></div>
                                                : <div className="h-3 w-3 rounded-full flex-shrink-0 border border-slate-200 dark:border-slate-700" style={{ backgroundColor: getCorPorCategoria(formCategoria, categoryColors) }} />;
                                        })()
                                        }
                                        <span className={`truncate text-sm ${formCategoria ? '' : 'opacity-65'}`}>{getTranslatedCategoryName(formCategoria, t) || (locale === 'en' ? 'Select...' : 'Categoria...')}</span>
                                    </div>
                                    <ChevronDownIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                </button>
                            </div>
                        ) : null}
                    </div>

                        {formTipo !== 'transferencia' && (
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="w-full py-2.5 px-4 bg-white dark:bg-dark-card text-light-text-muted dark:text-dark-text-muted rounded-xl font-medium text-xs border border-light-border dark:border-dark-elevated hover:bg-slate-50 dark:hover:bg-dark-bg transition-all flex items-center justify-between"
                                >
                                    <span>{locale === 'en' ? 'Advanced Options' : locale === 'es' ? 'Opciones Avanzadas' : locale === 'fr' ? 'Options Avancées' : locale === 'de' ? 'Erweiterte Optionen' : 'Opções Avançadas'}</span>
                                    <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180 text-[#3B82F6]' : 'text-slate-400'}`} />
                                </button>

                                {showAdvanced && (
                                    <div className="bg-white dark:bg-dark-card p-3 rounded-2xl space-y-2 border border-light-border dark:border-dark-elevated animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className={`${labelColor} block`}>
                                            {locale === 'en' ? 'Transaction Type' : locale === 'es' ? 'Tipo de Transacción' : locale === 'fr' ? 'Type de Transaction' : locale === 'de' ? 'Transaktionsart' : 'Tipo de Lançamento'}
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button type="button" onClick={() => setLaunchMode('single')} className={`py-2 text-xs font-semibold rounded-lg transition-all ${launchMode === 'single' ? 'bg-[#3B82F6] text-white shadow-md' : 'bg-light-card-elevated dark:bg-dark-bg text-slate-400'}`}>
                                                {locale === 'en' ? 'Single' : locale === 'es' ? 'Único' : locale === 'fr' ? 'Unique' : locale === 'de' ? 'Einzeln' : 'Único'}
                                            </button>
                                            <button type="button" onClick={() => setLaunchMode('installment')} className={`py-2 text-xs font-semibold rounded-lg transition-all ${launchMode === 'installment' ? 'bg-[#3B82F6] text-white shadow-md' : 'bg-light-card-elevated dark:bg-dark-bg text-slate-400'}`}>
                                                {locale === 'en' ? 'Installments' : locale === 'es' ? 'Plazos' : locale === 'fr' ? 'Mensualités' : locale === 'de' ? 'Raten' : 'Parcelado'}
                                            </button>
                                            <button type="button" onClick={() => setLaunchMode('recurring')} className={`py-2 text-xs font-semibold rounded-lg transition-all ${launchMode === 'recurring' ? 'bg-[#3B82F6] text-white shadow-md' : 'bg-light-card-elevated dark:bg-dark-bg text-slate-400'}`}>
                                                {locale === 'en' ? 'Fixed' : locale === 'es' ? 'Fijo' : locale === 'fr' ? 'Fixe' : locale === 'de' ? 'Fest' : 'Fixo'}
                                            </button>
                                        </div>

                                        {launchMode === 'installment' && (
                                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                                <div className="space-y-1">
                                                    <label className={`${labelColor} ml-1`}>
                                                        {locale === 'en' ? 'Installments' : locale === 'es' ? 'Cuotas' : locale === 'fr' ? 'Mensualités' : locale === 'de' ? 'Raten' : 'Parcelas'}
                                                    </label>
                                                    <div className="flex items-center gap-0 rounded-xl border border-light-border dark:border-dark-elevated overflow-hidden">
                                                        <button type="button" onClick={() => setInstallmentCount(String(Math.max(2, (parseInt(installmentCount) || 2) - 1)))} className="px-3 py-3.5 bg-light-card-elevated dark:bg-dark-bg text-slate-500 font-bold text-lg hover:bg-slate-100 dark:hover:bg-dark-surface transition-colors">−</button>
                                                        <input type="number" min="2" max="60" inputMode="numeric" value={installmentCount} onChange={e => setInstallmentCount(e.target.value)} className="flex-1 py-3.5 bg-white dark:bg-dark-card text-light-text dark:text-dark-text font-semibold text-sm text-center tabular-nums outline-none" />
                                                        <button type="button" onClick={() => setInstallmentCount(String(Math.min(60, (parseInt(installmentCount) || 2) + 1)))} className="px-3 py-3.5 bg-light-card-elevated dark:bg-dark-bg text-slate-500 font-bold text-lg hover:bg-slate-100 dark:hover:bg-dark-surface transition-colors">+</button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className={`${labelColor} ml-1`}>
                                                        {locale === 'en' ? 'Monthly' : locale === 'es' ? 'Mensual' : locale === 'fr' ? 'Mensuel' : locale === 'de' ? 'Monatlich' : 'Mensalidade'}
                                                    </label>
                                                    <div className="py-3.5 px-4 bg-[#3B82F6]/10 font-semibold text-sm text-[#3B82F6] rounded-xl text-center border border-dark-accent/20 flex items-center justify-center gap-1 tabular-nums">
                                                        {formatCurrency(installmentValue, appLocale, appCurrency)}<span className="text-[10px] text-[#3B82F6]/70 font-medium">/{locale === 'en' ? 'mo' : locale === 'es' ? 'mes' : locale === 'fr' ? 'mois' : locale === 'de' ? 'Mon.' : 'mês'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {launchMode === 'recurring' && (
                                            <div className="animate-in fade-in slide-in-from-top-1">
                                                <div className="space-y-1">
                                                    <label className={`${labelColor} ml-1`}>
                                                        {locale === 'en' ? 'Repeat for how many months?' : locale === 'es' ? '¿Repetir por cuántos meses?' : locale === 'fr' ? 'Répéter pendant combien de mois?' : locale === 'de' ? 'Wie viele Monate wiederholen?' : 'Repetir por quantos meses?'}
                                                    </label>
                                                    <div className="flex items-center gap-0 rounded-xl border border-light-border dark:border-dark-elevated overflow-hidden">
                                                        <button type="button" onClick={() => setRecurrenceQuantity(String(Math.max(2, (parseInt(recurrenceQuantity) || 12) - 1)))} className="px-3 py-3.5 bg-light-card-elevated dark:bg-dark-bg text-slate-500 font-bold text-lg hover:bg-slate-100 dark:hover:bg-dark-surface transition-colors">−</button>
                                                        <input type="number" min="2" max="120" inputMode="numeric" value={recurrenceQuantity} onChange={e => setRecurrenceQuantity(e.target.value)} className="flex-1 py-3.5 bg-white dark:bg-dark-card text-light-text dark:text-dark-text font-semibold text-sm text-center tabular-nums outline-none" />
                                                        <button type="button" onClick={() => setRecurrenceQuantity(String(Math.min(120, (parseInt(recurrenceQuantity) || 12) + 1)))} className="px-3 py-3.5 bg-light-card-elevated dark:bg-dark-bg text-slate-500 font-bold text-lg hover:bg-slate-100 dark:hover:bg-dark-surface transition-colors">+</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <button type="submit" className={`w-full ${submitBtn.cls} text-white py-3.5 rounded-2xl font-semibold shadow-lg shadow-black/10 active:scale-[0.98] transition-all tracking-normal text-sm`}>{submitBtn.text}</button>
                        {error && <p className="text-red-500 text-xs text-center font-medium bg-red-50 dark:bg-red-900/20 py-2.5 rounded-xl border border-red-100 dark:border-red-900/30 animate-in fade-in duration-200">{error}</p>}
                    </form>
            </main>

            <Modal isOpen={isScanSourceModalOpen} onClose={() => setIsScanSourceModalOpen(false)}>
                <div className="flex flex-col">
                    <h3 className="text-base font-semibold text-light-text dark:text-dark-text tracking-tight mb-1 text-center">
                        {locale === 'en' ? 'Receipt Source' : locale === 'es' ? 'Origen del Recibo' : locale === 'fr' ? 'Source du Reçu' : locale === 'de' ? 'Belegquelle' : 'Origem do Recibo'}
                    </h3>
                    <p className="text-xs text-light-text-muted dark:text-dark-text-secondary font-normal mb-6 text-center">
                        {locale === 'en' ? 'How do you want to capture?' : locale === 'es' ? '¿Cómo desea capturar?' : locale === 'fr' ? 'Comment souhaitez-vous capturer?' : locale === 'de' ? 'Wie möchten Sie erfassen?' : 'Como deseja capturar?'}
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => cameraInputRef.current?.click()}
                            className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 transition-all active:scale-95"
                        >
                            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
                                <CameraIcon className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                {locale === 'en' ? 'Camera' : locale === 'es' ? 'Cámara' : locale === 'fr' ? 'Appareil Photo' : locale === 'de' ? 'Kamera' : 'Câmera'}
                            </span>
                        </button>

                        <button
                            onClick={() => galleryInputRef.current?.click()}
                            className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-light-card-elevated dark:bg-dark-card border border-light-border dark:border-dark-elevated transition-all active:scale-95"
                        >
                            <div className="p-3 bg-slate-600 dark:bg-slate-500 rounded-xl shadow-lg shadow-slate-600/20">
                                <ViewGridIcon className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-light-text dark:text-dark-text-secondary">
                                {locale === 'en' ? 'Gallery' : locale === 'es' ? 'Galería' : locale === 'fr' ? 'Galerie' : locale === 'de' ? 'Galerie' : 'Galeria'}
                            </span>
                        </button>
                    </div>

                    <button
                        onClick={() => setIsScanSourceModalOpen(false)}
                        className="mt-6 py-3 text-slate-400 dark:text-slate-400 text-xs font-semibold hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)}>
                <Calendar selectedDate={formData} onDateSelect={d => { setFormData(d); setIsCalendarOpen(false); }} initialDisplayDate={new Date(formData + 'T00:00:00')} transactions={allTransactions} />
            </Modal>

            <ListPickerModal isOpen={activePicker === 'category'} onClose={() => setActivePicker(null)} title={t('newTx.category')} items={categorias[formTipo as 'entrada' | 'saida']?.map(c => ({ id: c.name, name: getTranslatedCategoryName(c.name, t), icon: c.icon, color: getCorPorCategoria(c.name, categoryColors) })) || []} selectedId={formCategoria} onSelect={i => setFormCategoria(i.id)} />
            <ListPickerModal 
                isOpen={activePicker === 'card'} 
                onClose={() => setActivePicker(null)} 
                title={t('newTx.whichCard')} 
                items={creditCards.map(c => ({ 
                    id: c.id, 
                    name: c.name,
                    icon: <CreditCardIcon className="h-5 w-5" />,
                    color: c.color
                }))} 
                selectedId={formCardId} 
                onSelect={i => setFormCardId(i.id)} 
            />
            <ListPickerModal 
                isOpen={activePicker === 'account'} 
                onClose={() => setActivePicker(null)} 
                title={t('newTx.whichAccount')} 
                items={accounts.map(a => ({ 
                    id: a.id, 
                    name: a.bankName,
                    icon: getBankLogo(a.bankName, "w-6 h-6") || '🏦'
                }))} 
                selectedId={formAccountId} 
                onSelect={i => setFormAccountId(i.id)} 
            />
            <ListPickerModal 
                isOpen={activePicker === 'destinationAccount'} 
                onClose={() => setActivePicker(null)} 
                title={locale === 'en' ? 'Destination Account' : locale === 'es' ? 'Cuenta de Destino' : locale === 'fr' ? 'Compte Destinataire' : locale === 'de' ? 'Zielkonto' : 'Conta de Destino'} 
                items={accounts.map(a => ({ 
                    id: a.id, 
                    name: a.bankName,
                    icon: getBankLogo(a.bankName, "w-6 h-6") || '🏦'
                }))} 
                selectedId={formDestinationAccountId} 
                onSelect={i => setFormDestinationAccountId(i.id)} 
            />
            <InvoicePickerModal isOpen={activePicker === 'statement'} onClose={() => setActivePicker(null)} selectedId={customStatementDate || defaultStatementDate} onSelect={i => setCustomStatementDate(i.id)} />

            {/* Calculadora — Design System Oficial SobControle */}
            {isCalculatorOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md px-5"
                    onClick={() => setIsCalculatorOpen(false)}
                >
                    <div
                        className="w-full max-w-[340px] bg-white dark:bg-dark-card border border-slate-200/80 dark:border-white/10 rounded-[32px] p-5 shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Topo / Header da Calculadora */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] flex items-center justify-center text-slate-700 dark:text-neutral-300">
                                    <CalculatorIcon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                                    {locale === 'en' ? 'Calculator' : locale === 'es' ? 'Calculadora' : locale === 'fr' ? 'Calculatrice' : locale === 'de' ? 'Rechner' : 'Calculadora'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleCalcKey('C')}
                                    className="px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-neutral-300 border border-slate-200/60 dark:border-white/[0.08] rounded-xl active:scale-95 transition-all"
                                >
                                    {locale === 'en' ? 'Clear' : 'Limpar'} (C)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCalculatorOpen(false)}
                                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                                    aria-label="Fechar"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Visor / Display */}
                        <div className="bg-slate-50 dark:bg-[#070707] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl px-4 py-3 mb-4 flex flex-col justify-end min-h-[82px] text-right shadow-inner">
                            <div className="text-xs font-mono font-medium text-slate-400 dark:text-neutral-500 truncate h-5 leading-5 tracking-wider">
                                {calcExpression && (calcResult !== null || livePreview !== null) ? calcExpression : ''}
                            </div>
                            <div className="flex items-baseline justify-end gap-2 overflow-hidden">
                                <p className="text-slate-900 dark:text-white text-3xl font-bold font-mono tracking-tight break-all leading-none tabular-nums">
                                    {calcResult !== null
                                        ? formatCurrency(calcResult, appLocale, appCurrency)
                                        : (calcExpression || '0')}
                                </p>
                            </div>
                            {calcResult === null && livePreview !== null && (
                                <p className="text-brand-accent dark:text-brand-accent-hover text-xs font-bold font-mono mt-1 tabular-nums">
                                    ≈ {formatCurrency(livePreview, appLocale, appCurrency)}
                                </p>
                            )}
                        </div>

                        {/* Grade de Teclas (Layout Padrão Mobile Fintech) */}
                        <div className="grid grid-cols-4 gap-2.5">
                            {/* Linha 1: 7, 8, 9, ÷ */}
                            <button
                                type="button"
                                onClick={() => handleCalcKey('7')}
                                className="h-13 py-3 rounded-2xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] border border-slate-200/70 dark:border-white/[0.06] text-slate-900 dark:text-white font-semibold text-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
                            >
                                7
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCalcKey('8')}
                                className="h-13 py-3 rounded-2xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] border border-slate-200/70 dark:border-white/[0.06] text-slate-900 dark:text-white font-semibold text-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
                            >
                                8
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCalcKey('9')}
                                className="h-13 py-3 rounded-2xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] border border-slate-200/70 dark:border-white/[0.06] text-slate-900 dark:text-white font-semibold text-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
                            >
                                9
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCalcKey('÷')}
                                className="h-13 py-3 rounded-2xl bg-slate-200/70 dark:bg-white/[0.07] hover:bg-slate-300/60 dark:hover:bg-white/[0.12] border border-slate-300/50 dark:border-white/[0.08] text-slate-800 dark:text-neutral-200 font-bold text-2xl active:scale-95 transition-all flex items-center justify-center"
                            >
                                ÷
                            </button>

                            {/* Linha 2: 4, 5, 6, × */}
                            <button
                                type="button"
                                onClick={() => handleCalcKey('4')}
                                className="h-13 py-3 rounded-2xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] border border-slate-200/70 dark:border-white/[0.06] text-slate-900 dark:text-white font-semibold text-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
                            >
                                4
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCalcKey('5')}
                                className="h-13 py-3 rounded-2xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] border border-slate-200/70 dark:border-white/[0.06] text-slate-900 dark:text-white font-semibold text-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
                            >
                                5
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCalcKey('6')}
                                className="h-13 py-3 rounded-2xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] border border-slate-200/70 dark:border-white/[0.06] text-slate-900 dark:text-white font-semibold text-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
                            >
                                6
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCalcKey('×')}
                                className="h-13 py-3 rounded-2xl bg-slate-200/70 dark:bg-white/[0.07] hover:bg-slate-300/60 dark:hover:bg-white/[0.12] border border-slate-300/50 dark:border-white/[0.08] text-slate-800 dark:text-neutral-200 font-bold text-2xl active:scale-95 transition-all flex items-center justify-center"
                            >
                                ×
                            </button>

                            {/* Linha 3: 1, 2, 3, − */}
                            <button
                                type="button"
                                onClick={() => handleCalcKey('1')}
                                className="h-13 py-3 rounded-2xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] border border-slate-200/70 dark:border-white/[0.06] text-slate-900 dark:text-white font-semibold text-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
                            >
                                1
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCalcKey('2')}
                                className="h-13 py-3 rounded-2xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] border border-slate-200/70 dark:border-white/[0.06] text-slate-900 dark:text-white font-semibold text-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
                            >
                                2
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCalcKey('3')}
                                className="h-13 py-3 rounded-2xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] border border-slate-200/70 dark:border-white/[0.06] text-slate-900 dark:text-white font-semibold text-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
                            >
                                3
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCalcKey('-')}
                                className="h-13 py-3 rounded-2xl bg-slate-200/70 dark:bg-white/[0.07] hover:bg-slate-300/60 dark:hover:bg-white/[0.12] border border-slate-300/50 dark:border-white/[0.08] text-slate-800 dark:text-neutral-200 font-bold text-2xl active:scale-95 transition-all flex items-center justify-center"
                            >
                                −
                            </button>

                            {/* Linha 4: 0, ,, ⌫, + */}
                            <button
                                type="button"
                                onClick={() => handleCalcKey('0')}
                                className="h-13 py-3 rounded-2xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] border border-slate-200/70 dark:border-white/[0.06] text-slate-900 dark:text-white font-semibold text-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
                            >
                                0
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCalcKey(',')}
                                className="h-13 py-3 rounded-2xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] border border-slate-200/70 dark:border-white/[0.06] text-slate-900 dark:text-white font-semibold text-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
                            >
                                ,
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCalcKey('⌫')}
                                className="h-13 py-3 rounded-2xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] border border-slate-200/70 dark:border-white/[0.06] text-slate-600 dark:text-neutral-300 hover:text-rose-500 dark:hover:text-rose-400 font-bold text-lg active:scale-95 transition-all flex items-center justify-center shadow-sm"
                                title="Apagar"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414A2 2 0 0110.828 5H20a2 2 0 012 2v10a2 2 0 01-2 2h-9.172a2 2 0 01-1.414-.586L3 12z" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCalcKey('+')}
                                className="h-13 py-3 rounded-2xl bg-slate-200/70 dark:bg-white/[0.07] hover:bg-slate-300/60 dark:hover:bg-white/[0.12] border border-slate-300/50 dark:border-white/[0.08] text-slate-800 dark:text-neutral-200 font-bold text-2xl active:scale-95 transition-all flex items-center justify-center"
                            >
                                +
                            </button>
                        </div>

                        {/* Linha de = e Usar Valor */}
                        <div className="grid grid-cols-4 gap-2.5 mt-2.5">
                            <button
                                type="button"
                                onClick={() => handleCalcKey('=')}
                                className="h-13 py-3 rounded-2xl bg-slate-800 dark:bg-white/15 hover:bg-slate-900 dark:hover:bg-white/20 border border-slate-700/50 dark:border-white/10 text-white font-bold text-2xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
                            >
                                =
                            </button>
                            <button
                                type="button"
                                onClick={handleCalcApply}
                                className="col-span-3 h-13 py-3 rounded-2xl font-bold uppercase tracking-wider text-xs bg-brand-accent text-white hover:bg-brand-accent-hover dark:bg-brand-accent dark:text-white dark:hover:bg-brand-accent-hover active:scale-95 transition-all shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{locale === 'en' ? 'Use Value' : locale === 'es' ? 'Usar Valor' : locale === 'fr' ? 'Utiliser' : locale === 'de' ? 'Verwenden' : 'Usar Valor'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default NewTransactionScreen;
