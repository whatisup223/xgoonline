import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your email...');
    const [email, setEmail] = useState('');

    useEffect(() => {
        const verifyEmail = async () => {
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');
            const e = params.get('email');

            if (!token || !e) {
                setStatus('error');
                setMessage('Invalid or missing verification link.');
                return;
            }
            setEmail(e);

            try {
                const response = await fetch('/api/auth/verify-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, email: e }),
                });

                const data = await response.json();

                if (response.ok) {
                    setStatus('success');
                    setMessage(data.message || 'Email successfully verified!');
                    // Redirect after 3 seconds
                    setTimeout(() => {
                        navigate('/login');
                    }, 3000);
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Verification failed. Link might be expired.');
                }
            } catch (err) {
                setStatus('error');
                setMessage('An error occurred during verification. Please try again later.');
            }
        };

        verifyEmail();
    }, [navigate]);

    return (
        <div className="min-h-screen bg-slate-50 font-['Outfit'] flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-200/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 -z-10" />
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-slate-200/30 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 -z-10" />

            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col p-10 text-center relative border border-slate-100">
                <div className="flex justify-center mb-6">
                    {status === 'loading' && (
                        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 shadow-inner">
                            <Loader2 size={40} className="animate-spin" />
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shadow-inner">
                            <CheckCircle2 size={40} />
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-600 shadow-inner">
                            <AlertTriangle size={40} />
                        </div>
                    )}
                </div>

                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
                    {status === 'loading' ? 'Verifying Email' : status === 'success' ? 'Email Verified!' : 'Verification Failed'}
                </h1>

                {email && status === 'loading' && (
                    <p className="text-slate-500 font-medium mb-6">Please wait while we verify {email}...</p>
                )}

                <p className={`text-sm md:text-base font-medium mb-8 p-4 rounded-xl ${status === 'loading' ? 'bg-slate-50 text-slate-600' :
                        status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {message}
                </p>

                {status === 'success' ? (
                    <div className="flex flex-col gap-3">
                        <p className="text-xs text-slate-400">Redirecting you to login...</p>
                        <Link to="/login" className="py-3 px-6 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors">
                            Go to Login <ArrowRight size={18} />
                        </Link>
                    </div>
                ) : status === 'error' ? (
                    <div className="flex flex-col gap-3">
                        <Link to="/signup" className="py-3 px-6 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                            Try Registering Again
                        </Link>
                        <Link to="/support" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                            Contact Support
                        </Link>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
