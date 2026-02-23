import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

export const TermsOfService: React.FC = () => {
    return (
        <div className="min-h-screen font-['Outfit'] bg-white">
            <div className="max-w-4xl mx-auto px-6 py-24">
                <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-orange-600 mb-8 transition-colors">
                    <ArrowLeft size={16} /> Back to Home
                </Link>

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                        <FileText size={20} />
                    </div>
                    <span className="text-sm font-bold text-orange-600 tracking-wider uppercase">Use Guidelines</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Terms of Service</h1>
                <p className="text-lg text-slate-500 mb-12">Last updated: February 18, 2026</p>

                <h3 className="text-2xl font-bold text-slate-900 mt-12 mb-4">1. Subscriptions & Billing</h3>
                <p>
                    By subscribing to a paid plan, you agree to recurring billing based on your selected cycle (Monthly or Yearly).
                </p>
                <ul className="list-disc pl-6 mt-4 space-y-2">
                    <li><strong>Auto-Renewal:</strong> Subscriptions renew automatically unless cancelled via the Billing settings at least 24 hours before the period ends.</li>
                    <li><strong>Cancellation:</strong> You may cancel auto-renewal at any time. You will retain access to premium features until the end of your current billing period.</li>
                </ul>

                <h3 className="text-2xl font-bold text-slate-900 mt-12 mb-4">2. Refund Policy</h3>
                <p>
                    We strive for transparency in our refund process. Refunds are processed manually and are subject to the following "Fair Use" criteria:
                </p>
                <ul className="list-disc pl-6 mt-4 space-y-2">
                    <li><strong>Time Window:</strong> Refund requests must be submitted within the timeframe specified in our global policy (defaulting to 7 days from purchase).</li>
                    <li><strong>Usage Threshold:</strong> To prevent abuse, refunds are only eligible if credit consumption is below the defined threshold (defaulting to 20% of the plan's total credits).</li>
                    <li><strong>Discretionary Refunds:</strong> Management reserves the right to deny refunds if patterns of abuse or system exploitation are detected.</li>
                </ul>

                <h3 className="text-2xl font-bold text-slate-900 mt-12 mb-4">3. Account Deletion & Termination</h3>
                <p>
                    We respect your right to be forgotten. However, to prevent accidental or malicious data loss, the following protocol applies:
                </p>
                <ul className="list-disc pl-6 mt-4 space-y-2">
                    <li><strong>Scheduled Deletion:</strong> Upon request, accounts are scheduled for deletion and permanently removed after a <strong>14-day grace period</strong>.</li>
                    <li><strong>Reactivation:</strong> You may cancel a deletion request at any time during the 14-day grace period by logging into your account.</li>
                    <li><strong>Suspension:</strong> We reserves the right to suspend or terminate accounts immediately for non-payment, payment disputes (chargebacks), or violation of Reddit's API rules.</li>
                </ul>

                <h3 className="text-2xl font-bold text-slate-900 mt-12 mb-4">4. Liability & API Usage</h3>
                <p>
                    RedditGo is an automation tool. You are solely responsible for the content generated and for ensuring your use of the tool complies with Reddit's Terms of Service and Anti-Spam policies. RedditGo is not responsible for any account bans or restrictions imposed by Reddit.
                </p>
            </div>
        </div>
    );
};
