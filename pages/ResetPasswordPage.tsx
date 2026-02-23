import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Loader2, AlertTriangle, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [token, setToken] = useState('');
    const [email, setEmail] = useState('');
    const [isTokenValid, setIsTokenValid] = useState(true);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('token');
        const e = params.get('email');
        if (!t || !e) {
            setIsTokenValid(false);
            setError('Invalid reset link. Please request a new password reset.');
        } else {
            setToken(t);
            setEmail(e);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, email, newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to reset password.');
                return;
            }

            setIsSuccess(true);
            setMessage(data.message || 'Password reset successfully!');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-['Outfit'] flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-200/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 -z-10" />
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-slate-200/30 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 -z-10" />

            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">

                {/* Left Side */}
                <div className="w-full md:w-5/12 bg-slate-50 p-10 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50/50 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-100/50 rounded-full blur-3xl -ml-16 -mb-16" />

                    <div className="relative z-10 w-full h-full flex flex-col justify-between">
                        <Link to="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors font-bold mb-8 group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            Back to Login
                        </Link>

                        <div className="flex-1 flex flex-col justify-center space-y-6">
                            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full w-fit">
                                <ShieldCheck size={16} className="text-orange-600 fill-orange-600" />
                                <span className="text-orange-700 font-bold text-xs uppercase tracking-wider">Secure Reset</span>
                            </div>
                            <h1 className="text-4xl font-extrabold text-slate-900 leading-[1.1]">
                                Set your <br /><span className="text-orange-600">new password.</span>
                            </h1>
                            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                                Choose a strong password to keep your account secure. This link is valid for 1 hour.
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
                            <h2 className="text-2xl font-extrabold text-slate-900">Create New Password</h2>
                            <p className="text-slate-500 text-base">
                                {email ? `Resetting password for ${email}` : 'Enter your new password below.'}
                            </p>
                        </div>

                        {isSuccess ? (
                            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl animate-in fade-in zoom-in-95 duration-300 text-center">
                                <div className="flex justify-center mb-3">
                                    <div className="bg-emerald-100 p-3 rounded-full">
                                        <CheckCircle2 size={28} className="text-emerald-600" />
                                    </div>
                                </div>
                                <p className="text-emerald-700 font-bold text-lg">{message}</p>
                                <p className="text-emerald-600 text-sm mt-1">Redirecting to login in 3 seconds...</p>
                            </div>
                        ) : (
                            <form className="space-y-5" onSubmit={handleSubmit}>
                                {error && (
                                    <div className="p-4 rounded-2xl border bg-red-50 text-red-600 border-red-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                                            <p className="font-bold">{error}</p>
                                        </div>
                                    </div>
                                )}

                                {!isTokenValid ? (
                                    <div className="text-center">
                                        <Link to="/forgot-password" className="text-orange-600 font-bold hover:underline">
                                            Request a new reset link →
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-slate-700" htmlFor="newPassword">New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    id="newPassword"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-slate-900 pr-12"
                                                    placeholder="At least 6 characters"
                                                    required
                                                    minLength={6}
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-slate-700" htmlFor="confirmPassword">Confirm Password</label>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                id="confirmPassword"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-slate-900"
                                                placeholder="Repeat your password"
                                                required
                                            />
                                        </div>

                                        {newPassword && (
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${newPassword.length >= i * 3
                                                        ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-orange-400' : i <= 3 ? 'bg-yellow-400' : 'bg-emerald-500'
                                                        : 'bg-slate-200'
                                                        }`} />
                                                ))}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isLoading || !isTokenValid}
                                            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><Lock size={20} /> Reset Password</>}
                                        </button>
                                    </>
                                )}
                            </form>
                        )}

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
