
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Flame,
  MessageSquarePlus,
  Clock,
  ArrowRight,
  RefreshCw,
  Send,
  Sparkles,
  AlertCircle,
  ThumbsUp,
  Crown,
  Type,
  Smile,
  ShieldCheck,
  Copy,
  ChevronDown,
  Target,
  Hash,
  Database,
  Zap,
  MoreVertical,
  Globe,
  ChevronRight,
  Quote,
  Wand2,
  Check,
  X,
  Building2,
  Trash2,
  Link as LinkIcon,
  MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { RedditPost, GeneratedReply } from '../types';
import { generateRedditReply, fetchBrandProfile, BrandProfile } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import CreditsBanner from '../components/CreditsBanner';

const PROGRESS_STEPS = [
  { message: 'Scanning the post context...', icon: '🔍', duration: 1000 },
  { message: 'Crafting your reply strategy...', icon: '🧠', duration: 1400 },
  { message: 'Writing the perfect comment...', icon: '✍️', duration: 1800 },
  { message: 'Optimizing for engagement...', icon: '🚀', duration: 1200 },
  { message: 'Finalizing your reply...', icon: '✨', duration: 800 },
];

const MOCK_POSTS: RedditPost[] = [
  {
    id: '1',
    title: 'Looking for a tool to automate my Reddit outreach',
    author: 'startup_founder_99',
    subreddit: 'saas',
    ups: 154,
    num_comments: 42,
    selftext: 'I spend 4 hours a day on Reddit trying to find leads. Is there any AI tool that can help me find relevant posts and draft replies?',
    url: 'https://reddit.com/r/saas/1',
    created_utc: Date.now() / 1000 - 3600
  },
  {
    id: '2',
    title: 'How do you handle growth marketing on a budget?',
    author: 'indie_maker_x',
    subreddit: 'marketing',
    ups: 89,
    num_comments: 15,
    selftext: 'I have $0 for ads. Currently trying to use community engagement but it is slow.',
    url: 'https://reddit.com/r/marketing/2',
    created_utc: Date.now() / 1000 - 7200
  }
];

export const Comments: React.FC = () => {
  const { user, updateUser, syncUser } = useAuth();
  const replyCardRef = useRef<HTMLDivElement>(null);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [targetSubreddit, setTargetSubreddit] = useState('saas');
  const [searchKeywords, setSearchKeywords] = useState('');
  const [generatedReply, setGeneratedReply] = useState<GeneratedReply | null>(null);
  const [editedComment, setEditedComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [progressStep, setProgressStep] = useState(0);
  const [redditStatus, setRedditStatus] = useState<{ connected: boolean; accounts: any[] }>({ connected: false, accounts: [] });
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  // Wizard & Modal State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [costs, setCosts] = useState({ comment: 1, post: 2, image: 5 });
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [regenType, setRegenType] = useState<'full' | 'refine'>('full');
  const [refinePrompt, setRefinePrompt] = useState('');
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);

  const currentPlan = plans.find(p => (p.name || '').toLowerCase() === (user?.plan || '').toLowerCase() || (p.id || '').toLowerCase() === (user?.plan || '').toLowerCase());
  const canTrack = user?.role === 'admin' || (currentPlan && currentPlan.allowTracking === true);

  const [wizardData, setWizardData] = useState({
    tone: 'helpful_peer',
    goal: 'help',
    productMention: '',
    productLink: '',
    description: '',
    targetAudience: '',
    problemSolved: ''
  });
  const [showBrandOverride, setShowBrandOverride] = useState(false);
  const [brandProfile, setBrandProfile] = useState<BrandProfile>({});
  const [language, setLanguage] = useState('English');
  const [activeTone, setActiveTone] = useState<'helpful_peer' | 'thought_leader' | 'skeptic' | 'storyteller'>('helpful_peer');
  const [includeBrandName, setIncludeBrandName] = useState(true);
  const [includeLink, setIncludeLink] = useState(true);
  const [useTracking, setUseTracking] = useState(false);

  useEffect(() => {
    syncUser(); // Refresh user data (credits, daily limits) on mount

    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.creditCosts) setCosts(data.creditCosts);
      })
      .catch(console.error);

    fetch('/api/plans')
      .then(res => res.json())
      .then(data => setPlans(data))
      .catch(console.error);
  }, []);

  // Load reddit status on mount/user change
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/user/reddit/status?userId=${user.id}`)
        .then(res => res.json())
        .then(status => {
          setRedditStatus(status);
          if (status.accounts?.length > 0 && !selectedAccount) {
            setSelectedAccount(status.accounts[0].username);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  // Check for draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('redditgo_comment_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.selectedPost || draft.generatedReply || draft.editedComment) {
          setShowDraftBanner(true);
        }
      } catch (e) {
        localStorage.removeItem('redditgo_comment_draft');
      }
    }
    setIsInitialCheckDone(true);
  }, []);

  // Auto-save effect
  useEffect(() => {
    // CRITICAL: Skip while initial check is happening or while banner is visible
    const hasData = !!(generatedReply || editedComment || (selectedPost && wizardData.description));

    if (hasData) {
      const draft = {
        selectedPost,
        generatedReply,
        editedComment,
        wizardData,
        selectedAccount,
        brandProfile,
        activeTone,
        language,
        includeBrandName,
        includeLink,
        useTracking
      };
      localStorage.setItem('redditgo_comment_draft', JSON.stringify(draft));
    } else if (isInitialCheckDone && !showDraftBanner) {
      // ONLY remove if it's explicitly empty and we're not currently showing a draft banner
      localStorage.removeItem('redditgo_comment_draft');
    }
  }, [selectedPost, generatedReply, editedComment, wizardData, selectedAccount, brandProfile, activeTone, language, showDraftBanner, isInitialCheckDone, includeBrandName, includeLink, useTracking]);

  const handleResumeDraft = () => {
    setShowDraftBanner(false);
    const savedDraft = localStorage.getItem('redditgo_comment_draft');
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      setSelectedPost(draft.selectedPost);
      setGeneratedReply(draft.generatedReply);
      setEditedComment(draft.editedComment || draft.generatedReply?.comment || '');
      setWizardData(draft.wizardData);
      setSelectedAccount(draft.selectedAccount);
      if (draft.brandProfile) setBrandProfile(draft.brandProfile);
      setActiveTone(draft.activeTone);
      setLanguage(draft.language || 'English');
      setIncludeBrandName(draft.includeBrandName !== undefined ? draft.includeBrandName : true);
      setIncludeLink(draft.includeLink !== undefined ? draft.includeLink : true);
      setUseTracking(draft.useTracking !== undefined ? draft.useTracking : false);

      // Ensure the drafted post is in the list so it's visible
      if (draft.selectedPost) {
        setPosts(prev => {
          const exists = prev.find(p => p.id === draft.selectedPost.id);
          if (!exists) return [draft.selectedPost, ...prev];
          return prev;
        });
      }

      showToast('Draft restored! 🚀', 'success');
      syncUser(); // Sync usage state after resuming
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('redditgo_comment_draft');
    setSelectedPost(null);
    setGeneratedReply(null);
    setEditedComment('');
    setWizardData({
      tone: 'helpful_peer',
      goal: 'help',
      productMention: '',
      productLink: '',
      description: '',
      targetAudience: '',
      problemSolved: ''
    });
    setShowDraftBanner(false);
    setShowDiscardConfirm(false);
    showToast('Draft discarded.', 'success');
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Cycle progress steps while generating
  useEffect(() => {
    if (!isGenerating) { setProgressStep(0); return; }
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

  const handleGenerate = async (post: RedditPost, customSettings?: any) => {
    const cost = costs.comment;

    // Proactive Daily Limit Pre-check
    if (user && user.role !== 'admin') {
      const plan = plans.find(p => (p.name || '').toLowerCase() === (user.plan || '').toLowerCase() || (p.id || '').toLowerCase() === (user.plan || '').toLowerCase());
      const planLimit = user.billingCycle === 'yearly' ? plan?.dailyLimitYearly : plan?.dailyLimitMonthly;
      const dailyLimit = (Number(user.customDailyLimit) > 0) ? Number(user.customDailyLimit) : (Number(planLimit) || 0);

      if (dailyLimit > 0) {
        const currentUsage = (user.dailyUsagePoints || 0);
        if ((currentUsage + cost) > dailyLimit) {
          setShowDailyLimitModal(true);
          return;
        }
      }
    }

    if ((user?.credits || 0) < cost && user?.role !== 'admin') {
      setShowNoCreditsModal(true);
      return;
    }

    setSelectedPost(post);
    setIsGenerating(true);
    setGeneratedReply(null);
    setIsWizardOpen(false);

    try {
      const tone = customSettings?.tone || wizardData.tone;
      const goal = customSettings?.goal || wizardData.goal;

      const overrideProfile: Partial<BrandProfile> = {
        ...(user?.brandProfile || {}),
        brandName: wizardData.productMention || user?.brandProfile?.brandName || undefined,
        website: wizardData.productLink || user?.brandProfile?.website || undefined,
        description: wizardData.description || user?.brandProfile?.description || undefined,
        targetAudience: wizardData.targetAudience || user?.brandProfile?.targetAudience || undefined,
        problem: wizardData.problemSolved || user?.brandProfile?.problem || undefined
      };

      const context = `Tone: ${tone}, Goal: ${goal}`;
      const reply = await generateRedditReply(post, post.subreddit, tone, context, user?.id, overrideProfile, language, includeBrandName, includeLink, useTracking);

      setGeneratedReply(reply);
      setEditedComment(reply.comment);
      showToast('AI Reply Generated!', 'success');

      if (reply.credits !== undefined) {
        updateUser({
          credits: reply.credits,
          dailyUsagePoints: reply.dailyUsagePoints,
          dailyUsage: reply.dailyUsage
        });
      }

      setTimeout(() => {
        replyCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'OUT_OF_CREDITS') {
        setShowNoCreditsModal(true);
      } else if (err.message === 'DAILY_LIMIT_REACHED') {
        setShowDailyLimitModal(true);
      } else {
        showToast('Generation failed.', 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!selectedPost || !generatedReply) return;

    const cost = costs.comment;

    // Proactive Daily Limit Pre-check (for Refine)
    if (user && user.role !== 'admin') {
      const plan = plans.find(p => (p.name || '').toLowerCase() === (user.plan || '').toLowerCase() || (p.id || '').toLowerCase() === (user.plan || '').toLowerCase());
      const planLimit = user.billingCycle === 'yearly' ? plan?.dailyLimitYearly : plan?.dailyLimitMonthly;
      const dailyLimit = (Number(user.customDailyLimit) > 0) ? Number(user.customDailyLimit) : (Number(planLimit) || 0);

      if (dailyLimit > 0) {
        const currentUsage = (user.dailyUsagePoints || 0);
        if ((currentUsage + cost) > dailyLimit) {
          setShowDailyLimitModal(true);
          return;
        }
      }
    }

    if ((user?.credits || 0) < cost && user?.role !== 'admin') {
      setShowNoCreditsModal(true);
      return;
    }

    setIsGenerating(true);
    try {
      const reply = await generateRedditReply(selectedPost, selectedPost.subreddit, instruction, `Refine this reply: "${editedComment}". Instruction: ${instruction}`, user?.id);
      setGeneratedReply(reply);
      setEditedComment(reply.comment);
      if (reply.credits !== undefined) {
        updateUser({
          credits: reply.credits,
          dailyUsagePoints: reply.dailyUsagePoints,
          dailyUsage: reply.dailyUsage
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'DAILY_LIMIT_REACHED') {
        setShowDailyLimitModal(true);
      } else {
        showToast('Refinement failed.', 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePost = async () => {
    if (!selectedPost || !editedComment || !user?.id) return;

    setIsPosting(true);
    try {
      const response = await fetch('/api/reddit/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          postId: selectedPost.id,
          comment: editedComment,
          postTitle: selectedPost.title,
          postUrl: selectedPost.url,
          postContent: selectedPost.selftext,
          subreddit: selectedPost.subreddit,
          productMention: wizardData.productMention,
          redditUsername: selectedAccount
        })
      });

      if (!response.ok) throw new Error('Failed to post reply');

      showToast('Successfully deployed to Reddit!', 'success');

      // Clear all states after successful deploy
      setGeneratedReply(null);
      setSelectedPost(null);
      setEditedComment('');
      setWizardData({
        tone: 'helpful_peer',
        goal: 'help',
        productMention: '',
        productLink: '',
        description: '',
        targetAudience: '',
        problemSolved: ''
      });
      localStorage.removeItem('redditgo_comment_draft');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const handleRedditAuth = async () => {
    try {
      const response = await fetch('/api/auth/reddit/url');
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      showToast('Auth failed', 'error');
    }
  };

  const fetchPosts = async () => {
    if (!user?.id) return;
    setIsFetching(true);
    try {
      const response = await fetch(`/api/reddit/posts?subreddit=${targetSubreddit}&keywords=${searchKeywords}&userId=${user.id}`);
      if (!response.ok) throw new Error('Fetch failed');
      const data = await response.json();

      // Update posts list, but preserve selectedPost if it's already set (e.g. via Resume Draft)
      setPosts(prev => {
        const merged = [...data];
        if (selectedPost && !data.find(p => p.id === selectedPost.id)) {
          merged.unshift(selectedPost);
        }
        return merged;
      });

      // Avoid default selection if we have a draft pending or already a post selected
      const hasDraft = localStorage.getItem('redditgo_comment_draft');
      if (data.length > 0 && !selectedPost && !hasDraft) {
        setSelectedPost(data[0]);
      }
    } catch (err: any) {
      setPosts(MOCK_POSTS);
      const hasDraft = localStorage.getItem('redditgo_comment_draft');
      if (MOCK_POSTS.length > 0 && !selectedPost && !hasDraft) {
        setSelectedPost(MOCK_POSTS[0]);
      }
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchPosts();
    fetchBrandProfile(user.id).then(p => { if (p?.brandName) setBrandProfile(p); });
    fetch(`/api/user/reddit/status?userId=${user.id}`)
      .then(res => res.json())
      .then(status => {
        setRedditStatus(status);
        if (status.accounts?.length > 0) setSelectedAccount(status.accounts[0].username);
      });
  }, [user]);

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

      {/* Discard Draft Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">Discard Comment Draft?</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                If you discard this, you will need to <span className="text-orange-600 font-bold">re-generate</span> which will cost {costs.comment} points.
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={handleDiscardDraft}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 hover:bg-red-700 transition-all font-['Outfit']"
              >
                YES, DISCARD DRAFT
              </button>
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all font-['Outfit']"
              >
                Keep it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-generate/Refine Confirmation Modal */}
      {showRegenConfirm && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 font-['Outfit']">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-md w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
                  <RefreshCw size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  {regenType === 'full' ? 'Regenerate' : 'Refine'}
                </h3>
              </div>
              <button onClick={() => setShowRegenConfirm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-4">
              <p className="text-slate-500 text-sm font-medium leading-relaxed text-center px-4">
                {regenType === 'full'
                  ? "Brand new version based on original settings."
                  : `Modification: "${refinePrompt}".`
                }
              </p>

              <div className="bg-orange-50 p-4 rounded-2xl flex items-center justify-between">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Confirmation Cost</span>
                <span className="font-black text-orange-600">{costs.comment} PTS</span>
              </div>
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
                  if (regenType === 'full') {
                    handleGenerate(selectedPost!, { tone: activeTone });
                  } else {
                    handleRefine(refinePrompt);
                  }
                }}
                className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
              >
                <Check size={14} /> Confirm & Pay
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
                <span className="text-sm font-black text-slate-900">{costs.comment} PTS</span>
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

      {/* Generating Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-14 max-w-md w-full shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full bg-orange-100 animate-ping opacity-60" />
              <div className="relative w-24 h-24 bg-orange-600 rounded-full flex items-center justify-center text-4xl shadow-2xl shadow-orange-300">
                {PROGRESS_STEPS[progressStep]?.icon}
              </div>
            </div>
            <div className="space-y-3 font-['Outfit']">
              <p className="text-2xl font-extrabold text-slate-900">{PROGRESS_STEPS[progressStep]?.message}</p>
              <p className="text-slate-400 font-medium text-sm">Powered by Redigo AI</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-orange-600 rounded-full transition-all duration-1000"
                style={{ width: `${((progressStep + 1) / PROGRESS_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-10 animate-fade-in font-['Outfit'] pt-4 px-4 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-7 bg-orange-600 rounded-full" />
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Comment Agent</h1>
            </div>
            <p className="text-slate-400 font-medium text-sm pl-4">Find & join relevant Reddit discussions automatically.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center bg-white border border-slate-200 rounded-2xl shadow-sm px-3 flex-1 sm:flex-none">
              <Target size={14} className="text-slate-400" />
              <input
                type="text"
                value={targetSubreddit}
                onChange={(e) => setTargetSubreddit(e.target.value)}
                placeholder="subreddit"
                className="p-2.5 bg-transparent focus:outline-none font-bold text-xs w-24"
              />
              <div className="w-[1px] h-4 bg-slate-200 mx-2" />
              <Hash size={14} className="text-slate-400" />
              <input
                type="text"
                value={searchKeywords}
                onChange={(e) => setSearchKeywords(e.target.value)}
                placeholder="keywords"
                className="p-2.5 bg-transparent focus:outline-none font-bold text-xs w-32"
              />
            </div>
            <button
              onClick={fetchPosts}
              disabled={isFetching}
              className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              Reload Feed
            </button>
          </div>
        </div>

        {/* Draft Banner */}
        {showDraftBanner && (
          <div className="bg-slate-900 rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500 group border border-slate-800">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative z-10 flex items-center gap-5 w-full md:w-auto">
              <div className="w-14 h-14 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center border border-white/5 text-orange-500 group-hover:scale-110 transition-transform duration-500">
                <Clock size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white leading-tight">Unsaved Draft Detected</h3>
                <p className="text-slate-400 text-xs font-medium max-w-md">
                  We saved your previous session automatically. Would you like to continue?
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
                Resume Work <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Credits */}
        <CreditsBanner plan={user?.plan || 'Starter'} credits={user?.credits || 0} />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          {/* Posts List */}
          <div className="xl:col-span-8 space-y-6">
            {posts.map(post => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className={`p-7 rounded-[2.5rem] transition-all duration-500 border-2 relative group overflow-hidden cursor-pointer ${selectedPost?.id === post.id ? 'border-orange-500 bg-orange-50/10 shadow-xl' : 'border-slate-100 bg-white hover:border-slate-200'}`}
              >
                <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest">r/{post.subreddit}</span>
                      <span className="text-[10px] font-bold text-slate-400">u/{post.author}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 leading-snug group-hover:text-orange-600 transition-colors">{post.title}</h3>
                    <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed font-medium">{post.selftext}</p>
                    <div className="flex items-center gap-5">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold"><ThumbsUp size={14} /> {post.ups}</div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold"><MessageSquarePlus size={14} /> {post.num_comments}</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedPost(post); setIsWizardOpen(true); }}
                    className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl text-sm font-black hover:bg-orange-600 transition-all flex flex-col items-center justify-center shadow-lg active:scale-95 group"
                  >
                    <div className="flex items-center gap-2">
                      <Wand2 size={18} />
                      <span>Wizard Reply</span>
                    </div>
                    <span className="text-[9px] text-orange-400 font-black uppercase tracking-[0.2em] mt-0.5 group-hover:text-white transition-colors">{costs.comment} PTS REQUIRED</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Assistant Panel */}
          <div className="xl:col-span-4">
            <div className="sticky top-10 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <h2 className="font-black text-slate-900">Reply Assistant</h2>
                </div>
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest px-2 py-0.5 bg-orange-50 border border-orange-100 rounded-lg">AI-Active</span>
              </div>

              <div className="p-8 flex-1 flex flex-col">
                {!selectedPost ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300">
                      <MessageSquarePlus size={40} />
                    </div>
                    <p className="text-slate-900 font-bold">Select a post to start</p>
                  </div>
                ) : (
                  <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest underline decoration-orange-200">Writing For:</p>
                      <p className="text-sm font-bold text-slate-900 leading-tight line-clamp-2">{selectedPost.title}</p>
                    </div>

                    {!generatedReply && !isGenerating ? (
                      <div className="flex-1 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50 flex flex-col items-center justify-center p-8 text-center space-y-6">
                        <Wand2 size={48} className="text-orange-600" />
                        <div className="space-y-2">
                          <p className="text-lg font-black text-slate-900">Reply Wizard</p>
                          <p className="text-xs text-slate-500 font-medium">Configure tone and goals for the best response quality.</p>
                        </div>
                        <button
                          onClick={() => setIsWizardOpen(true)}
                          className="bg-slate-900 text-white w-full py-4 rounded-2xl font-black hover:bg-orange-600 transition-all shadow-lg text-xs tracking-widest uppercase flex items-center justify-center gap-2 group"
                        >
                          Launch Settings
                          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    ) : (
                      <div ref={replyCardRef} className="space-y-6">
                        {/* Preview */}
                        <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-[10px] font-black">YU</div>
                            <span className="text-[10px] font-black text-slate-900">u/{selectedAccount || 'Profile'}</span>
                            <span className="text-[10px] text-slate-400">• typing...</span>
                          </div>
                          <div className="text-sm text-slate-700 leading-relaxed italic border-l-4 border-orange-200 pl-4">{editedComment}</div>
                        </div>

                        {/* Editor */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Final Polish</label>
                              <button
                                onClick={() => { setGeneratedReply(null); setIsWizardOpen(true); }}
                                className="text-[10px] font-black text-orange-600 hover:text-orange-700 uppercase tracking-widest flex items-center gap-1 transition-colors"
                              >
                                <ChevronRight size={10} className="rotate-180" /> Back to Wizard
                              </button>
                            </div>
                            <button onClick={() => { navigator.clipboard.writeText(editedComment); showToast('Copied!', 'success'); }} className="text-[10px] font-black text-slate-400 hover:text-slate-900 flex items-center gap-1 transition-colors"><Copy size={12} /> Copy</button>
                          </div>
                          <textarea
                            value={editedComment}
                            onChange={(e) => setEditedComment(e.target.value)}
                            className="w-full min-h-[160px] p-5 bg-white border border-slate-200 rounded-[1.75rem] text-sm text-slate-700 font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none shadow-sm"
                          />
                        </div>

                        {/* Quick Refine */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setRegenType('full'); setShowRegenConfirm(true); }}
                            className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:border-orange-200 hover:text-orange-600 transition-all"
                          >
                            Regenerate
                          </button>
                          <button
                            onClick={() => { setRegenType('refine'); setRefinePrompt('Make it shorter and more punchy'); setShowRegenConfirm(true); }}
                            className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:border-orange-200 hover:text-orange-600 transition-all font-['Outfit']"
                          >
                            Make Shorter
                          </button>
                        </div>

                      </div>
                    )}
                    {/* Account Selector & Deploy Button (only if reply generated) */}
                    {(generatedReply || editedComment) && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
                        {/* Account Selector */}
                        <div className="pt-4 border-t border-slate-100 space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                            <ShieldCheck size={12} className="text-orange-600" /> Deploying as
                          </label>
                          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                              {redditStatus.accounts.find(a => a.username === selectedAccount)?.icon ? (
                                <img src={redditStatus.accounts.find(a => a.username === selectedAccount)?.icon} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-orange-600 flex items-center justify-center text-white font-black text-xs">R</div>
                              )}
                            </div>
                            <div className="flex-1">
                              <select
                                value={selectedAccount}
                                onChange={(e) => setSelectedAccount(e.target.value)}
                                className="w-full bg-transparent border-none text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
                              >
                                {redditStatus.accounts.length > 0 ? (
                                  redditStatus.accounts.map(acc => (
                                    <option key={acc.username} value={acc.username}>u/{acc.username}</option>
                                  ))
                                ) : (
                                  <option value="">No accounts linked</option>
                                )}
                              </select>
                              {redditStatus.accounts.length === 0 && <p className="text-[9px] text-red-500 font-bold">Link an account in settings</p>}
                            </div>
                          </div>
                        </div>

                        {/* Deploy Button */}
                        <div className="pt-2">
                          <button
                            onClick={handlePost}
                            disabled={isPosting || !selectedAccount}
                            className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-slate-100 flex items-center justify-center gap-3 disabled:opacity-50 group"
                          >
                            {isPosting ? <RefreshCw className="animate-spin" size={18} /> : (
                              <>
                                <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                Deploy To Reddit
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reply Wizard Overlay */}
      {
        isWizardOpen && selectedPost && (
          <div className="fixed inset-0 z-[1200] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <div className="p-6 md:p-10 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Discussion Wizard</p>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Step {wizardStep} of 2</h3>
                </div>
                <button onClick={() => setIsWizardOpen(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm border border-slate-100">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 md:p-10 space-y-8 overflow-y-auto custom-scrollbar">
                {wizardStep === 1 ? (
                  <div className="space-y-8">
                    {/* Language Selector */}
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
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

                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Engagement Strategy</label>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: 'helpful_peer', label: 'Helpful Peer', desc: 'Friendly Support', icon: Smile },
                          { id: 'thought_leader', label: 'Thought Leader', desc: 'Expert Insight', icon: Crown },
                          { id: 'skeptic', label: 'Smart Skeptic', desc: 'Critical Analysis', icon: Zap },
                          { id: 'storyteller', label: 'Storyteller', desc: 'Personal Narrative', icon: Quote }
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => setWizardData({ ...wizardData, tone: t.id })}
                            className={`p-5 rounded-3xl border-2 text-left transition-all ${wizardData.tone === t.id ? 'border-orange-500 bg-orange-50/20' : 'border-slate-50 bg-white hover:border-slate-200'}`}
                          >
                            <t.icon size={22} className={wizardData.tone === t.id ? 'text-orange-600' : 'text-slate-300'} />
                            <p className="font-black text-slate-900 mt-3 text-sm">{t.label}</p>
                            <p className="text-[10px] text-slate-500 font-bold mt-1 line-clamp-1">{t.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setWizardStep(2)} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center justify-center gap-3">Next Step <ChevronRight size={20} /></button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Response Goal</label>
                      <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                        {['help', 'question', 'feedback', 'pitch'].map(g => (
                          <button
                            key={g}
                            onClick={() => setWizardData({ ...wizardData, goal: g })}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${wizardData.goal === g ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Engagement Context</label>

                      {brandProfile.brandName ? (
                        <div className="rounded-2xl border-2 border-green-100 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-green-50">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 bg-green-600 rounded-xl flex items-center justify-center">
                                <Building2 size={13} className="text-white" />
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-green-700 uppercase tracking-widest">Brand Profile Active</p>
                                <p className="font-extrabold text-slate-900 text-xs">{brandProfile.brandName}</p>
                              </div>
                              <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-lg text-[9px] font-black">
                                <Check size={9} /> Auto-applied
                              </span>
                            </div>
                            <button
                              onClick={() => setShowBrandOverride(v => !v)}
                              className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-orange-600 transition-colors"
                            >
                              <ChevronDown size={12} className={`transition-transform ${showBrandOverride ? 'rotate-180' : ''}`} />
                              {showBrandOverride ? 'Hide' : 'Override'}
                            </button>
                          </div>
                          {showBrandOverride && (
                            <div className="p-4 bg-white border-t border-green-100 space-y-3">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Override for this comment only</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Brand Name</label>
                                  <input
                                    type="text"
                                    value={wizardData.productMention}
                                    onChange={(e) => setWizardData({ ...wizardData, productMention: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 font-bold text-sm"
                                    placeholder={brandProfile.brandName || 'Product Name'}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><LinkIcon size={10} /> Website</label>
                                  <input
                                    type="url"
                                    value={wizardData.productLink}
                                    onChange={(e) => setWizardData({ ...wizardData, productLink: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 font-bold text-sm"
                                    placeholder={brandProfile.website || 'https://...'}
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Product Description</label>
                                <textarea
                                  rows={2}
                                  value={wizardData.description}
                                  onChange={(e) => setWizardData({ ...wizardData, description: e.target.value })}
                                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 font-medium text-sm resize-none"
                                  placeholder={brandProfile.description || 'What does it do?'}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Audience</label>
                                <input
                                  type="text"
                                  value={wizardData.targetAudience}
                                  onChange={(e) => setWizardData({ ...wizardData, targetAudience: e.target.value })}
                                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 font-bold text-sm"
                                  placeholder={brandProfile.targetAudience || 'e.g. SaaS founders'}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Problem it solves</label>
                                <input
                                  type="text"
                                  value={wizardData.problemSolved}
                                  onChange={(e) => setWizardData({ ...wizardData, problemSolved: e.target.value })}
                                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 font-bold text-sm"
                                  placeholder={brandProfile.problem || 'e.g. Difficulty finding leads'}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl border-2 border-orange-100 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-orange-50">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 bg-orange-500 rounded-xl flex items-center justify-center">
                                <Building2 size={13} className="text-white" />
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Quick Brand Context</p>
                                <p className="text-[10px] text-slate-500 font-medium">For better AI personalization</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowBrandOverride(v => !v)}
                              className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-orange-600 transition-colors"
                            >
                              <ChevronDown size={12} className={`transition-transform ${showBrandOverride ? 'rotate-180' : ''}`} />
                              {showBrandOverride ? 'Hide' : 'Fill in'}
                            </button>
                          </div>
                          {showBrandOverride && (
                            <div className="p-4 bg-white border-t border-orange-100 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  value={wizardData.productMention}
                                  onChange={(e) => setWizardData({ ...wizardData, productMention: e.target.value })}
                                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 font-bold text-sm"
                                  placeholder="Product Name"
                                />
                                <input
                                  type="url"
                                  value={wizardData.productLink}
                                  onChange={(e) => setWizardData({ ...wizardData, productLink: e.target.value })}
                                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 font-bold text-sm"
                                  placeholder="Website URL"
                                />
                              </div>
                              <textarea
                                rows={2}
                                value={wizardData.description}
                                onChange={(e) => setWizardData({ ...wizardData, description: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 font-medium text-sm resize-none"
                                placeholder="Product description..."
                              />
                              <input
                                type="text"
                                value={wizardData.targetAudience}
                                onChange={(e) => setWizardData({ ...wizardData, targetAudience: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 font-bold text-sm"
                                placeholder="Target Audience"
                              />
                              <input
                                type="text"
                                value={wizardData.problemSolved}
                                onChange={(e) => setWizardData({ ...wizardData, problemSolved: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-orange-500 font-bold text-sm"
                                placeholder="Problem it solves"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>


                    {/* Toggles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-slate-600 shadow-sm">
                            <Target size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">Include Brand Name</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIncludeBrandName(!includeBrandName)}
                          className={`w-10 h-6 rounded-full transition-all relative ${includeBrandName ? 'bg-slate-900' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${includeBrandName ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-slate-600 shadow-sm">
                            <LinkIcon size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">Include Link</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIncludeLink(!includeLink)}
                          className={`w-10 h-6 rounded-full transition-all relative ${includeLink ? 'bg-slate-900' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${includeLink ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Link Tracking Toggle */}
                      {includeLink && (
                        <div className="flex items-center justify-between p-4 bg-blue-50/30 rounded-2xl border border-blue-100 animate-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${!canTrack ? 'bg-slate-100 text-slate-400' : 'bg-white text-blue-600'}`}>
                              {!canTrack ? <Crown size={14} /> : <Zap size={14} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-900">Track Clicks</p>
                                {!canTrack && <span className="bg-blue-100 text-blue-600 text-[7px] font-black px-1 py-0.5 rounded-md uppercase tracking-tighter">Pro</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => canTrack ? setUseTracking(!useTracking) : window.location.href = '/pricing'}
                            className={`w-10 h-6 rounded-full transition-all relative ${useTracking && canTrack ? 'bg-blue-600' : 'bg-slate-300'}`}
                          >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${useTracking && canTrack ? 'translate-x-4' : 'translate-x-0'} flex items-center justify-center`}>
                              {!canTrack && <AlertCircle size={8} className="text-slate-400" />}
                            </div>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setWizardStep(1)} className="px-8 py-5 bg-slate-50 text-slate-400 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">Back</button>
                      <button
                        onClick={() => handleGenerate(selectedPost!)}
                        className="flex-1 py-5 bg-orange-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all flex flex-col items-center justify-center animate-pulse-slow"
                      >
                        <div className="flex items-center gap-2">
                          <span>Generate Reply</span>
                          <Sparkles size={16} />
                        </div>
                        <span className="text-[9px] text-orange-200 font-black uppercase tracking-[0.2em] mt-0.5">Will cost {costs.comment} PTS</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div >
          </div >
        )
      }
      {/* Daily Limit Modal */}
      {
        showDailyLimitModal && (
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
        )
      }
    </>
  );
};
