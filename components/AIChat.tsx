
import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ArrowLeftIcon, SparklesIcon, LoaderIcon, LockIcon } from './icons';
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

    const { setCurrentView, allTransactions, userProfile, theme, categorias, handleLancamentoSubmit, showToast } = context;
    const isPremium = userProfile.isPremium;

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial welcome message
    useEffect(() => {
        if (isPremium && messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'model',
                text: `Olá ${userProfile.name}! Sou seu CFO de Bolso. Tenho acesso a todas as suas transações. Como posso te ajudar hoje? \n\nVocê pode me perguntar coisas como: "Quanto gastei com Uber esse mês?" ou "Posso gastar R$100 hoje?"`,
                timestamp: new Date()
            }]);
        }
    }, [userProfile.name, isPremium, messages.length]);

    // Auto scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSendMessage = async (text: string = inputText) => {
        if (!text.trim() || isTyping || !isPremium) return;

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
                    systemInstruction: `Você é o "CFO de Bolso", um consultor financeiro pessoal de elite. 
                    Seu objetivo é ajudar o usuário (${userProfile.name}) a entender suas finanças.
                    
                    REGRAS:
                    1. Use os dados de transações fornecidos para responder perguntas específicas.
                    2. Seja preciso com cálculos.
                    3. Seja conciso. Use bullet points para clareza.
                    4. Dê conselhos práticos de economia baseados nos hábitos reais do usuário.
                    5. Responda sempre em Português do Brasil.
                    
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

            let aiText = response.text || "Desculpe, tive um problema ao processar isso.";
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
                text: "Ops! Tive um problema de conexão com a IA. Verifique sua internet ou tente novamente em instantes.",
                timestamp: new Date()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const suggestedQuestions = [
        "Resumo do mês",
        "Onde mais gastei?",
        "Conselhos de economia",
        "Destaques da semana"
    ];

    if (!isPremium) {
        return (
            <div className="bg-slate-50 dark:bg-dark-bg h-full flex flex-col items-center justify-center p-8 text-center">
                <button onClick={() => setCurrentView('main')} className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-dark-surface transition">
                    <ArrowLeftIcon className="h-6 w-6 text-slate-700 dark:text-white" />
                </button>
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-8 rounded-[40px] mb-8 shadow-inner shadow-indigo-200/50 dark:shadow-none">
                    <LockIcon className="h-16 w-16 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter">Recurso Exclusivo PRO</h1>
                <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-xs mx-auto font-semibold leading-relaxed">
                    O CFO de Bolso é sua inteligência artificial pessoal que analisa seus gastos em tempo real para te dar as melhores dicas.
                </p>
                <button
                    onClick={() => setCurrentView('premium')}
                    className="w-full max-w-xs bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 active:scale-95 transition-all"
                >
                    Assinar Agora
                </button>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-dark-bg h-full flex flex-col overflow-hidden">
            {/* Header */}
            <header className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-dark-bg flex items-center gap-4 z-10 shadow-sm pt-[calc(1rem+env(safe-area-inset-top))]">
                <button onClick={() => setCurrentView('main')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-dark-surface transition">
                    <ArrowLeftIcon className="h-6 w-6 text-slate-700 dark:text-slate-200" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg shadow-sm">
                        <SparklesIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none tracking-tight">CFO de Bolso</h1>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest mt-1 block">Online e Pronto</span>
                    </div>
                </div>
            </header>

            {/* Message Area */}
            <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar bg-slate-50 dark:bg-dark-bg">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[85%] p-4 rounded-3xl shadow-sm text-sm font-medium leading-relaxed ${msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-200 dark:shadow-none'
                            : 'bg-slate-50 dark:bg-dark-surface text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none shadow-slate-200/50 dark:shadow-none'
                            }`}>
                            <div className="whitespace-pre-wrap">
                                {msg.text}
                            </div>

                            {msg.pendingTransaction && (
                                <div className="mt-4 p-4 bg-slate-50 dark:bg-dark-bg/50 rounded-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-500">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">Confirmar Lançamento?</h4>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{msg.pendingTransaction.descricao}</p>
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
                                            showToast("Transação adicionada com sucesso!", "success");
                                            // Limpa a transação pendente desta mensagem para não mostrar o card de novo
                                            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pendingTransaction: undefined } : m));
                                        }}
                                        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                                    >
                                        Confirmar Agora
                                    </button>
                                </div>
                            )}

                            <div className={`text-[9px] font-black uppercase tracking-widest mt-2 opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-slate-50 dark:bg-dark-surface p-4 rounded-3xl rounded-tl-none border border-slate-100 dark:border-slate-700">
                            <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 bg-indigo-400 dark:bg-indigo-500 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 dark:bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 dark:bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-dark-bg border-t border-slate-100 dark:border-slate-800 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {messages.length < 3 && !isTyping && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {suggestedQuestions.map(q => (
                            <button
                                key={q}
                                onClick={() => handleSendMessage(q)}
                                className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors active:scale-95"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Pergunte sobre seus gastos..."
                        className="flex-1 bg-slate-50 dark:bg-dark-surface text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                    <button
                        onClick={() => handleSendMessage()}
                        disabled={!inputText.trim() || isTyping}
                        className="h-14 w-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/30 active:scale-90 disabled:opacity-30 disabled:grayscale transition-all"
                    >
                        {isTyping ? <LoaderIcon className="h-6 w-6 animate-spin" /> : <SparklesIcon className="h-6 w-6" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
