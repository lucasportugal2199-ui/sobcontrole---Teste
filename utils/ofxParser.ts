import { Categorias } from '../types';

export interface ParsedOFXTransaction {
    id: string;
    data: string; // YYYY-MM-DD
    descricao: string;
    valor: number;
    tipo: 'entrada' | 'saida';
    categoria: string;
    memo?: string;
}

// Categorização inteligente local baseada em palavras-chave de estabelecimentos brasileiros
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'Alimentação': [
        'ifood', 'restaurante', 'burger', 'mcdonald', 'habib', 'subway', 'pizza',
        'padaria', 'mercado', 'supermercado', 'carrefour', 'pao de acucar', 'assai',
        'atacadao', 'hortifruti', 'acougue', 'bar', 'choperia', 'lanches', 'cafe',
        'confeitaria', 'bistro', 'panificadora', 'mercearia', 'comida', 'alimentacao'
    ],
    'Transporte': [
        'uber', '99', 'taxi', 'combustivel', 'posto', 'gasolina', 'etanol',
        'shell', 'ipiranga', 'petrobras', 'estacionamento', 'estapar', 'pedagio',
        'sem parar', 'veloe', 'auto posto', 'bilhete unico', 'onibus', 'metro', 'voegol', 'latam', 'azul'
    ],
    'Saúde': [
        'farmacia', 'drogaria', 'raia', 'drogasil', 'pacheco', 'sao paulo', 'panvel',
        'hospital', 'clinica', 'laboratorio', 'medico', 'dentista', 'odonto',
        'consulta', 'remedio', 'otica', 'oftalmo', 'psicologo'
    ],
    'Moradia': [
        'aluguel', 'condominio', 'enel', 'light', 'cemig', 'copel', 'cpfl', 'energia',
        'sabesp', 'sanepar', 'cedae', 'agua', 'gas', 'ultragaz', 'supergasbras',
        'claro', 'vivo', 'tim', 'oi', 'internet', 'fibra', 'iptu', 'reforma'
    ],
    'Lazer': [
        'netflix', 'spotify', 'cinema', 'cinemark', 'cinepolis', 'steam', 'playstation',
        'xbox', 'nintendo', 'ingresso', 'sympla', 'eventim', 'show', 'teatro', 'livraria',
        'amazon prime', 'disney', 'hbo', 'max', 'deezer', 'youtube'
    ],
    'Educação': [
        'faculdade', 'universidade', 'escola', 'colegio', 'curso', 'udemy', 'alura',
        'livro', 'idiomas', 'ingles', 'pos graduacao', 'mensalidade'
    ],
    'Compras': [
        'amazon', 'mercado livre', 'shopee', 'aliexpress', 'shein', 'magalu', 'magazine luiza',
        'casas bahia', 'americanas', 'zara', 'renner', 'riachuelo', 'c&a', 'centauro', 'decathlon'
    ],
    'Salário': [
        'salario', 'pro ventos', 'pro-labore', 'pagamento de salario', 'remuneracao', 'folha'
    ],
    'Investimentos': [
        'rendimento', 'dividendos', 'juros s/ capital', 'cdi', 'tesouro', 'xp invest',
        'rico', 'nuinvest', 'b3', 'aplicacao', 'resgate'
    ]
};

const findBestCategory = (description: string, isEntrada: boolean, categories: Categorias): string => {
    const descLower = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const validList = isEntrada ? categories.entrada : categories.saida;
    const categoryNames = validList.map(c => c.name);

    // 1. Tentar encontrar palavra-chave em nossos padrões pré-definidos
    for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
            // Verifica se a categoria existe na lista do usuário
            const match = categoryNames.find(c => c.toLowerCase() === catName.toLowerCase());
            if (match) return match;
        }
    }

    // 2. Tentar match direto com o nome da categoria do usuário
    const directMatch = categoryNames.find(c => descLower.includes(c.toLowerCase()));
    if (directMatch) return directMatch;

    // 3. Fallback: 'Outros' se existir, ou a última categoria da lista
    const outros = categoryNames.find(c => c.toLowerCase().includes('outro'));
    if (outros) return outros;

    return categoryNames[categoryNames.length - 1] || 'Outros';
};

/**
 * Parser offline ultrarrápido para extratos bancários em formato OFX (XML ou SGML).
 */
export const parseOFXOffline = (ofxContent: string, categories: Categorias): ParsedOFXTransaction[] => {
    const transactions: ParsedOFXTransaction[] = [];

    // Localizar blocos de transação <STMTTRN>...</STMTTRN> ou <STMTTRN> até o próximo <STMTTRN>
    const regexBlock = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|$)/gi;
    let match: RegExpExecArray | null;

    while ((match = regexBlock.exec(ofxContent)) !== null) {
        const block = match[1];
        if (!block) continue;

        // Extrai tags com ou sem fechamento (ex: <TAG>VALOR</TAG> ou <TAG>VALOR\n)
        const getTagValue = (tag: string): string => {
            const pattern = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
            const found = pattern.exec(block);
            return found ? found[1].trim() : '';
        };

        const rawAmount = getTagValue('TRNAMT').replace(',', '.');
        const rawDate = getTagValue('DTPOSTED');
        const rawName = getTagValue('NAME') || getTagValue('MEMO') || 'Transação';
        const memo = getTagValue('MEMO');
        const fitid = getTagValue('FITID') || `ofx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const parsedAmount = parseFloat(rawAmount);
        if (isNaN(parsedAmount) || parsedAmount === 0) continue;

        // No padrão OFX, negativo = débito/saída, positivo = crédito/entrada
        const isEntrada = parsedAmount > 0;
        const tipo: 'entrada' | 'saida' = isEntrada ? 'entrada' : 'saida';
        const valorAbsoluto = Math.abs(parsedAmount);

        // Formatação de data (OFX costuma ser YYYYMMDDHHMMSS...)
        let formattedDate = new Date().toISOString().split('T')[0];
        if (rawDate && rawDate.length >= 8) {
            const year = rawDate.substring(0, 4);
            const month = rawDate.substring(4, 6);
            const day = rawDate.substring(6, 8);
            formattedDate = `${year}-${month}-${day}`;
        }

        const categoria = findBestCategory(rawName + ' ' + (memo || ''), isEntrada, categories);

        transactions.push({
            id: fitid,
            data: formattedDate,
            descricao: rawName,
            valor: valorAbsoluto,
            tipo,
            categoria,
            memo: memo !== rawName ? memo : undefined
        });
    }

    return transactions;
};
