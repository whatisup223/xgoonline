
import React from 'react';
import { Zap, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CreditsBannerProps {
    plan: string;
    credits: number;
}

const CreditsBanner: React.FC<CreditsBannerProps> = ({ plan, credits }) => {
    const isLowCredits = credits <= 0;

    return (
        <div className="bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
            {/* Animated Background Element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full blur-3xl -mr-16 -mt-16 -z-0 group-hover:scale-110 transition-transform duration-700"></div>

            {/* Icon & Label */}
            <div className="relative z-10 flex items-center gap-5">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center text-orange-400 border border-slate-700 shadow-inner group-hover:rotate-6 transition-transform">
                    <Zap size={28} fill="currentColor" />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-extrabold text-xl tracking-tight">{plan} Plan Active</h3>
                        {plan === 'Starter' && (
                            <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 text-[10px] font-black rounded-lg border border-orange-500/20 uppercase tracking-widest">Limited</span>
                        )}
                    </div>
                    <p className="text-slate-400 text-sm font-medium">
                        You have <span className="text-white font-black">{credits}</span> AI credits available.
                    </p>
                </div>
            </div>

            {/* Upgrade Button */}
            <div className="relative z-10 mt-6 md:mt-0 w-full md:w-auto flex items-center gap-6">
                {isLowCredits ? (
                    <Link
                        to="/pricing"
                        className="w-full md:w-auto bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm hover:bg-orange-50 transition-all flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5 active:scale-95"
                    >
                        <Crown size={18} className="text-orange-600 fill-orange-600" />
                        GET MORE CREDITS
                    </Link>
                ) : plan === 'Starter' ? (
                    <Link
                        to="/pricing"
                        className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600"
                    >
                        Upgrade Plan
                    </Link>
                ) : (
                    <div className="flex items-center gap-2 px-6 py-3 bg-green-500/10 text-green-500 rounded-xl border border-green-500/20 text-xs font-black uppercase tracking-widest">
                        <Crown size={14} fill="currentColor" />
                        Pro Features Unlocked
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreditsBanner;
