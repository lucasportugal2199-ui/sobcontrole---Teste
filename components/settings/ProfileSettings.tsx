import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, UserCircleIcon, LockIcon } from '../icons';
import { useAppContext } from '../../context/AppContext';
import { fileToBase64 } from '../../utils/helpers';
import { useTranslation } from '../../i18n';

interface PresetAvatar {
    id: number;
    src: string;
    label: string;
}

const PRESET_AVATARS: PresetAvatar[] = [
    { id: 1, src: '/avatars/avatar_1.png', label: 'Calopsita Canela' },
    { id: 2, src: '/avatars/avatar_2.png', label: 'Calopsita Arlequim' },
    { id: 3, src: '/avatars/avatar_3.png', label: 'Calopsita Albina' },
    { id: 4, src: '/avatars/avatar_4.png', label: 'Calopsita Cinza' },
    { id: 5, src: '/avatars/avatar_5.png', label: 'Calopsita Lutino' },
    { id: 6, src: '/avatars/avatar_6.png', label: 'Calopsita Cara Branca' },
    { id: 7, src: '/avatars/avatar_7.png', label: 'Calopsita Curiosa' },
    { id: 8, src: '/avatars/avatar_8.png', label: 'Calopsita Executiva' },
];

const ProfileSettings: React.FC = () => {
    const { userProfile, updateUserProfile, showToast } = useAppContext();
    const { t } = useTranslation();

    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (userProfile) {
            setEditName(userProfile.name);
            setEditAvatar(userProfile.avatar || '');
        }
    }, [userProfile]);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const base64 = await fileToBase64(e.target.files[0]);
                const dataUrl = `data:image/jpeg;base64,${base64}`;
                setEditAvatar(dataUrl);
            } catch (error) {
                showToast(t('profile.imageError') || "Erro ao carregar imagem.", "error");
            }
        }
    };

    const handleSelectPreset = (src: string) => {
        setEditAvatar(src);
    };

    const handleSaveProfile = () => {
        if (!editName.trim()) {
            showToast(t('profile.nameEmptyError') || "O nome não pode estar vazio.", "error");
            return;
        }
        updateUserProfile({ name: editName, avatar: editAvatar });
        showToast(t('profile.success') || "Perfil atualizado com sucesso!", "success");
    };

    const hasChanges = editName.trim() !== userProfile.name || editAvatar !== (userProfile.avatar || '');

    return (
        <div className="flex flex-col pt-1 max-w-md mx-auto">
            <div className="flex-1 flex flex-col items-center">
                {/* Avatar Atual em Destaque */}
                <div className="relative mb-3 flex-shrink-0">
                    <div className="h-20 w-20 rounded-full p-[2px] bg-gradient-to-br from-[#EA580C] to-[#F97316] shadow-sm relative flex items-center justify-center">
                        <div className="h-full w-full rounded-full border-2 border-white dark:border-[#111111] overflow-hidden bg-slate-100 dark:bg-[#181818] flex items-center justify-center font-bold text-lg text-slate-900 dark:text-white">
                            {editAvatar ? (
                                <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <UserCircleIcon className="w-12 h-12 text-slate-400 dark:text-neutral-500" />
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-1.5 bg-[#EA580C] hover:bg-[#F97316] text-white rounded-full shadow-md active:scale-95 transition-all border-2 border-white dark:border-[#111111]"
                        title="Enviar foto personalizada"
                    >
                        <CameraIcon className="h-3 w-3" />
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </div>

                {/* Grade de 8 Avatares Pré-definidos */}
                <div className="w-full mb-3 bg-white dark:bg-[#111111] rounded-2xl p-3 shadow-sm border border-light-border dark:border-[#1F1F1F]">
                    <div className="flex items-center justify-between mb-2 px-0.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                            Avatares Pré-definidos
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFEDD5] dark:bg-[#431407] text-[#EA580C] dark:text-[#F97316]">
                            8 opções
                        </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2.5 justify-items-center">
                        {PRESET_AVATARS.map((preset) => {
                            const isSelected = editAvatar === preset.src;

                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handleSelectPreset(preset.src)}
                                    className={`relative w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all active:scale-95 flex items-center justify-center bg-slate-100 dark:bg-[#181818] ${
                                        isSelected
                                            ? 'border-[#EA580C] ring-2 ring-[#EA580C]/40 shadow-md scale-105'
                                            : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20'
                                    }`}
                                    title={preset.label}
                                >
                                    <img
                                        src={preset.src}
                                        alt={preset.label}
                                        className="w-full h-full object-cover"
                                    />

                                    {isSelected && (
                                        <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#EA580C] text-white flex items-center justify-center shadow-sm">
                                            <span className="text-[8px] font-black leading-none">✓</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Form Card compacto alinhado com o design system */}
                <div className="w-full bg-white dark:bg-[#111111] rounded-2xl p-3.5 shadow-sm border border-light-border dark:border-[#1F1F1F] space-y-3">
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 mb-1 block">
                            {t('profile.displayName') || 'Nome de Exibição'}
                        </label>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-white/[0.04] border border-light-border dark:border-white/[0.08] rounded-xl px-3 py-2 font-medium text-sm text-light-text dark:text-dark-text outline-none focus:border-[#EA580C] dark:focus:border-[#EA580C] transition-all placeholder-slate-400"
                            placeholder="Seu nome"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 mb-1 block">
                            {t('profile.emailIdentity') || 'E-mail (Identidade)'}
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={userProfile.email}
                                disabled
                                className="w-full bg-slate-100 dark:bg-white/[0.02] border border-light-border dark:border-white/[0.05] rounded-xl px-3 py-2 pr-9 font-normal text-sm text-slate-500 dark:text-neutral-500 outline-none cursor-not-allowed"
                            />
                            <LockIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-neutral-500" />
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1 font-normal">
                            {t('profile.emailDisabledWarning') || 'E-mail não pode ser alterado por segurança.'}
                        </p>
                    </div>

                    <div className="pt-1">
                        <button
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={!hasChanges}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
                                hasChanges
                                    ? 'bg-[#EA580C] hover:bg-[#F97316] text-white shadow-md shadow-[#EA580C]/25 active:scale-[0.99] cursor-pointer'
                                    : 'bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-neutral-600 cursor-not-allowed'
                            }`}
                        >
                            {t('profile.saveButton') || 'Salvar Informações'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
