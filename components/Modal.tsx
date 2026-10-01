import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  verticalAlign?: 'top' | 'center' | 'popup';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, verticalAlign = 'center' }) => {
  // Bloqueia scroll do fundo enquanto modal está aberto
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  let overlayClass = 'fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-[150] pb-0';
  let containerClass = 'bg-slate-100 dark:bg-dark-card w-full p-6 relative shadow-2xl animate-in fade-in duration-300 text-light-text dark:text-dark-text overflow-y-auto max-h-[90dvh] rounded-t-[32px] slide-in-from-bottom-4';

  if (verticalAlign === 'top') {
    overlayClass = 'fixed inset-0 bg-black bg-opacity-75 flex items-start pt-20 justify-center z-[150] p-4';
    containerClass = 'bg-slate-100 dark:bg-dark-card w-full p-6 relative shadow-2xl animate-in fade-in duration-300 text-light-text dark:text-dark-text overflow-y-auto max-h-[90dvh] rounded-[32px] slide-in-from-top-4';
  } else if (verticalAlign === 'popup') {
    overlayClass = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[150] p-4';
    containerClass = 'bg-slate-100 dark:bg-dark-card w-[calc(100%-2rem)] max-w-sm p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-light-text dark:text-dark-text overflow-y-auto max-h-[85dvh] rounded-[32px]';
  }

  const modalContent = (
    <div
      className={overlayClass}
      onClick={onClose}
      // Bloqueia eventos de toque no fundo (impede scroll da tela de baixo)
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className={containerClass}
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: verticalAlign === 'popup' ? '1.5rem' : 'calc(1.5rem + var(--sab))' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-light-text-muted dark:text-dark-text-secondary hover:text-slate-900 dark:hover:text-white transition-colors z-10"
          aria-label="Fechar"
        >
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>
  );


  return createPortal(modalContent, document.body);
};

export default Modal;