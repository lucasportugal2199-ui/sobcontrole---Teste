import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  verticalAlign?: 'top' | 'center';
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

  // Para modais com inputs, posicionamos próximo ao topo + overflow-y-auto
  // para que o conteúdo suba automaticamente quando o teclado virtual aparecer
  const isInputModal = verticalAlign !== 'top';
  const overlayClass = isInputModal
    ? 'fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50 pb-0'
    : 'fixed inset-0 bg-black bg-opacity-75 flex items-start pt-20 justify-center z-50 p-4';

  const modalContent = (
    <div
      className={overlayClass}
      onClick={onClose}
      // Bloqueia eventos de toque no fundo (impede scroll da tela de baixo)
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className={`bg-light-bg dark:bg-dark-surface w-full rounded-t-[32px] p-6 relative shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 text-slate-900 dark:text-white overflow-y-auto max-h-[90dvh]`}
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors z-10"
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