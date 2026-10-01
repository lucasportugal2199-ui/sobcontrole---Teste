
import React from 'react';
import Modal from './Modal';

interface PickerItem {
    id: string;
    name: string;
    icon?: string;
}

interface ListPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: PickerItem[];
    selectedId: string; // Mudado para ID para maior precisão
    onSelect: (item: PickerItem) => void;
    title: string;
}

const ListPickerModal: React.FC<ListPickerModalProps> = ({ 
    isOpen, 
    onClose, 
    items, 
    selectedId, 
    onSelect,
    title
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col max-h-[70vh]">
                <h3 className="text-xl font-bold text-light-text dark:text-dark-text mb-6 px-1">{title}</h3>
                
                <div className="flex-1 overflow-y-auto no-scrollbar -mx-2 px-2">
                    <div className="space-y-1">
                        {items.map((item) => {
                            const isSelected = item.id === selectedId;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        onSelect(item);
                                        setTimeout(onClose, 180); // Delay suave para feedback visual
                                    }}
                                    className="w-full flex items-center justify-between p-4 rounded-xl transition-colors active:bg-slate-100 dark:active:bg-slate-700/50 group"
                                >
                                    <span className={`text-base font-semibold text-left flex-1 flex items-center gap-3 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-light-text dark:text-dark-text-secondary'}`}>
                                        <span className="w-9 h-9 flex items-center justify-center text-2xl leading-none flex-shrink-0 rounded-xl bg-slate-100 dark:bg-slate-700">
                                            {item.icon || '📂'}
                                        </span>
                                        {item.name}
                                    </span>
                                    
                                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ml-4 ${
                                        isSelected 
                                            ? 'border-blue-500 dark:border-blue-400' 
                                            : 'border-slate-300 dark:border-slate-600'
                                    }`}>
                                        {isSelected && (
                                            <div className="h-3 w-3 rounded-full bg-blue-500 dark:bg-blue-400 animate-in zoom-in duration-200" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ListPickerModal;
