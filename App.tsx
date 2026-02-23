
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { Admin } from './pages/Admin';
import { Settings } from './pages/Settings';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { LoginPage } from './pages/LoginPage';
import { PricingPage } from './pages/PricingPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { RedditCallback } from './pages/RedditCallback';
import { ContentArchitect } from './pages/ContentArchitect';
import { Comments } from './pages/Comments';
import { Support } from './pages/Support';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Landing Page - Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/reddit/callback" element={<RedditCallback />} />

          {/* User Dashboard Routes - Wrapped in AppLayout */}
          <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/comment-agent" element={<ProtectedRoute><AppLayout><Comments /></AppLayout></ProtectedRoute>} />
          <Route path="/post-agent" element={<ProtectedRoute><AppLayout><ContentArchitect /></AppLayout></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AppLayout><Analytics /></AppLayout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute><AppLayout><PricingPage /></AppLayout></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><AppLayout><Support /></AppLayout></ProtectedRoute>} />

          {/* Admin Routes - Separate from User Layout */}
          <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminLayout><Admin /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute adminOnly={true}><AdminLayout><Admin /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute adminOnly={true}><AdminLayout><Admin /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/communicate" element={<ProtectedRoute adminOnly={true}><AdminLayout><Admin /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/support" element={<ProtectedRoute adminOnly={true}><AdminLayout><Support /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute adminOnly={true}><AdminLayout><Admin /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/logs" element={<ProtectedRoute adminOnly={true}><AdminLayout><Admin /></AdminLayout></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
