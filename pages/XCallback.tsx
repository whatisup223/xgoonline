
import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const XCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, syncUser } = useAuth();
    const code = searchParams.get('code');
    const hasHandled = useRef(false);

    useEffect(() => {
        // If there's no code at all, fail immediately
        if (!code) {
            navigate('/settings?error=x_auth_failed');
            return;
        }

        // Wait until user is loaded before processing
        if (!user) {
            return; // The effect will re-run when `user` changes
        }

        // Prevent double-execution
        if (hasHandled.current) return;
        hasHandled.current = true;

        const handleCallback = async () => {
            try {
                const response = await fetch('/api/auth/x/callback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, userId: user.id })
                });

                if (response.ok) {
                    await syncUser();
                    navigate('/settings?success=x_connected');
                } else {
                    const errData = await response.json().catch(() => ({}));
                    const errMsg = encodeURIComponent(errData.error || 'X authentication failed');
                    navigate(`/settings?x_error=${errMsg}`);
                }
            } catch (error) {
                console.error('X OAuth error:', error);
                navigate('/settings?x_error=x_connection_failed');
            }
        };

        handleCallback();
    }, [code, user, navigate, syncUser]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-600 rounded-full animate-spin mx-auto"></div>
                <h2 className="text-xl font-bold text-slate-900">Connecting your X account...</h2>
                <p className="text-slate-500">Please wait while we finalize the connection.</p>
            </div>
        </div>
    );
};
