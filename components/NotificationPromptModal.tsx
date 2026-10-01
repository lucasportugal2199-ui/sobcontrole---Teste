import React from 'react';
import Modal from './Modal';
import { BellIcon } from './icons';
import { LocalNotifications } from '@capacitor/local-notifications';

interface NotificationPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => void;
    onDecline: () => void;
}

const NotificationPromptModal: React.FC<NotificationPromptModalProps> = ({ isOpen, onClose, onAccept, onDecline }) => {
    
    const handleAccept = async () => {
        try {
            const result = await LocalNotifications.requestPermissions();
            if (result.display === 'granted') {
                onAccept();
            } else {
                onDecline();
            }
        } catch (error) {
            console.error('Failed to request notification permission', error);
            onDecline();
        }
        onClose();
    };

    const handleDecline = () => {
        onDecline();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleDecline}>
            <div className="flex flex-col items-center text-center py-6 px-4">
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 text-blue-500 animate-pulse">
                    <BellIcon className="h-10 w-10" />
                </div>
                
                <h2 className="text-2xl font-black text-light-text dark:text-dark-text mb-3">
                    Fique no Controle!
                </h2>
                
                <p className="text-light-text-secondary dark:text-dark-text-muted mb-8 leading-relaxed">
                    Deseja ser lembrado sobre o vencimento de faturas, fechamento de faturas do cartão e quando seus orçamentos estiverem perto do limite?
                </p>

                <div className="w-full space-y-3">
                    <button 
                        onClick={handleAccept}
                        className="w-full bg-fin-info hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
                    >
                        Sim, me avise
                    </button>
                    
                    <button 
                        onClick={handleDecline}
                        className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-dark-card dark:hover:bg-slate-800 text-light-text-secondary dark:text-dark-text-muted font-bold py-4 rounded-xl transition-colors"
                    >
                        Agora não
                    </button>
                </div>
                
                <p className="text-xs text-slate-400 mt-6">
                    Você pode alterar isso a qualquer momento nas configurações.
                </p>
            </div>
        </Modal>
    );
};

export default NotificationPromptModal;
