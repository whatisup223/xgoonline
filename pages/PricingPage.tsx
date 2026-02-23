import React, { useState } from 'react';
import { Check, Shield, Crown, Zap, ArrowRight, Loader2, X, Users, CreditCard, Globe } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export const PricingPage: React.FC = () => {
    interface Plan {
        id: string;
        name: string;
        description?: string;
        monthlyPrice: number;
        yearlyPrice: number;
        credits: number;
        dailyLimitMonthly: number;
        dailyLimitYearly: number;
        features: string[];
        isPopular: boolean;
        highlightText?: string;
        isCustom?: boolean;
        allowImages: boolean;
        allowTracking: boolean;
        maxAccounts: number;
        purchaseEnabled?: boolean;
        isVisible?: boolean;
    }

    const { user, updateUser } = useAuth();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [gateways, setGateways] = useState<{ stripe: boolean; paypal: boolean }>({ stripe: true, paypal: false });
    const [showGatewayModal, setShowGatewayModal] = useState(false);
    const [selectedPlanForModal, setSelectedPlanForModal] = useState<Plan | null>(null);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [plansRes, configRes] = await Promise.all([
                    fetch('/api/plans'),
                    fetch('/api/config')
                ]);
                if (plansRes.ok) setPlans(await plansRes.json());
                if (configRes.ok) {
                    const config = await configRes.json();
                    if (config.gateways) setGateways(config.gateways);
                }
            } catch (error) {
                console.error('Failed to fetch pricing data', error);
            } finally {
                setLoadingPlans(false);
            }
        };
        fetchData();
    }, []);

    const handleSubscribe = async (plan: Plan, gatewayOverride?: 'stripe' | 'paypal') => {
        if (!user) {
            window.location.href = '/signup';
            return;
        }

        const isFree = plan.monthlyPrice === 0 && (billingCycle === 'monthly' || plan.yearlyPrice === 0);

        // If gateway not specified and multiple enabled AND not a free plan, show modal
        if (!isFree && !gatewayOverride && gateways.stripe && gateways.paypal) {
            setSelectedPlanForModal(plan);
            setShowGatewayModal(true);
            return;
        }

        const gateway = isFree ? 'system' : (gatewayOverride || (gateways.paypal && !gateways.stripe ? 'paypal' : 'stripe'));

        setIsLoading(plan.id);
        setShowGatewayModal(false);
        try {
            const res = await fetch('/api/user/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    planId: plan.id,
                    billingCycle,
                    gateway
                })
            });

            if (res.ok) {
                const data = await res.json();

                if (data.checkoutUrl) {
                    // Redirect to Stripe or PayPal Checkout
                    window.location.href = data.checkoutUrl;
                } else if (data.paypalOrderId) {
                    // Handle PayPal specifically if needed (though usually we'd use checkoutUrl)
                    window.location.href = `https://www.paypal.com/checkoutnow?token=${data.paypalOrderId}`;
                } else {
                    // Instant activation (Free plan or Dev mode fallback)
                    alert(`Successfully subscribed to ${plan.name}!`);
                    if (updateUser && data.user) {
                        updateUser(data.user);
                    }
                }
            } else {
                const err = await res.json();
                alert('Subscription failed: ' + err.error);
            }
        } catch (error) {
            console.error('Subscription error', error);
            alert('An error occurred');
        } finally {
            setIsLoading(null);
        }
    };


    return (
        <div className="max-w-6xl mx-auto py-10 px-4">
            <div className="text-center mb-16 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wide">
                    <Crown size={14} className="fill-orange-700" />
                    Upgrade Your Plan
                </span>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                    Scale your growth with <span className="text-orange-600">Pro Power.</span>
                </h1>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                    Unlock the full potential of your AI agent. Cancel anytime.
                </p>

                <div className="flex items-center justify-center gap-4 mt-8">
                    <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-500'}`}>Monthly</span>
                    <button
                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 relative ${billingCycle === 'monthly' ? 'bg-slate-200' : 'bg-orange-600'}`}
                    >
                        <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${billingCycle === 'monthly' ? 'translate-x-0' : 'translate-x-6'}`}></div>
                    </button>
                    <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-500'}`}>
                        Yearly
                        {plans.length > 0 && (() => {
                            const discounts = plans
                                .filter((p: any) => p.monthlyPrice > 0 && p.yearlyPrice > 0)
                                .map((p: any) => Math.round(100 - (p.yearlyPrice / (p.monthlyPrice * 12) * 100)));
                            const maxDiscount = Math.max(...discounts, 0);

                            return maxDiscount > 0 ? (
                                <span className="text-green-600 text-[10px] ml-1.5 font-black uppercase bg-green-100 px-2.5 py-1 rounded-lg border border-green-200">
                                    SAVE UP TO {maxDiscount}%
                                </span>
                            ) : null;
                        })()}
                    </span>

                </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {plans.filter(p => p.isVisible !== false).map((plan) => {
                    const isCurrentPlan = user?.plan === plan.name;
                    const isFree = plan.monthlyPrice === 0;

                    // Only show yearly if selected, not free, and a yearly price exists
                    const isYearlySelected = billingCycle === 'yearly' && !isFree && (plan.yearlyPrice || 0) > 0;
                    const price = isYearlySelected ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
                    const credits = isYearlySelected ? plan.credits * 12 : plan.credits;
                    const dailyLimit = isYearlySelected ? plan.dailyLimitYearly : plan.dailyLimitMonthly;

                    // Calculate actual discount percentage
                    const actualDiscount = (plan.monthlyPrice > 0 && plan.yearlyPrice > 0)
                        ? Math.round(100 - (plan.yearlyPrice / (plan.monthlyPrice * 12) * 100))
                        : 0;

                    return (
                        <div key={plan.id} className={`relative bg-white rounded-[2.5rem] p-8 border ${plan.isPopular ? 'border-orange-200 shadow-xl shadow-orange-100/50 scale-105 z-10' : 'border-slate-100 shadow-lg'} hover:-translate-y-2 transition-all duration-300 flex flex-col ${plan.purchaseEnabled === false ? 'opacity-80 grayscale-[0.2]' : ''}`}>
                            {plan.isPopular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide shadow-lg shadow-orange-200">
                                    Most Popular
                                </div>
                            )}


                            <div className="mb-8">
                                <div className="flex flex-col gap-1.5">
                                    {!isFree && plan.purchaseEnabled === false && (
                                        <span className="bg-orange-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit mb-2 shadow-sm shadow-orange-100">
                                            Reached Capacity
                                        </span>
                                    )}
                                    <h3 className={`text-2xl font-bold ${plan.isPopular ? 'text-orange-600' : 'text-slate-900'}`}>{plan.name}</h3>
                                    {isYearlySelected && actualDiscount > 0 && (
                                        <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-lg w-fit">
                                            SAVE {actualDiscount}%
                                        </span>
                                    )}
                                </div>

                                <p className="text-slate-500 text-sm mt-2 font-medium">
                                    {plan.description || (
                                        plan.name?.toLowerCase() === 'starter' ? 'For individuals exploring AI replies.' :
                                            plan.name?.toLowerCase() === 'professional' ? 'Perfect for indie hackers and solo founders.' :
                                                'For serious growth and small teams.'
                                    )}
                                </p>
                            </div>


                            <div className="mb-8 flex items-baseline gap-1">
                                {isFree ? (
                                    <span className="text-5xl font-extrabold text-slate-900">Free</span>
                                ) : (
                                    <div className="flex flex-col">
                                        {isYearlySelected && (
                                            <span className="text-lg font-bold text-slate-300 line-through mb-[-4px] ml-1">${plan.monthlyPrice}</span>
                                        )}
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-extrabold text-slate-900">${price}</span>
                                            <span className="text-slate-400 font-medium">/mo</span>
                                        </div>
                                    </div>
                                )}
                                {isYearlySelected && (
                                    <div className="ml-auto text-right">
                                        <span className="text-[10px] text-green-600 font-black block bg-green-50 px-2 py-1 rounded-lg border border-green-100">Billed ${plan.yearlyPrice}/yr</span>
                                    </div>
                                )}
                            </div>


                            <ul className="space-y-4 mb-8 flex-1">
                                {/* Dynamic Primary Features */}
                                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.isPopular ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                                        <Zap size={12} strokeWidth={4} />
                                    </div>
                                    {credits.toLocaleString()} Credits {isYearlySelected ? 'Upfront' : '/ Month'}
                                </li>

                                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.isPopular ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                                        <Zap size={12} strokeWidth={4} />
                                    </div>
                                    {dailyLimit || 0} Daily Actions
                                </li>

                                {/* Feature Toggles (Visual) */}
                                <li className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.maxAccounts > 1 ? (plan.isPopular ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600') : 'bg-slate-50 text-slate-300'}`}>
                                        {plan.maxAccounts > 1 ? <Check size={12} strokeWidth={4} /> : <X size={12} strokeWidth={4} />}
                                    </div>
                                    <span className={plan.maxAccounts > 1 ? '' : 'text-slate-400'}>
                                        {plan.maxAccounts >= 100 ? 'Unlimited Accounts' : plan.maxAccounts > 1 ? `Up to ${plan.maxAccounts} Accounts` : 'Multiple Accounts Support'}
                                    </span>
                                </li>

                                <li className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.allowImages ? (plan.isPopular ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600') : 'bg-slate-50 text-slate-300'}`}>
                                        {plan.allowImages ? <Check size={12} strokeWidth={4} /> : <X size={12} strokeWidth={4} />}
                                    </div>
                                    <span className={plan.allowImages ? '' : 'text-slate-400'}>
                                        AI Image Generation
                                    </span>
                                </li>

                                <li className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.allowTracking ? (plan.isPopular ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600') : 'bg-slate-50 text-slate-300'}`}>
                                        {plan.allowTracking ? <Check size={12} strokeWidth={4} /> : <X size={12} strokeWidth={4} />}
                                    </div>
                                    <span className={plan.allowTracking ? '' : 'text-slate-400'}>
                                        Advanced Link Tracking
                                    </span>
                                </li>

                                {/* Custom Decorative Features */}
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.isPopular ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                                            <Check size={12} strokeWidth={4} />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => !isCurrentPlan && plan.purchaseEnabled !== false && handleSubscribe(plan)}
                                disabled={!!isLoading || isCurrentPlan || plan.purchaseEnabled === false}
                                className={`w-full py-4 rounded-xl font-bold text-center transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2 ${isCurrentPlan
                                    ? 'bg-slate-100 text-slate-400 cursor-default shadow-none border border-slate-200'
                                    : plan.purchaseEnabled === false
                                        ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                                        : plan.isPopular
                                            ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-orange-200'
                                            : 'bg-white text-slate-900 border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                {isLoading === plan.id ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : isCurrentPlan ? (
                                    <>Current Plan</>
                                ) : plan.purchaseEnabled === false ? (
                                    <>Capacity Reached</>
                                ) : (
                                    <>Choose {plan.name} <ArrowRight size={18} /></>
                                )}
                            </button>

                            {plan.monthlyPrice === 0 && (
                                <p className="text-center text-xs text-slate-400 font-medium mt-4">
                                    Free forever. No credit card required.
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Payment Method Selection Modal */}
            {showGatewayModal && selectedPlanForModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowGatewayModal(false)} />
                    <div className="relative bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Select Payment Method</h3>
                                <button onClick={() => setShowGatewayModal(false)} className="p-2 hover:bg-white rounded-2xl transition-colors">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200">
                                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Selected</p>
                                    <p className="text-lg font-black text-slate-900">{selectedPlanForModal.name} <span className="text-slate-400 font-medium">({billingCycle})</span></p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 space-y-4">
                            {gateways.stripe && (
                                <button
                                    onClick={() => handleSubscribe(selectedPlanForModal, 'stripe')}
                                    className="w-full p-6 bg-white border-2 border-slate-100 rounded-[2rem] flex items-center gap-6 hover:border-indigo-600 hover:bg-indigo-50/30 transition-all group relative overflow-hidden"
                                >
                                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                        <CreditCard size={28} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xl font-bold text-slate-900">Secure Card Payment</p>
                                        <p className="text-slate-500 text-sm">Credit, Debit, Apple Pay</p>
                                    </div>
                                    <div className="ml-auto p-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white text-slate-200 transition-colors">
                                        <ArrowRight size={20} />
                                    </div>
                                </button>
                            )}

                            {gateways.paypal && (
                                <button
                                    onClick={() => handleSubscribe(selectedPlanForModal, 'paypal')}
                                    className="w-full p-6 bg-white border-2 border-slate-100 rounded-[2rem] flex items-center gap-6 hover:border-blue-600 hover:bg-blue-50/30 transition-all group"
                                >
                                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                        <Globe size={28} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xl font-bold text-slate-900">PayPal Checkout</p>
                                        <p className="text-slate-500 text-sm">PayPal, Venmo, Pay Later</p>
                                    </div>
                                    <div className="ml-auto p-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white text-slate-200 transition-colors">
                                        <ArrowRight size={20} />
                                    </div>
                                </button>
                            )}
                        </div>

                        <div className="p-8 pt-0 text-center">
                            <p className="text-xs text-slate-400 font-medium">
                                Secure multi-gateway processing. Your data is never stored on our servers.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
