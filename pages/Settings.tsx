
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    User, CreditCard, Shield, Globe, Link as LinkIcon,
    LogOut, RefreshCw, CheckCircle2, Tag, Palette,
    Building2, Target, Zap, Save, Check, Pencil,
    Upload, Trash2, Eye, X, Archive
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Tab = 'profile' | 'brand' | 'billing' | 'history';

const DEFAULT_BRAND = {
    brandName: 'Redditgo',
    description: 'An AI-powered Reddit outreach tool that helps SaaS founders find and engage with their target audience authentically.',
    targetAudience: 'SaaS founders, indie hackers, B2B marketers',
    problem: 'Manual Reddit outreach is slow, inconsistent, and hard to scale without sounding spammy.',
    website: 'https://redditgo.online/',
    primaryColor: '#EA580C',
    secondaryColor: '#1E293B',
    brandTone: 'professional',
    customTone: ''
};

const BRAND_TONES = [
    { id: 'professional', label: 'Professional', emoji: '💼', desc: 'Authoritative & trustworthy' },
    { id: 'friendly', label: 'Friendly', emoji: '😊', desc: 'Approachable & warm' },
    { id: 'bold', label: 'Bold', emoji: '⚡', desc: 'Confident & direct' },
    { id: 'educational', label: 'Educational', emoji: '📚', desc: 'Informative & helpful' },
    { id: 'custom', label: 'Custom', emoji: '✏️', desc: 'Define your own tone' },
];

export const Settings: React.FC = () => {
    const { user, login, token, logout, updateUser, syncUser } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('profile');

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get('success') === 'true') {
            syncUser();
            setActiveTab('billing'); // Automatically switch to billing so user sees the change
            setProfileMessage({ type: 'success', text: 'Payment successful! Your account has been upgraded.' });
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [syncUser]);

    useEffect(() => {
        if (activeTab === 'history') {
            syncUser();
        }
    }, [activeTab, syncUser]);

    // New state variables
    const [isUploading, setIsUploading] = useState(false);
    const [is2faLoading, setIs2faLoading] = useState(false);

    // --- Subscription & Deletion States ---
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelComment, setCancelComment] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleCancelAutoRenewal = async () => {
        if (!cancelReason) return;
        setIsCancelling(true);
        try {
            const res = await fetch(`/api/user/cancel-subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user.id || user._id,
                    reason: cancelReason,
                    comment: cancelComment
                })
            });
            if (res.ok) {
                // Success - reload or update local user state
                window.location.reload();
            } else {
                alert('Failed to cancel renewal. Please try again or contact support.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsCancelling(false);
            setIsCancelModalOpen(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/user/schedule-deletion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user.id || user._id,
                    password: deletePassword
                })
            });
            if (res.ok) {
                alert('Account scheduled for deletion in 14 days. You will be logged out.');
                logout();
                window.location.href = '/login';
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to schedule deletion.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    const [isRestoring, setIsRestoring] = useState(false);
    const handleCancelDeletion = async () => {
        setIsRestoring(true);
        try {
            const res = await fetch(`/api/user/cancel-deletion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId: user.id || user._id })
            });

            if (res.ok) {
                const data = await res.json();
                // Update local user state immediately to hide the banner
                updateUser({ deletionScheduledDate: undefined });
                // Also trigger a full sync to be sure
                await syncUser();

                // Show success message
                setProfileMessage({ type: 'success', text: 'Account termination has been cancelled successfully.' });
                setTimeout(() => setProfileMessage(null), 5000);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to cancel deletion. Please contact support.');
            }
        } catch (err) {
            console.error('Restoration error:', err);
            alert('An error occurred during restoration.');
        } finally {
            setIsRestoring(false);
        }
    };

    const navigateToSettings = (tab: Tab) => {
        setActiveTab(tab);
    };
    const [redditStatus, setRedditStatus] = useState<{ connected: boolean; accounts: any[] }>({ connected: false, accounts: [] });
    const [loading, setLoading] = useState(true);
    const [brandSaving, setBrandSaving] = useState(false);
    const [brandSaved, setBrandSaved] = useState(false);
    const [brandError, setBrandError] = useState('');
    const [brandProfile, setBrandProfile] = useState({ ...DEFAULT_BRAND });

    // Profile State
    const [profileName, setProfileName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isProfileSaving, setIsProfileSaving] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Password State
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [isPasswordSaving, setIsPasswordSaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [previewInvoice, setPreviewInvoice] = useState<string | null>(null);
    const [plans, setPlans] = useState<any[]>([]);

    const generateInvoiceImage = (user: any, tx?: any) => {
        return new Promise<string>((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 700;
            const ctx = canvas.getContext('2d');

            // Plan Details Logic
            const planName = tx?.planName || user.plan || 'Starter';
            const price = tx?.amount !== undefined ? tx.amount.toFixed(2) : '0.00';
            const currency = (tx?.currency || 'USD').toUpperCase();
            const description = tx?.description || `${planName} Plan Subscription`;
            const isAdminAdj = tx?.isAdjustment === true;
            const adjType = tx?.adjustmentType;
            const prevBal = tx?.previousBalance;
            const finalBal = tx?.finalBalance;
            const creditsAdded = tx?.creditsAdded;
            const subDescription = tx?.subDescription || (creditsAdded ? `Added ${creditsAdded} Credits` : '');
            const gateway = tx?.gateway || (tx?.type === 'stripe_payment' ? 'stripe' : tx?.type === 'paypal_payment' ? 'paypal' : 'system');

            if (ctx) {
                // Background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 800, 700);

                // Header section
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(0, 0, 800, 160);

                // Logo
                ctx.font = 'bold 42px Arial';
                ctx.fillStyle = '#ea580c';
                ctx.fillText('Redditgo', 50, 95);

                // Right header info
                ctx.textAlign = 'right';
                ctx.font = 'bold 12px Arial';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText('OFFICIAL RECEIPT', 750, 60);

                ctx.font = '24px Arial';
                ctx.fillStyle = '#1e293b';
                ctx.fillText('INVOICE', 750, 95);

                // Bill To & Company Info
                ctx.textAlign = 'left';
                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = '#64748b';
                ctx.fillText('BILL TO', 50, 210);

                ctx.font = 'bold 20px Arial';
                ctx.fillStyle = '#0f172a';
                ctx.fillText(user.name || 'Valued Customer', 50, 240);

                ctx.font = '16px Arial';
                ctx.fillStyle = '#475569';
                ctx.fillText(user.email || '', 50, 265);

                // Meta Info (Right side)
                ctx.textAlign = 'right';
                const date = tx?.date ? new Date(tx.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString();

                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = '#64748b';
                ctx.fillText('DATE', 750, 210);
                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = '#0f172a';
                ctx.fillText(date, 750, 235);

                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = '#64748b';
                ctx.fillText('TRANSACTION ID', 750, 275);
                ctx.font = 'bold 13px Courier New';
                ctx.fillStyle = '#0f172a';
                let displayId = tx?.id ? String(tx.id) : 'N/A';
                if (displayId.startsWith('cs_') || displayId.length > 20) {
                    displayId = `INV-${displayId.slice(-8).toUpperCase()}`;
                }
                ctx.fillText(displayId, 750, 300);

                // Table Header
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(50, 360, 700, 45);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'left';
                ctx.fillText('DESCRIPTION', 75, 388);
                ctx.textAlign = 'right';
                ctx.fillText('AMOUNT', 725, 388);

                // Table Rows
                ctx.textAlign = 'left';
                ctx.font = 'bold 17px Arial';
                ctx.fillStyle = '#0f172a';
                ctx.fillText(description, 75, 445);

                if (subDescription) {
                    ctx.font = '14px Arial';
                    ctx.fillStyle = '#64748b';
                    ctx.fillText(subDescription, 75, 470);
                }

                ctx.textAlign = 'right';
                ctx.font = 'bold 18px Arial';
                ctx.fillStyle = '#0f172a';
                ctx.fillText(`${price} ${currency}`, 725, 445);

                // Summary / Totals
                const lineY = 530;
                ctx.beginPath();
                ctx.moveTo(450, lineY);
                ctx.lineTo(750, lineY);
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.font = 'bold 15px Arial';
                ctx.fillStyle = '#64748b';
                ctx.fillText('Subtotal:', 600, lineY + 35);
                ctx.fillStyle = '#0f172a';
                ctx.fillText(`${price} ${currency}`, 725, lineY + 35);

                ctx.font = 'bold 24px Arial';
                ctx.fillStyle = '#0f172a';
                ctx.fillText('Total:', 600, lineY + 80);
                ctx.fillStyle = '#ea580c';
                ctx.fillText(`${price} ${currency}`, 725, lineY + 80);

                // Payment Method Indicator
                if (gateway && gateway !== 'system') {
                    ctx.textAlign = 'left';
                    ctx.fillStyle = '#f1f5f9';
                    ctx.beginPath();
                    ctx.roundRect?.(50, lineY + 50, 180, 40, 8);
                    ctx.fill?.();

                    ctx.font = 'bold 11px Arial';
                    ctx.fillStyle = '#64748b';
                    ctx.fillText('PAYMENT METHOD', 65, lineY + 40);

                    ctx.font = 'bold 14px Arial';
                    ctx.fillStyle = '#1e293b';
                    const methodLabel = gateway.charAt(0).toUpperCase() + gateway.slice(1);
                    ctx.fillText(methodLabel, 65, lineY + 75);
                }

                // Admin Adjustments Detail Box
                if (isAdminAdj && prevBal !== undefined && finalBal !== undefined) {
                    ctx.fillStyle = '#fff7ed';
                    ctx.fillRect(50, 510, 350, 110);
                    ctx.strokeStyle = '#fdba74';
                    ctx.strokeRect(50, 510, 350, 110);

                    ctx.font = 'bold 11px Arial';
                    ctx.fillStyle = '#c2410c';
                    ctx.textAlign = 'left';
                    ctx.fillText('CREDIT ADJUSTMENT DETAILS', 70, 535);

                    ctx.font = '13px Arial';
                    ctx.fillStyle = '#9a3412';
                    ctx.fillText(`Previous Balance:  ${prevBal} pts`, 70, 560);
                    ctx.fillText(`Change:            +${creditsAdded} pts`, 70, 580);
                    ctx.font = 'bold 13px Arial';
                    ctx.fillText(`New Balance:       ${finalBal} pts`, 70, 600);
                }

                // Footer Note
                ctx.textAlign = 'center';
                ctx.font = 'italic 13px Arial';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText('This is a computer-generated receipt. No signature is required.', 400, 670);
                ctx.font = 'bold 13px Arial';
                ctx.fillText('https://redditgo.online', 400, 688);

                resolve(canvas.toDataURL('image/png'));
            }
        });
    };

    useEffect(() => {
        if (user) {
            setProfileName(user.name || '');
            setAvatarUrl(user.avatar || '');
            if (user.brandProfile && Object.keys(user.brandProfile).length > 0) {
                setBrandProfile(prev => ({ ...prev, ...user.brandProfile }));
            }
        }
        const fetchData = async () => {
            if (!user?.id) { setLoading(false); return; }
            try {
                const [redditRes, brandRes, plansRes] = await Promise.all([
                    fetch(`/api/user/reddit/status?userId=${user.id}`),
                    fetch(`/api/user/brand-profile?userId=${user.id}`),
                    fetch('/api/plans')
                ]);

                if (redditRes.ok) {
                    const status = await redditRes.json();
                    setRedditStatus(status);
                } else {
                    setRedditStatus({ connected: false, accounts: [] });
                }

                if (brandRes.ok) {
                    const brandData = await brandRes.json();
                    if (brandData && Object.keys(brandData).length > 0) {
                        setBrandProfile(prev => ({ ...prev, ...brandData }));
                    }
                }

                if (plansRes.ok) {
                    setPlans(await plansRes.json());
                }
            } catch (err) {
                console.error("Failed to fetch settings:", err);
                setRedditStatus({ connected: false, accounts: [] });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleConnectReddit = async () => {
        try {
            const response = await fetch('/api/auth/reddit/url');
            const data = await response.json();
            if (data.url) window.location.href = data.url;
        } catch {
            alert('Failed to initiate Reddit connection');
        }
    };

    const handleSaveBrand = async () => {
        if (!user?.id) return;
        setBrandSaving(true);
        setBrandError('');
        try {
            const res = await fetch('/api/user/brand-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, ...brandProfile })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Save failed');
            }

            const responseData = await res.json();

            // Update local auth context with new brand data and potential bonus credits
            const updatePayload: any = { brandProfile: { ...brandProfile } };
            if (responseData.credits !== undefined) {
                updatePayload.credits = responseData.credits;
            }
            updateUser(updatePayload);

            setBrandSaved(true);
            setTimeout(() => setBrandSaved(false), 3000);
        } catch (err: any) {
            setBrandError(err.message || 'Failed to save. Please try again.');
        } finally {
            setBrandSaving(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 800 * 1024) {
                setProfileMessage({ type: 'error', text: 'Image too large. Max 800KB.' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarUrl(reader.result as string);
                setProfileMessage(null); // Clear errors
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async () => {
        if (!user?.id) return;
        setIsProfileSaving(true);
        setProfileMessage(null);

        try {
            const response = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: profileName,
                    avatar: avatarUrl
                })
            });

            if (!response.ok) throw new Error('Failed to update profile');

            const updatedUser = await response.json();
            // Update local auth context
            updateUser({ name: profileName, avatar: avatarUrl });

            setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
            setTimeout(() => setProfileMessage(null), 3000);
        } catch (error) {
            setProfileMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
            setIsProfileSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!user?.id) return;
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Passwords do not match!' });
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
            return;
        }

        setIsPasswordSaving(true);
        setPasswordMessage(null);

        try {
            const response = await fetch(`/api/users/${user.id}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to change password');
            }

            setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setPasswordMessage(null), 3000);
        } catch (error: any) {
            setPasswordMessage({ type: 'error', text: error.message || 'Failed to change password' });
        } finally {
            setIsPasswordSaving(false);
        }
    };

    if (!user) return (
        <div className="min-h-[400px] flex items-center justify-center">
            <RefreshCw className="animate-spin text-orange-600" size={32} />
        </div>
    );

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'profile', label: 'Account', icon: <User size={15} /> },
        { id: 'brand', label: 'Brand Profile', icon: <Building2 size={15} /> },
        { id: 'billing', label: 'Billing', icon: <CreditCard size={15} /> },
        { id: 'history', label: 'History', icon: <RefreshCw size={15} /> },
    ];

    const hasBrand = !!brandProfile.brandName;

    return (
        <div className="max-w-4xl space-y-6 font-['Outfit'] pb-20 pt-4">
            {user.deletionScheduledDate && (
                <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-100 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 animate-in slide-in-from-top-6 duration-700 shadow-2xl shadow-rose-200/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="relative group">
                            <div className="p-5 bg-rose-600 text-white rounded-[1.5rem] shadow-xl shadow-rose-200 relative z-10 group-hover:scale-105 transition-transform duration-500">
                                <Archive size={32} />
                            </div>
                            <div className="absolute inset-0 bg-rose-400 rounded-[1.5rem] blur-xl opacity-40 group-hover:opacity-60 animate-pulse -z-10 transition-opacity" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-rose-600 text-[10px] font-black text-white rounded-md uppercase tracking-wider">Scheduled Termination</span>
                                <h3 className="text-xl font-black text-rose-950 tracking-tight leading-tight">Account Deletion Active</h3>
                            </div>
                            <div className="flex flex-col gap-2">
                                <p className="text-sm text-rose-700/80 font-semibold max-w-md">
                                    All your data, credits, and profiles will be permanently purged on <span className="font-black text-rose-900 border-b-2 border-rose-200 pb-0.5">{new Date(user.deletionScheduledDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex-1 h-2 bg-rose-100 rounded-full overflow-hidden border border-rose-200/50 p-0.5">
                                        <div
                                            className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-full shadow-lg shadow-rose-200"
                                            style={{ width: `${Math.max(5, 100 - (Math.ceil((new Date(user.deletionScheduledDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) / 14 * 100))}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                        <span className="text-sm font-black text-rose-600">
                                            {Math.ceil((new Date(user.deletionScheduledDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Days Left</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleCancelDeletion}
                        disabled={isRestoring}
                        className="group relative overflow-hidden px-8 py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center gap-3 z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={14} className={`${isRestoring ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-700`} />
                        {isRestoring ? 'Restoring...' : 'Cancel Termination'}
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-end border-b border-slate-100 pb-6">
                <div className="space-y-1">
                    <p className="text-slate-400 font-semibold text-sm">Welcome back, {user?.name?.split(' ')[0] || 'there'}</p>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-7 bg-orange-600 rounded-full" />
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
                    </div>
                    <p className="text-slate-400 font-medium text-sm pl-4">Manage your account, brand, and preferences.</p>
                </div>
                <button onClick={logout} className="flex items-center gap-2 px-4 py-2 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors">
                    <LogOut size={16} /> Logout
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar snap-x">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap snap-start ${activeTab === tab.id
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.id === 'brand' && hasBrand && (
                            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        )}
                    </button>
                ))}
            </div>

            {/* ── ACCOUNT TAB ── */}
            {activeTab === 'profile' && (
                <div className="space-y-8">
                    <section className="space-y-4">
                        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                            <User className="text-orange-600" size={20} /> Profile Information
                        </h2>
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm space-y-6">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-2xl font-black border-4 border-white shadow-lg shrink-0 overflow-hidden relative">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    ) : (
                                        profileName ? profileName.substring(0, 2).toUpperCase() : user.name.substring(0, 2).toUpperCase()
                                    )}
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 text-lg truncate" title={user.email}>{user.email}</h3>
                                    <p className="text-xs text-slate-400 truncate">Profile ID: #{user.id}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <label className="space-y-2">
                                    <span className="text-sm font-bold text-slate-700">Display Name</span>
                                    <input
                                        type="text"
                                        value={profileName}
                                        onChange={(e) => setProfileName(e.target.value)}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-900 focus:border-orange-500 transition-colors"
                                    />
                                </label>
                                <label className="space-y-2">
                                    <span className="text-sm font-bold text-slate-700">Profile Picture</span>
                                    <div className="flex gap-2">
                                        <label className="flex-1 cursor-pointer group">
                                            <div className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-500 group-hover:bg-slate-100 group-hover:border-orange-200 group-hover:text-orange-600 transition-all flex items-center justify-center gap-2">
                                                <Upload size={18} />
                                                <span className="text-sm">Choose Image...</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/png, image/jpeg, image/gif"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </label>
                                        {avatarUrl && (
                                            <button
                                                onClick={() => setAvatarUrl('')}
                                                className="p-3.5 bg-red-50 border border-red-100 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                title="Remove Avatar"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium px-1">Max 800KB (JPG, PNG)</p>
                                </label>
                                <label className="space-y-2 md:col-span-2">
                                    <span className="text-sm font-bold text-slate-700">Email Address</span>
                                    <input
                                        type="email"
                                        value={user.email}
                                        className="w-full p-4 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-500 cursor-not-allowed"
                                        disabled
                                    />
                                </label>
                            </div>

                            {profileMessage && (
                                <div className={`p-4 rounded-xl text-sm font-bold ${profileMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {profileMessage.type === 'success' ? <CheckCircle2 className="inline mr-2" size={16} /> : null}
                                    {profileMessage.text}
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isProfileSaving || !profileName.trim()}
                                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-orange-600 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                                >
                                    {isProfileSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                            <Shield className="text-orange-600" size={20} /> Security & Password
                        </h2>
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <label className="space-y-2">
                                    <span className="text-sm font-bold text-slate-700">Current Password</span>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-900 focus:border-orange-500 transition-colors"
                                    />
                                </label>
                                <label className="space-y-2">
                                    <span className="text-sm font-bold text-slate-700">New Password</span>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-900 focus:border-orange-500 transition-colors"
                                    />
                                </label>
                                <label className="space-y-2">
                                    <span className="text-sm font-bold text-slate-700">Confirm New Password</span>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-900 focus:border-orange-500 transition-colors"
                                    />
                                </label>
                            </div>

                            {passwordMessage && (
                                <div className={`p-4 rounded-xl text-sm font-bold ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {passwordMessage.type === 'success' ? <CheckCircle2 className="inline mr-2" size={16} /> : null}
                                    {passwordMessage.text}
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handlePasswordChange}
                                    disabled={isPasswordSaving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-orange-600 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                                >
                                    {isPasswordSaving ? <RefreshCw className="animate-spin" size={16} /> : <Shield size={16} />}
                                    Update Password
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                            <Shield className="text-emerald-600" size={20} /> Two-Factor Authentication (2FA)
                        </h2>
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-900">Email Verification</p>
                                    <p className="text-xs text-slate-500 font-medium">Receive a unique code via email whenever you log in.</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (!user?.id) return;
                                        try {
                                            const res = await fetch(`/api/users/${user.id}/2fa`, {
                                                method: 'PUT',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${token}`
                                                },
                                                body: JSON.stringify({ enabled: !user.twoFactorEnabled })
                                            });
                                            if (res.ok) {
                                                updateUser({ twoFactorEnabled: !user.twoFactorEnabled });
                                                setProfileMessage({ type: 'success', text: `2FA ${!user.twoFactorEnabled ? 'enabled' : 'disabled'} successfully!` });
                                                setTimeout(() => setProfileMessage(null), 3000);
                                            }
                                        } catch (err) {
                                            setProfileMessage({ type: 'error', text: 'Failed to update 2FA settings' });
                                        }
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${user.twoFactorEnabled ? 'bg-orange-600' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                            <LinkIcon className="text-blue-600" size={20} /> Connected Accounts
                        </h2>
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm space-y-4">
                            {loading ? (
                                <div className="flex items-center justify-center py-4">
                                    <RefreshCw className="animate-spin text-slate-400" size={20} />
                                </div>
                            ) : (
                                <>
                                    {/* Plan Limits Indicator */}
                                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                <LinkIcon size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Slots</p>
                                                <p className="text-sm font-bold text-slate-900">
                                                    {(redditStatus.accounts || []).length} / {plans.find(p => (p.id || '').toLowerCase() === (user.plan || '').toLowerCase() || (p.name || '').toLowerCase() === (user.plan || '').toLowerCase())?.maxAccounts || 1} <span className="text-slate-400 font-medium ml-1">accounts connected</span>
                                                </p>
                                            </div>
                                        </div>
                                        {(redditStatus.accounts || []).length >= (plans.find(p => (p.id || '').toLowerCase() === (user.plan || '').toLowerCase() || (p.name || '').toLowerCase() === (user.plan || '').toLowerCase())?.maxAccounts || 1) ? (
                                            <Link to="/pricing" className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">UPGRADE FOR MORE</Link>
                                        ) : (
                                            <button
                                                onClick={handleConnectReddit}
                                                className="text-[10px] font-black text-white bg-slate-900 px-4 py-1.5 rounded-lg hover:bg-orange-600 transition-all flex items-center gap-2"
                                            >
                                                <RefreshCw size={10} /> LINK NEW ACCOUNT
                                            </button>
                                        )}
                                    </div>

                                    {/* Account List */}
                                    {(redditStatus.accounts || []).length > 0 ? (
                                        <div className="space-y-3">
                                            {(redditStatus.accounts || []).map((acc: any) => (
                                                <div key={acc.username} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[1.5rem] hover:border-orange-200 transition-all group">
                                                    <div className="flex items-center gap-4">
                                                        {acc.icon
                                                            ? <img src={acc.icon} alt={acc.username} className="w-10 h-10 rounded-xl border-2 border-white shadow-sm" />
                                                            : <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black">R</div>
                                                        }
                                                        <div>
                                                            <p className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">u/{acc.username}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">Linked on {new Date(acc.connectedAt).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                            <CheckCircle2 size={12} /> Active
                                                        </span>
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm(`Disconnect u/${acc.username}?`)) {
                                                                    const res = await fetch('/api/user/reddit/disconnect', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ userId: user.id, username: acc.username })
                                                                    });
                                                                    if (res.ok) window.location.reload();
                                                                }
                                                            }}
                                                            className="text-slate-300 hover:text-red-500 text-xs font-bold transition-colors py-2 px-2"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                                            <Globe className="mx-auto text-slate-300 mb-3" size={40} />
                                            <p className="font-bold text-slate-900">No Reddit accounts linked</p>
                                            <p className="text-xs text-slate-400 mb-6">Connect your first account to start using AI outreach.</p>
                                            <button onClick={handleConnectReddit} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-orange-600 transition-all shadow-xl shadow-slate-200">
                                                LINK REDDIT ACCOUNT
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </section>

                    <section className="space-y-4 pt-4">
                        <h2 className="text-lg font-extrabold text-red-600 flex items-center gap-2">
                            <Trash2 size={20} /> Danger Zone
                        </h2>
                        <div className={`p-8 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-500 ${user.deletionScheduledDate ? 'bg-slate-50 border-slate-200 grayscale' : 'bg-red-50 border-red-100'}`}>
                            <div className="space-y-1">
                                <p className={`font-bold ${user.deletionScheduledDate ? 'text-slate-500' : 'text-red-900'}`}>
                                    {user.deletionScheduledDate ? 'Deletion is Pending' : 'Delete Account'}
                                </p>
                                <p className={`text-sm font-medium ${user.deletionScheduledDate ? 'text-slate-400' : 'text-red-600'}`}>
                                    {user.deletionScheduledDate
                                        ? `You have already scheduled this account for deletion. It will be wiped on ${new Date(user.deletionScheduledDate).toLocaleDateString()}.`
                                        : 'Permanently remove your account and all data. This action is irreversible after 14 days.'}
                                </p>
                            </div>
                            {user.deletionScheduledDate ? (
                                <div className="flex items-center gap-2 px-6 py-3 bg-slate-200 text-slate-500 rounded-xl font-black text-xs uppercase tracking-widest cursor-not-allowed">
                                    <Shield size={14} /> PENDING WIPE
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsDeleteModalOpen(true)}
                                    className="px-8 py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 transition-all shadow-lg shadow-red-200 whitespace-nowrap"
                                >
                                    DELETE ACCOUNT
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {/* ── BRAND PROFILE TAB ── */}
            {activeTab === 'brand' && (
                <div className="space-y-6">

                    {/* AI Memory Banner */}
                    <div className="p-5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl flex items-center gap-4 text-white shadow-xl shadow-orange-200">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <Zap size={22} className="text-white" />
                        </div>
                        <div>
                            <p className="font-extrabold text-base">AI Brand Memory — Fill Once, Used Everywhere</p>
                            <p className="text-orange-100 text-sm font-medium mt-0.5">
                                Every AI post & comment will automatically use this context. No need to re-enter anything.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">

                        {/* ── Section 1: Brand Identity ── */}
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-3 pb-2 border-b border-slate-50">
                                <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                                    <Building2 size={16} />
                                </div>
                                <div>
                                    <p className="font-extrabold text-slate-900">Brand Identity</p>
                                    <p className="text-xs text-slate-400 font-medium">Core information about your product</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Tag size={10} /> Brand / Product Name *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Redditgo"
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-bold transition-all text-slate-900"
                                        value={brandProfile.brandName}
                                        onChange={e => setBrandProfile(p => ({ ...p, brandName: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Globe size={10} /> Website URL
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="https://yoursite.com"
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-bold transition-all text-slate-900"
                                        value={brandProfile.website}
                                        onChange={e => setBrandProfile(p => ({ ...p, website: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">What does your product do?</label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Redditgo is an AI-powered Reddit outreach tool that helps SaaS founders find and engage with their target audience authentically."
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-medium text-slate-700 resize-none transition-all"
                                    value={brandProfile.description}
                                    onChange={e => setBrandProfile(p => ({ ...p, description: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* ── Section 2: Audience & Problem ── */}
                        <div className="p-8 space-y-6 bg-slate-50/50 border-t border-slate-100">
                            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                                <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                    <Target size={16} />
                                </div>
                                <div>
                                    <p className="font-extrabold text-slate-900">Audience & Problem</p>
                                    <p className="text-xs text-slate-400 font-medium">Who you serve and what pain you solve</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Target Audience</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. SaaS founders, B2B marketers"
                                        className="w-full p-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-bold transition-all text-slate-900"
                                        value={brandProfile.targetAudience}
                                        onChange={e => setBrandProfile(p => ({ ...p, targetAudience: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Main Problem You Solve</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Manual Reddit outreach is slow and ineffective"
                                        className="w-full p-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-bold transition-all text-slate-900"
                                        value={brandProfile.problem}
                                        onChange={e => setBrandProfile(p => ({ ...p, problem: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Section 3: Visual Identity ── */}
                        <div className="p-8 space-y-6 border-t border-slate-100">
                            <div className="flex items-center gap-3 pb-2 border-b border-slate-50">
                                <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                                    <Palette size={16} />
                                </div>
                                <div>
                                    <p className="font-extrabold text-slate-900">Visual Identity</p>
                                    <p className="text-xs text-slate-400 font-medium">Colors used when generating AI images for your posts</p>
                                </div>
                            </div>

                            {/* Color Pickers */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Primary Color */}
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Primary Color</label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <input
                                                type="color"
                                                value={brandProfile.primaryColor}
                                                onChange={e => setBrandProfile(p => ({ ...p, primaryColor: e.target.value }))}
                                                className="w-14 h-14 rounded-2xl cursor-pointer border-4 border-white shadow-lg"
                                                style={{ padding: '2px' }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={brandProfile.primaryColor}
                                                onChange={e => setBrandProfile(p => ({ ...p, primaryColor: e.target.value }))}
                                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 font-mono font-bold text-slate-700 text-sm"
                                                placeholder="#EA580C"
                                            />
                                            <p className="text-[10px] text-slate-400 font-medium mt-1 px-1">Main brand color</p>
                                        </div>
                                    </div>
                                    {/* Preset swatches */}
                                    <div className="flex gap-2 flex-wrap">
                                        {['#EA580C', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setBrandProfile(p => ({ ...p, primaryColor: c }))}
                                                className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${brandProfile.primaryColor === c ? 'border-slate-900 scale-110' : 'border-white shadow-sm'}`}
                                                style={{ backgroundColor: c }}
                                                title={c}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Secondary Color */}
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Secondary Color</label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <input
                                                type="color"
                                                value={brandProfile.secondaryColor}
                                                onChange={e => setBrandProfile(p => ({ ...p, secondaryColor: e.target.value }))}
                                                className="w-14 h-14 rounded-2xl cursor-pointer border-4 border-white shadow-lg"
                                                style={{ padding: '2px' }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={brandProfile.secondaryColor}
                                                onChange={e => setBrandProfile(p => ({ ...p, secondaryColor: e.target.value }))}
                                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 font-mono font-bold text-slate-700 text-sm"
                                                placeholder="#1E293B"
                                            />
                                            <p className="text-[10px] text-slate-400 font-medium mt-1 px-1">Background / accent color</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {['#1E293B', '#111827', '#1E3A5F', '#064E3B', '#1C1917', '#312E81', '#4A044E', '#083344'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setBrandProfile(p => ({ ...p, secondaryColor: c }))}
                                                className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${brandProfile.secondaryColor === c ? 'border-slate-400 scale-110' : 'border-white shadow-sm'}`}
                                                style={{ backgroundColor: c }}
                                                title={c}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Live Preview */}
                            <div className="p-5 rounded-2xl border border-slate-100 space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Color Preview</p>
                                <div className="flex gap-3 items-center">
                                    <div className="flex-1 h-12 rounded-xl shadow-sm" style={{ backgroundColor: brandProfile.primaryColor }} />
                                    <div className="flex-1 h-12 rounded-xl shadow-sm" style={{ backgroundColor: brandProfile.secondaryColor }} />
                                    <div className="flex-1 h-12 rounded-xl shadow-sm flex items-center justify-center text-xs font-black" style={{ background: `linear-gradient(135deg, ${brandProfile.primaryColor}, ${brandProfile.secondaryColor})`, color: '#fff' }}>
                                        Gradient
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Section 4: Brand Tone ── */}
                        <div className="p-8 space-y-6 bg-slate-50/50 border-t border-slate-100">
                            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                                <div className="w-9 h-9 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                                    <Pencil size={16} />
                                </div>
                                <div>
                                    <p className="font-extrabold text-slate-900">Default Brand Tone</p>
                                    <p className="text-xs text-slate-400 font-medium">How your brand communicates with the audience</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {BRAND_TONES.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setBrandProfile(p => ({ ...p, brandTone: t.id }))}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all ${brandProfile.brandTone === t.id
                                            ? 'border-orange-500 bg-orange-50 shadow-md shadow-orange-100'
                                            : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="text-2xl mb-2">{t.emoji}</div>
                                        <p className="font-extrabold text-slate-900 text-sm leading-tight">{t.label}</p>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">{t.desc}</p>
                                        {brandProfile.brandTone === t.id && (
                                            <div className="mt-2">
                                                <Check size={12} className="text-orange-600" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Custom Tone Input */}
                            {brandProfile.brandTone === 'custom' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Pencil size={10} /> Describe Your Custom Tone
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="e.g. We communicate like a knowledgeable friend — never corporate, always direct, occasionally humorous, and always backed by data. We challenge assumptions and celebrate contrarian thinking."
                                        className="w-full p-4 bg-white border border-orange-200 rounded-2xl focus:outline-none focus:border-orange-500 font-medium text-slate-700 resize-none transition-all"
                                        value={brandProfile.customTone}
                                        onChange={e => setBrandProfile(p => ({ ...p, customTone: e.target.value }))}
                                    />
                                    <p className="text-[10px] text-slate-400 font-medium px-1">The more specific you are, the better the AI will match your voice.</p>
                                </div>
                            )}
                        </div>

                        {/* ── Save Button ── */}
                        <div className="p-8 border-t border-slate-100">
                            {brandError && (
                                <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold">
                                    ⚠️ {brandError}
                                </div>
                            )}
                            <button
                                onClick={handleSaveBrand}
                                disabled={brandSaving || !brandProfile.brandName}
                                className={`w-full py-5 rounded-[2rem] font-black transition-all flex items-center justify-center gap-3 text-lg ${brandSaved
                                    ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                                    : 'bg-orange-600 text-white hover:bg-orange-50 shadow-2xl shadow-orange-200 disabled:opacity-50 disabled:grayscale'
                                    }`}
                            >
                                {brandSaving
                                    ? <><RefreshCw className="animate-spin" size={22} /> Saving Brand Profile...</>
                                    : brandSaved
                                        ? <><Check size={22} /> Brand Profile Saved! ✓</>
                                        : <><Save size={22} /> SAVE BRAND PROFILE</>
                                }
                            </button>
                            <p className="text-center text-[11px] text-slate-400 font-medium mt-3">
                                This profile is used automatically in all AI-generated posts and comments.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── BILLING TAB ── */}
            {activeTab === 'billing' && (
                <div className="space-y-8">
                    <section className="space-y-6">
                        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                            <CreditCard className="text-purple-600" size={20} /> Subscription & Usage
                        </h2>

                        {/* Current Plan Card */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-orange-600/20 transition-all duration-700" />
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black tracking-widest uppercase mb-4 text-orange-400">
                                        <Shield size={12} /> Current Plan
                                    </div>
                                    <p className="text-4xl font-extrabold mb-2">{user.plan || 'Starter'} Plan ({user.billingCycle || 'monthly'})</p>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-slate-400 text-sm opacity-80">
                                            {user.plan === 'Starter'
                                                ? 'Basic access. Upgrade to unlock more power.'
                                                : 'Your plan serves you well. Keep growing!'}
                                        </p>
                                        {user.subscriptionEnd && user.plan !== 'Starter' && (
                                            <p className="text-orange-400 text-xs font-bold flex items-center gap-1.5">
                                                <RefreshCw size={12} /> Renews/Expires on: {new Date(user.subscriptionEnd).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    {user.plan === 'Starter' ? (
                                        <Link to="/pricing" className="px-8 py-3 bg-orange-600 text-white rounded-xl font-black hover:bg-orange-500 hover:shadow-lg hover:shadow-orange-600/30 transition-all inline-block">
                                            UPGRADE NOW
                                        </Link>
                                    ) : (
                                        <div className="space-y-3 text-right">
                                            <div className="space-y-1">
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Status</p>
                                                {user.autoRenew !== false ? (
                                                    <div className="flex items-center justify-end gap-2 text-green-400 font-black">
                                                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                                        Active
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2 text-orange-400 font-black">
                                                        <Archive size={14} />
                                                        Cancelling soon
                                                    </div>
                                                )}
                                            </div>
                                            {user.autoRenew !== false && (
                                                <button
                                                    onClick={() => setIsCancelModalOpen(true)}
                                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-400 transition-colors border-b border-transparent hover:border-red-400/30"
                                                >
                                                    Cancel Auto-Renewal
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Usage & Credits */}
                        <div className="flex flex-col gap-8">
                            {/* Credit Balance Banner */}
                            <div className="bg-gradient-to-br from-orange-600 to-amber-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden flex flex-col justify-between h-full min-h-[200px] group">
                                <div className="relative z-10 flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                            <Zap className="text-white" size={24} fill="currentColor" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white/90">Credit Balance</h2>
                                            <p className="text-orange-100 text-xs font-medium">Available AI generations</p>
                                        </div>
                                    </div>
                                    <Link to="/pricing" className="px-4 py-2 bg-white text-orange-600 text-xs font-black rounded-xl hover:bg-orange-50 transition-all shadow-lg shadow-black/10">
                                        TOP UP +
                                    </Link>
                                </div>

                                <div className="relative z-10 space-y-4 mt-6">
                                    <div>
                                        <span className="text-5xl font-black text-white tracking-tight">{user.credits || 0}</span>
                                        <span className="text-sm font-bold text-orange-200 uppercase tracking-widest ml-2">Credits</span>
                                    </div>

                                    <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden backdrop-blur-sm">
                                        <div
                                            className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out"
                                            style={{ width: `${Math.min(100, Math.max(5, ((user.credits || 0) / 100) * 100))}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Decorative Elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-all duration-700 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-900/20 rounded-full blur-[40px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                            </div>

                            {/* Billing History Card - Now Below */}
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                            <CreditCard size={20} />
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-slate-900">Billing History</p>
                                            <p className="text-xs text-slate-400 font-medium">View and download your invoices ({user.transactions?.length || 0})</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                                    {(user.transactions && Array.isArray(user.transactions) && user.transactions.length > 0) ? (
                                        [...user.transactions].reverse().map((tx, i) => (
                                            <div key={tx.id || i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-orange-200 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2.5 rounded-xl border border-slate-100 transition-colors ${tx.type === 'stripe_payment' ? 'bg-indigo-100 text-indigo-600' :
                                                        tx.type === 'paypal_payment' ? 'bg-blue-100 text-blue-600' :
                                                            tx.type === 'admin_plan_change' ? 'bg-purple-100 text-purple-600' :
                                                                'bg-orange-100 text-orange-600'
                                                        }`}>
                                                        {tx.type === 'stripe_payment' ? <CreditCard size={18} /> :
                                                            tx.type === 'paypal_payment' ? <Globe size={18} /> :
                                                                tx.type === 'admin_plan_change' ? <Shield size={18} /> :
                                                                    <Zap size={18} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-slate-900">{tx.description || 'Transaction'}</p>
                                                            {tx.isAdjustment && (
                                                                <span className="text-[8px] font-black bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded uppercase tracking-tighter">Adjusted by Admin</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-medium">{new Date(tx.date).toLocaleDateString()} • {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-slate-900">
                                                            {tx.amount > 0 ? `$${tx.amount.toFixed(2)}` : 'FREE'}
                                                        </p>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${(tx.type === 'stripe_payment' || tx.type === 'paypal_payment') ? 'text-green-600 bg-green-50' : 'text-slate-500 bg-slate-200'
                                                            }`}>
                                                            {(tx.type === 'stripe_payment' || tx.type === 'paypal_payment') ? 'PAID' : 'PROCESSED'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={async () => {
                                                                const dataUrl = await generateInvoiceImage(user, tx);
                                                                setPreviewInvoice(dataUrl);
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                            title="Preview Invoice"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                const dataUrl = await generateInvoiceImage(user, tx);
                                                                const link = document.createElement('a');
                                                                link.download = `Redigo-Invoice-${tx.id || 'TX'}.png`;
                                                                link.href = dataUrl;
                                                                link.click();
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                                                            title="Download Invoice"
                                                        >
                                                            <Upload className="rotate-180" size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                            <Archive className="mx-auto text-slate-200 mb-2" size={32} />
                                            <p className="text-sm text-slate-400 font-medium italic">No Billing History yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    <section className="space-y-6">
                        {/* Total Spent Banner */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                                    <RefreshCw className="text-orange-400" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white/90">Total Credits Used</h2>
                                    <p className="text-white/60 text-sm">Lifetime consumption across all features</p>
                                </div>
                            </div>
                            <div className="relative z-10 flex flex-col items-start md:items-end gap-5 w-full md:w-auto">
                                <div className="text-left md:text-right">
                                    <p className="text-4xl font-black text-white tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                                        {user.usageStats?.totalSpent || 0}
                                    </p>
                                    <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mt-1">Total Credits</p>
                                </div>
                                {(() => {
                                    // Determine the daily limit
                                    if (!Array.isArray(plans)) return null;
                                    const userPlanName = (user.plan || 'Starter').toLowerCase();
                                    const plan = plans.find(p => (p.name || '').toLowerCase() === userPlanName || (p.id || '').toLowerCase() === userPlanName);
                                    const planLimit = user.billingCycle === 'yearly' ? plan?.dailyLimitYearly : plan?.dailyLimitMonthly;
                                    const dailyLimit = (Number(user.customDailyLimit) > 0) ? Number(user.customDailyLimit) : (Number(planLimit) || 0);

                                    const currentUsage = user.dailyUsagePoints || 0;

                                    return dailyLimit > 0 && (
                                        <div className="w-full md:w-60 space-y-2.5 flex flex-col items-start md:items-end border-t border-white/10 pt-4 md:border-t-0 md:pt-0">
                                            <div className="flex justify-between w-full text-[10px] font-black uppercase tracking-widest text-white/50">
                                                <div className="flex items-center gap-1.5">
                                                    <Zap size={10} className="text-orange-400" />
                                                    <span>Daily Limit</span>
                                                </div>
                                                <span className="text-white">{currentUsage} / {dailyLimit} pts</span>
                                            </div>
                                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5 relative">
                                                <div
                                                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(249,115,22,0.6)]"
                                                    style={{ width: `${Math.min(100, (currentUsage / dailyLimit) * 100)}%` }}
                                                />
                                            </div>
                                            <p className="text-[9px] text-white/40 font-bold uppercase tracking-tighter">Resets in 24h</p>
                                        </div>
                                    );
                                })()}
                            </div>
                            {/* Decorative background blur */}
                            <div className="absolute top-1/2 right-0 w-64 h-64 bg-orange-600/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                    <Tag size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Posts</p>
                                    <p className="text-2xl font-black text-slate-900">
                                        {user.usageStats?.posts || 0}
                                        <span className="text-xs font-medium text-slate-400 ml-1">({user.usageStats?.postsCredits || 0} pts)</span>
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                                    <Palette size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Images</p>
                                    <p className="text-2xl font-black text-slate-900">
                                        {user.usageStats?.images || 0}
                                        <span className="text-xs font-medium text-slate-400 ml-1">({user.usageStats?.imagesCredits || 0} pts)</span>
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Comments</p>
                                    <p className="text-2xl font-black text-slate-900">
                                        {user.usageStats?.comments || 0}
                                        <span className="text-xs font-medium text-slate-400 ml-1">({user.usageStats?.commentsCredits || 0} pts)</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* History List */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm space-y-4">
                            <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                                {(user.usageStats?.history && Array.isArray(user.usageStats.history) && user.usageStats.history.length > 0) ? (
                                    [...user.usageStats.history].reverse().map((item: any, i: number) => {
                                        let icon = <Zap size={18} />;
                                        let colorClass = 'bg-slate-100 text-slate-600';
                                        let label = 'Action';

                                        if (item.type === 'post') {
                                            icon = <Tag size={18} />;
                                            colorClass = 'bg-blue-100 text-blue-600';
                                            label = 'AI Post Generation';
                                        } else if (item.type === 'image') {
                                            icon = <Palette size={18} />;
                                            colorClass = 'bg-purple-100 text-purple-600';
                                            label = 'AI Image Generation';
                                        } else if (item.type === 'comment') {
                                            icon = <Zap size={18} />;
                                            colorClass = 'bg-green-100 text-green-600';
                                            label = 'AI Comment Generation';
                                        }

                                        return (
                                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-orange-200 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2.5 rounded-xl border border-slate-100 ${colorClass}`}>
                                                        {icon}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{label}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">{new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-orange-600">
                                                        -{item.cost} Credits
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <RefreshCw className="mx-auto text-slate-300 mb-2" size={32} />
                                        <p className="text-sm text-slate-400 font-medium italic">No usage history yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* Invoice Preview Modal */}
            {previewInvoice && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Invoice Preview</h3>
                            <button
                                onClick={() => setPreviewInvoice(null)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-8 bg-slate-50 flex justify-center">
                            <img src={previewInvoice} alt="Invoice Preview" className="shadow-xl rounded-lg max-w-full h-auto border border-slate-200" />
                        </div>
                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white">
                            <button
                                onClick={() => setPreviewInvoice(null)}
                                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.download = `Redigo-Invoice-${new Date().toISOString().split('T')[0]}.png`;
                                    link.href = previewInvoice;
                                    link.click();
                                }}
                                className="px-5 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-500 shadow-lg shadow-orange-200 transition-all flex items-center gap-2"
                            >
                                <Upload className="rotate-180" size={16} /> Download
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Cancellation Survey Modal */}
            {isCancelModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-6 md:p-10 animate-in zoom-in-95 duration-200 space-y-6 md:space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                                <Archive size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900">We're sorry to see you go</h3>
                            <p className="text-slate-500 font-medium">Please let us know why you're cancelling. Your feedback helps us improve.</p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { id: 'price', label: 'Too expensive' },
                                { id: 'features', label: 'Missing features' },
                                { id: 'technical', label: 'Technical issues' },
                                { id: 'unused', label: "I don't use it enough" },
                                { id: 'other', label: 'Other' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setCancelReason(opt.label)}
                                    className={`w-full p-4 rounded-2xl border-2 text-left font-bold transition-all flex items-center justify-between ${cancelReason === opt.label ? 'border-orange-600 bg-orange-50 text-orange-600' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                                >
                                    {opt.label}
                                    {cancelReason === opt.label && <Check size={18} />}
                                </button>
                            ))}

                            <textarea
                                placeholder="Any additional comments? (Optional)"
                                rows={3}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-orange-500 font-medium text-slate-700 resize-none transition-all"
                                value={cancelComment}
                                onChange={e => setCancelComment(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsCancelModalOpen(false)}
                                className="flex-1 py-4 text-slate-600 font-black hover:bg-slate-50 rounded-2xl transition-all"
                            >
                                Keep Subscription
                            </button>
                            <button
                                onClick={handleCancelAutoRenewal}
                                disabled={!cancelReason || isCancelling}
                                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 shadow-xl shadow-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isCancelling ? <RefreshCw className="animate-spin" size={18} /> : 'Confirm Cancellation'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Deletion Modal */}
            {isDeleteModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-6 md:p-10 animate-in zoom-in-95 duration-200 space-y-6 md:space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900">Are you absolutely sure?</h3>
                            <p className="text-slate-500 font-medium text-sm">
                                This will schedule your account and all data for permanent deletion in 14 days.
                                Log back in before then to cancel the deletion.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-xs font-bold leading-relaxed">
                                ⚠️ WARNING: All your brand profiles, post history, and campaign data will be lost forever.
                            </div>
                            <label className="block space-y-2">
                                <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Confirm Password</span>
                                <input
                                    type="password"
                                    placeholder="Enter your password to confirm"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-red-500 font-bold text-slate-900 transition-all"
                                    value={deletePassword}
                                    onChange={e => setDeletePassword(e.target.value)}
                                />
                            </label>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 py-4 text-slate-600 font-black hover:bg-slate-50 rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={!deletePassword || isDeleting}
                                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 shadow-xl shadow-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <RefreshCw className="animate-spin" size={18} /> : 'Delete My Data'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div >
    );
};
