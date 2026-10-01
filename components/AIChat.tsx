
import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import { ArrowLeftIcon, SparklesIcon, LoaderIcon, LockIcon, CrownIcon, CalopsitaIcon } from './icons';
import { GoogleGenAI } from "@google/genai";
import { formatCurrency } from '../utils/helpers';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
    pendingTransaction?: {
        valor: number;
        descricao: string;
        categoria: string;
        tipo: 'entrada' | 'saida';
        data: string;
    };
}

const AIChat: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("AIChat missing AppContext");

    const { setCurrentView, allTransactions, userProfile, theme, categorias, handleLancamentoSubmit, showToast, incrementCfoInteractions, updateUserProfile } = context;
    const { t, locale } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const isPremium = userProfile.isPremium;

    // Limite de 3 consultas gratuitas por dia para quem não for PRO
    const FREE_DAILY_CFO_LIMIT = 3;
    const todayStr = new Date().toISOString().split('T')[0];
    const dailyQueriesUsed = userProfile.cfoLastQueryDate === todayStr ? (userProfile.cfoDailyQueriesCount || 0) : 0;
    const remainingQueries = isPremium ? Infinity : Math.max(0, FREE_DAILY_CFO_LIMIT - dailyQueriesUsed);
    const hasReachedLimit = !isPremium && remainingQueries <= 0;

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial welcome message
    useEffect(() => {
        if (messages.length === 0) {
            const welcomeText = isPremium
                ? `Piu! Olá, ${userProfile.name}! 🦜 Eu sou a sua Calopsita CFO. Como você é assinante PRO, você tem consultas ilimitadas! Como posso te ajudar a voar alto nas suas finanças hoje?`
                : `Piu! Olá, ${userProfile.name}! 🦜 Eu sou a sua Calopsita CFO. Você tem 3 consultas gratuitas por dia para analisar seus gastos, guardar sementinhas e organizar seu orçamento. Como posso te ajudar hoje?`;

            setMessages([{
                id: 'welcome',
                role: 'model',
                text: welcomeText,
                timestamp: new Date()
            }]);
        }
    }, [userProfile.name, messages.length, isPremium]);

    // Auto scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSendMessage = async (text: string = inputText) => {
        if (!text.trim() || isTyping) return;

        if (hasReachedLimit) {
            showToast("Você atingiu o limite de 3 consultas gratuitas de hoje com a Calopsita CFO.", "info");
            setCurrentView('premium');
            return;
        }

        // Incrementa contador diário para usuários gratuitos
        if (!isPremium && updateUserProfile) {
            const nextCount = dailyQueriesUsed + 1;
            updateUserProfile({
                cfoDailyQueriesCount: nextCount,
                cfoLastQueryDate: todayStr
            });
        }

        if (incrementCfoInteractions) {
            incrementCfoInteractions();
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: text,
            timestamp: new Date()
        };

        const currentMessages = [...messages, userMsg];
        setMessages(currentMessages);
        setInputText('');
        setIsTyping(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '' });

            const dataContext = JSON.stringify(allTransactions.map(tx => ({
                data: tx.data,
                desc: tx.descricao,
                valor: tx.valor,
                tipo: tx.tipo,
                cat: tx.categoria
            })));

            // IMPORTANTE: O histórico para o Gemini DEVE começar com um turno 'user'.
            // Removemos a mensagem de boas-vindas do histórico enviado se ela for a primeira.
            const apiHistory = currentMessages
                .filter(m => m.id !== 'welcome') // Remove mensagem estática de boas-vindas
                .slice(0, -1) // Remove a última mensagem (que é a atual do user)
                .map(m => ({
                    role: m.role,
                    parts: [{ text: m.text }]
                }));

            const chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                history: apiHistory,
                config: {
                    systemInstruction: `Você é a "Calopsita CFO", uma consultora financeira pessoal de elite com o carisma e a perspicácia de uma calopsita inteligente e atenta aos centavos.
                    Seu objetivo é ajudar o usuário (${userProfile.name}) a entender suas finanças, poupar dinheiro e alcançar seus objetivos.
                    
                    PERSONALIDADE:
                    - Inteligente, carismática e atenta a cada centavo do orçamento.
                    - De vez em quando use expressões leves e divertidas de calopsita (ex: "Piu!", "guardar sementinhas", "voar alto nas metas", "cuidar do ninho"), mantendo sempre respostas precisas, práticas e profissionais.
                    
                    REGRAS:
                    1. Use os dados de transações fornecidos para responder perguntas específicas.
                    2. Seja preciso com cálculos.
                    3. Seja conciso. Use bullet points para clareza.
                    4. Dê conselhos práticos de economia baseados nos hábitos reais do usuário.
                    5. ${
                        locale === 'en' ? 'Always respond in English.' :
                        locale === 'es' ? 'Responde siempre en Español.' :
                        locale === 'fr' ? 'Répondez toujours en Français.' :
                        locale === 'de' ? 'Antworte immer auf Deutsch.' :
                        'Responda sempre em Português do Brasil.'
                    }
                    
                    CONTEXTO ATUAL DE TRANSAÇÕES:
                    ${dataContext}
                    
                    CATEGORIAS DISPONÍVEIS (Saída): ${JSON.stringify(categorias.saida.map(c => c.name))}
                    CATEGORIAS DISPONÍVEIS (Entrada): ${JSON.stringify(categorias.entrada.map(c => c.name))}
                    
                    REGRAS PARA LANÇAMENTOS:
                    - Se o usuário sugerir um gasto, ganho ou transação (ex: "gastei 50 no bar"), identifique: valor, descrição, categoria, tipo (entrada/saida) e data (YYYY-MM-DD).
                    - No final da sua explicação, inclua SEMPRE um bloco JSON no formato:
                    [TRANSACTION_DATA]
                    { "valor": 50.0, "descricao": "Bar", "categoria": "Lazer", "tipo": "saida", "data": "2024-03-08" }
                    [/TRANSACTION_DATA]
                    - Use apenas as categorias fornecidas. Se não souber, use "Outros".`,
                },
            });

            const response = await chat.sendMessage({ message: text });

            let aiText = response.text || t('aichat.errorProcessing');
            let pendingTransaction = undefined;

            // Intercepta JSON de transação
            const txMatch = aiText.match(/\[TRANSACTION_DATA\]([\s\S]*?)\[\/TRANSACTION_DATA\]/);
            if (txMatch) {
                try {
                    pendingTransaction = JSON.parse(txMatch[1].trim());
                    // Remove o bloco JSON do texto visível
                    aiText = aiText.replace(/\[TRANSACTION_DATA\][\s\S]*?\[\/TRANSACTION_DATA\]/, '').trim();
                } catch (e) {
                    console.error("Erro ao parsear transação da IA", e);
                }
            }

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: aiText,
                timestamp: new Date(),
                pendingTransaction
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("AI Chat Error:", error);
            setMessages(prev => [...prev, {
                id: 'error',
                role: 'model',
                text: t('aichat.connectionError'),
                timestamp: new Date()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const suggestedQuestions = [
        t('aichat.suggested.summary'),
        t('aichat.suggested.whereSpent'),
        t('aichat.suggested.savingsAdvice'),
        t('aichat.suggested.weeklyHighlights')
    ];

    return (
        <div className="bg-light-card-elevated dark:bg-dark-bg h-full flex flex-col overflow-hidden">
            {/* Header */}
            <header className="p-4 border-b border-light-border dark:border-dark-elevated bg-slate-100 dark:bg-dark-bg flex items-center justify-between gap-4 z-10 shadow-sm pt-[calc(1rem+var(--sat))]">
                <div className="flex items-center gap-3">
                    <button onClick={() => setCurrentView('main')} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-dark-surface transition">
                        <ArrowLeftIcon className="h-6 w-6 text-light-text dark:text-dark-text-secondary" />
                    </button>
                    <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/30 overflow-hidden shadow-sm flex-shrink-0">
                        <CalopsitaIcon className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1 className="text-base font-black text-light-text dark:text-dark-text leading-none tracking-tight">Assistente IA</h1>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mt-1 block">Calopsita CFO • Consultora Financeira 🦜</span>
                    </div>
                </div>

                {/* Badge de Status / Limite Diário */}
                {isPremium ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-amber-500/20 border border-amber-500/30 rounded-full shadow-sm">
                        <CrownIcon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">PRO • Ilimitado</span>
                    </div>
                ) : (
                    <button
                        onClick={() => setCurrentView('premium')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200/80 dark:bg-dark-surface border border-slate-300 dark:border-dark-elevated rounded-full hover:border-amber-400/50 transition group"
                        title="Toque para virar PRO e ter consultas ilimitadas"
                    >
                        <span className={`w-2 h-2 rounded-full ${remainingQueries > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-[10px] font-black text-light-text dark:text-dark-text tracking-tight">
                            {remainingQueries}/{FREE_DAILY_CFO_LIMIT} hoje
                        </span>
                        <CrownIcon className="w-3 h-3 text-amber-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                )}
            </header>

            {/* Message Area */}
            <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar bg-light-card-elevated dark:bg-dark-bg">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                        {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-xl overflow-hidden border border-amber-400/30 flex-shrink-0 mb-1 shadow-sm">
                                <CalopsitaIcon className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className={`max-w-[85%] p-4 rounded-3xl shadow-sm text-sm font-medium leading-relaxed ${msg.role === 'user'
                            ? 'bg-fin-info text-white rounded-tr-none shadow-blue-200 dark:shadow-none'
                            : 'bg-light-card-elevated dark:bg-dark-card text-light-text dark:text-dark-text-secondary border border-light-border dark:border-dark-elevated rounded-tl-none shadow-slate-200/50 dark:shadow-none'
                            }`}>
                            <div className="whitespace-pre-wrap">
                                {msg.text}
                            </div>

                            {msg.pendingTransaction && (
                                <div className="mt-4 p-4 bg-light-card-elevated dark:bg-dark-bg/50 rounded-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-500">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-fin-info dark:text-blue-400 mb-2">{t('aichat.confirmTransaction')}</h4>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-light-text dark:text-dark-text truncate">{msg.pendingTransaction.descricao}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{msg.pendingTransaction.categoria}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-black ${msg.pendingTransaction.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {msg.pendingTransaction.tipo === 'entrada' ? '+' : '-'}{formatCurrency(msg.pendingTransaction.valor)}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const tx = msg.pendingTransaction!;
                                            handleLancamentoSubmit({ preventDefault: () => { } } as any, {
                                                ...tx,
                                                paymentMethod: 'debito'
                                            });
                                            showToast(t('aichat.toast.transactionAdded'), "success");
                                            // Limpa a transação pendente desta mensagem para não mostrar o card de novo
                                            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pendingTransaction: undefined } : m));
                                        }}
                                        className="w-full py-2.5 bg-fin-info text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                                    >
                                        {t('aichat.confirmNow')}
                                    </button>
                                </div>
                            )}

                            <div className={`text-[9px] font-black uppercase tracking-widest mt-2 opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                {msg.timestamp.toLocaleTimeString(appLocale, { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-light-card-elevated dark:bg-dark-card p-4 rounded-3xl rounded-tl-none border border-light-border dark:border-dark-elevated">
                            <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                <div className="w-1.5 h-1.5 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <div className="p-4 bg-white dark:bg-dark-bg border-t border-light-border dark:border-dark-elevated pb-[calc(1rem+var(--sab))]">
                {messages.length < 3 && !isTyping && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {suggestedQuestions.map(q => (
                            <button
                                key={q}
                                onClick={() => handleSendMessage(q)}
                                className="text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-indigo-950/40 text-fin-info dark:text-blue-400 px-4 py-2 rounded-full border border-blue-100 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors active:scale-95"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}
                {hasReachedLimit ? (
                    <div className="p-4 bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-pink-500/10 border border-amber-500/30 rounded-2xl text-center space-y-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-wide">
                            <LockIcon className="w-4 h-4" />
                            <span>Limite diário de 3 consultas atingido</span>
                        </div>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary font-medium max-w-sm mx-auto leading-relaxed">
                            Suas 3 consultas gratuitas de hoje com a Calopsita CFO se esgotaram. Para continuar tirando dúvidas, recebendo análises e conselhos sem limites, assine o plano PRO!
                        </p>
                        <button
                            onClick={() => setCurrentView('premium')}
                            className="w-full max-w-sm mx-auto bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-purple-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                        >
                            <CrownIcon className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
                            <span>Desbloquear Consultas Ilimitadas no PRO</span>
                        </button>
                    </div>
                ) : (
                    <div>
                        {!isPremium && (
                            <div className="flex justify-between items-center mb-2 px-1 text-[11px]">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">
                                    Consultas gratuitas hoje:
                                </span>
                                <span className="font-black text-amber-600 dark:text-amber-400">
                                    {remainingQueries} de {FREE_DAILY_CFO_LIMIT} restantes
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={t('aichat.inputPlaceholder')}
                                className="flex-1 bg-light-card-elevated dark:bg-dark-card text-light-text dark:text-dark-text border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={!inputText.trim() || isTyping}
                                className="h-14 w-14 bg-fin-info text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/30 active:scale-90 disabled:opacity-30 disabled:grayscale transition-all"
                            >
                                {isTyping ? <LoaderIcon className="h-6 w-6 animate-spin" /> : <SparklesIcon className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIChat;
