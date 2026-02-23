import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Zap, Bot, BarChart, ArrowRight, Loader2, AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [errorReason, setErrorReason] = useState<string | null>(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isMfaRequired, setIsMfaRequired] = useState(false);
    const [mfaCode, setMfaCode] = useState('');
    const [isMfaLoading, setIsMfaLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state?.isBlocked) {
            setError(location.state.message);
            setErrorReason(location.state.reason);
            setIsBlocked(true);
        } else {
            const params = new URLSearchParams(location.search);
            const queryError = params.get('error');
            if (queryError === 'suspended' || queryError === 'banned') {
                setError(`Your account has been ${queryError}.`);
                setErrorReason('Contact support for details.');
                setIsBlocked(true);
                // Clean up the URL
                window.history.replaceState({}, document.title, '/login');
            }
        }
    }, [location]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setErrorReason(null);
        setIsBlocked(false);
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Login failed');
                setErrorReason(data.reason || null);
                setIsBlocked(data.error && (data.error.toLowerCase().includes('banned') || data.error.toLowerCase().includes('suspended')));
                return;
            }

            if (data.requires2fa) {
                setIsMfaRequired(true);
                return;
            }

            login(data.token, data.user);

            // Redirect based on role
            if (data.user?.role?.toLowerCase() === 'admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        let interval: any;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleResend2FA = async () => {
        if (resendTimer > 0) return;
        setError(null);
        try {
            const response = await fetch('/api/auth/resend-2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (response.ok) {
                setResendTimer(60); // 1 minute cooldown
            } else {
                setError(data.error || 'Failed to resend code');
            }
        } catch (err) {
            setError('Failed to resend code');
        }
    };

    const handleVerifyMfa = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsMfaLoading(true);

        try {
            const response = await fetch('/api/auth/verify-2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: mfaCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Verification failed');
                return;
            }

            login(data.token, data.user);
            navigate(data.user?.role?.toLowerCase() === 'admin' ? '/admin' : '/dashboard');
        } catch (err: any) {
            setError(err.message || 'Verification failed');
        } finally {
            setIsMfaLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-['Outfit'] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements similar to Landing Page */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-200/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 -z-10 animate-pulse-slow"></div>
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-blue-200/30 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 -z-10 animate-pulse-slow delay-700"></div>

            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">

                {/* Left Side - Value Prop (Light Theme) */}
                <div className="w-full md:w-5/12 bg-slate-50 p-10 flex flex-col justify-between relative overflow-hidden">
                    {/* Background Gradients */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-100 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -ml-16 -mb-16"></div>

                    <div className="relative z-10">
                        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors font-bold mb-8 group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            Back to Home
                        </Link>

                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 bg-orange-100 px-3 py-1 rounded-full w-fit">
                                <Zap size={16} className="text-orange-600 fill-orange-600" />
                                <span className="text-orange-700 font-bold text-xs uppercase tracking-wider">Ai Power</span>
                            </div>

                            <h1 className="text-4xl font-extrabold text-slate-900 leading-[1.1]">
                                Your <span className="text-orange-600">AI Agent</span> is waiting.
                            </h1>

                            <div className="space-y-4 pt-2">
                                <div className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 flex-shrink-0">
                                        <Bot size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">AI Reply Agent</h3>
                                        <p className="text-slate-500 text-xs leading-relaxed mt-1">Generates context-aware, helpful replies that subtly mention your product.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 flex-shrink-0">
                                        <BarChart size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">Growth Analytics</h3>
                                        <p className="text-slate-500 text-xs leading-relaxed mt-1">Track karma, engagement, and click-through rates in real-time.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 pt-8 text-slate-400 text-xs font-medium">
                        © 2026 RedditGo AI.
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-7/12 bg-white p-10 flex flex-col justify-center">
                    <div className="max-w-sm mx-auto w-full space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-extrabold text-slate-900">
                                {isMfaRequired ? 'Enter Verification Code' : 'Sign in to your account'}
                            </h2>
                            <p className="text-slate-500 text-base">
                                {isMfaRequired ? `We've sent a 6-digit code to your email.` : 'Check on your agent and growth metrics.'}
                            </p>
                        </div>

                        {error && (
                            <div className={`p-4 rounded-2xl border font-medium ${isBlocked ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-50 text-red-600 border-red-100'} animate-in fade-in slide-in-from-top-2 duration-300`}>
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                                    <div className="space-y-1">
                                        <p className="font-extrabold">{error}</p>
                                        {errorReason && (
                                            <p className="text-xs opacity-80 bg-red-100/50 p-2 rounded-lg mt-2 border border-red-200/50">
                                                <span className="font-black uppercase tracking-widest text-[10px]">Reason:</span> {errorReason}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isMfaRequired ? (
                            <form className="space-y-5" onSubmit={handleSubmit}>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700" htmlFor="email">Email address</label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                        placeholder="name@company.com"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-slate-700" htmlFor="password">Password</label>
                                        <Link to="/forgot-password" className="text-sm font-bold text-orange-600 hover:text-orange-700">Forgot password?</Link>
                                    </div>
                                    <input
                                        type="password"
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Sign In <ArrowRight size={20} /></>}
                                </button>
                            </form>
                        ) : (
                            <form className="space-y-5" onSubmit={handleVerifyMfa}>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700" htmlFor="mfaCode">Verification Code</label>
                                    <input
                                        type="text"
                                        id="mfaCode"
                                        value={mfaCode}
                                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-black text-2xl text-center tracking-[10px] text-slate-900 placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-sm placeholder:font-medium"
                                        placeholder="Enter 6-digit code"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isMfaLoading}
                                    className="w-full py-3.5 bg-orange-600 text-white rounded-xl font-bold text-lg hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isMfaLoading ? <Loader2 className="animate-spin" size={20} /> : <>Verify & Login <Check size={20} /></>}
                                </button>

                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={handleResend2FA}
                                        disabled={resendTimer > 0}
                                        className="text-orange-600 font-bold text-sm hover:text-orange-700 disabled:text-slate-400 transition-colors"
                                    >
                                        {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Didn't receive code? Resend"}
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsMfaRequired(false)}
                                    className="w-full py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors"
                                >
                                    Go back to Login
                                </button>
                            </form>
                        )}

                        <div className="text-center">
                            <p className="text-slate-500 font-medium text-sm">
                                Don't have an account? <Link to="/signup" className="text-orange-600 font-bold hover:text-orange-700">Sign Up</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
