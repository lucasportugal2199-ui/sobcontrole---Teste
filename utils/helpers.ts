
// Fix: Ensure proper types are imported for Gemini API
import { GoogleGenAI, Type } from "@google/genai";
import { MESES_NOMES } from '../constants';
import { Transaction, Categorias, TransactionType, ReceiptAnalysisResult, DailyBalance, ImportedTransaction, PaymentMethod, AllData, CreditCard } from '../types';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const getCorPorCategoria = (categoria: string, cores: { [key: string]: string }): string => {
  return cores[categoria] || cores.DEFAULT;
};

export const formatarMesAno = (date: Date): string => {
  const mes = MESES_NOMES[date.getMonth()];
  const ano = date.getFullYear();
  return `${mes} de ${ano}`;
};

export const getMonthKey = (date: Date): string => {
  const ano = date.getFullYear();
  const mes = date.getMonth() + 1;
  return `${ano}-${mes.toString().padStart(2, '0')}`;
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


// Calcula o dia de fechamento efetivo do cartão para um determinado mês de referência
export const getEffectiveClosingDay = (card: CreditCard, referenceDate?: Date): number => {
  if (card.closingType === 'dynamic' && card.closingDaysBefore != null) {
    // Fechamento dinâmico: X dias antes do vencimento
    const ref = referenceDate || new Date();
    const dueDate = new Date(ref.getFullYear(), ref.getMonth(), card.dueDay);
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

  // Cria a data de vencimento
  const dueDate = new Date(targetYear, targetMonth, card.dueDay);
  return formatDateToInput(dueDate);
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

export const calculateAccountBalance = (accountId: string, allTransactions: Transaction[], currentDate?: Date): number => {
    let balance = 0;
    const limitMonth = currentDate ? getMonthKey(currentDate) : null;

    for (const tx of allTransactions) {
        if (limitMonth) {
            const txMonth = getMonthKey(new Date(tx.data + 'T00:00:00'));
            if (txMonth > limitMonth) {
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

const getAIClient = () => {
    return new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || '' });
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

export const suggestCategory = async (description: string, type: TransactionType, categories: Categorias): Promise<string> => {
  if (!description.trim()) throw new Error("A descrição não pode estar vazia.");
  const ai = getAIClient();
  const currentCategories = categories[type].map(c => c.name);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analise a descrição: "${description}" e escolha uma destas categorias: [${currentCategories.join(', ')}]`,
    config: {
        systemInstruction: `Responda APENAS o nome da categoria. Se nada servir, use "Outros" ou a mais próxima.`,
    }
  });
  const cleaned = response.text?.trim().replace(/\.$/, "") || "";
  if (currentCategories.includes(cleaned)) return cleaned;
  const match = currentCategories.find(c => c.toLowerCase() === cleaned.toLowerCase());
  return match || currentCategories[0];
};

export const analyzeReceipt = async (base64Image: string, mimeType: string, categories: Categorias): Promise<ReceiptAnalysisResult> => {
    const ai = getAIClient();
    const availableExpenseCategories = categories.saida.map(c => c.name).join(', ');

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType, data: base64Image } }, 
                { text: `Extraia os dados deste recibo. Categorias permitidas: [${availableExpenseCategories}]. Escolha a mais aproximada, NUNCA crie uma nova.` }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    valor: { type: Type.NUMBER },
                    descricao: { type: Type.STRING },
                    data: { type: Type.STRING },
                    categoria: { type: Type.STRING }
                },
                required: ['valor', 'descricao', 'data', 'categoria']
            }
        }
    });
    
    try {
        const sanitized = sanitizeJsonResponse(response.text || "");
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
    const ai = getAIClient();
    const isOFX = file.name.toLowerCase().endsWith('.ofx');
    
    const catEntrada = categories.entrada.map(c => c.name).join(', ');
    const catSaida = categories.saida.map(c => c.name).join(', ');

    let contentPart;
    if (isOFX) {
        const text = await fileToText(file);
        contentPart = { text: `Analise este conteúdo de arquivo OFX e extraia as transações financeiras. Categorias de entrada permitidas: [${catEntrada}]. Categorias de saída permitidas: [${catSaida}].\n\n${text}` };
    } else {
        const base64 = await fileToBase64(file);
        contentPart = { inlineData: { mimeType: file.type || 'application/pdf', data: base64 } };
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                contentPart as any,
                { text: `Analise este documento e extraia as transações. REGRAS: 1. Ignore saldos. 2. Data AAAA-MM-DD. 3. Valor positivo. 4. tipo='saida' ou 'entrada'. 5. CATEGORIA OBRIGATÓRIA: Use APENAS uma das listas enviadas no contexto. Não invente categorias novas sob nenhuma circunstância. Se não souber, use a mais próxima.` }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        data: { type: Type.STRING },
                        descricao: { type: Type.STRING },
                        valor: { type: Type.NUMBER },
                        tipo: { type: Type.STRING, enum: ['entrada', 'saida'] },
                        categoria: { type: Type.STRING }
                    },
                    required: ['data', 'descricao', 'valor', 'tipo', 'categoria']
                }
            }
        }
    });

    try {
        const sanitized = sanitizeJsonResponse(response.text || "[]");
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

export const formatCurrencyForInput = (value: string): string => {
  if (!value) return '';
  let numericValue = value.replace(/\D/g, '');
  if (numericValue === '') return '';
  while (numericValue.length < 3) numericValue = '0' + numericValue;
  const cents = numericValue.slice(-2);
  const integerPart = numericValue.slice(0, -2);
  const formattedInteger = new Intl.NumberFormat('pt-BR').format(parseInt(integerPart, 10));
  return `R$ ${formattedInteger},${cents}`;
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

export const exportTransactionsToExcel = async (transactions: Transaction[], customFileName?: string) => {
    const fileName = customFileName || `Exportacao_Financeira_${Date.now()}.xlsx`;
    // @ts-ignore
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
    const data = transactions.sort((a, b) => a.data.localeCompare(b.data)).map(tx => ({
        'Data': new Date(tx.data + 'T00:00:00').toLocaleDateString('pt-BR'),
        'Descrição': tx.descricao,
        'Valor': tx.valor,
        'Tipo': tx.tipo === 'entrada' ? 'Receita' : 'Despesa',
        'Categoria': tx.categoria,
        'Pagamento': tx.paymentMethod.toUpperCase(),
        'Recorrente': tx.isRecurring ? 'Sim' : 'Não'
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const wscols = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }];
    worksheet['!cols'] = wscols;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lançamentos");
    XLSX.writeFile(workbook, fileName);
};

export const exportTransactionsToCSV = (transactions: Transaction[], customFileName?: string) => {
    const fileName = customFileName || `Exportacao_Financeira_${Date.now()}.csv`;
    const header = "Data,Descrição,Valor,Tipo,Categoria,Pagamento,Recorrente\n";
    const body = transactions.sort((a, b) => a.data.localeCompare(b.data)).map(tx => {
        const row = [
            new Date(tx.data + 'T00:00:00').toLocaleDateString('pt-BR'),
            `"${tx.descricao.replace(/"/g, '""')}"`,
            tx.valor,
            tx.tipo === 'entrada' ? 'Receita' : 'Despesa',
            tx.categoria,
            tx.paymentMethod.toUpperCase(),
            tx.isRecurring ? 'Sim' : 'Não'
        ];
        return row.join(',');
    }).join('\n');

    const csvContent = "\uFEFF" + header + body; // Adiciona BOM para Excel ler UTF-8 corretamente
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportTransactionsToPDF = async (transactions: Transaction[], customFileName?: string, title?: string) => {
    const fileName = customFileName || `Exportacao_Financeira_${Date.now()}.pdf`;
    
    // @ts-ignore
    const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    // @ts-ignore
    await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js');

    const doc = new jsPDF();
    const tableTitle = title || "Relatório Financeiro";
    
    doc.setFontSize(18);
    doc.text(tableTitle, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    
    const tableData = transactions.sort((a, b) => a.data.localeCompare(b.data)).map(tx => [
        new Date(tx.data + 'T00:00:00').toLocaleDateString('pt-BR'),
        tx.descricao,
        tx.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        tx.tipo === 'entrada' ? 'Receita' : 'Despesa',
        tx.categoria,
        tx.paymentMethod.toUpperCase()
    ]);

    // @ts-ignore
    doc.autoTable({
        startY: 35,
        head: [['Data', 'Descrição', 'Valor', 'Tipo', 'Categoria', 'Pagamento']],
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
