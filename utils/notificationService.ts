
import { LocalNotifications } from '@capacitor/local-notifications';

export interface InactivityReminder {
    id: number;
    days: number;
    title: string;
    body: string;
}

export const CALOPSITA_REMINDERS: InactivityReminder[] = [
    {
        id: 1,
        days: 1,
        title: "Psiu! Lançou o cafezinho de hoje? ☕🦜",
        body: "A Calopsita CFO está de olho no poleiro! Registre os gastos de hoje antes de dormir para não esquecer nada."
    },
    {
        id: 2,
        days: 2,
        title: "Piu! Dois dias sem nos ver por aqui 🪶",
        body: "Dois minutinhos no app mantêm seu extrato afinado e o saldo cantando bonito!"
    },
    {
        id: 3,
        days: 3,
        title: "Bico afiado nas finanças! 🦜✨",
        body: "Três dias sem registros! Dê um pulinho no app para a Calopsita CFO conferir se as contas continuam sob controle."
    },
    {
        id: 4,
        days: 5,
        title: "Cadê você no ninho? 🌾🦜",
        body: "Cinco dias sem lançamentos! Suas sementinhas de reserva precisam de atenção para não voarem embora."
    },
    {
        id: 5,
        days: 7,
        title: "Reunião de diretoria com a Calopsita CFO 📋🦜",
        body: "Uma semana se passou! Venha conferir suas faturas e metas antes que o bicho pegue no fechamento do mês."
    },
    {
        id: 6,
        days: 10,
        title: "Alerta no poleiro! O topete tá em pé ⚠️🦜",
        body: "Dez dias sem abrir o app! A Calopsita CFO está em alerta. Vamos botar a casa em ordem hoje?"
    },
    {
        id: 7,
        days: 14,
        title: "Balanço quinzenal te esperando! 📊🦜",
        body: "Duas semanas sem atualizar gastos. Metade do mês já passou: venha proteger suas sementinhas e investimentos!"
    },
    {
        id: 8,
        days: 21,
        title: "Não deixe suas finanças baterem asas! 💸🪽",
        body: "21 dias longe do ninho! Venha colocar as contas em dia com a ajuda e as orientações da sua Calopsita CFO."
    },
    {
        id: 9,
        days: 30,
        title: "Novo ciclo, novo voo! 🚀🦜",
        body: "Um mês sem registros. Que tal recomeçar agora, zerar pendências e decolar rumo à sua independência financeira?"
    }
];

export const NotificationService = {
    /**
     * Solicita permissão para notificações (Android 13+)
     */
    async requestPermission(): Promise<boolean> {
        try {
            const check = await LocalNotifications.checkPermissions();
            if (check.display === 'granted') return true;

            const request = await LocalNotifications.requestPermissions();
            return request.display === 'granted';
        } catch (error) {
            console.error('Erro ao solicitar permissão de notificação:', error);
            return false;
        }
    },

    /**
     * Cancela todos os lembretes pendentes
     */
    async cancelAll(): Promise<void> {
        try {
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel(pending);
            }
        } catch (error) {
            console.error('Erro ao cancelar notificações:', error);
        }
    },

    /**
     * Retorna a lista de mensagens e prazos da Calopsita CFO
     */
    getRemindersList(): InactivityReminder[] {
        return CALOPSITA_REMINDERS;
    },

    /**
     * Agenda lembretes graduais de inatividade com a personalidade da Calopsita CFO
     */
    async scheduleInactivityReminders(): Promise<void> {
        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
            console.warn('[Notifications] Permissão negada — lembretes não agendados');
            return;
        }
        await this.cancelAll();

        try {
            const now = Date.now();
            const notifications = CALOPSITA_REMINDERS.map(reminder => ({
                id: reminder.id,
                title: reminder.title,
                body: reminder.body,
                schedule: { at: new Date(now + 1000 * 60 * 60 * 24 * reminder.days) },
                sound: 'default',
                smallIcon: 'ic_stat_name',
                actionTypeId: 'OPEN_APP'
            }));

            await LocalNotifications.schedule({ notifications });
            console.log(`✔ ${notifications.length} lembretes da Calopsita CFO agendados com sucesso.`);
        } catch (error) {
            console.error('Erro ao agendar notificações:', error);
        }
    }
};
