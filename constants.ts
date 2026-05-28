
import { Categorias } from './types';

export const INITIAL_CATEGORIAS: Categorias = {
  entrada: [
    { id: 'salario', name: 'Salário', icon: 'wallet' },
    { id: 'investimentos-in', name: 'Investimentos', icon: 'chart-pie' },
    { id: 'vendas', name: 'Vendas', icon: 'shopping-bag' },
    { id: 'outras-receitas', name: 'Outras Receitas', icon: 'card' },
    { id: 'saldo-inicial', name: 'Saldo Inicial', icon: 'bank' }
  ],
  saida: [
    { id: 'moradia', name: 'Moradia', icon: 'home' },
    { id: 'alimentacao', name: 'Alimentação', icon: 'shopping-basket' },
    { id: 'transporte', name: 'Transporte', icon: 'car', bucket: 'necessidades', group: 'Gastos Variáveis' },
    { id: 'lazer', name: 'Lazer', icon: 'sun', bucket: 'desejos', group: 'Gastos Variáveis' },
    { id: 'saude', name: 'Saúde', icon: 'medkit', bucket: 'necessidades', group: 'Gastos Fixos' },
    { id: 'educacao', name: 'Educação', icon: 'flask', bucket: 'necessidades', group: 'Gastos Fixos' },
    { id: 'investimentos-out', name: 'Investimentos', icon: 'chart-pie', bucket: 'futuro', group: 'Reserva Financeira' },
    { id: 'outras-despesas', name: 'Outras Despesas', icon: 'box', bucket: 'desejos', group: 'Gastos Variáveis' },
  ],
};

export const CATEGORY_ICONS: { iconId: string; label: string; group: string }[] = [
  // 💰 Finanças
  { iconId: 'wallet', label: 'Carteira', group: 'Finanças' },
  { iconId: 'money', label: 'Dinheiro', group: 'Finanças' },
  { iconId: 'coins', label: 'Moedas', group: 'Finanças' },
  { iconId: 'bank', label: 'Banco', group: 'Finanças' },
  { iconId: 'card', label: 'Cartão', group: 'Finanças' },
  { iconId: 'chart-pie', label: 'Investimento', group: 'Finanças' },
  { iconId: 'chart-up', label: 'Rendimento', group: 'Finanças' },
  { iconId: 'receipt', label: 'Recibo', group: 'Finanças' },
  { iconId: 'percent', label: 'Juros', group: 'Finanças' },
  { iconId: 'briefcase', label: 'Trabalho', group: 'Finanças' },

  // 🏠 Moradia & Casa
  { iconId: 'home', label: 'Moradia', group: 'Casa' },
  { iconId: 'bolt', label: 'Energia', group: 'Casa' },
  { iconId: 'droplet', label: 'Água', group: 'Casa' },
  { iconId: 'wifi', label: 'Internet', group: 'Casa' },
  { iconId: 'lightbulb', label: 'Iluminação', group: 'Casa' },
  { iconId: 'tools', label: 'Manutenção', group: 'Casa' },

  // 🍔 Alimentação
  { iconId: 'shopping-basket', label: 'Mercado', group: 'Alimentação' },
  { iconId: 'utensils', label: 'Restaurante', group: 'Alimentação' },
  { iconId: 'coffee', label: 'Café', group: 'Alimentação' },
  { iconId: 'pizza', label: 'Delivery', group: 'Alimentação' },

  // 🚗 Transporte
  { iconId: 'car', label: 'Carro', group: 'Transporte' },
  { iconId: 'bus', label: 'Ônibus', group: 'Transporte' },
  { iconId: 'gas-pump', label: 'Combustível', group: 'Transporte' },
  { iconId: 'plane', label: 'Viagem', group: 'Transporte' },

  // ❤️ Saúde & Bem-estar
  { iconId: 'medkit', label: 'Saúde', group: 'Saúde' },
  { iconId: 'heart', label: 'Bem-estar', group: 'Saúde' },
  { iconId: 'dumbbell', label: 'Academia', group: 'Saúde' },
  { iconId: 'shield', label: 'Seguro', group: 'Saúde' },

  // 📚 Educação & Cultura
  { iconId: 'flask', label: 'Ciência', group: 'Educação' },
  { iconId: 'book', label: 'Livro', group: 'Educação' },
  { iconId: 'graduation', label: 'Faculdade', group: 'Educação' },

  // 🎮 Lazer & Entretenimento
  { iconId: 'sun', label: 'Lazer', group: 'Lazer' },
  { iconId: 'gamepad', label: 'Games', group: 'Lazer' },
  { iconId: 'music', label: 'Música', group: 'Lazer' },
  { iconId: 'film', label: 'Cinema', group: 'Lazer' },
  { iconId: 'camera', label: 'Fotografia', group: 'Lazer' },

  // 🛍️ Compras & Pessoal
  { iconId: 'shopping-bag', label: 'Compras', group: 'Pessoal' },
  { iconId: 'shirt', label: 'Roupas', group: 'Pessoal' },
  { iconId: 'scissors', label: 'Beleza', group: 'Pessoal' },
  { iconId: 'phone', label: 'Celular', group: 'Pessoal' },
  { iconId: 'gift', label: 'Presente', group: 'Pessoal' },

  // 👨‍👩‍👧 Família & Outros
  { iconId: 'baby', label: 'Bebê', group: 'Outros' },
  { iconId: 'pet', label: 'Pet', group: 'Outros' },
  { iconId: 'leaf', label: 'Natureza', group: 'Outros' },
  { iconId: 'globe', label: 'Mundo', group: 'Outros' },
  { iconId: 'star', label: 'Favorito', group: 'Outros' },
  { iconId: 'crown', label: 'Premium', group: 'Outros' },
  { iconId: 'tag', label: 'Etiqueta', group: 'Outros' },
  { iconId: 'box', label: 'Outros', group: 'Outros' },
];

export const INITIAL_CATEGORIA_CORES: { [key: string]: string } = {
  Moradia: '#FF6384',
  Alimentação: '#FF9F40', 
  Transporte: '#36A2EB', 
  Lazer: '#4BC0C0',
  Saúde: '#9966FF',
  Educação: '#FFCE56', 
  Investimentos: '#C9CBCF',
  'Outras Despesas': '#E7E9ED',
  Salário: '#10B981',
  Vendas: '#06B6D4',
  'Outras Receitas': '#6C757D',
  'Saldo Inicial': '#10B981',
  DEFAULT: '#5B21B6',
};

export const MESES_NOMES: string[] = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Paleta de 24 cores organizada em degradê (espectro cromático).
 * Flui de vermelho → laranja → amarelo → verde → ciano → azul → roxo → rosa.
 * Cada grupo possui um tom escuro e um claro para dar sensação de gradiente.
 */
export const COLOR_PALETTE: string[] = [
    // Vermelho → Laranja → Amarelo
    '#C62828', '#E53935', '#EF6C00', '#FB8C00', '#F9A825', '#FDD835',
    // Verde → Ciano
    '#2E7D32', '#43A047', '#00897B', '#26A69A', '#00838F', '#00ACC1',
    // Azul → Indigo
    '#1565C0', '#1E88E5', '#283593', '#3949AB', '#4527A0', '#5E35B1',
    // Roxo → Rosa → Terroso
    '#7B1FA2', '#AB47BC', '#AD1457', '#E91E63', '#6D4C41', '#546E7A',
];

export const AVAILABLE_BADGES = [
  // Básicas
  { id: 'iniciante', name: 'Iniciante', icon: '🌱', description: 'Realizou seu primeiro lançamento.' },
  { id: 'metas_1', name: 'Sonhador', icon: '🎯', description: 'Criou sua primeira meta de poupança.' },
  { id: 'planejador', name: 'Planejador', icon: '📅', description: 'Definiu seu primeiro orçamento mensal.' },
  
  // Metas (Novas!)
  { id: 'goal_completed_1', name: 'Primeiro Sonho', icon: '🎈', description: 'Completou 100% de uma meta de poupança.' },
  { id: 'goal_active_3', name: 'Foco Múltiplo', icon: '🏔️', description: 'Possui 3 ou mais metas ativas simultaneamente.' },
  { id: 'goal_deposit_5', name: 'Hábito de Ouro', icon: '💎', description: 'Realizou 5 aportes em suas metas.' },

  // Consistência & Uso do App
  { id: 'streak_3', name: 'Primeiros Passos', icon: '👣', description: 'Usou o app por 3 dias seguidos.' },
  { id: 'streak_7', name: 'Rotina Criada', icon: '🗓️', description: 'Usou o app por 7 dias seguidos.' },
  { id: 'streak_30', name: 'Comprometido', icon: '🔥', description: 'Usou o app por 30 dias seguidos.' },
  { id: 'streak_90', name: 'Disciplina Financeira', icon: '🧘', description: 'Usou o app por 90 dias seguidos.' },
  
  // Gamificação & Comportamento
  { id: 'budget_master', name: 'Mestre do Orçamento', icon: '🛡️', description: 'Terminou um mês sem estourar nenhum limite de categoria.' },
  { id: 'zero_spend_weekend', name: 'Fim de Semana de Ouro', icon: '🏆', description: 'Passou um sábado e domingo sem registrar despesas.' },
  { id: 'ai_explorer', name: 'Radar de Recibos', icon: '🤖', description: 'Escaneou 10 recibos usando a câmera inteligente.' },
  { id: 'conscious_investor', name: 'Investidor Consciente', icon: '📈', description: 'Alocou 10% da sua renda mensal em investimentos.' },
  { id: 'emergency_ready', name: 'Fundo de Emergência 1/3', icon: '🔋', description: 'Alcançou o equivalente a 1 mês de gastos em uma meta.' },

  // Longevidade
  { id: 'usage_3m', name: 'SobControle', icon: '🥉', description: '3 meses usando o app sem falhar.' },
  { id: 'usage_6m', name: 'Autocontrole', icon: '🥈', description: '6 meses usando o app sem falhar.' },
  { id: 'usage_12m', name: 'Controle Absoluto', icon: '🥇', description: '12 meses usando o app sem falhar.' },

  // Maestria
  { id: 'completionist', name: 'Exemplo a Seguir', icon: '🌟', description: 'Todas as conquistas básicas desbloqueadas.' },

  // Poupança
  { id: 'saldo_1000', name: 'Poupador Focado', icon: '🏦', description: 'Guardou seus primeiros R$ 1.000,00 em metas.' },
];
