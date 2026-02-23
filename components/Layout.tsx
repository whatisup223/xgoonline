
import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  Crown,
  PenTool,
  MessageSquare,
  CreditCard,
  User,
  LifeBuoy,
  ChevronRight,
  Plus,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { OnboardingWizard } from './OnboardingWizard';

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
      : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm'
      }`}
  >
    <Icon
      size={20}
      className={`${active ? 'text-white' : 'group-hover:text-orange-500 transition-colors'}`}
    />
    <span className="text-sm">{label}</span>
  </Link>
);

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const sidebarRef = useRef<HTMLElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: PenTool, label: 'Post Agent', path: '/post-agent' },
    { icon: MessageSquare, label: 'Comment Agent', path: '/comment-agent' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: CreditCard, label: 'Pricing', path: '/pricing' },
    { icon: LifeBuoy, label: 'Help & Support', path: '/support' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isAdmin = user?.role?.toLowerCase() === 'admin';
  if (isAdmin) {
    menuItems.push({ icon: Shield, label: 'Admin Panel', path: '/admin' } as any);
  }

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
      {!user?.hasCompletedOnboarding && <OnboardingWizard />}

      {/* ── Mobile top bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <Link to="/dashboard" className="flex items-center gap-2 active:scale-95 transition-all group">
          <div className="w-8 h-8 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-md group-hover:rotate-12 transition-transform">
            <Zap fill="currentColor" size={16} />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">RedditGo</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Mobile Credits Badge - Clickable */}
          <Link
            to="/pricing"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600/10 border border-orange-600/20 rounded-xl text-orange-600 active:scale-95 transition-all"
          >
            <Zap size={14} fill="currentColor" />
            <span className="text-xs font-black">{user?.credits || 0}</span>
          </Link>

          <div className="relative" ref={profileRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setIsProfileOpen(!isProfileOpen); }}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-orange-400 p-0.5 shadow-sm text-white flex items-center justify-center font-black text-[10px] uppercase active:scale-95 transition-all"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover rounded-[0.55rem]" />
              ) : (
                <div className="w-full h-full bg-white rounded-[0.55rem] flex items-center justify-center text-orange-600">
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : 'JD'}
                </div>
              )}
            </button>

            {isProfileOpen && (
              <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-2 z-[60] animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <Link
                  to="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="block px-4 py-3 border-b border-slate-50 mb-1 hover:bg-slate-50 transition-colors group/mobile-info"
                >
                  <p className="text-xs font-black text-slate-900 truncate group-hover/mobile-info:text-orange-600 transition-colors">{user?.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 truncate">{user?.email}</p>
                </Link>
                <div className="space-y-0.5">
                  <Link to="/pricing" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors">
                    <CreditCard size={16} /> <span className="text-xs font-bold">Manage Plan</span>
                  </Link>
                  <Link to="/settings" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors">
                    <Settings size={16} /> <span className="text-xs font-bold">Settings</span>
                  </Link>
                  <Link to="/support" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors">
                    <LifeBuoy size={16} /> <span className="text-xs font-bold">Help & Support</span>
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
                  <span className="text-sm font-black">Sign Out Account</span>
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
            aria-label="Open menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        className={`fixed lg:sticky top-0 h-screen w-72 bg-[#f8fafc] backdrop-blur-xl border-r border-slate-200/60 transition-transform duration-300 z-[100] flex flex-col ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-100 ring-4 ring-orange-50">
              <Zap fill="currentColor" size={24} />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">RedditGo</h1>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 px-4">Main Menu</p>
          {menuItems.map((item) => (
            <SidebarItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              active={location.pathname === item.path}
            />
          ))}
        </div>

        <div className="shrink-0 px-4 pb-20 pt-3 border-t border-slate-200/60 space-y-3">
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setIsOpen(false)}
              className="block bg-slate-900 p-4 rounded-3xl shadow-lg shadow-slate-200 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={16} className="text-orange-500 fill-orange-500 animate-pulse" />
                  <span className="font-bold text-sm tracking-wide">Back to Admin</span>
                </div>
                <p className="text-slate-400 text-[10px] leading-relaxed font-medium">Access system controls and management.</p>
              </div>
            </Link>
          )}

          {user?.plan === 'Starter' && !isAdmin && (
            <Link
              to="/pricing"
              onClick={() => setIsOpen(false)}
              className="block bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-3xl shadow-lg shadow-orange-200 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={16} className="text-yellow-300 fill-yellow-300 animate-pulse" />
                  <span className="font-bold text-sm tracking-wide">Upgrade to Pro</span>
                </div>
                <p className="text-orange-100 text-[10px] leading-relaxed font-medium">Unlock unlimited AI replies and advanced analytics.</p>
              </div>
            </Link>
          )}

          <Link
            to="/settings"
            onClick={() => setIsOpen(false)}
            className="block bg-white/80 border border-slate-200/60 p-3 rounded-2xl shadow-sm hover:border-orange-300 hover:shadow-md transition-all group bg-gradient-to-br from-white to-slate-50/50"
          >
            <div className="flex items-center gap-3">
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-9 h-9 rounded-xl object-cover shadow-inner shrink-0 group-hover:scale-105 transition-transform border border-white" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-100 flex items-center justify-center text-slate-600 font-bold shadow-inner uppercase text-sm shrink-0 group-hover:scale-105 transition-transform border border-white">
                  {user?.name ? user.name.substring(0, 2) : 'JD'}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-slate-900 truncate group-hover:text-orange-600 transition-colors">{user?.name || 'Guest User'}</p>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${user?.plan === 'Starter' ? 'bg-slate-400' : 'bg-green-500 animate-pulse'}`} />
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 transition-colors">{user?.plan || 'Guest'} Plan</p>
                </div>
              </div>
            </div>
          </Link>

          <div className="pt-2">
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
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="hidden lg:flex shrink-0 h-20 items-center justify-end px-10 bg-white/40 backdrop-blur-xl border-b border-slate-200/60 z-30">
          <div className="flex items-center gap-6">
            {/* Credits System Indicator - Clickable */}
            <Link
              to="/pricing"
              className="flex items-center gap-3 px-5 py-2.5 bg-white border border-slate-200/60 rounded-2xl shadow-sm group cursor-pointer hover:border-orange-200 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap size={16} fill="currentColor" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Available Credits</p>
                <p className="text-sm font-black text-slate-900 leading-none">{user?.credits || 0} <span className="text-[10px] text-slate-400 font-bold tracking-normal">points</span></p>
              </div>
              <div className="ml-2 w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-orange-600 group-hover:text-white transition-all">
                <Plus size={12} />
              </div>
            </Link>

            {/* Profile Section with Dropdown */}
            <div className="flex items-center gap-4 pl-2 relative" ref={profileRef}>
              <Link to="/settings"
                onClick={(e) => e.stopPropagation()}
                className="text-right hidden xl:block group/name"
              >
                <p className="text-sm font-black text-slate-900 leading-none mb-1 group-hover/name:text-orange-600 transition-colors">{user?.name || 'Guest User'}</p>
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest leading-none">
                  {user?.plan || 'Starter'} Plan
                </p>
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); setIsProfileOpen(!isProfileOpen); }}
                className="relative group focus:outline-none"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-orange-400 p-0.5 shadow-lg shadow-orange-100 group-hover:scale-105 transition-all cursor-pointer">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover rounded-[0.85rem]" />
                  ) : (
                    <div className="w-full h-full bg-white rounded-[0.85rem] flex items-center justify-center text-orange-600 font-black text-lg">
                      {user?.name ? user.name.substring(0, 2).toUpperCase() : 'JD'}
                    </div>
                  )}
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-sm" title="Online" />
              </button>

              {/* Desktop Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute top-full right-0 mt-4 w-72 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-[1.8rem] mb-2">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Profile" className="w-10 h-10 rounded-xl object-cover bg-orange-600" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black">
                        {user?.name ? user.name.substring(0, 1).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-sm font-black text-slate-900 truncate">{user?.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 truncate">{user?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link to="/pricing" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 rounded-2xl text-slate-600 transition-all group">
                      <div className="flex items-center gap-3">
                        <CreditCard size={18} className="group-hover:text-orange-600" />
                        <span className="text-sm font-bold">Manage Plan</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-300" />
                    </Link>
                    <Link to="/settings" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 rounded-2xl text-slate-600 transition-all group">
                      <div className="flex items-center gap-3">
                        <Settings size={18} className="group-hover:text-orange-600" />
                        <span className="text-sm font-bold">Settings</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-300" />
                    </Link>
                    <Link to="/support" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 rounded-2xl text-slate-600 transition-all group">
                      <div className="flex items-center gap-3">
                        <LifeBuoy size={18} className="group-hover:text-orange-600" />
                        <span className="text-sm font-bold">Help & Support</span>
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
