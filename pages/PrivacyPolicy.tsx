import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen font-['Outfit'] bg-white">
            <div className="max-w-4xl mx-auto px-6 py-24">
                <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-orange-600 mb-8 transition-colors">
                    <ArrowLeft size={16} /> Back to Home
                </Link>

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                        <ShieldCheck size={20} />
                    </div>
                    <span className="text-sm font-bold text-orange-600 tracking-wider uppercase">Privacy & Safety</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Privacy Policy</h1>
                <p className="text-lg text-slate-500 mb-12">Last updated: February 23, 2026</p>

                <div className="prose prose-lg prose-slate max-w-none">
                    <p>
                        At RedditGo, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclosure, and safeguard your information when you visit our website and use our application.
                    </p>

                    <h3 className="text-2xl font-bold text-slate-900 mt-12 mb-4">1. Collection of Your Information</h3>
                    <p>
                        We may collect information about you in a variety of ways. The information we may collect includes:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-6 text-slate-600">
                        <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and demographic information that you voluntarily give to us when you register with the Application.</li>
                        <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Application, such as your IP address, your browser type, your operating system, and your access times.</li>
                        <li><strong>Reddit Integration Data:</strong> We access public Reddit data and perform actions on your behalf (posting, commenting) only as authorized by you via the Reddit API. We do not store your Reddit password.</li>
                    </ul>

                    <h3 className="text-2xl font-bold text-slate-900 mt-12 mb-4">2. Use of Your Information</h3>
                    <p>
                        Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-6 text-slate-600">
                        <li>Create and manage your account.</li>
                        <li>Generate personalized AI responses for your Reddit engagement.</li>
                        <li>Monitor and analyze usage and trends to improve your experience.</li>
                        <li>Notify you of updates to the Application.</li>
                        <li>Offer recommendations and improvements to your Reddit outreach strategy.</li>
                    </ul>

                    <h3 className="text-2xl font-bold text-slate-900 mt-12 mb-4">3. Disclosure of Your Information</h3>
                    <p>
                        We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-6 text-slate-600">
                        <li><strong>By Law or to Protect Rights:</strong> To respond to legal process, investigate violations of our policies, or protect the rights and safety of others.</li>
                        <li><strong>Third-Party Service Providers:</strong> We share data with partners that perform services for us, including payment processing (Stripe/PayPal), data analysis, and hosting.</li>
                    </ul>

                    <h3 className="text-2xl font-bold text-slate-900 mt-12 mb-4">4. Data Retention & Deletion</h3>
                    <p>
                        We believe in your right to privacy and data control. Our retention policies are as follows:
                    </p>
                    <ul className="list-disc pl-6 mt-4 space-y-2 mb-6 text-slate-600">
                        <li><strong>Deletion Grace Period:</strong> When you request account deletion, your data enters a <strong>14-day "soft-deletion" state</strong>. During this time, your account is deactivated but data is preserved to allow for restoration if you change your mind.</li>
                        <li><strong>Permanent Removal:</strong> After the 14-day grace period, all personal data, brand profiles, and Reddit integration tokens are <strong>permanently purged</strong> from our active databases.</li>
                        <li><strong>Cancellation Feedback:</strong> We collect and store reasons for subscription cancellation to improve our service. This data is anonymized for analytical purposes.</li>
                        <li><strong>Financial Records:</strong> Transaction data is retained as required by law for accounting and tax purposes, even after an account is deleted.</li>
                    </ul>

                    <h3 className="text-2xl font-bold text-slate-900 mt-12 mb-4">5. Security of Your Data</h3>
                    <p>
                        We use administrative, technical, and physical security measures to help protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure.
                    </p>

                    <h3 className="text-2xl font-bold text-slate-900 mt-12 mb-4">6. Policy Updates</h3>
                    <p>
                        We may update this privacy policy from time to time. The "Last Updated" date at the top of this page will reflect the most recent changes.
                    </p>
                </div>
            </div>
        </div>
    );
};
