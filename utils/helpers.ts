import { generateWithGemini, userContent, GeminiPart } from './aiClient';
import { MESES_NOMES } from '../constants';
import { Transaction, Categorias, Category, TransactionType, ReceiptAnalysisResult, DailyBalance, ImportedTransaction, PaymentMethod, AllData, CreditCard } from '../types';
import { parseOFXOffline } from './ofxParser';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as XLSX from 'xlsx';

export const formatCurrency = (value: number, locale = 'pt-BR', currency = 'BRL'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(value);
};

export const getCorPorCategoria = (categoria: string, cores: { [key: string]: string }): string => {
  return cores[categoria] || cores.DEFAULT;
};

export const formatarMesAno = (date: Date, locale = 'pt-BR', monthNames?: string[]): string => {
  if (monthNames && monthNames[date.getMonth()]) {
    const mes = monthNames[date.getMonth()];
    const ano = date.getFullYear();
    if (locale.startsWith('pt') || locale.startsWith('es')) {
      return `${mes} de ${ano}`;
    }
    return `${mes} ${ano}`;
  }
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  return formatter.format(date);
};

/** Categorias do tipo da transação. Transferência não tem categorias: lista vazia. */
export const getCategoriesForType = (categorias: Categorias, type: TransactionType): Category[] =>
  type === 'transferencia' ? [] : categorias[type] || [];

export const getMonthKey = (date: Date): string => {
  const ano = date.getFullYear();
  const mes = date.getMonth() + 1;
  return `${ano}-${mes.toString().padStart(2, '0')}`;
};

export const getTranslatedCategoryName = (name: string, t: any): string => {
  const defaultCategoriesMap: Record<string, string> = {
    'Salário': 'cat.salario',
    'Investimentos': 'cat.investimentos',
    'Vendas': 'cat.vendas',
    'Outras Receitas': 'cat.outrasReceitas',
    'Saldo Inicial': 'cat.saldoInicial',
    'Moradia': 'cat.moradia',
    'Alimentação': 'cat.alimentacao',
    'Transporte': 'cat.transporte',
    'Lazer': 'cat.lazer',
    'Saúde': 'cat.saude',
    'Educação': 'cat.educacao',
    'Outras Despesas': 'cat.outrasDespesas'
  };
  
  const key = defaultCategoriesMap[name];
  if (key) {
    const val = t(key);
    if (val && val !== key) {
      return val;
    }
  }
  return name;
};

export const getDiasNoMes = (ano: number, mes: number): number => {
  return new Date(ano, mes + 1, 0).getDate();
};

export const formatDateToInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addMonthsSafely = (dateStr: string, monthsToAdd: number): string => {
    // Retorna string YYYY-MM-DD mantendo o último dia válido do mês
    // Para resolver o bug do dia 31 sumindo em meses menores
    const origDate = new Date(dateStr + 'T00:00:00');
    const expectedMonth = origDate.getMonth() + monthsToAdd;
    const expectedYear = origDate.getFullYear() + Math.floor(expectedMonth / 12);
    const realMonth = ((expectedMonth % 12) + 12) % 12;

    const originalDay = Number(dateStr.split('-')[2]); // Pegamos o dia originário (fixo) a partir da string

    const tempDate = new Date(expectedYear, realMonth, originalDay);
    // Se o mês no objeto Date que foi gerado "pular" para o próximo (ex: 31 de Abril cai em 1 de Maio),
    // reduzimos a data para o dia 0 do mês que pulou (último dia do mês realMonth).
    if (tempDate.getMonth() !== realMonth) {
        tempDate.setDate(0); 
    }

    return formatDateToInput(tempDate);
};


// Data com o dia limitado ao último dia do mês: dia 31 em abril vira 30/04
// (new Date(2026, 3, 31) "transbordaria" para 01/05).
const dateWithClampedDay = (year: number, month: number, day: number): Date =>
  new Date(year, month, Math.min(day, getDiasNoMes(year, month)));

// Calcula o dia de fechamento efetivo do cartão para um determinado mês de referência
export const getEffectiveClosingDay = (card: CreditCard, referenceDate?: Date): number => {
  if (card.closingType === 'dynamic' && card.closingDaysBefore != null) {
    // Fechamento dinâmico: X dias antes do vencimento
    const ref = referenceDate || new Date();
    const dueDate = dateWithClampedDay(ref.getFullYear(), ref.getMonth(), card.dueDay);
    const closingDate = new Date(dueDate);
    closingDate.setDate(closingDate.getDate() - card.closingDaysBefore);
    return closingDate.getDate();
  }
  // Fechamento fixo (padrão)
  return card.closingDay;
};

// Nova função para calcular a data exata de vencimento baseada no fechamento
export const calculateCreditCardDueDate = (purchaseDateStr: string, card: CreditCard): string => {
  const date = new Date(purchaseDateStr + 'T00:00:00');
  const day = date.getDate();
  let targetMonth = date.getMonth();
  let targetYear = date.getFullYear();

  const effectiveClosingDay = getEffectiveClosingDay(card, date);

  // Se o dia da compra for maior ou igual ao fechamento, entra na próxima fatura
  if (day >= effectiveClosingDay) {
      targetMonth++;
      if (targetMonth > 11) {
          targetMonth = 0;
          targetYear++;
      }
  }

  // Ajuste fino: Se o dia de vencimento for menor que o dia de fechamento, 
  // significa que o vencimento ocorre no mês seguinte ao fechamento da fatura.
  // Ex: Fecha dia 25, Vence dia 05 (do mês seguinte).
  // Se comprou dia 01/01 (Fecha 25/01), vence 05/02.
  // Se comprou dia 26/01 (Fecha 25/02), vence 05/03.
  if (card.dueDay < effectiveClosingDay) {
      targetMonth++;
      if (targetMonth > 11) {
          targetMonth = 0;
          targetYear++;
      }
  }

  // Cria a data de vencimento (dia 31 em mês de 30 dias = último dia do mês)
  const dueDate = dateWithClampedDay(targetYear, targetMonth, card.dueDay);
  return formatDateToInput(dueDate);
};

// Soma meses a uma chave de mês: ("2026-11", 3) → "2027-02"
export const addMonthsToMonthKey = (monthKey: string, months: number): string => {
  const [year, month] = monthKey.split('-').map(Number);
  return getMonthKey(new Date(year, month - 1 + months, 1));
};

// Data de vencimento (YYYY-MM-DD) da fatura de um mês ("YYYY-MM")
export const getStatementDueDate = (statementKey: string, dueDay: number): string => {
  const [year, month] = statementKey.split('-').map(Number);
  return formatDateToInput(dateWithClampedDay(year, month - 1, dueDay));
};

export const calculateStatementDate = (purchaseDateStr: string, card: CreditCard): string => {
  // Esta função retorna a "Chave do Mês" (YYYY-MM) a qual a fatura pertence.
  // Reutilizamos a lógica da data de vencimento para garantir consistência.
  const dueDateStr = calculateCreditCardDueDate(purchaseDateStr, card);
  const dueDate = new Date(dueDateStr + 'T00:00:00');
  return getMonthKey(dueDate);
};

export const inicializarDias = (numDias: number) => {
  return Array.from({ length: numDias }, (_, i) => ({
    dia: i + 1,
    entrada: 0,
    saida: 0,
  }));
};

export const calcularSaldoFinal = (transactions: Transaction[], saldoInicial: number, numDias: number): number => {
    const totalEntradas = transactions
      .filter(t => t.tipo === 'entrada')
      .reduce((sum, t) => sum + Number(t.valor || 0), 0);
    const totalSaidas = transactions
      .filter(t => t.tipo === 'saida')
      .reduce((sum, t) => sum + Number(t.valor || 0), 0);
    return saldoInicial + totalEntradas - totalSaidas;
};

export const getSaldoLimitDate = (currentDate: Date): Date => {
  const today = new Date();
  const isPastMonth = currentDate.getFullYear() < today.getFullYear() || (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() < today.getMonth());
  const isCurrentMonth = currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() === today.getMonth();

  if (isPastMonth) {
    // Último dia do mês selecionado
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  } else if (isCurrentMonth) {
    // Hoje
    return today;
  } else {
    // Mês futuro: último dia do mês anterior (para mostrar o saldo inicial do mês selecionado)
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
  }
};

export const calculateAccountBalance = (accountId: string, allTransactions: Transaction[], limitDate?: Date): number => {
    let balance = 0;
    const limitDateStr = limitDate ? formatDateToInput(limitDate) : null;

    for (const tx of allTransactions) {
        if (limitDateStr) {
            if (tx.data > limitDateStr) {
                continue;
            }
        }
        const val = Number(tx.valor) || 0;
        if (tx.tipo === 'entrada' && tx.accountId === accountId) {
            balance += val;
        } else if (tx.tipo === 'saida' && tx.accountId === accountId) {
            balance -= val;
        } else if (tx.tipo === 'transferencia') {
            if (tx.accountId === accountId) balance -= val;
            if (tx.destinationAccountId === accountId) balance += val;
        }
    }
    return balance;
};

export const getPreviousBalance = (monthKey: string, allData: AllData): number => {
    const sortedKeys = Object.keys(allData).sort();
    let lastKnownBalance = 0;
    
    for (const key of sortedKeys) {
        if (key < monthKey) {
            lastKnownBalance = allData[key]?.saldoFinal || 0;
        } else {
            break;
        }
    }
    return lastKnownBalance;
};

export const calculateDailyBalancesForMonth = (
    transactionsForMonth: Transaction[], 
    initialBalance: number, 
    year: number, 
    month: number
): DailyBalance[] => {
    const numDias = getDiasNoMes(year, month);
    const dias = inicializarDias(numDias).map(d => ({ ...d, entrada: 0, saida: 0, saidaCredito: 0, saldo: 0, transactions: [] as Transaction[] }));

    for (const tx of transactionsForMonth) {
        // Para fluxo de caixa (Lancamento/diasComSaldo), a data relevante
        // para cartões de crédito É o VENCIMENTO DA FATURA (tx.data), 
        // pois é quando o dinheiro sai da conta.
        const dateToUse = tx.data;
        const parts = dateToUse.split('-');
        if (parts.length !== 3) continue;
        const diaOriginal = parseInt(parts[2], 10);
        const diaExibicao = Math.min(diaOriginal, numDias);
        const dia = dias[diaExibicao - 1];
        if (dia) {
            // Apenas transações que afetam o caixa no dia devem compor entrada/saída
            if (tx.tipo === 'entrada' && tx.paymentMethod !== 'credito') {
                 dia.entrada += (Number(tx.valor) || 0); 
            } else if (tx.tipo === 'saida' && tx.paymentMethod !== 'credito') {
                 dia.saida += (Number(tx.valor) || 0);
            } else if (tx.paymentMethod === 'credito' && tx.tipo === 'saida') {
                 dia.saidaCredito += (Number(tx.valor) || 0);
            }
            dia.transactions.push(tx);
        }
    }

    let saldoCorrente = initialBalance;
    return dias.map(dia => {
        saldoCorrente += dia.entrada - dia.saida - dia.saidaCredito;
        return { ...dia, saldo: saldoCorrente };
    });
};

export const calculatePercentageChange = (current: number, previous: number): { value: string, isPositive: boolean, isInfinite: boolean } => {
    if (previous === 0) return { value: current > 0 ? '+∞%' : 'N/A', isPositive: current > 0, isInfinite: true };
    const change = ((current - previous) / Math.abs(previous)) * 100;
    const isPositive = change > 0;
    return { value: `${isPositive ? '+' : ''}${change.toFixed(1)}%`, isPositive, isInfinite: false };
};

const sanitizeJsonResponse = (text: string): string => {
    if (!text) return "";
    let cleaned = text.trim();
    cleaned = cleaned.replace(/```json/g, "").replace(/```/g, "");
    
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start = -1;
    if (firstBrace !== -1 && firstBracket !== -1) start = Math.min(firstBrace, firstBracket);
    else start = firstBrace !== -1 ? firstBrace : firstBracket;

    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    let end = Math.max(lastBrace, lastBracket);

    if (start !== -1 && end !== -1 && end > start) {
        return cleaned.substring(start, end + 1);
    }
    return cleaned;
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

export const fileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsText(file);
    });
};

export interface CategoryAgentResult {
  action: 'match' | 'create';
  categoryName: string;
  newCategory?: {
    name: string;
    icon: string;
    bucket?: 'necessidades' | 'desejos' | 'futuro';
    group?: 'Gastos Fixos' | 'Gastos Variáveis' | 'Reserva Financeira';
  };
  reason?: string;
}

export const suggestCategoryWithAgent = async (
  description: string,
  type: TransactionType,
  categories: Categorias
): Promise<CategoryAgentResult> => {
  if (!description.trim()) throw new Error("A descrição não pode estar vazia.");
  const currentCategories = getCategoriesForType(categories, type).map(c => c.name);

  const availableIcons = [
    'shopping-basket', 'utensils', 'coffee', 'pizza', 'burger', 'beer', 'cookie', 'shopping-cart',
    'car', 'bus', 'gas-pump', 'plane', 'bike', 'parking', 'route',
    'home', 'bolt', 'droplet', 'wifi', 'lightbulb', 'tools', 'building', 'key',
    'medkit', 'heart', 'dumbbell', 'shield', 'pill', 'glasses',
    'sun', 'gamepad', 'music', 'film', 'camera', 'clapperboard', 'dices',
    'shopping-bag', 'shirt', 'scissors', 'phone', 'gift', 'cpu',
    'flask', 'book', 'graduation', 'pencil',
    'pet', 'baby', 'leaf', 'box', 'tag', 'heart-handshake', 'umbrella',
    'wallet', 'money', 'coins', 'bank', 'card', 'chart-pie', 'receipt', 'briefcase'
  ];

  try {
    const responseText = await generateWithGemini({
      contents: userContent({ text: `Você é o Agente Inteligente de Categorização Financeira do app SobControle.
Analise a transação com descrição: "${description}" e tipo: "${type}".
Categorias já existentes no app do usuário: [${currentCategories.join(', ')}].

DIRETRIZES:
1. Caso a descrição se encaixe bem ou de forma aceitável em uma das categorias já existentes (ex: 'Supermercado' -> 'Alimentação', 'Uber' -> 'Transporte', 'Netflix' -> 'Assinatura', 'Aluguel' -> 'Moradia', 'Salário' -> 'Salário'):
   - Use action: "match"
   - Use categoryName com o nome EXATO da categoria existente correspondente.

2. Caso a descrição represente claramente um nicho específico que NÃO tem categoria correspondente adequada (ex: 'Ração de gato', 'Pet Shop' e não existe categoria Pet; ou 'Farmácia', 'Remédios' e não existe Saúde; ou 'Curso de Figma' e não existe Educação):
   - Use action: "create"
   - Defina categoryName com um nome conciso e elegante para a nova categoria (em português, ex: "Pet", "Farmácia", "Beleza", "Impostos", "Cursos").
   - Em newCategory:
     - name: o mesmo nome da nova categoria.
     - icon: selecione o iconId mais adequado da lista: [${availableIcons.join(', ')}].
     - bucket: se for saída, escolha entre "necessidades", "desejos" ou "futuro".
     - group: se for saída, escolha entre "Gastos Fixos", "Gastos Variáveis" ou "Reserva Financeira".
     - reason: justificativa breve.` }),
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: 'OBJECT',
          properties: {
            action: { type: 'STRING', enum: ['match', 'create'] },
            categoryName: { type: 'STRING' },
            newCategory: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                icon: { type: 'STRING' },
                bucket: { type: 'STRING', enum: ['necessidades', 'desejos', 'futuro'] },
                group: { type: 'STRING', enum: ['Gastos Fixos', 'Gastos Variáveis', 'Reserva Financeira'] },
                reason: { type: 'STRING' }
              }
            },
            reason: { type: 'STRING' }
          },
          required: ['action', 'categoryName']
        }
      }
    }, 'categorize');

    const sanitized = sanitizeJsonResponse(responseText);
    const parsed = JSON.parse(sanitized) as CategoryAgentResult;

    // Se o modelo sugeriu criar uma categoria cujo nome já existe (case-insensitive), faça match nela
    const exactOrSimilar = currentCategories.find(c => c.toLowerCase() === parsed.categoryName.toLowerCase());
    if (exactOrSimilar) {
      return {
        action: 'match',
        categoryName: exactOrSimilar,
        reason: parsed.reason
      };
    }

    if (parsed.action === 'create' && !parsed.newCategory) {
      parsed.newCategory = {
        name: parsed.categoryName,
        icon: 'tag',
        bucket: type === 'saida' ? 'desejos' : undefined,
        group: type === 'saida' ? 'Gastos Variáveis' : undefined
      };
    }

    return parsed;
  } catch (err) {
    console.warn("Agente de Categorização fallback:", err);
    const fallbackMatch = currentCategories.find(c => description.toLowerCase().includes(c.toLowerCase()));
    return {
      action: 'match',
      categoryName: fallbackMatch || currentCategories[0] || 'Outros'
    };
  }
};

export const suggestCategory = async (description: string, type: TransactionType, categories: Categorias): Promise<string> => {
  const result = await suggestCategoryWithAgent(description, type, categories);
  return result.categoryName;
};

export const analyzeReceipt = async (base64Image: string, mimeType: string, categories: Categorias): Promise<ReceiptAnalysisResult> => {
    const availableExpenseCategories = categories.saida.map(c => c.name).join(', ');

    const responseText = await generateWithGemini({
        contents: userContent(
            { inlineData: { mimeType, data: base64Image } },
            { text: `Extraia os dados deste recibo. Categorias permitidas: [${availableExpenseCategories}]. Escolha a mais aproximada, NUNCA crie uma nova.` }
        ),
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: 'OBJECT',
                properties: {
                    valor: { type: 'NUMBER' },
                    descricao: { type: 'STRING' },
                    data: { type: 'STRING' },
                    categoria: { type: 'STRING' }
                },
                required: ['valor', 'descricao', 'data', 'categoria']
            }
        }
    }, 'receipt');

    try {
        const sanitized = sanitizeJsonResponse(responseText);
        const json = JSON.parse(sanitized);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(json.data)) json.data = formatDateToInput(new Date());
        
        const categoryNames = categories.saida.map(c => c.name);
        if (!categoryNames.includes(json.categoria)) {
            json.categoria = categoryNames.find(c => c.toLowerCase() === json.categoria?.toLowerCase()) || categoryNames[0];
        }

        return json as ReceiptAnalysisResult;
    } catch (e) {
        throw new Error("Erro ao ler recibo. Tente uma foto mais clara.");
    }
};

export const analyzeStatement = async (file: File, categories: Categorias): Promise<ImportedTransaction[]> => {
    const isOFX = file.name.toLowerCase().endsWith('.ofx');
    
    // Leitura instantânea e 100% offline para arquivos OFX
    if (isOFX) {
        try {
            const text = await fileToText(file);
            const parsed = parseOFXOffline(text, categories);
            if (parsed && parsed.length > 0) {
                return parsed;
            }
        } catch (e) {
            console.warn('[analyzeStatement] Erro no parser OFX local, tentando fallback com IA...', e);
        }
    }

    const catEntrada = categories.entrada.map(c => c.name).join(', ');
    const catSaida = categories.saida.map(c => c.name).join(', ');

    let contentPart: GeminiPart;
    if (isOFX) {
        const text = await fileToText(file);
        contentPart = { text: `Analise este conteúdo de arquivo OFX e extraia as transações financeiras. Categorias de entrada permitidas: [${catEntrada}]. Categorias de saída permitidas: [${catSaida}].\n\n${text}` };
    } else {
        const base64 = await fileToBase64(file);
        contentPart = { inlineData: { mimeType: file.type || 'application/pdf', data: base64 } };
    }

    const responseText = await generateWithGemini({
        contents: userContent(
            contentPart,
            { text: `Analise este documento e extraia as transações. REGRAS: 1. Ignore saldos. 2. Data AAAA-MM-DD. 3. Valor positivo. 4. tipo='saida' ou 'entrada'. 5. CATEGORIA OBRIGATÓRIA: Use APENAS uma das listas enviadas no contexto. Não invente categorias novas sob nenhuma circunstância. Se não souber, use a mais próxima.` }
        ),
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        data: { type: 'STRING' },
                        descricao: { type: 'STRING' },
                        valor: { type: 'NUMBER' },
                        tipo: { type: 'STRING', enum: ['entrada', 'saida'] },
                        categoria: { type: 'STRING' }
                    },
                    required: ['data', 'descricao', 'valor', 'tipo', 'categoria']
                }
            }
        }
    }, 'statement');

    try {
        const sanitized = sanitizeJsonResponse(responseText || "[]");
        const results = JSON.parse(sanitized) as ImportedTransaction[];
        
        const validIn = categories.entrada.map(c => c.name);
        const validOut = categories.saida.map(c => c.name);

        return results.map(r => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(r.data)) r.data = formatDateToInput(new Date());
            const list = r.tipo === 'entrada' ? validIn : validOut;
            if (!list.includes(r.categoria)) {
                r.categoria = list.find(c => c.toLowerCase() === r.categoria?.toLowerCase()) || list[list.length - 1];
            }
            return r;
        });
    } catch (e) {
        console.error("Erro ao analisar extrato:", e);
        throw new Error("Não foi possível extrair dados deste arquivo. Verifique se é um extrato válido.");
    }
};

export const formatCurrencyForInput = (value: string, locale = 'pt-BR', currency = 'BRL'): string => {
  if (!value) return '';
  let numericValue = value.replace(/\D/g, '');
  if (numericValue === '') return '';
  while (numericValue.length < 3) numericValue = '0' + numericValue;
  const cents = numericValue.slice(-2);
  const integerPart = numericValue.slice(0, -2);
  const formattedInteger = new Intl.NumberFormat(locale).format(parseInt(integerPart, 10));
  const decimalSeparator = locale.startsWith('en') ? '.' : ',';
  
  let symbol = 'R$';
  if (currency === 'USD') symbol = '$';
  else if (currency === 'EUR') symbol = '€';
  
  return `${symbol} ${formattedInteger}${decimalSeparator}${cents}`;
};

export const parseCurrency = (formattedValue: string): number => {
    if (!formattedValue) return 0;
    const numericString = formattedValue.replace(/\D/g, '');
    if (numericString === '') return 0;
    return parseInt(numericString, 10) / 100;
};

// Modificação Crucial: Detecta IDs duplicados na lista e os regenera automaticamente
export const sanitizeTransactions = (transactions: any[]): Transaction[] => {
    if (!Array.isArray(transactions)) return [];
    
    const seenIds = new Set<string>();
    
    return transactions.filter(tx => {
        const dateObj = new Date(tx.data + 'T00:00:00');
        return tx && tx.id && !isNaN(dateObj.getTime()) && !isNaN(Number(tx.valor));
    }).map(tx => {
        let paymentMethod: PaymentMethod = 'debito';
        if (tx.paymentMethod === 'credito') paymentMethod = 'credito';
        else paymentMethod = 'debito';

        let id = tx.id;
        
        // Se o ID já foi visto nesta lista, regenera um novo para evitar duplicidade na UI
        if (seenIds.has(id)) {
            id = `${id}-dup-${Math.random().toString(36).substr(2, 5)}`;
        }
        seenIds.add(id);

        return {
            id: id,
            data: tx.data,
            compraData: tx.compraData,
            descricao: tx.descricao || "Sem descrição",
            valor: Number(tx.valor),
            tipo: tx.tipo === 'entrada' ? 'entrada' : 'saida',
            categoria: tx.categoria || "Outros",
            paymentMethod,
            isRecurring: !!tx.isRecurring,
            recurrenceId: tx.recurrenceId,
            goalId: tx.goalId,
            installment: tx.installment,
            cardId: tx.cardId,
            statementDate: tx.statementDate
        };
    });
};

const saveAndShareFile = async (base64Data: string, fileName: string, contentType: string) => {
    if (Capacitor.isNativePlatform()) {
        try {
            const result = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache,
            });
            await Share.share({
                title: fileName,
                text: 'Exportação Financeira Sob Controle',
                url: result.uri,
                dialogTitle: 'Salvar ou enviar exportação',
            });
        } catch (error) {
            console.error('Erro ao exportar arquivo no mobile:', error);
            alert('Erro ao exportar arquivo. Verifique se o app tem as permissões necessárias.');
        }
    } else {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: contentType });
        
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const exportTransactionsToExcel = async (transactions: Transaction[], customFileName?: string, locale = 'pt-BR', t: (key: string) => string = (k) => k) => {
    const fileName = customFileName || `Exportacao_Financeira_${Date.now()}.xlsx`;
    const data = transactions.sort((a, b) => a.data.localeCompare(b.data)).map(tx => ({
        [t('common.date')]: new Date(tx.data + 'T00:00:00').toLocaleDateString(locale),
        [t('common.description')]: tx.descricao,
        [t('common.value')]: tx.valor,
        [t('common.type')]: tx.tipo === 'entrada' ? t('txType.income') : t('txType.expense'),
        [t('common.category')]: tx.categoria,
        [t('management.payMethod') || 'Pagamento']: tx.paymentMethod.toUpperCase(),
        [t('management.recurring') || 'Recorrente']: tx.isRecurring ? t('common.yes') : t('common.no')
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const wscols = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }];
    worksheet['!cols'] = wscols;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t('nav.transactions') || "Lançamentos");
    
    const base64XLSX = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    await saveAndShareFile(base64XLSX, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};

export const exportTransactionsToCSV = async (transactions: Transaction[], customFileName?: string, locale = 'pt-BR', t: (key: string) => string = (k) => k) => {
    const fileName = customFileName || `Exportacao_Financeira_${Date.now()}.csv`;
    const header = `${t('common.date')},${t('common.description')},${t('common.value')},${t('common.type')},${t('common.category')},${t('management.payMethod') || 'Pagamento'},${t('management.recurring') || 'Recorrente'}\n`;
    const body = transactions.sort((a, b) => a.data.localeCompare(b.data)).map(tx => {
        const row = [
            new Date(tx.data + 'T00:00:00').toLocaleDateString(locale),
            `"${tx.descricao.replace(/"/g, '""')}"`,
            tx.valor,
            tx.tipo === 'entrada' ? t('txType.income') : t('txType.expense'),
            tx.categoria,
            tx.paymentMethod.toUpperCase(),
            tx.isRecurring ? t('common.yes') : t('common.no')
        ];
        return row.join(',');
    }).join('\n');

    const csvContent = "\uFEFF" + header + body; // Adiciona BOM para Excel ler UTF-8 corretamente
    const base64CSV = btoa(unescape(encodeURIComponent(csvContent)));
    await saveAndShareFile(base64CSV, fileName, 'text/csv');
};

export const exportTransactionsToPDF = async (transactions: Transaction[], customFileName?: string, title?: string, locale = 'pt-BR', currency = 'BRL', t: (key: string) => string = (k) => k) => {
    const fileName = customFileName || `Exportacao_Financeira_${Date.now()}.pdf`;
    
    // @ts-ignore
    const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    // @ts-ignore
    await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js');

    const doc = new jsPDF();
    const tableTitle = title || t('data.exportPDF') || "Relatório Financeiro";
    
    doc.setFontSize(18);
    doc.text(tableTitle, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`${t('common.loading') ? t('common.loading').replace('...', '') : 'Gerado em'}: ${new Date().toLocaleString(locale)}`, 14, 30);
    
    const tableData = transactions.sort((a, b) => a.data.localeCompare(b.data)).map(tx => [
        new Date(tx.data + 'T00:00:00').toLocaleDateString(locale),
        tx.descricao,
        new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(tx.valor),
        tx.tipo === 'entrada' ? t('txType.income') : t('txType.expense'),
        tx.categoria,
        tx.paymentMethod.toUpperCase()
    ]);

    // @ts-ignore
    doc.autoTable({
        startY: 35,
        head: [[t('common.date'), t('common.description'), t('common.value'), t('common.type'), t('common.category'), t('management.payMethod') || 'Pagamento']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }, // Azul primário do app
        styles: { fontSize: 9 },
    });

    doc.save(fileName);
};

export interface Distribution502030 {
  receitas: number;
  "Gastos Fixos": number;
  "Gastos Variáveis": number;
  "Reserva Financeira": number;
  percentuais: {
    "Gastos Fixos": number;
    "Gastos Variáveis": number;
    "Reserva Financeira": number;
  };
}

export const calculate502030 = (transactions: Transaction[], categorias: Categorias): Distribution502030 => {
  let receitas = 0;
  let gastosFixos = 0;
  let gastosVariaveis = 0;
  let reservaFinanceira = 0;

  // Mapa para buscas rápidas
  const categoryGroupMap: Record<string, string> = {};
  categorias.saida.forEach(c => {
    categoryGroupMap[c.name] = c.group || 'Sem Grupo';
  });

  transactions.forEach(tx => {
    const val = Number(tx.valor) || 0;
    if (tx.tipo === 'entrada') {
      receitas += val;
    } else if (tx.tipo === 'saida') {
      const group = categoryGroupMap[tx.categoria] || 'Sem Grupo';
      if (group === 'Gastos Fixos') gastosFixos += val;
      else if (group === 'Gastos Variáveis') gastosVariaveis += val;
      else if (group === 'Reserva Financeira') reservaFinanceira += val;
    }
  });

  const percentuais = {
    "Gastos Fixos": receitas > 0 ? (gastosFixos / receitas) * 100 : 0,
    "Gastos Variáveis": receitas > 0 ? (gastosVariaveis / receitas) * 100 : 0,
    "Reserva Financeira": receitas > 0 ? (reservaFinanceira / receitas) * 100 : 0,
  };

  return {
    receitas,
    "Gastos Fixos": gastosFixos,
    "Gastos Variáveis": gastosVariaveis,
    "Reserva Financeira": reservaFinanceira,
    percentuais
  };
};

export const validate502030 = (
  distribution: Distribution502030
): { status: 'ok' | 'warning'; mensagens: string[] } => {
  const mensagens: string[] = [];

  if (distribution.percentuais['Gastos Fixos'] > 50) {
    mensagens.push('Gastos Fixos ultrapassaram 50% das receitas.');
  }
  if (distribution.percentuais['Gastos Variáveis'] > 30) {
    mensagens.push('Gastos Variáveis ultrapassaram 30% das receitas.');
  }
  if (distribution.percentuais['Reserva Financeira'] < 20 && distribution.receitas > 0) {
    mensagens.push('Reserva Financeira está abaixo de 20% das receitas.');
  }

  return {
    status: mensagens.length > 0 ? 'warning' : 'ok',
    mensagens,
  };
};

// Fix: Implement and export getBankColor as it is used in MenuScreen.tsx
export const getBankColor = (name: string): string | null => {
  const n = name.toLowerCase();
  if (n.includes('nubank') || n.includes('roxo') || n === 'nu') return '#8A05BE';
  if (n.includes('itau') || n.includes('itaú')) return '#EC7000';
  if (n.includes('bradesco')) return '#CC092F';
  if (n.includes('santander')) return '#EC0000';
  if (n.includes('inter')) return '#FF7A00';
  if (n.includes('bb') || n.includes('brasil')) return '#F9D71C';
  if (n.includes('caixa')) return '#005CA9';
  if (n.includes('c6')) return '#000000';
  if (n.includes('xp')) return '#EBEB00';
  if (n.includes('btg')) return '#001529';
  if (n.includes('safra')) return '#AF9341';
  return null;
};

export const recalculateBalancesFrom = (startKey: string, data: AllData): AllData => {
  const updated: AllData = { ...data };
  const sorted = Object.keys(updated).sort();
  if (sorted.length === 0) return updated;

  const idx = sorted.indexOf(startKey);
  const effectiveStartIdx = idx === -1 ? 0 : idx;
  const effectiveStartKey = sorted[effectiveStartIdx];
  const lastKey = sorted[sorted.length - 1];

  // Calcula o saldo anterior ao primeiro mês a recalcular
  let lastSaldo = getPreviousBalance(effectiveStartKey, updated);

  // Itera por todos os meses desde o startKey até o último mês com dados,
  // incluindo meses intermediários que possam não existir em allData (gaps)
  const [startYear, startMonth] = effectiveStartKey.split('-').map(Number);
  const [endYear, endMonth] = lastKey.split('-').map(Number);

  let curYear = startYear;
  let curMonth = startMonth;

  while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
    const key = `${curYear}-${String(curMonth).padStart(2, '0')}`;
    const monthData = updated[key];

    if (monthData) {
      const dt = new Date(curYear, curMonth - 1, 1);
      const days = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
      const saldo = calcularSaldoFinal(monthData.transactions, lastSaldo, days);
      updated[key] = { ...monthData, saldoFinal: saldo };
      lastSaldo = saldo;
    } else {
      // Mês sem transações: propaga o saldo do mês anterior como saldoFinal
      // para que getPreviousBalance encontre um valor correto
      updated[key] = { transactions: [], saldoFinal: lastSaldo };
    }

    // Avança para o próximo mês
    curMonth++;
    if (curMonth > 12) {
      curMonth = 1;
      curYear++;
    }
  }
  return updated;
};

export const generateMockTransactions = (): Transaction[] => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const pad = (n: number) => String(n).padStart(2, '0');
  const makeDate = (monthOffset: number, day: number) => {
    const d = new Date(currentYear, currentMonth + monthOffset, day);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const sampleTxs: Omit<Transaction, 'id'>[] = [
    // Mês atual
    { data: makeDate(0, 1), descricao: 'Salário Mensal', valor: 5500.00, tipo: 'entrada', categoria: 'Salário', paymentMethod: 'debito' },
    { data: makeDate(0, 2), descricao: 'Supermercado Carrefour', valor: 489.30, tipo: 'saida', categoria: 'Alimentação', paymentMethod: 'debito' },
    { data: makeDate(0, 3), descricao: 'Uber Viagem', valor: 28.50, tipo: 'saida', categoria: 'Transporte', paymentMethod: 'credito' },
    { data: makeDate(0, 5), descricao: 'Academia SmartFit', valor: 119.90, tipo: 'saida', categoria: 'Saúde', paymentMethod: 'credito', isRecurring: true },
    { data: makeDate(0, 7), descricao: 'Aluguel do Apê', valor: 1800.00, tipo: 'saida', categoria: 'Moradia', paymentMethod: 'debito' },
    { data: makeDate(0, 10), descricao: 'iFood Jantar', valor: 65.40, tipo: 'saida', categoria: 'Alimentação', paymentMethod: 'credito' },
    { data: makeDate(0, 12), descricao: 'Posto Shell Combustível', valor: 220.00, tipo: 'saida', categoria: 'Transporte', paymentMethod: 'debito' },
    { data: makeDate(0, 14), descricao: 'Freelance Web Design', valor: 1200.00, tipo: 'entrada', categoria: 'Outras Receitas', paymentMethod: 'debito' },
    { data: makeDate(0, 15), descricao: 'Farmácia Drogasil', valor: 87.20, tipo: 'saida', categoria: 'Saúde', paymentMethod: 'debito' },
    { data: makeDate(0, 18), descricao: 'Assinatura Netflix', valor: 55.90, tipo: 'saida', categoria: 'Lazer', paymentMethod: 'credito', isRecurring: true },
    { data: makeDate(0, 20), descricao: 'Restaurante OutBack', valor: 195.00, tipo: 'saida', categoria: 'Lazer', paymentMethod: 'credito' },
    { data: makeDate(0, 22), descricao: 'Conta de Energia Enel', valor: 145.80, tipo: 'saida', categoria: 'Moradia', paymentMethod: 'debito' },

    // Mês anterior
    { data: makeDate(-1, 1), descricao: 'Salário Mensal', valor: 5500.00, tipo: 'entrada', categoria: 'Salário', paymentMethod: 'debito' },
    { data: makeDate(-1, 4), descricao: 'Supermercado Pão de Açúcar', valor: 612.40, tipo: 'saida', categoria: 'Alimentação', paymentMethod: 'debito' },
    { data: makeDate(-1, 8), descricao: 'Aluguel do Apê', valor: 1800.00, tipo: 'saida', categoria: 'Moradia', paymentMethod: 'debito' },
    { data: makeDate(-1, 11), descricao: 'Cinema + Pipoca', valor: 82.00, tipo: 'saida', categoria: 'Lazer', paymentMethod: 'credito' },
    { data: makeDate(-1, 15), descricao: 'Posto Ipiranga', valor: 200.00, tipo: 'saida', categoria: 'Transporte', paymentMethod: 'debito' },
    { data: makeDate(-1, 21), descricao: 'Rendimento de Investimentos', valor: 184.50, tipo: 'entrada', categoria: 'Investimentos', paymentMethod: 'debito' },
  ];

  return sampleTxs.map((tx, idx) => ({
    ...tx,
    id: `mock-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`
  }));
};

