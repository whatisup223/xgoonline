
import React, { useState, useEffect } from 'react';
import { generateRedditPost, fetchBrandProfile, BrandProfile } from '../services/geminiService';
import {
    PenTool,
    Sparkles,
    Image as ImageIcon,
    Send,
    ArrowRight,
    Check,
    Target,
    Zap,
    RefreshCw,
    Link as LinkIcon,
    Tag,
    Users,
    Lightbulb,
    MessageSquare,
    BookOpen,
    ChevronDown,
    ChevronUp,
    Building2,
    Settings,
    Trash2,
    X,
    AlertCircle,
    Clock,
    Crown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import CreditsBanner from '../components/CreditsBanner';

const PROGRESS_STEPS = [
    { message: 'Analyzing your target community...', icon: '🔍', duration: 1200 },
    { message: 'Crafting your viral headline...', icon: '✍️', duration: 1500 },
    { message: 'Writing the thread body...', icon: '📝', duration: 2400 },
    { message: 'Polishing for maximum engagement...', icon: '✨', duration: 1200 },
];

const TONES = [
    {
        id: 'helpful_peer',
        label: 'Helpful Peer',
        desc: 'Friendly & relatable, like sharing a discovery with a friend',
        icon: Users,
        color: 'blue'
    },
    {
        id: 'thought_leader',
        label: 'Thought Leader',
        desc: 'Structured insights with bullet points & deep expertise',
        icon: Lightbulb,
        color: 'purple'
    },
    {
        id: 'storyteller',
        label: 'Storyteller',
        desc: 'Opens with a personal anecdote to build emotional connection',
        icon: BookOpen,
        color: 'green'
    },
    {
        id: 'skeptic',
        label: 'Skeptic',
        desc: 'Challenges common assumptions, then offers your solution',
        icon: MessageSquare,
        color: 'orange'
    },
];

const toneColorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200 group-hover:border-blue-400',
    purple: 'bg-purple-50 text-purple-600 border-purple-200 group-hover:border-purple-400',
    green: 'bg-green-50 text-green-600 border-green-200 group-hover:border-green-400',
    orange: 'bg-orange-50 text-orange-600 border-orange-200 group-hover:border-orange-400',
};

const toneActiveMap: Record<string, string> = {
    blue: 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100',
    purple: 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-100',
    green: 'border-green-500 bg-green-50 shadow-lg shadow-green-100',
    orange: 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-100',
};

export const ContentArchitect: React.FC = () => {
    const { user, updateUser, syncUser } = useAuth();
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [progressStep, setProgressStep] = useState(0);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [brandProfile, setBrandProfile] = useState<BrandProfile>({});
    const [showBrandOverride, setShowBrandOverride] = useState(false);
    const [language, setLanguage] = useState('English');

    const [postData, setPostData] = useState({
        subreddit: '',
        goal: 'Engagement',
        tone: 'helpful_peer',
        title: '',
        content: '',
        imagePrompt: '',
        imageUrl: '',
        productMention: '',
        productUrl: '',
        description: '',
        targetAudience: '',
        problemSolved: '',
        primaryColor: '',
        secondaryColor: ''
    });
    const [plans, setPlans] = useState<any[]>([]);
    const [redditStatus, setRedditStatus] = useState<{ connected: boolean; accounts: any[] }>({ connected: false, accounts: [] });
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [includeImage, setIncludeImage] = useState(true);
    const [includeBrandName, setIncludeBrandName] = useState(true);
    const [includeLink, setIncludeLink] = useState(true);
    const [costs, setCosts] = useState({ comment: 1, post: 2, image: 5 });
    const [showRegenConfirm, setShowRegenConfirm] = useState(false);
    const [regenMode, setRegenMode] = useState<'text' | 'image' | 'both'>('text');
    const [showDraftBanner, setShowDraftBanner] = useState(false);
    const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
    const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);

    const currentPlan = plans.find(p => (p.name || '').toLowerCase() === (user?.plan || '').toLowerCase() || (p.id || '').toLowerCase() === (user?.plan || '').toLowerCase());
    const canGenerateImages = user?.role === 'admin' || (currentPlan && currentPlan.allowImages === true);
    const canTrack = user?.role === 'admin' || (currentPlan && currentPlan.allowTracking === true);

    const [useTracking, setUseTracking] = useState(false);

    useEffect(() => {
        syncUser(); // Refresh credits & daily limits on mount
        fetch('/api/config')
            .then(res => res.json())
            .then(data => {
                console.log('Fetched Config:', data);
                if (data.creditCosts) {
                    const mergedCosts = {
                        comment: Number(data.creditCosts.comment) || 1,
                        post: Number(data.creditCosts.post) || 2,
                        image: Number(data.creditCosts.image) || 5
                    };
                    console.log('Applied Costs:', mergedCosts);
                    setCosts(mergedCosts);
                }
            })
            .catch(err => console.error('Config fetch failed:', err));

        fetch('/api/plans')
            .then(res => res.json())
            .then(data => setPlans(data))
            .catch(console.error);
    }, []);

    // Load brand profile on mount
    useEffect(() => {
        if (user?.id) {
            fetchBrandProfile(user.id).then(p => {
                if (p?.brandName) setBrandProfile(p);
            });
            fetch(`/api/user/reddit/status?userId=${user.id}`)
                .then(res => res.json())
                .then(status => {
                    setRedditStatus(status);
                    if (status.accounts?.length > 0) {
                        setSelectedAccount(status.accounts[0].username);
                    }
                });
        }
    }, [user]);

    // Check for draft on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem('redditgo_post_draft');
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                if (draft.title || draft.content) {
                    setShowDraftBanner(true);
                }
            } catch (e) {
                localStorage.removeItem('redditgo_post_draft');
            }
        }
        setIsInitialCheckDone(true);
    }, []);

    // Auto-save effect
    useEffect(() => {
        if (postData.title || postData.content) {
            localStorage.setItem('redditgo_post_draft', JSON.stringify({
                ...postData,
                step: step,
                includeBrandName,
                includeLink,
                useTracking,
                includeImage,
                language
            }));
        } else if (isInitialCheckDone && !showDraftBanner) {
            localStorage.removeItem('redditgo_post_draft');
        }
    }, [postData, step, includeBrandName, includeLink, useTracking, includeImage, language, isInitialCheckDone, showDraftBanner]);

    const handleResumeDraft = async () => {
        const savedDraft = localStorage.getItem('redditgo_post_draft');
        if (savedDraft) {
            const draft = JSON.parse(savedDraft);
            setPostData(draft);
            setStep(draft.step || 2);
            setIncludeBrandName(draft.includeBrandName !== undefined ? draft.includeBrandName : true);
            setIncludeLink(draft.includeLink !== undefined ? draft.includeLink : true);
            setUseTracking(draft.useTracking !== undefined ? draft.useTracking : false);
            setIncludeImage(draft.includeImage !== undefined ? draft.includeImage : true);
            setLanguage(draft.language || 'English');
            setShowDraftBanner(false);
            showToast('Draft restored! Continuing from where you left off.', 'success');
            syncUser(); // Sync usage state after resuming

            // IMAGE RECOVERY LOGIC
            // If the draft has an image prompt but no image URL, check the server
            if (draft.imagePrompt && !draft.imageUrl && user?.id) {
                try {
                    const res = await fetch(`/api/user/latest-image?userId=${user.id}`);
                    const latestImage = await res.json();

                    // Robust comparison: trim and normalize prompts
                    const draftPrompt = (draft.imagePrompt || '').trim().toLowerCase();
                    const serverPrompt = (latestImage?.prompt || '').trim().toLowerCase();

                    if (latestImage && latestImage.url && serverPrompt === draftPrompt) {
                        setPostData(prev => ({ ...prev, imageUrl: latestImage.url }));
                        setImageLoaded(false); // Reset image load state for new URL
                        showToast('Image recovered from server!', 'success');
                    }
                } catch (e) {
                    console.error('Failed to recover image:', e);
                }
            }
        }
    };

    const handleDiscardDraft = () => {
        localStorage.removeItem('redditgo_post_draft');
        setPostData({
            subreddit: '',
            goal: 'Engagement',
            tone: 'helpful_peer',
            title: '',
            content: '',
            imagePrompt: '',
            imageUrl: '',
            productMention: '',
            productUrl: '',
            description: '',
            targetAudience: '',
            problemSolved: '',
            primaryColor: '',
            secondaryColor: ''
        });
        setStep(1);
        setShowDraftBanner(false);
        setShowDiscardConfirm(false);
        showToast('Draft discarded successfully.', 'success');
    };

    const goals = ['Engagement', 'Lead Gen', 'Problem Solving', 'Product Launch', 'Storytelling'];

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Cycle through progress messages while generating
    useEffect(() => {
        if (!isGenerating) {
            setProgressStep(0);
            return;
        }
        let current = 0;
        const cycle = () => {
            if (current < PROGRESS_STEPS.length - 1) {
                current++;
                setProgressStep(current);
                setTimeout(cycle, PROGRESS_STEPS[current].duration);
            }
        };
        setTimeout(cycle, PROGRESS_STEPS[0].duration);
    }, [isGenerating]);

    const triggerImageGeneration = async (prompt: string) => {
        // Proactive Daily Limit Pre-check (for individual image trigger)
        if (user && user.role !== 'admin') {
            const plan = plans.find(p => (p.name || '').toLowerCase() === (user.plan || '').toLowerCase() || (p.id || '').toLowerCase() === (user.plan || '').toLowerCase());
            const planLimit = user.billingCycle === 'yearly' ? plan?.dailyLimitYearly : plan?.dailyLimitMonthly;
            const dailyLimit = (Number(user.customDailyLimit) > 0) ? Number(user.customDailyLimit) : (Number(planLimit) || 0);

            if (dailyLimit > 0) {
                const currentUsage = (user.dailyUsagePoints || 0);
                if ((currentUsage + Number(costs.image || 5)) > dailyLimit) {
                    setShowDailyLimitModal(true);
                    return;
                }
            }
        }

        setIsGeneratingImage(true);
        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, userId: user.id })
            });

            if (response.status === 402) {
                setShowNoCreditsModal(true);
                return;
            }
            if (response.status === 429) {
                setShowDailyLimitModal(true);
                return;
            }
            if (!response.ok) throw new Error('Failed to generate image');

            const data = await response.json();
            setPostData(prev => ({ ...prev, imageUrl: data.url }));

            // Sync credits for image too
            if (data.credits !== undefined) {
                updateUser({
                    credits: data.credits,
                    dailyUsagePoints: data.dailyUsagePoints,
                    dailyUsage: data.dailyUsage
                });
            }
        } catch (err) {
            console.error('Image gen failed:', err);
            // Image generation is optional, but we still log failed attempts
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleGenerateContent = async (mode: 'text' | 'image' | 'both' = 'both') => {
        if (!postData.subreddit) return;

        const postCost = Number(costs.post) ?? 2;
        const imageCost = Number(costs.image) ?? 5;

        // Determine if we should generate an image based on the mode and current step
        let isImageRequested = false;
        if (mode === 'image') {
            isImageRequested = true;
            setIncludeImage(true); // Force UI to show image section
        } else if (mode === 'both') {
            if (step === 1) {
                // Initial generation: respect the user's toggle AND plan permissions
                isImageRequested = includeImage && canGenerateImages;
            } else {
                // Full Refresh from modal: user explicitly chose image+text
                isImageRequested = true;
                setIncludeImage(true);
            }
        }

        let totalCost = 0;
        if (mode === 'text') totalCost = postCost;
        else if (mode === 'image') totalCost = imageCost;
        else totalCost = isImageRequested ? (postCost + imageCost) : postCost;

        // Proactive Daily Limit Pre-check
        if (user && user.role !== 'admin') {
            const plan = plans.find(p => (p.name || '').toLowerCase() === (user.plan || '').toLowerCase() || (p.id || '').toLowerCase() === (user.plan || '').toLowerCase());
            const planLimit = user.billingCycle === 'yearly' ? plan?.dailyLimitYearly : plan?.dailyLimitMonthly;
            const dailyLimit = (Number(user.customDailyLimit) > 0) ? Number(user.customDailyLimit) : (Number(planLimit) || 0);

            if (dailyLimit > 0) {
                const currentUsage = (user.dailyUsagePoints || 0);
                if ((currentUsage + totalCost) > dailyLimit) {
                    setShowDailyLimitModal(true);
                    return;
                }
            }
        }

        // Frontend balance pre-check
        if ((user?.credits || 0) < totalCost && user?.role !== 'admin') {
            setShowNoCreditsModal(true);
            return;
        }

        if (mode === 'image') {
            triggerImageGeneration(postData.imagePrompt);
            showToast('Regenerating image...', 'success');
            return;
        }

        setIsGenerating(true);
        setProgressStep(0);
        try {
            // Build override profile from any filled-in fields
            const overrideProfile: Partial<BrandProfile> = {
                ...(user?.brandProfile || {}),
                brandName: postData.productMention || user?.brandProfile?.brandName || undefined,
                website: postData.productUrl || user?.brandProfile?.website || undefined,
                description: postData.description || user?.brandProfile?.description || undefined,
                targetAudience: postData.targetAudience || user?.brandProfile?.targetAudience || undefined,
                problem: postData.problemSolved || user?.brandProfile?.problem || undefined,
                primaryColor: postData.primaryColor || user?.brandProfile?.primaryColor || undefined,
                secondaryColor: postData.secondaryColor || user?.brandProfile?.secondaryColor || undefined
            };

            const generated = await generateRedditPost(
                postData.subreddit,
                postData.goal,
                postData.tone,
                postData.productMention,
                postData.productUrl,
                user?.id,
                overrideProfile,
                language,
                includeBrandName,
                includeLink,
                useTracking
            );

            setPostData(prev => ({
                ...prev,
                title: generated.title,
                content: generated.content,
                imagePrompt: generated.imagePrompt,
                imageUrl: mode === 'both' ? '' : prev.imageUrl
            }));

            // Synchronize credits
            if (generated.credits !== undefined) {
                updateUser({
                    credits: generated.credits,
                    dailyUsagePoints: generated.dailyUsagePoints,
                    dailyUsage: generated.dailyUsage
                });
            }

            setStep(2);
            // Non-blocking call: trigger image generation but don't AWAIT it
            if (mode === 'both' && isImageRequested) {
                triggerImageGeneration(generated.imagePrompt);
            }

            showToast('Content updated!', 'success');

        } catch (err: any) {
            console.error(err);
            if (err.message === 'OUT_OF_CREDITS') {
                setShowNoCreditsModal(true);
            } else if (err.message === 'DAILY_LIMIT_REACHED') {
                setShowDailyLimitModal(true);
            } else {
                showToast('AI generation failed. Please check your settings.', 'error');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePost = async () => {
        if (!user?.id) return;
        setIsPosting(true);
        try {
            const response = await fetch('/api/reddit/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    subreddit: postData.subreddit,
                    title: postData.title,
                    text: postData.content,
                    kind: 'self',
                    redditUsername: selectedAccount
                })
            });
            if (!response.ok) throw new Error('Failed to post to Reddit');
            localStorage.removeItem('redditgo_post_draft');
            showToast('Post successfully published to Reddit! 🎉', 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsPosting(false);
        }
    };

    const currentTone = TONES.find(t => t.id === postData.tone);

    return (
        <>
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[99999] p-5 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 duration-500 border border-white/20 backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-600/90 shadow-emerald-900/20' : 'bg-red-600/90 shadow-red-900/20'}`}>
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                        {toast.type === 'success' ? <Sparkles size={20} className="text-white" /> : <AlertCircle size={20} className="text-white" />}
                    </div>
                    <div className="text-left">
                        <p className="font-extrabold text-sm text-white leading-tight font-['Outfit']">{toast.message}</p>
                        {toast.type === 'success' && <p className="text-white/80 text-[10px] font-medium mt-0.5">Operation successful</p>}
                    </div>
                    <button onClick={() => setToast(null)} className="ml-2 text-white/50 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Generating Overlay */}
            {isGenerating && (
                <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-14 max-w-md w-full shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="relative w-20 h-20 md:w-24 md:h-24 mx-auto">
                            <div className="absolute inset-0 rounded-full bg-orange-100 animate-ping opacity-60" />
                            <div className="relative w-24 h-24 bg-orange-600 rounded-full flex items-center justify-center text-4xl shadow-2xl shadow-orange-300">
                                {PROGRESS_STEPS[progressStep]?.icon}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <p className="text-2xl font-extrabold text-slate-900">
                                {PROGRESS_STEPS[progressStep]?.message}
                            </p>
                            <p className="text-slate-400 font-medium text-sm">Powered by AI · Please wait</p>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-orange-600 rounded-full transition-all duration-1000"
                                style={{ width: `${((progressStep + 1) / PROGRESS_STEPS.length) * 100}%` }}
                            />
                        </div>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            Step {progressStep + 1} of {PROGRESS_STEPS.length}
                        </p>
                    </div>
                </div>
            )}

            {/* Re-generate Confirmation Modal */}
            {showRegenConfirm && (
                <div className="fixed inset-0 z-[999] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-md w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
                                    <RefreshCw size={24} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">Regenerate Options</h3>
                            </div>
                            <button onClick={() => setShowRegenConfirm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="space-y-3">
                            {/* Option: Text Only */}
                            <button
                                onClick={() => setRegenMode('text')}
                                className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${regenMode === 'text' ? 'border-orange-500 bg-orange-50/50 shadow-md' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${regenMode === 'text' ? 'bg-orange-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                        <PenTool size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Text Only</p>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Refresh headline & body</p>
                                    </div>
                                </div>
                                <span className={`font-black text-xs ${regenMode === 'text' ? 'text-orange-600' : 'text-slate-400'}`}>{costs.post} PTS</span>
                            </button>

                            {/* Option: Image Only */}
                            {canGenerateImages && (
                                <button
                                    onClick={() => setRegenMode('image')}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${regenMode === 'image' ? 'border-orange-500 bg-orange-50/50 shadow-md' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${regenMode === 'image' ? 'bg-orange-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                            <ImageIcon size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">Image Only</p>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">New AI visual context</p>
                                        </div>
                                    </div>
                                    <span className={`font-black text-xs ${regenMode === 'image' ? 'text-orange-600' : 'text-slate-400'}`}>{costs.image} PTS</span>
                                </button>
                            )}

                            {/* Option: Both */}
                            <button
                                onClick={() => setRegenMode(canGenerateImages ? 'both' : 'text')}
                                className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${(regenMode === 'both' || (regenMode === 'text' && !canGenerateImages)) ? 'border-orange-500 bg-orange-50/50 shadow-md' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${(regenMode === 'both' || (regenMode === 'text' && !canGenerateImages)) ? 'bg-orange-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                        {canGenerateImages ? <Sparkles size={18} /> : <PenTool size={18} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{canGenerateImages ? 'Full Refresh' : 'Text Refresh'}</p>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{canGenerateImages ? 'New post + New image' : 'Refresh headline & body'}</p>
                                    </div>
                                </div>
                                <span className={`font-black text-xs ${(regenMode === 'both' || (regenMode === 'text' && !canGenerateImages)) ? 'text-orange-600' : 'text-slate-400'}`}>{canGenerateImages ? (Number(costs.post) + Number(costs.image)) : costs.post} PTS</span>
                            </button>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-50">
                            <button
                                onClick={() => setShowRegenConfirm(false)}
                                className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all uppercase text-[10px] tracking-widest"
                            >
                                Nevermind
                            </button>
                            <button
                                onClick={() => {
                                    setShowRegenConfirm(false);
                                    handleGenerateContent(regenMode);
                                }}
                                className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                            >
                                <Check size={14} /> Confirm & Pay
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Discard Draft Confirmation Modal */}
            {showDiscardConfirm && (
                <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                            <Trash2 size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-slate-900">Discard Current Draft?</h3>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                If you discard this, you will need to <span className="text-orange-600 font-bold">regenerate</span> which will cost more points. This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 pt-2">
                            <button
                                onClick={handleDiscardDraft}
                                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 hover:bg-red-700 transition-all"
                            >
                                YES, DISCARD DRAFT
                            </button>
                            <button
                                onClick={() => setShowDiscardConfirm(false)}
                                className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                            >
                                Keep it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* No Credits Modal */}
            {showNoCreditsModal && (
                <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-['Outfit']">
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-orange-50 to-white -z-10" />

                        <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-inner border border-orange-200">
                            <Zap size={40} className="fill-current" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900 leading-tight">Out of Fuel! ⛽</h3>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                You've used all your AI credits. <br />Top up to keep the momentum going!
                            </p>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required</span>
                                <span className="text-sm font-black text-slate-900">{Number(costs.post)} PTS</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Balance</span>
                                <span className="text-sm font-black text-red-500">{user?.credits || 0} PTS</span>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <Link
                                to="/pricing"
                                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black shadow-xl shadow-orange-200 hover:bg-orange-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
                            >
                                Top Up Credits <ArrowRight size={16} />
                            </Link>
                            <button
                                onClick={() => setShowNoCreditsModal(false)}
                                className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors text-xs uppercase tracking-widest"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-10 font-['Outfit'] pb-20 pt-4">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
                    <div className="space-y-1">
                        <p className="text-slate-400 font-semibold text-sm">Welcome back, {user?.name?.split(' ')[0] || 'there'}</p>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-7 bg-orange-600 rounded-full" />
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Post Agent</h1>
                        </div>
                        <p className="text-slate-400 font-medium text-sm pl-4">Design, generate &amp; publish viral Reddit threads in seconds.</p>
                    </div>



                    {/* Step Indicator */}
                    <div className="flex items-center gap-3">
                        {[{ n: 1, label: 'Setup' }, { n: 2, label: 'Edit' }, { n: 3, label: 'Publish' }].map((s, i) => (
                            <React.Fragment key={s.n}>
                                <div className="flex flex-col items-center gap-1">
                                    <div className={`w-10 h-10 rounded-full border-4 border-white flex items-center justify-center text-[11px] font-black shadow-sm transition-all ${step > s.n ? 'bg-green-500 text-white' :
                                        step === s.n ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' :
                                            'bg-slate-100 text-slate-400'
                                        }`}>
                                        {step > s.n ? <Check size={14} /> : s.n}
                                    </div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                                </div>
                                {i < 2 && <div className={`h-0.5 w-10 rounded-full transition-all duration-500 ${step > s.n ? 'bg-green-400' : 'bg-slate-100'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Draft Banner */}
                {showDraftBanner && (
                    <div className="bg-slate-900 rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500 group border border-slate-800">
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className="relative z-10 flex items-center gap-5 w-full md:w-auto">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center border border-white/5 text-orange-500 group-hover:scale-110 transition-transform duration-500">
                                <PenTool size={28} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-white leading-tight">Unfinished Post Found</h3>
                                <p className="text-slate-400 text-xs font-medium max-w-md">
                                    We saved your previous session automatically. Would you like to continue working?
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 flex items-center gap-3 w-full md:w-auto justify-end">
                            <button
                                onClick={() => setShowDiscardConfirm(true)}
                                className="px-5 py-3 text-slate-500 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleResumeDraft}
                                className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-900/40 hover:shadow-orange-600/20 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                            >
                                Resume Draft <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                )}

                <CreditsBanner
                    plan={user?.plan || 'Starter'}
                    credits={user?.credits || 0}
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* Left: Workspace */}
                    <div className="lg:col-span-7 space-y-8">

                        {/* STEP 1 */}
                        {step === 1 && (
                            <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-xl space-y-10">
                                <div className="space-y-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                            <Target size={20} />
                                        </div>
                                        <h2 className="text-xl font-extrabold text-slate-900">Campaign Foundation</h2>
                                    </div>

                                    {/* Subreddit + Goal */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Target Community</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">r/</span>
                                                <input
                                                    type="text"
                                                    placeholder="saas, marketing, tech..."
                                                    className="w-full pl-9 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-bold transition-all"
                                                    value={postData.subreddit}
                                                    onChange={(e) => setPostData({ ...postData, subreddit: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Content Goal</label>
                                            <select
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-bold appearance-none"
                                                value={postData.goal}
                                                onChange={(e) => setPostData({ ...postData, goal: e.target.value })}
                                            >
                                                {goals.map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Brand Integration — Smart Override */}
                                    {brandProfile.brandName ? (
                                        <div className="rounded-3xl border-2 border-green-100 overflow-hidden">
                                            {/* Active Brand Badge */}
                                            <div className="flex items-center justify-between px-5 py-4 bg-green-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center">
                                                        <Building2 size={14} className="text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Brand Profile Active</p>
                                                        <p className="font-extrabold text-slate-900 text-sm">{brandProfile.brandName}</p>
                                                    </div>
                                                    <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-lg text-[10px] font-black">
                                                        <Check size={10} /> Auto-applied
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => setShowBrandOverride(v => !v)}
                                                    className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 hover:text-orange-600 transition-colors"
                                                >
                                                    {showBrandOverride ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    {showBrandOverride ? 'Hide override' : 'Override for this post'}
                                                </button>
                                            </div>

                                            {/* Collapsible Override Panel */}
                                            {showBrandOverride && (
                                                <div className="p-5 bg-white border-t border-green-100 space-y-4">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                        <Tag size={10} /> Override for this post only — leave blank to use Profile defaults
                                                    </p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand Name</label>
                                                            <input
                                                                type="text"
                                                                placeholder={`Default: ${brandProfile.brandName}`}
                                                                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-bold transition-all text-sm"
                                                                value={postData.productMention}
                                                                onChange={(e) => setPostData({ ...postData, productMention: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                                <LinkIcon size={10} /> Website URL
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder={`Default: ${brandProfile.website || 'Not set'}`}
                                                                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-bold transition-all text-sm"
                                                                value={postData.productUrl}
                                                                onChange={(e) => setPostData({ ...postData, productUrl: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">What does it do? (override)</label>
                                                        <textarea
                                                            rows={2}
                                                            placeholder={`Default: ${brandProfile.description || 'From your Brand Profile'}`}
                                                            className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-medium text-sm resize-none transition-all"
                                                            value={postData.description}
                                                            onChange={(e) => setPostData({ ...postData, description: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Audience (override)</label>
                                                        <input
                                                            type="text"
                                                            placeholder={`Default: ${brandProfile.targetAudience || 'From your Brand Profile'}`}
                                                            className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-bold transition-all text-sm"
                                                            value={postData.targetAudience}
                                                            onChange={(e) => setPostData({ ...postData, targetAudience: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Problem it solves (override)</label>
                                                        <input
                                                            type="text"
                                                            placeholder={`Default: ${brandProfile.problem || 'From your Brand Profile'}`}
                                                            className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-bold transition-all text-sm"
                                                            value={postData.problemSolved}
                                                            onChange={(e) => setPostData({ ...postData, problemSolved: e.target.value })}
                                                        />
                                                    </div>
                                                    {/* Color Overrides */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Color</label>
                                                            <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-2xl">
                                                                <input
                                                                    type="color"
                                                                    className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                                                                    value={postData.primaryColor || brandProfile.primaryColor || '#EA580C'}
                                                                    onChange={(e) => setPostData({ ...postData, primaryColor: e.target.value })}
                                                                />
                                                                <span className="text-xs font-bold text-slate-600 uppercase">{postData.primaryColor || brandProfile.primaryColor || '#EA580C'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secondary Color</label>
                                                            <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-2xl">
                                                                <input
                                                                    type="color"
                                                                    className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                                                                    value={postData.secondaryColor || brandProfile.secondaryColor || '#1E293B'}
                                                                    onChange={(e) => setPostData({ ...postData, secondaryColor: e.target.value })}
                                                                />
                                                                <span className="text-xs font-bold text-slate-600 uppercase">{postData.secondaryColor || brandProfile.secondaryColor || '#1E293B'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* No Brand Profile — Quick Override with full fields */
                                        <div className="rounded-3xl border-2 border-orange-100 overflow-hidden">
                                            <div className="flex items-center justify-between px-5 py-4 bg-orange-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center">
                                                        <Building2 size={14} className="text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Quick Brand Override</p>
                                                        <p className="text-[11px] text-slate-500 font-medium">Fill in for richer, more personalized AI output</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Link to="/settings" className="text-[10px] font-black text-slate-400 hover:text-orange-600 transition-colors">Save permanently →</Link>
                                                    <button
                                                        onClick={() => setShowBrandOverride(v => !v)}
                                                        className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 hover:text-orange-600 transition-colors"
                                                    >
                                                        {showBrandOverride ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        {showBrandOverride ? 'Hide' : 'Fill in'}
                                                    </button>
                                                </div>
                                            </div>
                                            {showBrandOverride && (
                                                <div className="p-5 bg-white border-t border-orange-100 space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand / Product Name</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Redigo"
                                                                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-bold transition-all text-sm"
                                                                value={postData.productMention}
                                                                onChange={(e) => setPostData({ ...postData, productMention: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                                <LinkIcon size={10} /> Website URL
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="https://yoursite.com"
                                                                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-bold transition-all text-sm"
                                                                value={postData.productUrl}
                                                                onChange={(e) => setPostData({ ...postData, productUrl: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">What does it do?</label>
                                                        <textarea
                                                            rows={2}
                                                            placeholder="e.g. AI-powered Reddit outreach tool that helps SaaS founders find and engage their audience authentically."
                                                            className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-medium text-sm resize-none transition-all"
                                                            value={postData.description}
                                                            onChange={(e) => setPostData({ ...postData, description: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Audience</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. SaaS founders, indie hackers, B2B marketers"
                                                            className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-bold transition-all text-sm"
                                                            value={postData.targetAudience}
                                                            onChange={(e) => setPostData({ ...postData, targetAudience: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Problem it solves</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Difficulty finding relevant Reddit conversations"
                                                            className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 font-bold transition-all text-sm"
                                                            value={postData.problemSolved}
                                                            onChange={(e) => setPostData({ ...postData, problemSolved: e.target.value })}
                                                        />
                                                    </div>
                                                    {/* Quick Override Colors */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Color</label>
                                                            <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-2xl">
                                                                <input
                                                                    type="color"
                                                                    className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                                                                    value={postData.primaryColor || '#EA580C'}
                                                                    onChange={(e) => setPostData({ ...postData, primaryColor: e.target.value })}
                                                                />
                                                                <span className="text-xs font-bold text-slate-600 uppercase">{postData.primaryColor || '#EA580C'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secondary Color</label>
                                                            <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-2xl">
                                                                <input
                                                                    type="color"
                                                                    className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                                                                    value={postData.secondaryColor || '#1E293B'}
                                                                    onChange={(e) => setPostData({ ...postData, secondaryColor: e.target.value })}
                                                                />
                                                                <span className="text-xs font-bold text-slate-600 uppercase">{postData.secondaryColor || '#1E293B'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-medium">The more detail you provide, the more personalized the AI output will be.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}


                                    {/* Tone of Voice - Cards */}
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tone of Voice</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {TONES.map(tone => {
                                                const Icon = tone.icon;
                                                const isActive = postData.tone === tone.id;
                                                return (
                                                    <button
                                                        key={tone.id}
                                                        onClick={() => setPostData({ ...postData, tone: tone.id })}
                                                        className={`group p-5 rounded-2xl border-2 text-left transition-all duration-200 ${isActive
                                                            ? toneActiveMap[tone.color]
                                                            : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${toneColorMap[tone.color]}`}>
                                                                <Icon size={16} />
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <p className="font-extrabold text-slate-900 text-sm">{tone.label}</p>
                                                                <p className="text-[11px] text-slate-400 font-medium leading-snug">{tone.desc}</p>
                                                            </div>
                                                            {isActive && (
                                                                <div className="ml-auto">
                                                                    <Check size={16} className="text-green-500" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Language Selector */}
                                    <div className="space-y-4 pt-10 border-t border-slate-50">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            🌐 Output Language
                                        </label>
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm"
                                        >
                                            <option value="English">🇺🇸 English</option>
                                            <option value="Arabic">🇸🇦 Arabic (العربية)</option>
                                            <option value="French">🇫🇷 French (Français)</option>
                                            <option value="Spanish">🇪🇸 Spanish (Español)</option>
                                            <option value="German">🇩🇪 German (Deutsch)</option>
                                            <option value="Portuguese">🇧🇷 Portuguese (Português)</option>
                                            <option value="Italian">🇮🇹 Italian (Italiano)</option>
                                            <option value="Dutch">🇳🇱 Dutch (Nederlands)</option>
                                            <option value="Turkish">🇹🇷 Turkish (Türkçe)</option>
                                            <option value="Japanese">🇯🇵 Japanese (日本語)</option>
                                            <option value="Korean">🇰🇷 Korean (한국어)</option>
                                            <option value="Chinese">🇨🇳 Chinese (中文)</option>
                                        </select>
                                    </div>



                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-4 mt-8">
                                        <div className="flex items-center justify-between p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${!canGenerateImages ? 'bg-slate-100 text-slate-400' : 'bg-white text-orange-600'}`}>
                                                    {!canGenerateImages ? <Crown size={18} /> : <ImageIcon size={20} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-slate-900">Include Base Image</p>
                                                        {!canGenerateImages && <span className="bg-orange-100 text-orange-600 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter">Pro Feature</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] text-slate-500 font-medium">
                                                            {canGenerateImages ? `Generate visual (+${Number(costs.image)} pts)` : 'Upgrade to generate AI visuals for your posts'}
                                                        </p>
                                                        {canGenerateImages && (
                                                            <div className="flex gap-1" title="Applying your brand colors">
                                                                <div className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: brandProfile.primaryColor || '#EA580C' }} />
                                                                <div className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: brandProfile.secondaryColor || '#1E293B' }} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={() => canGenerateImages ? setIncludeImage(!includeImage) : window.location.href = '/pricing'}
                                                    className={`w-12 h-7 rounded-full transition-all relative ${includeImage && canGenerateImages ? 'bg-orange-600' : 'bg-slate-300'} ${!canGenerateImages ? 'cursor-pointer hover:bg-slate-400' : ''}`}
                                                >
                                                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${includeImage && canGenerateImages ? 'translate-x-5' : 'translate-x-0'} flex items-center justify-center`}>
                                                        {!canGenerateImages && <AlertCircle size={10} className="text-slate-400" />}
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Include Brand Name Toggle */}
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 shadow-sm">
                                                    <Tag size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">Include Brand Name</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">Explicitly mention {postData.productMention || brandProfile.brandName || 'brand'} in post</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setIncludeBrandName(!includeBrandName)}
                                                className={`w-12 h-7 rounded-full transition-all relative ${includeBrandName ? 'bg-slate-900' : 'bg-slate-300'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${includeBrandName ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        {/* Include Link Toggle */}
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 shadow-sm">
                                                    <LinkIcon size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">Include Website Link</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">Embed link to {postData.productUrl || brandProfile.website || 'website'}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setIncludeLink(!includeLink)}
                                                className={`w-12 h-7 rounded-full transition-all relative ${includeLink ? 'bg-slate-900' : 'bg-slate-300'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${includeLink ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        {/* Link Tracking Toggle */}
                                        {includeLink && (
                                            <div className="flex items-center justify-between p-4 bg-blue-50/30 rounded-2xl border border-blue-100 animate-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${!canTrack ? 'bg-slate-100 text-slate-400' : 'bg-white text-blue-600'}`}>
                                                        {!canTrack ? <Crown size={18} /> : <Zap size={18} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-slate-900">Enable Link Tracking</p>
                                                            {!canTrack && <span className="bg-blue-100 text-blue-600 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter">Pro Feature</span>}
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-medium">
                                                            {canTrack ? 'Get analytics on every click' : 'Track clicks & performance for your links'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => canTrack ? setUseTracking(!useTracking) : window.location.href = '/pricing'}
                                                    className={`w-12 h-7 rounded-full transition-all relative ${useTracking && canTrack ? 'bg-blue-600' : 'bg-slate-300'}`}
                                                >
                                                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${useTracking && canTrack ? 'translate-x-5' : 'translate-x-0'} flex items-center justify-center`}>
                                                        {!canTrack && <AlertCircle size={10} className="text-slate-400" />}
                                                    </div>
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            {postData.title && postData.content && (
                                                <button
                                                    onClick={() => setStep(2)}
                                                    className="flex-1 py-5 bg-white border-2 border-slate-900 text-slate-900 rounded-[2rem] font-black hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group"
                                                >
                                                    RESUME PROGRESS
                                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (postData.title || postData.content) {
                                                        setShowRegenConfirm(true);
                                                        return; // STOP HERE
                                                    }
                                                    handleGenerateContent();
                                                }}
                                                disabled={!postData.subreddit || isGenerating}
                                                className={`py-5 bg-slate-900 text-white rounded-[2rem] font-black hover:bg-orange-600 transition-all shadow-2xl flex items-center justify-center gap-2 group disabled:opacity-50 ${postData.title && postData.content ? 'px-8' : 'w-full'}`}
                                            >
                                                <Sparkles size={20} />
                                                {isGenerating ? 'ORCHESTRATING...' : postData.title ? `RE-GENERATE (${(includeImage && canGenerateImages) ? (Number(costs.post) + Number(costs.image)) : Number(costs.post)} pts)` : `GENERATE POST (${(includeImage && canGenerateImages) ? (Number(costs.post) + Number(costs.image)) : Number(costs.post)} PTS)`}
                                                {!postData.title && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Content Editor */}
                        {step === 2 && (
                            <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-xl space-y-8">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
                                            <PenTool size={20} />
                                        </div>
                                        <h2 className="text-xl font-extrabold text-slate-900">Content Editor</h2>
                                    </div>
                                    <button onClick={() => setStep(1)} className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest">← Back</button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Headline</label>
                                        <input
                                            type="text"
                                            value={postData.title}
                                            onChange={(e) => setPostData({ ...postData, title: e.target.value })}
                                            className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-lg text-slate-900 focus:outline-none focus:border-orange-500"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thread Body</label>
                                        <textarea
                                            rows={9}
                                            value={postData.content}
                                            onChange={(e) => setPostData({ ...postData, content: e.target.value })}
                                            className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl font-medium text-slate-700 focus:outline-none focus:border-orange-500 resize-none leading-relaxed"
                                        />
                                    </div>

                                    {includeImage && canGenerateImages && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <ImageIcon size={12} />
                                                    AI Brand Visual
                                                    {isGeneratingImage && (
                                                        <span className="text-orange-500 flex items-center gap-1">
                                                            <RefreshCw size={10} className="animate-spin" />
                                                            Generating...
                                                        </span>
                                                    )}
                                                </label>
                                                {!isGeneratingImage && postData.imageUrl && (
                                                    <button
                                                        onClick={() => {
                                                            setRegenMode('image');
                                                            setShowRegenConfirm(true);
                                                        }}
                                                        className="text-[10px] font-black text-slate-400 hover:text-orange-600 flex items-center gap-1 transition-colors"
                                                    >
                                                        <RefreshCw size={10} /> Regenerate
                                                    </button>
                                                )}
                                            </div>

                                            <div className="relative rounded-3xl overflow-hidden bg-slate-100 min-h-[200px]">
                                                {(isGeneratingImage || !imageLoaded) && postData.imageUrl === '' && (
                                                    <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse flex items-center justify-center">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <Sparkles size={28} className="text-orange-300 animate-pulse" />
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                {isGeneratingImage ? 'Crafting your brand visual...' : 'Visual will appear here'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {postData.imageUrl && (
                                                    <>
                                                        {!imageLoaded && (
                                                            <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
                                                        )}
                                                        <img
                                                            src={postData.imageUrl}
                                                            alt="AI Generated Brand Visual"
                                                            onLoad={() => setImageLoaded(true)}
                                                            className={`w-full object-cover rounded-3xl transition-all duration-700 ${imageLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-sm scale-105'}`}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setStep(3)}
                                        className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black hover:bg-orange-600 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        REVIEW & PUBLISH <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowRegenConfirm(true);
                                        }}
                                        disabled={isGenerating}
                                        className="p-5 bg-slate-50 text-slate-400 rounded-[2rem] hover:text-orange-600 hover:bg-orange-50 transition-all"
                                        title="Regenerate all content"
                                    >
                                        <RefreshCw size={24} className={isGenerating ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Publish */}
                        {step === 3 && (
                            <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-xl space-y-8">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                                            <Send size={20} />
                                        </div>
                                        <h2 className="text-xl font-extrabold text-slate-900">Final Review</h2>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setStep(1)} className="text-[10px] font-black text-slate-400 hover:text-orange-600 uppercase tracking-widest transition-colors flex items-center gap-1">
                                            <Settings size={12} /> Settings
                                        </button>
                                        <div className="w-[1px] h-3 bg-slate-200" />
                                        <button onClick={() => setStep(2)} className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest">← Edit</button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-5 bg-slate-50 rounded-2xl space-y-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Publishing Identity</p>
                                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100">
                                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200">
                                                {(redditStatus.accounts || []).find(a => a.username === selectedAccount)?.icon ? (
                                                    <img src={(redditStatus.accounts || []).find(a => a.username === selectedAccount)?.icon} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-orange-600 flex items-center justify-center text-white font-black">R</div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <select
                                                    value={selectedAccount}
                                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                                    className="w-full bg-transparent border-none text-sm font-bold text-slate-900 focus:outline-none"
                                                >
                                                    {(redditStatus.accounts || []).length > 0 ? (
                                                        (redditStatus.accounts || []).map(acc => (
                                                            <option key={acc.username} value={acc.username}>u/{acc.username}</option>
                                                        ))
                                                    ) : (
                                                        <option value="">No accounts connected</option>
                                                    )}
                                                </select>
                                                {(redditStatus.accounts || []).length === 0 && <p className="text-[10px] text-red-500 font-bold mt-1">Please link an account in settings</p>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-slate-50 rounded-2xl space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Posting to</p>
                                        <p className="font-extrabold text-slate-900 text-lg">r/{postData.subreddit}</p>
                                    </div>
                                    <div className="p-5 bg-slate-50 rounded-2xl space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Headline</p>
                                        <p className="font-bold text-slate-900">{postData.title}</p>
                                    </div>
                                    {postData.imageUrl && (
                                        <img src={postData.imageUrl} alt="Post visual" className="w-full rounded-2xl" />
                                    )}
                                    <div className="p-5 bg-slate-50 rounded-2xl space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Content Preview</p>
                                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-6">{postData.content}</p>
                                    </div>
                                </div>


                                <button
                                    onClick={handlePost}
                                    disabled={isPosting}
                                    className="w-full py-6 bg-orange-600 text-white rounded-[2.5rem] font-black hover:bg-orange-500 transition-all shadow-2xl shadow-orange-200 flex items-center justify-center gap-3 text-lg group"
                                >
                                    {isPosting
                                        ? <><RefreshCw className="animate-spin" size={24} /> Publishing...</>
                                        : <><Send size={24} className="group-hover:translate-x-1 transition-transform" /> PUBLISH TO REDDIT</>
                                    }
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right: Live Preview */}
                    <div className="lg:col-span-5">
                        <div className="sticky top-10 space-y-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reddit Live Preview</p>

                            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl transition-shadow">
                                <div className="p-8 space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-black text-sm">
                                            {postData.subreddit ? postData.subreddit[0].toUpperCase() : 'R'}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900">r/{postData.subreddit || 'subreddit'}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Posted by u/you • just now</p>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                                        {postData.title || 'Your viral headline will appear here...'}
                                    </h3>

                                    {/* Image in preview with skeleton */}
                                    {isGeneratingImage && (
                                        <div className="w-full h-36 bg-gradient-to-br from-orange-50 via-slate-50 to-orange-50 rounded-2xl animate-pulse flex items-center justify-center">
                                            <Sparkles size={20} className="text-orange-300 animate-pulse" />
                                        </div>
                                    )}

                                    {postData.imageUrl && !isGeneratingImage && (
                                        <div className="relative rounded-2xl overflow-hidden">
                                            {!imageLoaded && (
                                                <div className="absolute inset-0 bg-slate-100 animate-pulse rounded-2xl" />
                                            )}
                                            <img
                                                src={postData.imageUrl}
                                                alt="Post"
                                                onLoad={() => setImageLoaded(true)}
                                                className={`w-full rounded-2xl transition-all duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                            />
                                        </div>
                                    )}

                                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-5 font-medium">
                                        {postData.content || 'Your thread body will appear here once generated...'}
                                    </p>

                                    <div className="flex items-center gap-5 border-t border-slate-100 pt-4">
                                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                            <span>👍</span> 1.2k
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                            <span>💬</span> 84 comments
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                            <span>📩</span> Share
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tone Badge */}
                            {currentTone && (
                                <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Tone Strategy</p>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${toneColorMap[currentTone.color]}`}>
                                            <currentTone.icon size={18} />
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-slate-900">{currentTone.label}</p>
                                            <p className="text-xs text-slate-400 font-medium">{currentTone.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >
            {/* Daily Limit Modal */}
            {showDailyLimitModal && (
                <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-['Outfit']">
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50 to-white -z-10" />

                        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-inner border border-blue-200">
                            <Clock size={40} className="fill-current" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900 leading-tight">Daily Limit Reached! 🕒</h3>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                You've reached your allowed quota of <span className="text-orange-600 font-bold">
                                    {(() => {
                                        const plan = plans.find(p => (p.name || '').toLowerCase() === (user?.plan || '').toLowerCase() || (p.id || '').toLowerCase() === (user?.plan || '').toLowerCase());
                                        const planLimit = user?.billingCycle === 'yearly' ? plan?.dailyLimitYearly : plan?.dailyLimitMonthly;
                                        return (Number(user?.customDailyLimit) > 0) ? user?.customDailyLimit : (planLimit || 0);
                                    })()} PTS
                                </span> for today. Your limit resets every 24 hours.
                            </p>
                        </div>

                        <div className="space-y-3 pt-2">
                            <Link
                                to="/support"
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
                            >
                                Contact Support <MessageSquare size={16} />
                            </Link>
                            <Link
                                to="/pricing"
                                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black shadow-xl shadow-orange-100 hover:bg-orange-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
                            >
                                Upgrade Plan <Crown size={18} />
                            </Link>
                            <button
                                onClick={() => setShowDailyLimitModal(false)}
                                className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors text-xs uppercase tracking-widest"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
