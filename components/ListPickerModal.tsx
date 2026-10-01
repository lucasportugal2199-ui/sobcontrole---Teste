import React from 'react';

import CategoryIcon from './CategoryIcon';
import Modal from './Modal';

interface PickerItem {
    id: string;
    name: string;
    icon?: string | React.ReactNode;
    color?: string;
}

interface ListPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: PickerItem[];
    selectedId: string;
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
                <h3 className="text-lg font-bold text-light-text dark:text-dark-text mb-6 px-1">{title}</h3>
                
                <div className="flex-1 overflow-y-auto no-scrollbar -mx-2 px-2">
                    <div className="space-y-1">
                        {items.map((item) => {
                            const isSelected = item.id === selectedId;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        onSelect(item);
                                        setTimeout(onClose, 180);
                                    }}
                                    className="w-full flex items-center justify-between p-4 rounded-xl transition-colors active:bg-slate-100 dark:active:bg-slate-700/50 group"
                                >
                                    <span className={`text-base font-semibold text-left flex-1 flex items-center gap-3 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-light-text dark:text-dark-text-secondary'}`}>
                                        <span 
                                            className="w-8 h-8 flex items-center justify-center text-xl leading-none flex-shrink-0 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden border border-transparent"
                                            style={item.color ? { backgroundColor: `${item.color}33`, borderColor: `${item.color}44` } : undefined}
                                        >
                                            {item.icon ? (
                                                typeof item.icon === 'string' ? (
                                                    <CategoryIcon name={item.icon} className="h-5 w-5" style={item.color ? { color: item.color } : undefined} />
                                                ) : (
                                                    <span style={item.color ? { color: item.color } : undefined} className="flex items-center justify-center">
                                                        {item.icon}
                                                    </span>
                                                )
                                            ) : '📂'}
                                        </span>
                                        {item.name}
                                    </span>
                                    
                                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ml-4 ${
                                        isSelected 
                                            ? 'border-blue-500 dark:border-blue-400' 
                                            : 'border-slate-300 dark:border-slate-600'
                                    }`}>
                                        {isSelected && (
                                            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-in zoom-in duration-200" />
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
