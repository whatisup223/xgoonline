import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface User {
    id: number | string;
    _id?: string;
    name: string;
    email: string;
    role: string;
    plan: string;
    billingCycle?: 'monthly' | 'yearly';
    status: string;
    statusMessage?: string;
    hasCompletedOnboarding: boolean;
    credits: number;
    dailyUsagePoints?: number;
    dailyUsage?: number;
    customDailyLimit?: number;
    lastUsageDate?: string;
    avatar?: string;
    brandProfile?: any;
    twoFactorEnabled?: boolean;
    subscriptionStart?: string;
    subscriptionEnd?: string;
    autoRenew?: boolean;
    deletionScheduledDate?: string;
    isSuspended?: boolean;
    transactions?: any[];
    connectedAccounts?: any[];
    usageStats?: {
        posts: number;
        comments: number;
        images: number;
        postsCredits: number;
        commentsCredits: number;
        imagesCredits: number;
        totalSpent: number;
        history: { date: string; type: string; cost: number }[];
    };
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, userData: User) => void;
    signup: (token: string, userData: User) => void;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
    syncUser: () => Promise<void>;
    completeOnboarding: (credits?: number) => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('redditgo_post_draft');
        localStorage.removeItem('redditgo_comment_draft');
        localStorage.removeItem('redigo_comment_draft');
        setToken(null);
        setUser(null);
    }, []);

    const syncUser = useCallback(async () => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) return;

        try {
            const userData = JSON.parse(storedUser);
            const response = await fetch(`/api/users/${userData.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const freshUser = await response.json();

                if (freshUser.status === 'Banned' || freshUser.status === 'Suspended') {
                    logout();
                    window.location.href = '/login?error=' + freshUser.status.toLowerCase();
                    return;
                }

                // Only update if data is actually different to avoid unnecessary re-renders
                setUser(prev => {
                    const isDifferent = JSON.stringify(prev) !== JSON.stringify(freshUser);
                    if (isDifferent) {
                        localStorage.setItem('user', JSON.stringify(freshUser));
                        return freshUser;
                    }
                    return prev;
                });

                console.log('[Auth] User synced with server:', freshUser.plan);
            } else if (response.status === 403) {
                const data = await response.json();
                if (data.error && (data.error.toLowerCase().includes('banned') || data.error.toLowerCase().includes('suspended'))) {
                    logout();
                }
            }
        } catch (error) {
            console.error('[Auth] Sync failed:', error);
        }
    }, [token, logout]);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            syncUser();
        }
    }, [syncUser]);

    const login = useCallback((newToken: string, userData: User) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
    }, []);

    const signup = useCallback((newToken: string, userData: User) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
    }, []);

    const updateUser = useCallback((userData: Partial<User>) => {
        setUser(prev => {
            if (!prev) return null;
            const updatedUser = { ...prev, ...userData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
        });
    }, []);

    const completeOnboarding = useCallback((credits?: number) => {
        setUser(prev => {
            if (!prev) return null;
            const updatedUser = {
                ...prev,
                hasCompletedOnboarding: true,
                credits: credits !== undefined ? credits : prev.credits
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
        });
    }, []);

    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{ user, token, login, signup, logout, updateUser, syncUser, completeOnboarding, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

