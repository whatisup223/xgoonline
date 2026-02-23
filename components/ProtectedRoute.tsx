import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RefreshCw } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
    const { isAuthenticated, user } = useAuth();

    // In a real app, you might want a "isInitialLoading" state in AuthContext
    // For now, we check if token exists but user is null (loading from localStorage)
    const token = localStorage.getItem('token');

    if (token && !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <RefreshCw className="animate-spin text-orange-600" size={32} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && user?.role?.toLowerCase() !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    if (user && (user.status === 'Banned' || user.status === 'Suspended')) {
        console.log('[ProtectedRoute] Blocking banned/suspended user');
        return <Navigate to="/login" replace state={{
            isBlocked: true,
            message: `Your account has been ${user.status.toLowerCase()}.`,
            reason: user.statusMessage || 'Contact support for details.'
        }} />;
    }

    return <>{children}</>;
};
