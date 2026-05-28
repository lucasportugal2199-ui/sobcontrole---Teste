import React, { useContext } from 'react';
import { CreditCardIcon, BankIcon, EditIcon, TrashIcon } from '../icons';
import { AppContext } from '../../context/AppContext';
import { CreditCard } from '../../types';

interface CardsSettingsProps {
    openCardModal: (card?: CreditCard) => void;
    setDeletingCardId: (id: string | null) => void;
}

const CardsSettings: React.FC<CardsSettingsProps> = ({ openCardModal, setDeletingCardId }) => {
    const { creditCards } = useContext(AppContext);

    return (
        <div className="space-y-4">
            {creditCards.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                    <CreditCardIcon className="h-16 w-16 mx-auto mb-4" />
                    <p className="font-bold">Nenhum cartão cadastrado.</p>
                </div>
            ) : (
                creditCards.map(card => (
                    <div key={card.id} className="p-4 bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: card.color }}>
                                <BankIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">{card.name}</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                    Vence dia {card.dueDay} • {card.closingType === 'dynamic' && card.closingDaysBefore != null
                                        ? `Fecha ${card.closingDaysBefore} dias antes`
                                        : `Fecha dia ${card.closingDay}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openCardModal(card)} className="p-2 bg-teal-50 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent rounded-lg">
                                <EditIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeletingCardId(card.id)} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default CardsSettings;
