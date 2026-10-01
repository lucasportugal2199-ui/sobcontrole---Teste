// Template definitions — cada template define a ordem dos cards e quais são visíveis.
// Estes são usados pelo Dashboard.tsx e LayoutSettings.tsx para configurar o layout.

export interface TemplateDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    order: string[];
    visibility: Record<string, boolean>;
}

export const TEMPLATE_EXECUTIVE: TemplateDefinition = {
    id: 'executive',
    name: 'Visão Executiva',
    description: 'KPIs com variação % e alertas inteligentes',
    icon: '📊',
    order: [
        'resumo',
        'contas',
        'invoices',
        'monthlyComparison',
        'orcamento',
        'tendencias',
    ],
    visibility: {
        resumo: true,
        contas: true,
        invoices: true,
        monthlyComparison: true,
        orcamento: true,
        tendencias: true,
    }
};

export const TEMPLATE_ANALYTICS: TemplateDefinition = {
    id: 'analytics',
    name: 'Análise Detalhada',
    description: 'Fluxo de caixa diário, fixos vs variáveis',
    icon: '🔍',
    order: [
        'resumo',
        'dailyCashFlow',
        'contas',
        'invoices',
        'fixedVsVariable',
        'despesasCategoria',
        'receitasCategoria',
        'tendencias',
        'distribuicao502030',
        'taxaPoupanca',
        'metodosPagamentoChart',
    ],
    visibility: {
        resumo: true,
        dailyCashFlow: true,
        contas: true,
        invoices: true,
        fixedVsVariable: true,
        despesasCategoria: true,
        receitasCategoria: true,
        tendencias: true,
        distribuicao502030: true,
        taxaPoupanca: true,
        metodosPagamentoChart: true,
    }
};

export const TEMPLATE_FORECAST: TemplateDefinition = {
    id: 'forecast',
    name: 'Projeção e Metas',
    description: 'Projeção de fim de mês, ritmo de gastos e histórico de poupança',
    icon: '🔮',
    order: [
        'resumo',
        'endOfMonthForecast',
        'contas',
        'invoices',
        'orcamento',
        'spendingPace',
        'tendencias',
        'savingsRateHistory',
        'distribuicao502030',
    ],
    visibility: {
        resumo: true,
        endOfMonthForecast: true,
        contas: true,
        invoices: true,
        orcamento: true,
        spendingPace: true,
        tendencias: true,
        savingsRateHistory: true,
        distribuicao502030: true,
    }
};

export const ALL_TEMPLATES: TemplateDefinition[] = [
    TEMPLATE_EXECUTIVE,
    TEMPLATE_ANALYTICS,
    TEMPLATE_FORECAST,
];

// Lista completa de todos os cards possíveis (existentes + novos) com labels
export const ALL_CARD_LABELS: Record<string, string> = {
    resumo: 'Resumo',
    contas: 'Contas',
    invoices: 'Faturas',
    insights: 'CFO IA',
    resumoDiario: 'Métricas',
    orcamento: 'Orçamentos',
    tendencias: 'Tendências',
    despesasCategoria: 'Despesas por Categoria',
    receitasCategoria: 'Receitas por Categoria',
    metodosPagamentoChart: 'Métodos de Pagamento',
    taxaPoupanca: 'Taxa de Poupança',
    distribuicao502030: 'Método 50/30/20',
    // Novos
    monthlyComparison: 'Comparativo Mensal',
    smartAlerts: 'Alertas Inteligentes',
    dailyCashFlow: 'Fluxo de Caixa Diário',
    fixedVsVariable: 'Fixos vs Variáveis',
    endOfMonthForecast: 'Projeção do Mês',
    spendingPace: 'Ritmo de Gastos',
    savingsRateHistory: 'Histórico de Poupança',
};
