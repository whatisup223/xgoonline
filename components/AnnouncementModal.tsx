
import React from 'react';
import { X, Bell, Zap, Megaphone, Info, CheckCircle2, Sparkles } from 'lucide-react';

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: 'update' | 'promotion' | 'maintenance' | 'welcome';
    imageUrl?: string;
}

interface AnnouncementModalProps {
    announcement: Announcement;
    onDismiss: () => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ announcement, onDismiss }) => {
    const getTypeStyles = () => {
        switch (announcement.type) {
            case 'update': return { icon: <Zap className="text-orange-500" />, bg: 'bg-orange-50', border: 'border-orange-100', accent: 'bg-orange-600' };
            case 'promotion': return { icon: <Sparkles className="text-purple-500" />, bg: 'bg-purple-50', border: 'border-purple-100', accent: 'bg-purple-600' };
            case 'maintenance': return { icon: <Info className="text-blue-500" />, bg: 'bg-blue-50', border: 'border-blue-100', accent: 'bg-blue-600' };
            case 'welcome': return { icon: <Megaphone className="text-emerald-500" />, bg: 'bg-emerald-50', border: 'border-emerald-100', accent: 'bg-emerald-600' };
            default: return { icon: <Bell className="text-slate-500" />, bg: 'bg-slate-50', border: 'border-slate-100', accent: 'bg-slate-900' };
        }
    };

    const styles = getTypeStyles();

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onDismiss} />
            <div className="relative bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">

                {announcement.imageUrl && (
                    <div className="w-full bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden max-h-[320px]">
                        <img
                            src={announcement.imageUrl}
                            alt={announcement.title}
                            className="max-w-full max-h-[320px] w-auto h-auto object-contain animate-in fade-in duration-500"
                        />
                    </div>
                )}

                <div className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-12 ${styles.bg} rounded-2xl flex items-center justify-center shadow-sm border ${styles.border}`}>
                            {styles.icon}
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-0.5">Announcement</span>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{announcement.title}</h3>
                        </div>
                        <button onClick={onDismiss} className="ml-auto p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-900 active:scale-95">
                            <X size={20} />
                        </button>
                    </div>

                    <div
                        className="text-slate-600 leading-relaxed font-medium space-y-4 prose prose-slate prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: announcement.content }}
                    />

                    <div className="mt-8 pt-6 border-t border-slate-100 italic">
                        <button
                            onClick={onDismiss}
                            className={`w-full py-4 ${styles.accent} text-white rounded-2xl font-bold shadow-xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2`}
                        >
                            <CheckCircle2 size={20} />
                            Got it, thanks!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
