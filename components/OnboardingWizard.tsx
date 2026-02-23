import React, { useState } from 'react';
import {
    Zap,
    Globe,
    Rocket,
    ChevronRight,
    ChevronLeft,
    Check,
    Shield,
    Target,
    Sparkles,
    Layout,
    ArrowRight,
    Star,
    BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const OnboardingWizard: React.FC = () => {
    const { user, completeOnboarding, updateUser } = useAuth();
    const [step, setStep] = useState(() => {
        const saved = localStorage.getItem('onboarding_step');
        return saved ? parseInt(saved) : 1;
    });
    const [isLoading, setIsLoading] = useState(false);

    const updateStep = (newStep: number) => {
        setStep(newStep);
        localStorage.setItem('onboarding_step', newStep.toString());
    };

    // Wizard State
    const [isRedditLinked, setIsRedditLinked] = useState(false);
    const [showSkipWarning, setShowSkipWarning] = useState(false);

    // Brand Settings Data
    const [brandData, setBrandData] = useState({
        brandName: '',
        website: '',
        description: '',
        targetAudience: '',
        problem: '',
        visualIdentity: '',
        primaryColor: '#EA580C',
        secondaryColor: '#1E293B',
        brandTone: 'professional',
        customTone: ''
    });

    const totalSteps = 6;

    const handleNext = () => {
        if (step < totalSteps) updateStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) updateStep(step - 1);
    };

    const handleSaveBrand = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/user/brand-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id, ...brandData })
            });

            if (res.ok) {
                const data = await res.json();
                // Sync brand data and potential credits to local context
                const updates: any = {};
                if (data.brandProfile) updates.brandProfile = data.brandProfile;
                if (data.credits) updates.credits = data.credits;

                if (Object.keys(updates).length > 0) {
                    updateUser(updates);
                }
            }
            handleNext();
        } catch (e) {
            alert("Failed to save brand profile");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinish = async () => {
        setIsLoading(true);
        try {
            // Actual API call first to get credits
            const res = await fetch('/api/user/complete-onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id })
            });

            if (res.ok) {
                const data = await res.json();
                completeOnboarding(data.credits);
                localStorage.removeItem('onboarding_step');
            } else {
                // Fallback if API fails
                completeOnboarding();
            }
        } catch (e) {
            console.error("API failed, but state updated locally:", e);
            completeOnboarding();
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnectReddit = async () => {
        try {
            const res = await fetch('/api/auth/reddit/url');
            const { url } = await res.json();
            window.location.href = url;
        } catch (e) {
            alert("Failed to get Reddit auth URL");
        }
    };

    if (user?.hasCompletedOnboarding) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center md:p-6 animate-in fade-in duration-500 font-['Outfit']">
            <div className="bg-white w-full h-[100dvh] md:h-auto md:max-w-3xl md:rounded-[3.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col md:flex-row max-h-[100dvh] md:max-h-[600px] border border-white/20">

                {/* Sidebar Info Section (Visual Branding) */}
                <div className="w-full md:w-[280px] bg-slate-900 p-4 md:py-8 md:px-7 flex flex-col justify-between relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/20 rounded-full blur-[80px] -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/20 rounded-full blur-[60px] -ml-24 -mb-24" />

                    <div className="relative z-10">
                        {/* Branding Header */}
                        <div className="flex items-center justify-between md:block mb-4 md:mb-8">
                            <div className="flex items-center gap-2 md:gap-3">
                                {step > 1 && (
                                    <button
                                        onClick={handleBack}
                                        className="md:hidden w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg text-white"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                )}
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-600 rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-900/20">
                                    <Zap fill="currentColor" size={16} className="md:w-[20px]" />
                                </div>
                                <h2 className="text-lg md:text-xl font-black tracking-tight text-white uppercase">redditgo</h2>
                            </div>

                            {/* Mobile Step Counter */}
                            <div className="md:hidden px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/10">
                                Step {step}/{totalSteps}
                            </div>
                        </div>

                        {/* Sidebar Content - Hidden on mobile, shown on desktop */}
                        <div className="hidden md:block space-y-6">
                            <div className="space-y-2">
                                <p className="text-orange-500 font-black text-xs uppercase tracking-widest">Onboarding</p>
                                <h1 className="text-3xl font-black text-white leading-tight">Setting up your engine.</h1>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { s: 1, label: 'Welcome' },
                                    { s: 2, label: 'Identity' },
                                    { s: 3, label: 'Strategy' },
                                    { s: 4, label: 'Personality' },
                                    { s: 5, label: 'Connectivity' },
                                    { s: 6, label: 'Launch' }
                                ].map((item) => (
                                    <button
                                        key={item.s}
                                        onClick={() => updateStep(item.s)}
                                        className={`flex items-center gap-4 group w-full text-left transition-all cursor-pointer`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${step >= item.s ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-700 text-slate-500'} ${item.s === step ? 'ring-4 ring-orange-500/20 scale-110' : ''}`}>
                                            {step > item.s ? <Check size={14} strokeWidth={4} /> : <span className="text-xs font-black">{item.s}</span>}
                                        </div>
                                        <span className={`text-sm font-bold transition-all ${step >= item.s ? 'text-white' : 'text-slate-500'} ${item.s === step ? 'text-orange-400' : ''}`}>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Mobile Progress Bar (Horizontal) */}
                        <div className="md:hidden w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                            <div
                                className="h-full bg-orange-600 transition-all duration-500"
                                style={{ width: `${(step / totalSteps) * 100}%` }}
                            />
                        </div>
                    </div>

                    <div className="hidden md:flex relative z-10 items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                            <Star size={18} />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                            Join 5,000+ brands growing organically on Reddit.
                        </p>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 bg-white flex flex-col relative min-w-0 min-h-0">
                    <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar min-h-0">

                        {/* Step 1: Welcome */}
                        {step === 1 && (
                            <div className="space-y-5 md:space-y-6 animate-in slide-in-from-bottom-8 duration-700">
                                <div className="space-y-2 md:space-y-3 text-center md:text-left">
                                    <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
                                        Hello, <span className="text-orange-600">{user?.name?.split(' ')[0]}</span>.
                                    </h2>
                                    <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed max-w-md mx-auto md:mx-0">
                                        We're excited to help you automate your Reddit marketing. Let's get the basics sorted in under 2 minutes.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="p-4 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-5 group hover:border-orange-200 transition-all">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-orange-600 shadow-sm group-hover:scale-110 transition-transform shrink-0">
                                            <Sparkles size={24} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-base">Post Agent</p>
                                            <p className="text-xs text-slate-400 font-medium font-['Outfit']">Create engaging Reddit posts that drive massive traffic.</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-5 group hover:border-orange-200 transition-all">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform shrink-0">
                                            <Target size={24} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-base">Comment Agent</p>
                                            <p className="text-xs text-slate-400 font-medium font-['Outfit']">Automate authentic discussions in relevant communities.</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-5 group hover:border-orange-200 transition-all">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm group-hover:scale-110 transition-transform shrink-0">
                                            <BarChart3 size={24} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-base">Analytics & Tracking</p>
                                            <p className="text-xs text-slate-400 font-medium font-['Outfit']">Monitor your growth and conversion rates in real-time.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Identity */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in slide-in-from-right-8 duration-700">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Identity</h2>
                                    <p className="text-slate-500 text-sm font-medium">Basic info to identify your brand.</p>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Brand Name</label>
                                            <input
                                                type="text"
                                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:outline-none transition-all font-bold text-sm"
                                                placeholder="e.g. Marketation"
                                                value={brandData.brandName}
                                                onChange={(e) => setBrandData({ ...brandData, brandName: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Website URL</label>
                                            <input
                                                type="text"
                                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:outline-none transition-all font-bold text-sm"
                                                placeholder="https://example.com"
                                                value={brandData.website}
                                                onChange={(e) => setBrandData({ ...brandData, website: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Brand Description</label>
                                        <textarea
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:outline-none transition-all font-medium h-24 resize-none text-sm shadow-inner"
                                            placeholder="What does your company actually do?"
                                            value={brandData.description}
                                            onChange={(e) => setBrandData({ ...brandData, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Strategy */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in slide-in-from-right-8 duration-700">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Strategy</h2>
                                    <p className="text-slate-500 text-sm font-medium">Who you serve and what pains you solve.</p>
                                </div>

                                <div className="space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Target Audience</label>
                                        <input
                                            type="text"
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:outline-none transition-all font-bold text-sm"
                                            placeholder="e.g. SaaS Founders, Marketing Managers"
                                            value={brandData.targetAudience}
                                            onChange={(e) => setBrandData({ ...brandData, targetAudience: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Main Problem You Solve</label>
                                        <textarea
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:outline-none transition-all font-medium h-24 resize-none text-sm shadow-inner"
                                            placeholder="What specific problem are you solving for them?"
                                            value={brandData.problem}
                                            onChange={(e) => setBrandData({ ...brandData, problem: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Personality */}
                        {step === 4 && (
                            <div className="space-y-6 animate-in slide-in-from-right-8 duration-700">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Personality</h2>
                                    <p className="text-slate-500 text-sm font-medium">How the AI should sound and look.</p>
                                </div>

                                <div className="space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Visual Identity / Vibe</label>
                                        <input
                                            type="text"
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:outline-none transition-all font-bold text-sm"
                                            placeholder="e.g. Modern, Minimalist, Dark Mode"
                                            value={brandData.visualIdentity}
                                            onChange={(e) => setBrandData({ ...brandData, visualIdentity: e.target.value })}
                                        />
                                    </div>

                                    {/* Brand Colors */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Primary Color</label>
                                            <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-2xl">
                                                <input
                                                    type="color"
                                                    value={brandData.primaryColor}
                                                    onChange={(e) => setBrandData({ ...brandData, primaryColor: e.target.value })}
                                                    className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white shadow-sm shrink-0"
                                                />
                                                <input
                                                    type="text"
                                                    value={brandData.primaryColor}
                                                    onChange={(e) => setBrandData({ ...brandData, primaryColor: e.target.value })}
                                                    className="w-full bg-transparent border-none focus:ring-0 font-mono text-xs font-bold text-slate-600 uppercase"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Secondary Color</label>
                                            <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-2xl">
                                                <input
                                                    type="color"
                                                    value={brandData.secondaryColor}
                                                    onChange={(e) => setBrandData({ ...brandData, secondaryColor: e.target.value })}
                                                    className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white shadow-sm shrink-0"
                                                />
                                                <input
                                                    type="text"
                                                    value={brandData.secondaryColor}
                                                    onChange={(e) => setBrandData({ ...brandData, secondaryColor: e.target.value })}
                                                    className="w-full bg-transparent border-none focus:ring-0 font-mono text-xs font-bold text-slate-600 uppercase"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Default Brand Tone</label>
                                        <select
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
                                            value={brandData.brandTone}
                                            onChange={(e) => setBrandData({ ...brandData, brandTone: e.target.value })}
                                        >
                                            <option value="professional">💼 Professional & Expert</option>
                                            <option value="friendly">😊 Friendly & Casual</option>
                                            <option value="bold">⚡ Bold & Direct</option>
                                            <option value="educational">📚 Educational & Helpful</option>
                                            <option value="custom">✏️ Custom Tone</option>
                                        </select>
                                    </div>

                                    {/* Custom Tone Textarea */}
                                    {brandData.brandTone === 'custom' && (
                                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Describe Your Custom Tone</label>
                                            <textarea
                                                className="w-full p-4 bg-slate-50 border border-orange-200 rounded-2xl focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:outline-none transition-all font-medium h-24 resize-none text-sm shadow-inner"
                                                placeholder="Describe your brand voice..."
                                                value={brandData.customTone}
                                                onChange={(e) => setBrandData({ ...brandData, customTone: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 5: Reddit Link */}
                        {step === 5 && (
                            <div className="space-y-8 animate-in slide-in-from-right-8 duration-700 flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-orange-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-orange-200 rotate-12 ring-4 ring-orange-50">
                                    <Globe size={36} />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sync Reddit</h2>
                                    <p className="text-slate-500 text-sm font-medium max-w-md mx-auto leading-relaxed">
                                        We need your permission to discover relevant threads and post your AI-generated replies.
                                    </p>
                                </div>
                                <button
                                    onClick={handleConnectReddit}
                                    className="w-full max-w-sm py-4 bg-[#FF4500] text-white rounded-[1.5rem] font-black shadow-[0_16px_32px_-8px_rgba(255,69,0,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group text-sm"
                                >
                                    <Globe size={20} className="group-hover:rotate-12 transition-transform" />
                                    Link Reddit Account
                                </button>
                                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                                    <Shield size={14} className="text-green-500" />
                                    Secure & Privacy-Focused
                                </div>
                            </div>
                        )}

                        {/* Step 6: Success */}
                        {step === 6 && (
                            <div className="space-y-8 animate-in zoom-in-95 duration-700 flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white ring-4 ring-green-50 mb-4 shadow-xl shadow-green-100">
                                    <Check size={40} strokeWidth={4} />
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Launch Ready.</h2>
                                    <p className="text-slate-500 text-base font-medium max-w-md mx-auto leading-relaxed">
                                        Great job! Your profile is set up. Here's a quick summary of your engine status:
                                    </p>
                                </div>
                                <div className="w-full max-w-sm space-y-3">
                                    <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                                                <Target size={16} />
                                            </div>
                                            <span className="font-bold text-slate-900 text-sm">Brand Profile</span>
                                        </div>
                                        <Check className="text-green-500" size={18} strokeWidth={3} />
                                    </div>
                                    <div className={`p-4 rounded-2xl flex items-center justify-between border transition-all ${isRedditLinked ? 'bg-slate-50 border-slate-100' : 'bg-orange-50 border-orange-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isRedditLinked ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                <Globe size={16} />
                                            </div>
                                            <span className="font-bold text-slate-900 text-sm">Reddit Account</span>
                                        </div>
                                        {isRedditLinked ? (
                                            <Check className="text-green-500" size={18} strokeWidth={3} />
                                        ) : (
                                            <button
                                                onClick={() => updateStep(5)}
                                                className="text-[10px] font-black text-orange-600 uppercase underline tracking-widest hover:text-orange-700"
                                            >
                                                Link Now
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-3xl text-white shadow-xl shadow-orange-200 transform hover:scale-[1.02] transition-transform border border-orange-400 relative overflow-hidden w-full max-w-sm cursor-default">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 animate-pulse-slow" />
                                    <div className="relative z-10 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner border border-white/10">
                                                <Zap size={24} fill="#fbbf24" className="text-yellow-300 animate-pulse" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-black text-2xl leading-none tracking-tight">100 Credits</p>
                                                <p className="text-orange-100 text-[10px] font-black uppercase tracking-widest mt-1.5 opacity-90">Setup Bonus Unlocked</p>
                                            </div>
                                        </div>
                                        <div className="bg-white text-orange-600 px-3 py-1.5 rounded-full text-[10px] font-black shadow-lg tracking-wider uppercase">
                                            Added
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Skip Warning Overlay (within content) */}
                        {showSkipWarning && (
                            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-8 text-center animate-in fade-in zoom-in-95">
                                <div className="space-y-6 max-w-xs">
                                    <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                                        <Shield size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black text-slate-900">Are you sure?</h3>
                                        <p className="text-sm text-slate-500 font-medium">
                                            Without linking Reddit, you won't be able to use the AI agents to post or reply.
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => setShowSkipWarning(false)}
                                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                                        >
                                            Go Back & Link
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowSkipWarning(false);
                                                handleNext();
                                            }}
                                            className="w-full py-3 text-slate-400 font-bold text-sm hover:text-slate-900 transition-all"
                                        >
                                            Skip anyway
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation Footer */}
                    <div className="p-4 md:p-12 flex items-center justify-between bg-white shrink-0 border-t border-slate-100">
                        <div className="flex items-center gap-4">
                            {step > 1 && (
                                <button
                                    onClick={handleBack}
                                    className="hidden md:flex items-center gap-2 text-slate-400 font-bold hover:text-slate-900 transition-colors py-2 px-3 text-sm group"
                                >
                                    <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                                    Back
                                </button>
                            )}

                            {step === 1 && (
                                <button
                                    onClick={handleFinish}
                                    className="text-slate-300 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:text-slate-900 transition-colors py-2 px-3 hover:scale-105 transition-all"
                                >
                                    Skip for now
                                </button>
                            )}

                            {/* Mobile Skip for now when step > 1 & < 4 */}
                            {step > 1 && step < 4 && (
                                <button
                                    onClick={() => step === 3 ? setShowSkipWarning(true) : handleFinish()}
                                    className="md:hidden text-slate-300 font-black text-[10px] uppercase tracking-[0.2em] hover:text-slate-900 transition-colors py-2 px-3"
                                >
                                    Skip
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            {step < totalSteps ? (
                                <button
                                    onClick={step === 4 ? handleSaveBrand : handleNext}
                                    disabled={isLoading}
                                    className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-xl shadow-slate-200 hover:bg-orange-600 hover:shadow-orange-200 transition-all active:scale-95 flex items-center gap-2 text-sm"
                                >
                                    {isLoading ? 'Saving...' : 'Continue'}
                                    <ArrowRight size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleFinish}
                                    disabled={isLoading}
                                    className="px-10 py-5 bg-orange-600 text-white rounded-[1.8rem] font-black shadow-[0_20px_40px_-10px_rgba(234,88,12,0.4)] hover:bg-orange-700 hover:scale-105 transition-all active:scale-95 flex items-center gap-3 group"
                                >
                                    <Rocket size={22} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    Launch Dashboard
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
