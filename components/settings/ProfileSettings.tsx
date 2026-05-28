import React, { useState, useRef, useEffect, useContext } from 'react';
import { CameraIcon, UserCircleIcon, LockIcon } from '../icons';
import { AppContext } from '../../context/AppContext';
import { fileToBase64 } from '../../utils/helpers';

const ProfileSettings: React.FC = () => {
    const { userProfile, updateUserProfile, showToast } = useContext(AppContext);

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
                showToast("Erro ao carregar imagem.", "error");
            }
        }
    };

    const handleSaveProfile = () => {
        if (!editName.trim()) {
            showToast("O nome não pode estar vazio.", "error");
            return;
        }
        updateUserProfile({ name: editName, avatar: editAvatar });
        showToast("Perfil atualizado com sucesso!", "success");
    };

    const hasChanges = editName.trim() !== userProfile.name || editAvatar !== (userProfile.avatar || '');

    return (
        <div className="flex flex-col pt-4">
            <div className="flex-1 flex flex-col items-center pb-8">
                {/* Avatar */}
                <div className="relative mb-4">
                    <div className="w-32 h-32 rounded-full border-4 border-white dark:border-dark-bg shadow-xl overflow-hidden bg-slate-200 dark:bg-dark-surface">
                        {editAvatar ? (
                            <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <UserCircleIcon className="w-20 h-20 text-slate-400" />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute bottom-1 right-1 p-2 bg-dark-accent rounded-full text-white shadow-lg active:scale-90 transition-transform border-4 border-white dark:border-dark-bg"
                    >
                        <CameraIcon className="h-5 w-5" />
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </div>

                {/* Form Card */}
                <div className="w-full bg-white dark:bg-dark-surface rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-dark-bg space-y-6 mt-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nome de Exibição</label>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-dark-accent transition-colors"
                        />
                    </div>

                    <div className="relative opacity-60">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 block">E-mail (Identidade)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={userProfile.email}
                                disabled
                                className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 rounded-2xl p-4 pr-10 font-bold text-sm text-slate-500 dark:text-slate-300 outline-none cursor-not-allowed"
                            />
                            <LockIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                        <p className="text-[9px] text-slate-400 mt-2 ml-1">E-mail não pode ser alterado por segurança.</p>
                    </div>

                    <button
                        onClick={handleSaveProfile}
                        disabled={!hasChanges}
                        className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all duration-300 transform ${hasChanges
                            ? 'bg-dark-accent text-white shadow-dark-accent/20 active:scale-[0.98] cursor-pointer'
                            : 'bg-slate-200 dark:bg-dark-bg text-slate-400 dark:text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        Salvar Informações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
