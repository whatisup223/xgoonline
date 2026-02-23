
import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Settings,
    Activity,
    LogOut,
    Shield,
    AlertCircle,
    Menu,
    X,
    CreditCard,
    Globe,
    Sliders,
    LifeBuoy,
    ChevronRight,
    Zap,
    Sparkles,
    Bell,
    TrendingDown,
    UserMinus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarItemProps {
    icon: any;
    label: string;
    path: string;
    active: boolean;
    onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, path, active, onClick }) => (
    <Link
        to={path}
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${active
            ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 font-semibold translate-x-1'
            : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm hover:translate-x-1'
            }`}
    >
        <Icon
            size={20}
            className={`${active ? 'text-white' : 'group-hover:text-orange-600 transition-colors'}`}
        />
        <span className="text-sm">{label}</span>
    </Link>
);

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isProfileOpen, setIsProfileOpen] = React.useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const sidebarRef = useRef<HTMLElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/admin' },
        { icon: Activity, label: 'Analytics', path: '/admin/analytics' },
        { icon: Users, label: 'User Management', path: '/admin/users' },
        { icon: Bell, label: 'Communicate', path: '/admin/communicate' },
        { icon: LifeBuoy, label: 'Support Center', path: '/admin/support' },
        { icon: Sliders, label: 'Configuration', path: '/admin/settings' },
        { icon: AlertCircle, label: 'System Logs', path: '/admin/logs' },
    ];

    // Close sidebar when route changes
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    // Close sidebar or profile when clicking outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener('click', handleClick);
        return () => {
            document.removeEventListener('click', handleClick);
        };
    }, [isOpen, isProfileOpen]);

    // Prevent body scroll when sidebar open on mobile
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    return (
        <div className="min-h-screen bg-[#fcfcfd] flex font-['Outfit']">
            {/* ── Mobile top bar ── */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
                <Link to="/dashboard" className="flex items-center gap-2 active:scale-95 transition-all group">
                    <div className="w-8 h-8 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-md group-hover:rotate-12 transition-transform">
                        <Shield fill="currentColor" size={16} />
                    </div>
                    <span className="text-lg font-extrabold tracking-tight text-slate-900">RedditGo Admin</span>
                </Link>

                <div className="flex items-center gap-3">
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsProfileOpen(!isProfileOpen); }}
                            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-orange-400 p-0.5 shadow-sm text-white flex items-center justify-center font-black text-[10px] uppercase active:scale-95 transition-all"
                        >
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover rounded-[0.55rem]" />
                            ) : (
                                <div className="w-full h-full bg-white rounded-[0.55rem] flex items-center justify-center text-orange-600">
                                    {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
                                </div>
                            )}
                        </button>

                        {isProfileOpen && (
                            <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-2 z-[60] animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                                <div className="px-4 py-3 border-b border-slate-50 mb-1">
                                    <p className="text-xs font-black text-slate-900 truncate">{user?.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 truncate">{user?.email}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <Link to="/dashboard" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors">
                                        <LayoutDashboard size={16} /> <span className="text-xs font-bold">User Dashboard</span>
                                    </Link>
                                    <Link to="/settings" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors">
                                        <Settings size={16} /> <span className="text-xs font-bold">System Settings</span>
                                    </Link>
                                </div>
                                <div className="h-px bg-slate-50 my-2 mx-2" />
                                <button
                                    onClick={() => { logout(); setIsProfileOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all group/logout"
                                >
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover/logout:scale-110 transition-transform">
                                        <LogOut size={16} />
                                    </div>
                                    <span className="text-sm font-black">Sign Out</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                        className="p-2.5 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 rounded-xl transition-all active:scale-95"
                    >
                        {isOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                    aria-hidden="true"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                ref={sidebarRef}
                className={`fixed lg:sticky top-0 h-screen w-72 bg-[#f8fafc] backdrop-blur-xl border-r border-slate-200/60 transition-transform duration-300 z-[100] flex flex-col ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
            >
                <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-100 ring-4 ring-orange-50">
                            <Shield fill="currentColor" size={24} />
                        </div>
                        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">AdminPanel</h1>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-8 space-y-1 custom-scrollbar">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">Management</p>
                    {menuItems.map((item) => (
                        <SidebarItem
                            key={item.path}
                            icon={item.icon}
                            label={item.label}
                            path={item.path}
                            active={location.pathname === item.path || (location.pathname === '/admin' && item.path === '/admin')}
                        />
                    ))}
                </div>

                <div className="shrink-0 px-4 pb-20 pt-3 border-t border-slate-200/60 space-y-3">
                    <Link
                        to="/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="block bg-gradient-to-br from-orange-600 to-orange-500 p-4 rounded-[2rem] shadow-lg shadow-orange-100 text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-300"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Zap size={14} fill="currentColor" className="text-white" />
                                </div>
                                <span className="font-bold text-sm">Exit Admin</span>
                            </div>
                            <p className="text-orange-50 text-[10px] items-center flex gap-1 font-medium">Return to user dashboard <ChevronRight size={10} /></p>
                        </div>
                    </Link>

                    <button
                        onClick={() => { logout(); setIsOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all group/sidebar-logout"
                    >
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover/sidebar-logout:scale-110 transition-transform">
                            <LogOut size={16} />
                        </div>
                        <span className="text-sm font-black">Sign Out</span>
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <header className="hidden lg:flex shrink-0 h-20 items-center justify-between px-10 bg-white/40 backdrop-blur-xl border-b border-slate-200/60 z-30">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-orange-600 rounded-full animate-pulse shadow-sm shadow-orange-200" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Administrative Console</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 relative" ref={profileRef}>
                            <div className="text-right hidden xl:block">
                                <p className="text-sm font-black text-slate-900 leading-none mb-1">{user?.name}</p>
                                <div className="flex items-center justify-end gap-1.5">
                                    <Sparkles size={10} className="text-orange-600 fill-orange-600" />
                                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest leading-none">Super Admin</p>
                                </div>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); setIsProfileOpen(!isProfileOpen); }}
                                className="relative group focus:outline-none"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-orange-400 p-0.5 shadow-lg shadow-orange-100 group-hover:scale-105 transition-all cursor-pointer flex items-center justify-center text-white">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Profile" className="w-full h-full object-cover rounded-[0.85rem]" />
                                    ) : (
                                        <div className="w-full h-full bg-white rounded-[0.85rem] flex items-center justify-center text-orange-600 font-black text-lg uppercase">
                                            {user?.name ? user.name.substring(0, 2) : 'AD'}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full shadow-sm" />
                            </button>

                            {isProfileOpen && (
                                <div className="absolute top-full right-0 mt-4 w-72 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                                    <div className="p-4 bg-gradient-to-br from-orange-600 to-orange-500 rounded-[1.8rem] mb-2 flex items-center gap-3 text-white">
                                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-xs">
                                            {user?.name ? user.name.substring(0, 1).toUpperCase() : 'A'}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-black truncate">{user?.name}</p>
                                            <p className="text-[10px] font-bold text-orange-100 truncate tracking-tight">{user?.email}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Link to="/dashboard" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 rounded-2xl text-slate-600 transition-all group">
                                            <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                                                <LayoutDashboard size={18} className="group-hover:text-orange-600" />
                                                <span>User Dashboard</span>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-300" />
                                        </Link>
                                        <Link to="/settings" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 rounded-2xl text-slate-600 transition-all group">
                                            <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                                                <Settings size={18} className="group-hover:text-orange-600" />
                                                <span>Settings</span>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-300" />
                                        </Link>
                                    </div>

                                    <div className="h-px bg-slate-100 my-2 mx-4" />

                                    <button
                                        onClick={() => logout()}
                                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-red-50 text-red-500 rounded-2xl transition-all group"
                                    >
                                        <LogOut size={18} />
                                        <span className="text-sm font-black">Sign Out</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar pt-24 lg:pt-8 px-6 pb-6 lg:px-12 lg:pb-12">
                    {children}
                </main>
            </div>
        </div>
    );
};
