
import { LocalNotifications } from '@capacitor/local-notifications';

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
     * Agenda lembretes graduais de inatividade
     */
    async scheduleInactivityReminders(): Promise<void> {
        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
            console.warn('[Notifications] Permissão negada — lembretes não agendados');
            return;
        }
        await this.cancelAll();

        try {
            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: 1,
                        title: "Não perca o fio da meada! 💸",
                        body: "Você não registra gastos há 3 dias. Que tal atualizar sua planilha agora?",
                        schedule: { at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3) }, // 3 dias
                        sound: 'default',
                        smallIcon: 'ic_stat_name', // Deve corresponder ao ícone no Android Studio
                        actionTypeId: 'OPEN_APP'
                    },
                    {
                        id: 2,
                        title: "Uma semana sem te ver! 📊",
                        body: "Sete dias sem lançamentos. Manter a constância é o segredo do controle financeiro.",
                        schedule: { at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) }, // 7 dias
                        sound: 'default',
                        actionTypeId: 'OPEN_APP'
                    },
                    {
                        id: 3,
                        title: "Sua saúde financeira importa 🚀",
                        body: "Já se passaram 15 dias. Vamos voltar ao controle e organizar esse mês?",
                        schedule: { at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15) }, // 15 dias
                        sound: 'default',
                        actionTypeId: 'OPEN_APP'
                    }
                ]
            });
            console.log('✔ Lembretes de inatividade agendados com sucesso.');
        } catch (error) {
            console.error('Erro ao agendar notificações:', error);
        }
    }
};
