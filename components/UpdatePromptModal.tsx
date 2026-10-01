import React from 'react';
import Modal from './Modal';
import { useTranslation } from '../i18n';
import { ArrowRightIcon, CheckCircleIcon } from './icons';
import { AppUpdateInfo } from '../utils/updateChecker';

interface UpdatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: AppUpdateInfo | null;
}

const UpdatePromptModal: React.FC<UpdatePromptModalProps> = ({
  isOpen,
  onClose,
  updateInfo
}) => {
  const { t } = useTranslation();

  if (!updateInfo || !updateInfo.hasUpdate) return null;

  const handleUpdateClick = () => {
    try {
      window.open(updateInfo.storeUrl, '_system');
    } catch {
      window.location.href = updateInfo.storeUrl;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={updateInfo.isForceUpdate ? () => {} : onClose}>
      <div className="space-y-5 text-center p-1">
        {/* Rocket Icon Container */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30 animate-bounce">
          <span className="text-3xl">🚀</span>
        </div>

        <div>
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
            Nova Versão v{updateInfo.latestVersion}
          </span>
          <h3 className="text-xl font-black text-light-text dark:text-white uppercase tracking-tight mt-2">
            {t('update.title') || 'Atualização Disponível!'}
          </h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {t('update.subtitle') || 'Uma nova versão do SobControle está disponível na Play Store com novidades.'}
          </p>
        </div>

        {/* Release Notes */}
        {updateInfo.releaseNotes && (
          <div className="p-3.5 bg-slate-100 dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-white/[0.08] text-left space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Novidades desta versão:
            </span>
            <p className="text-xs font-medium text-light-text dark:text-dark-text leading-relaxed flex items-start gap-2">
              <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{updateInfo.releaseNotes}</span>
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleUpdateClick}
            className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-500/25 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <span>{t('update.button') || 'Atualizar na Play Store'}</span>
            <ArrowRightIcon className="h-4 w-4" />
          </button>

          {!updateInfo.isForceUpdate && (
            <button
              onClick={onClose}
              className="w-full py-3 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              {t('common.later') || 'Lembrar mais tarde'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default UpdatePromptModal;
