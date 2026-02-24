
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const XCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, syncUser } = useAuth();
    const code = searchParams.get('code');

    useEffect(() => {
        const handleCallback = async () => {
            // Wait for user to be loaded if code is present
            if (code && !user) {
                return;
            }

            if (!code || !user) {
                navigate('/dashboard?error=x_auth_failed');
                return;
            }

            try {
                const response = await fetch('/api/auth/x/callback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, userId: user.id })
                });

                if (response.ok) {
                    await syncUser();
                    navigate('/dashboard?success=x_connected');
                } else {
                    navigate('/dashboard?error=x_auth_failed');
                }
            } catch (error) {
                console.error('x OAuth error:', error);
                navigate('/dashboard?error=x_auth_failed');
            }
        };

        handleCallback();
    }, [code, user, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-600 rounded-full animate-spin mx-auto"></div>
                <h2 className="text-xl font-bold text-slate-900">Connecting your x account...</h2>
                <p className="text-slate-500">Please wait while we finalize the connection.</p>
            </div>
        </div>
    );
};
