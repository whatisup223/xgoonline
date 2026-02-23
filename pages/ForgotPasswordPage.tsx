import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Mail, Lock, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [errorReason, setErrorReason] = useState<string | null>(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError(null);
        setErrorReason(null);
        setIsBlocked(false);
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                const blocked = response.status === 403;
                setError(data.error || 'Failed to process request');
                setErrorReason(data.reason || null);
                setIsBlocked(blocked);
                return;
            }

            setMessage(data.message || 'If an account exists, a reset link has been sent.');
        } catch (err: any) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setIsResending(true);
        setResendStatus(null);
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (response.ok) {
                setResendStatus({ type: 'success', message: 'Email resent successfully!' });
            } else {
                setResendStatus({ type: 'error', message: data.error || 'Failed to resend email.' });
            }
        } catch (err: any) {
            setResendStatus({ type: 'error', message: 'Something went wrong. Please try again.' });
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-['Outfit'] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements similar to Landing Page */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-200/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 -z-10 animate-pulse-slow"></div>
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-slate-200/30 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 -z-10 animate-pulse-slow delay-700"></div>

            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">

                {/* Left Side - Value Prop (Light Theme) */}
                <div className="w-full md:w-5/12 bg-slate-50 p-10 flex flex-col justify-between relative overflow-hidden">
                    {/* Background Gradients */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50/50 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-100/50 rounded-full blur-3xl -ml-16 -mb-16"></div>

                    <div className="relative z-10 w-full h-full flex flex-col justify-between">
                        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors font-bold mb-8 group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            Back to Home
                        </Link>

                        <div className="flex-1 flex flex-col justify-center space-y-6">
                            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full w-fit">
                                <ShieldCheck size={16} className="text-orange-600 fill-orange-600" />
                                <span className="text-orange-700 font-bold text-xs uppercase tracking-wider">Secure Access</span>
                            </div>

                            <h1 className="text-4xl font-extrabold text-slate-900 leading-[1.1]">
                                Don't worry, <br /><span className="text-orange-600">we've got you.</span>
                            </h1>

                            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                                It happens to the best of us. We'll send you a link to reset your password and get you back to growing on Reddit.
                            </p>
                        </div>

                        <div className="pt-8 text-slate-400 text-xs font-medium">
                            © 2026 RedditGo AI.
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-7/12 bg-white p-10 flex flex-col justify-center">
                    <div className="max-w-sm mx-auto w-full space-y-6">
                        <div className="space-y-1">
                            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-6">
                                <Lock size={28} />
                            </div>
                            <h2 className="text-2xl font-extrabold text-slate-900">Reset Password</h2>
                            <p className="text-slate-500 text-base">Enter the email associated with your account.</p>
                        </div>

                        <form className="space-y-5" onSubmit={handleSubmit}>
                            {error && (
                                <div className={`p-4 rounded-2xl border font-medium ${isBlocked ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-50 text-red-600 border-red-100'} animate-in fade-in slide-in-from-top-2 duration-300 mb-4`}>
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
                            {message && (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300 mb-4 text-center">
                                    <div className="flex justify-center mb-3">
                                        <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                                            <CheckCircle2 size={32} />
                                        </div>
                                    </div>
                                    <p className="text-emerald-800 font-bold mb-3 leading-relaxed">{message}</p>

                                    {resendStatus && (
                                        <div className={`mt-3 mb-3 p-2 rounded-xl text-sm font-bold ${resendStatus.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                            {resendStatus.message}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleResend}
                                        disabled={isResending}
                                        className="py-2.5 px-5 bg-white text-emerald-700 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-50 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        {isResending ? <Loader2 className="animate-spin" size={16} /> : null}
                                        {isResending ? 'Sending...' : "Didn't receive it? Resend"}
                                    </button>
                                </div>
                            )}

                            {!message && (
                                <>
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

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><Mail size={20} /> Send Reset Link</>}
                                    </button>
                                </>
                            )}
                        </form>

                        <div className="text-center">
                            <Link to="/login" className="inline-flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors text-sm">
                                <ArrowLeft size={16} /> Back to Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
