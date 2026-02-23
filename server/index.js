
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// MongoDB Integration
import mongoose from 'mongoose';
import { User, TrackingLink, BrandProfile, Plan, Ticket, Setting, RedditReply, RedditPost, SystemLog, Announcement, CancellationFeedback } from './models.js';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import multer from 'multer';
import fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_fallback_key_123';

// Connect to MongoDB
if (process.env.MONGO_URI) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB!');
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
  }
}

let settingsCache = {};
const savedData = {};

const initSettings = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const allSettings = await Setting.find({});
      allSettings.forEach(s => {
        savedData[s.key] = s.value;
        settingsCache[s.key] = s.value;
      });
      console.log(`✅ Loaded ${allSettings.length} settings from MongoDB into cache`);
    }
  } catch (e) {
    console.error('Failed to load settings from DB.', e);
  }
};

await initSettings();

// Emergency Check: Ensure primary admin is never suspended
if (process.env.ADMIN_EMAIL) {
  try {
    const adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (adminUser && (adminUser.isSuspended || adminUser.status !== 'Active')) {
      await User.updateOne(
        { email: process.env.ADMIN_EMAIL },
        { $set: { isSuspended: false, status: 'Active', statusMessage: '' } }
      );
      console.log(`🛡️ Emergency: Primary admin ${process.env.ADMIN_EMAIL} has been unsuspended.`);
    }

    // AGGRESSIVE SYNC: Force Professional Email Templates if DB version is outdated or plain-text
    const dbEmailTemplates = await Setting.findOne({ key: 'emailTemplates' });
    if (dbEmailTemplates && dbEmailTemplates.value) {
      const psTemplate = dbEmailTemplates.value.payment_success?.body || "";
      // If the DB version is old (doesn't contain the receipt box structure), wipe it.
      if (!psTemplate.includes('Receipt #') || !psTemplate.includes('Total Paid:') || !dbEmailTemplates.value.password_updated) {
        await Setting.deleteOne({ key: 'emailTemplates' });
        console.log('🚮 Aggressive Sync: Outdated/Plain email templates wiped from DB. System will now use Premium HTML templates.');
        delete settingsCache.emailTemplates;
      }
    }

    // CRITICAL FIX: Convert dailyUsage from String to Number for all users to support atomic $inc
    const usersWithStrUsage = await User.find({ dailyUsage: { $type: "string" } });
    if (usersWithStrUsage.length > 0) {
      console.log(`🧹 Cleaning up ${usersWithStrUsage.length} users with string dailyUsage...`);
      for (const u of usersWithStrUsage) {
        await User.updateOne({ _id: u._id }, { $set: { dailyUsage: Number(u.dailyUsage) || 0 } });
      }
      console.log('✅ Cleanup complete.');
    }
  } catch (err) {
    console.error('Failed to run startup safeguards:', err);
  }
}

// Email Templates Logic (removed older seeder call to avoid duplication with setupAdmin below)

const loadSettings = () => settingsCache;

const saveSettings = (data) => {
  if (data) {
    Object.assign(settingsCache, data);
    for (const [key, value] of Object.entries(data)) {
      Setting.findOneAndUpdate({ key }, { value }, { upsert: true }).exec().catch(err => console.error('Failed to save setting:', key, err));
    }
  }
};

// ─── Email Service Logic ───────────────────────────────────────────────
const DEFAULT_EMAIL_TEMPLATES = {
  'welcome': {
    name: 'Welcome Email',
    subject: 'Welcome to Redditgo! 🚀',
    body: `<h1>Welcome, {{name}}!</h1><p>We're thrilled to have you here. Redditgo is designed to help you scale your Reddit outreach authentically.</p><p>Get started by connecting your Reddit account in the dashboard.</p><p>Best,<br/>The Redditgo Team</p>`,
    active: true
  },
  'reset_password': {
    name: 'Reset Password',
    subject: 'Reset your password - Redditgo',
    body: `<h1>Password Reset Request</h1><p>You requested a password reset. Click the button below to set a new password:</p><p><a href="{{reset_link}}" style="background:#EA580C;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Reset Password</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
    active: true
  },
  'payment_success': {
    name: 'Payment Successful',
    subject: 'Payment Successful! 🎉',
    body: `<h1>Thank you for your purchase!</h1>
    <p>Your subscription to <strong>{{plan_name}}</strong> is now active. Here are your transaction details:</p>
    <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 20px; padding: 30px; margin: 25px 0; font-family: sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #0f172a; font-size: 20px;">Receipt #{{transaction_id}}</h2>
        <span style="font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Official Invoice</span>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; color: #64748b;">Plan:</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #0f172a;">{{plan_name}} Plan</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #64748b;">Credits Added:</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #0f172a;">{{credits_added}} AI Credits</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #64748b;">Total Balance:</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #0f172a;">{{final_balance}} AI Credits</td>
        </tr>
        <tr style="border-top: 1px dashed #e2e8f0;">
          <td style="padding: 20px 0 0 0; font-size: 18px; font-weight: bold; color: #0f172a;">Total Paid:</td>
          <td style="padding: 20px 0 0 0; text-align: right; font-size: 18px; font-weight: 900; color: #EA580C;">{{amount}} {{currency}}</td>
        </tr>
      </table>
    </div>
    <p>A persistent copy of this invoice is always available in your <a href="{{settings_url}}">billing portal</a>.</p>`,
    active: true
  },
  'low_credits': {
    name: 'Low Credits Warning',
    subject: 'Low Credits Warning ⚠️',
    body: `<h1>Running low on credits!</h1><p>Hi {{name}}, your credit balance is down to {{balance}}.</p><p>To ensure your outreach doesn't stop, consider topping up or upgrading your plan.</p>`,
    active: true
  },
  'ticket_created': {
    name: 'Ticket Confirmation',
    subject: 'Support Ticket Received #{{ticket_id}}',
    body: `<h1>We've received your ticket!</h1><p>Hi {{name}}, thanks for reaching out. Our team is looking into your issue: <strong>{{subject}}</strong></p><p>You'll receive an email when we reply.</p>`,
    active: true
  },
  'admin_reply': {
    name: 'Admin Reply',
    subject: 'New Reply to Ticket #{{ticket_id}}',
    body: `<h1>You have a new reply!</h1><p>Hi {{name}}, an admin has replied to your ticket "<strong>{{subject}}</strong>":</p><div style="padding: 15px; background: #f3f4f6; border-radius: 10px; margin: 15px 0;">{{reply_message}}</div>`,
    active: true
  },
  'verify_email': {
    name: 'Verify Email',
    subject: 'Action Required: Verify your email - Redditgo',
    body: `<h1>Welcome to Redditgo, {{name}}!</h1><p>Please confirm your email address to activate your account and start your outreach journey.</p><p><a href="{{verify_link}}" style="background:#EA580C;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Verify Email</a></p><p>This link will expire in 24 hours.</p>`,
    active: true
  },
  'two_factor_code': {
    name: '2FA Verification Code',
    subject: 'Your Verification Code - Redditgo',
    body: `<h1>Verification Code</h1><p>Hi {{name}},</p><p>We received a login attempt for your account. Use the following code to complete your login:</p><div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #EA580C; margin: 20px 0;">{{code}}</div><p>This code will expire in 10 minutes. If you did not attempt to log in, please ignore this email or change your password.</p>`,
    active: true
  },
  'account_status_changed': {
    name: 'Account Status Update',
    subject: 'Important: Your account status has been updated - Redditgo',
    body: `<h1>Account Status Update</h1><p>Hi {{name}},</p><p>Your account status has been changed to: <strong>{{status}}</strong></p><p><strong>Reason:</strong> {{reason}}</p><p>If you believe this is a mistake, please contact our support team.</p>`,
    active: true
  },
  'plan_expired': {
    name: 'Subscription Expired',
    subject: 'Your subscription has expired - Redditgo',
    body: `<h1>Subscription Expired</h1><p>Hi {{name}}, your premium subscription has expired. You have been returned to the <strong>Starter</strong> plan.</p><p>To continue using premium features and higher limits, please upgrade your plan.</p><p><a href="{{upgrade_link}}" style="background:#EA580C;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Upgrade Plan</a></p>`,
    active: true
  },
  'cancellation_confirmed': {
    name: 'Cancellation Confirmed',
    subject: 'Stripe/PayPal Auto-Renewal Cancelled',
    body: `<h1>Auto-Renewal Cancelled</h1>
    <p>Hi {{name}}, we've received your request to stop the automatic renewal of your subscription.</p>
    <p>Your current <strong>{{plan_name}}</strong> benefits and your remaining credits will remain active until <strong>{{expiry_date}}</strong>.</p>
    <p>After this date, your account will move to the free Starter plan and you won't be charged again.</p>
    <p>We're sorry to see you go! You can reactivate your subscription at any time in your <a href="{{settings_url}}">Account Settings</a>.</p>`,
    active: true
  },
  'plan_expired_notice': {
    name: 'Subscription Ended',
    subject: 'Your Redditgo subscription has ended',
    body: `<h1>Subscription Period Ended</h1>
    <p>Hi {{name}}, your subscription to <strong>{{plan_name}}</strong> has now expired.</p>
    <p>Your account has been moved to the Starter plan. If you had remaining credits, they are still available in your account balance for future use.</p>
    <p>We hope to see you back soon! To keep using premium features, you can upgrade at any time.</p>
    <p><a href="{{upgrade_link}}" style="background:#EA580C;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">View Pricing Plans</a></p>`,
    active: true
  },
  'deletion_scheduled': {
    name: 'Account Deletion Scheduled',
    subject: 'Action Required: Your account is scheduled for deletion',
    body: `<h1>Account Deletion Scheduled</h1>
    <p>Hi {{name}}, we've received your request to delete your account.</p>
    <p>Your account and all associated data are scheduled to be permanently removed on <strong>{{deletion_date}}</strong>.</p>
    <p><strong>Note:</strong> If you change your mind, simply log back into your account before this date to cancel the deletion request.</p>
    <p>If you did not request this, please contact support immediately or log in to secure your account.</p>`,
    active: true
  },
  'refund_processed': {
    name: 'Refund Success',
    subject: 'Refund Processed - Redditgo',
    body: `<h1>Refund Processed</h1><p>Hi {{name}}, we have successfully processed your refund for transaction <strong>{{transaction_id}}</strong>.</p><p>As a result, your account has been returned to the Starter plan. If you have any questions, please reply to this email.</p>`,
    active: true
  },
  'deletion_cancelled': {
    name: 'Account Deletion Cancelled',
    subject: 'Confirmation: Your account deletion request has been cancelled',
    body: `<h1>Deletion Request Cancelled</h1>
    <p>Hi {{name}},</p>
    <p>This email confirms that your request to delete your Redditgo account has been successfully cancelled.</p>
    <p>Your account is now fully active, and all your data and credits remain intact. You can continue using our services as usual.</p>
    <p>If you have any questions or did not authorize this action, please contact our support team immediately.</p>`,
    active: true
  },
  'plan_upgraded': {
    name: 'Plan Upgraded',
    subject: 'Your account has been upgraded! 🚀',
    body: `<h1>Plan Upgraded Successfully</h1>
    <p>Hi {{name}},</p>
    <p>This is a confirmation that your account has been upgraded to the <strong>{{plan_name}}</strong> plan by an administrator.</p>
    <p>Your new credit balance is: <strong>{{credits}}</strong></p>
    <p>You can now enjoy all the benefits of your new plan. If you have any questions about this change, please contact our support team.</p>
    <p><a href="{{settings_url}}" style="background:#EA580C;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">View Account Settings</a></p>`,
    active: true
  },
  'plan_changed': {
    name: 'Plan Changed',
    subject: 'Your Redditgo plan has been updated! 🔄',
    body: `<h1>Plan Updated</h1>
    <p>Hi {{name}},</p>
    <p>We're confirming that your account has been successfully switched to the <strong>{{plan_name}}</strong> plan.</p>
    <p>Any previous subscription benefits have been updated according to your new plan. Your current credit balance is: <strong>{{credits}}</strong></p>
    <p>If you have any questions about this change, we're here to help!</p>
    <p><a href="{{settings_url}}" style="background:#EA580C;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">View Your Dashboard</a></p>`,
    active: true
  },
  'two_factor_updated': {
    name: '2FA Status Updated',
    subject: 'Security Alert: 2FA settings changed - Redditgo',
    body: `<h1>2FA Status Updated</h1><p>Hi {{name}},</p><p>This is a security notification to inform you that Two-Factor Authentication (2FA) has been <strong>{{status}}</strong> on your account at {{time}}.</p><p>If you did not perform this action, please secure your account immediately by changing your password.</p>`,
    active: true
  },
  'password_updated': {
    name: 'Password Updated',
    subject: 'Security Alert: Password changed - Redditgo',
    body: `<h1>Password Updated</h1><p>Hi {{name}},</p><p>Your account password was successfully changed on {{time}}.</p><p>If you did not perform this action, please contact our support team immediately.</p>`,
    active: true
  }
};

const getEmailTemplates = () => {
  const cached = settingsCache.emailTemplates || {};
  const merged = { ...DEFAULT_EMAIL_TEMPLATES };
  for (const key in cached) {
    if (cached[key]) merged[key] = { ...merged[key], ...cached[key] };
  }
  return merged;
};

// --- Helper: Check for Low Credits ---
const checkLowCredits = async (user) => {
  if (user.role === 'admin') return;
  const credits = user.credits || 0;
  if (credits <= 20 && !user.lowCreditsNotified) {
    await sendEmail('low_credits', user.email, {
      name: user.name || 'there',
      balance: credits.toString(),
      upgrade_link: `${process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000'}/pricing`
    });
    user.lowCreditsNotified = true;
    await user.save();
    addSystemLog('INFO', `Low credits alert sent to ${user.email}`);
  } else if (credits > 20 && user.lowCreditsNotified) {
    user.lowCreditsNotified = false;
    await user.save();
  }
};

// --- Global Health Check (Subscription Expiration & Deletion) ---
let lastGlobalCheck = 0;
const runGlobalCheck = async () => {
  const now = Date.now();
  // Only run once per hour
  if (now - lastGlobalCheck < 3600000) return;
  lastGlobalCheck = now;

  try {
    const today = new Date();

    // 1. Handle Expired Subscriptions
    const expiredUsers = await User.find({
      plan: { $ne: 'Starter' },
      subscriptionEnd: { $lt: today }
      // Removed autoRenew: false check because automated rebilling is not yet implemented.
      // All expired accounts must be downgraded to prevent infinite free premium access.
    });

    for (const u of expiredUsers) {
      const oldPlan = u.plan;
      u.plan = 'Starter';
      u.status = 'Active';
      // In the Starter plan, we reset daily usage points
      u.dailyUsagePoints = 0;
      await u.save();

      await sendEmail('plan_expired_notice', u.email, {
        name: u.name || 'User',
        plan_name: oldPlan,
        upgrade_link: `${process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000'}/pricing`
      });
      addSystemLog('INFO', `Subscription for ${u.email} expired and moved to Starter.`);
    }

    // 2. Handle Scheduled Deletions (14-day period)
    const usersToDelete = await User.find({
      deletionScheduledDate: { $lt: today }
    });

    for (const u of usersToDelete) {
      addSystemLog('WARN', `Deleting user account ${u.email} after 14-day cooling period.`);

      // CASCADE DELETION: Clean up all associated data
      const userId = u.id || u._id;
      await Promise.all([
        BrandProfile.deleteMany({ userId: userId.toString() }),
        RedditReply.deleteMany({ userId: userId.toString() }),
        RedditPost.deleteMany({ userId: userId.toString() }),
        TrackingLink.deleteMany({ userId: userId.toString() }),
        User.deleteOne({ _id: u._id })
      ]);

      addSystemLog('SUCCESS', `Cascading deletion complete for ${u.email}. All associated data removed.`);
    }

  } catch (err) {
    console.error('Error in runGlobalCheck:', err);
  }
};

const sendEmail = async (templateId, to, variables = {}) => {
  try {
    const templates = getEmailTemplates();
    const template = templates[templateId];

    if (!template || !template.active) return;

    if (!smtpSettings || !smtpSettings.host) {
      console.warn('[EMAIL] SMTP not configured. Skipping email.');
      return;
    }

    const port = parseInt(smtpSettings.port) || 587;
    // port 465 => implicit SSL (secure: true), other ports => STARTTLS (secure: false + requireTLS)
    const useImplicitSSL = smtpSettings.secure && port === 465;
    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: port,
      secure: useImplicitSSL,
      ...((!useImplicitSSL && smtpSettings.secure) ? { requireTLS: true } : {}),
      auth: {
        user: smtpSettings.user,
        pass: smtpSettings.pass
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      }
    });

    let subject = template.subject;
    let body = template.body;

    // Replace variables (Robust regex handles whitespace: {{ key }} or {{key}})
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, String(value));
    });

    const mailOptions = {
      from: smtpSettings.from || `"Redditgo" <${smtpSettings.user}>`,
      to,
      subject,
      html: `
        <div style="font-family: 'Inter', sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #EA580C; margin: 0;">Redditgo</h1>
          </div>
          <div style="line-height: 1.6;">
            ${body}
          </div>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 12px;">
            © ${new Date().getFullYear()} Redditgo. All rights reserved.
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    addSystemLog('INFO', `Email sent: ${templateId} to ${to}`, { messageId: info.messageId });
    return info;
  } catch (err) {
    addSystemLog('ERROR', `Email failed: ${templateId} to ${to}`, { error: err.message });
    console.error('[EMAIL ERROR]', err);
  }
};

const app = express();
app.set('trust proxy', 1); // Trust first proxy (EasyPanel/Nginx)
const PORT = process.env.PORT || 3001;

// --- Multer Configuration ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed'));
  }
});

// --- 1. Basic Security & CORS ---
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// --- 2. Webhook (Needs Raw Body) ---
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
  const sig = request.headers['stripe-signature'];
  const stripe = getStripe();
  const stripeSettings = loadSettings().stripe || {};

  let event;

  try {
    if (stripeSettings.webhookSecret && stripe && sig) {
      event = stripe.webhooks.constructEvent(request.body, sig, stripeSettings.webhookSecret);
    } else {
      addSystemLog('WARN', '[Webhook] Received without verification (Dev or Missing Secret)');
      console.log('[Webhook] Received without verification (Dev or Missing Secret)');
      event = JSON.parse(request.body.toString());
    }
  } catch (err) {
    addSystemLog('ERROR', `[Webhook] Signature verification failed: ${err.message}`);
    console.error('[Webhook] Signature verification failed.', err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  addSystemLog('INFO', `[Webhook] Event: ${event.type}`);
  console.log(`[Webhook] Event: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userEmail, plan, credits, billingCycle } = session.metadata || {};
    const stripeCustomerEmail = session.customer_details?.email;
    const emailToSearch = userEmail || stripeCustomerEmail;

    await applyPlanToUser({
      email: emailToSearch,
      planName: plan,
      billingCycle: billingCycle,
      transactionId: session.id,
      gateway: 'stripe',
      amount: (session.amount_total || 0) / 100,
      currency: session.currency || 'USD',
      metadata: { credits }
    });
  } else if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const email = charge.billing_details?.email || charge.receipt_email;
    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;

    // Try to find the session related to this charge if possible, or use email
    if (email) {
      await revokePlanFromUser({
        email: email,
        transactionId: paymentIntentId, // Usually matches the transaction ID stored
        gateway: 'stripe',
        reason: 'refund'
      });
    }
  } else if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object;
    // Disputes are serious, we revoke access immediately
    const email = dispute.billing_details?.email;
    if (email) {
      await revokePlanFromUser({
        email,
        transactionId: dispute.charge,
        gateway: 'stripe',
        reason: 'dispute'
      });
    }
  }

  response.send();
});

// --- PayPal Webhook ---
app.post('/api/paypal/webhook', express.json(), async (req, res) => {
  try {
    const event = req.body;
    const { webhookId, isSandbox } = paypalSettings;

    addSystemLog('INFO', `[PayPal Webhook] Received: ${event.event_type}`, { id: event.id });

    // Verify PayPal Webhook Signature
    if (webhookId && req.headers['paypal-transmission-id']) {
      try {
        const accessToken = await getPaypalAccessToken();
        const verificationUrl = isSandbox
          ? "https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature"
          : "https://api-m.paypal.com/v1/notifications/verify-webhook-signature";

        const verificationPayload = {
          transmission_id: req.headers['paypal-transmission-id'],
          transmission_time: req.headers['paypal-transmission-time'],
          cert_url: req.headers['paypal-cert-url'],
          auth_algo: req.headers['paypal-auth-algo'],
          transmission_sig: req.headers['paypal-transmission-sig'],
          webhook_id: webhookId,
          webhook_event: event
        };

        const vRes = await fetch(verificationUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(verificationPayload)
        });

        if (vRes.ok) {
          const vData = await vRes.json();
          if (vData.verification_status !== 'SUCCESS') {
            addSystemLog('WARN', '[PayPal Webhook] Signature verification failed', { status: vData.verification_status });
            if (!isSandbox) {
              console.warn('[PayPal] Webhook signature verification failed. Rejecting.');
              return res.status(400).send('Verification Failed');
            }
          }
        }
      } catch (vErr) {
        console.error('[PayPal Webhook Verification Error]', vErr);
        // Continue in sandbox for ease of testing
        if (!isSandbox) return res.status(500).send('Verification Process Error');
      }
    } else if (!isSandbox) {
      addSystemLog('WARN', '[PayPal Webhook] Received without headers or Webhook ID in Production');
      return res.status(400).send('Webhook ID missing');
    }

    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = event.resource;
      const captureId = resource.id;
      const orderId = resource.supplementary_data?.related_ids?.order_id;

      // Look for custom_id in the capture resource or supplementary data
      const customId = resource.custom_id || resource.purchase_units?.[0]?.custom_id;

      if (customId) {
        try {
          const { userId, planId, billingCycle } = JSON.parse(customId);
          const user = await User.findOne({ id: userId });
          const plan = await Plan.findOne({ id: planId });

          if (user && plan) {
            await applyPlanToUser({
              email: user.email,
              planName: plan.name,
              billingCycle: billingCycle,
              transactionId: orderId || captureId,
              gateway: 'paypal',
              amount: parseFloat(resource.amount?.value || 0),
              currency: resource.amount?.currency_code || 'USD',
              metadata: { credits: plan.credits }
            });
          }
        } catch (parseErr) {
          console.error('[PayPal Webhook] Success Parse Error:', parseErr);
        }
      }
    } else if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
      const resource = event.resource;
      const orderId = resource.supplementary_data?.related_ids?.order_id;

      // For refunds, we need to find the user by transaction ID in our records
      const userWithTx = await User.findOne({ "transactions.id": orderId });
      if (userWithTx) {
        await revokePlanFromUser({
          email: userWithTx.email,
          transactionId: orderId,
          gateway: 'paypal',
          reason: 'refund'
        });
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[PayPal Webhook Error]', err);
    res.status(500).send('Webhook Error');
  }
});

// --- 3. Body Parsing & Sanitization (AFTER Webhook) ---
app.use(express.json());
app.use(mongoSanitize());

// --- 4. Rate Limiting ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);


// --- System Logging (MongoDB) ---
const addSystemLog = async (level, message, metadata = {}) => {
  try {
    const logEntry = new SystemLog({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      timestamp: new Date(),
      level: level.toUpperCase(),
      message,
      metadata
    });
    await logEntry.save();

    // Optional: Keep only last 2000 logs in DB to prevent bloating
    // This is better done as a periodic task, but for now we'll just insert.
    return logEntry;
  } catch (err) {
    console.error('Failed to save system log to DB:', err);
  }
};

// Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path.replace(/\/$/, '');

  // Log request start
  // console.log(`[${new Date().toISOString()}] ${req.method} ${path}`);

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    let logLevel = 'INFO';
    if (res.statusCode >= 400) logLevel = 'WARN';
    if (res.statusCode >= 500) logLevel = 'ERROR';

    // Don't flood logs with health checks or static assets if any
    if (path === '/api/health') return;

    addSystemLog(logLevel, `${req.method} ${path}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      user: req.userEmail || 'Guest'
    });
  });

  if (req.method === 'POST' && !path.includes('/api/webhook')) {
    // console.log('Body:', JSON.stringify(req.body));
  }
  next();
});

// JSON Error Handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    addSystemLog('ERROR', 'Invalid JSON payload received', { ip: req.ip });
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next();
});

// Data Models are now managed by MongoDB schemas in models.js


// ─── Tracking Redirector ──────────────────────────────────────────────────
app.get(['/t/:id', '/t/:id/'], async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = id.replace(/\/$/, '').toLowerCase();

    const link = await TrackingLink.findOne({ id: new RegExp('^' + cleanId + '$', 'i') });

    if (!link) {
      console.warn(`[TRACKING] 404 - Link not found: ${cleanId}`);
      addSystemLog('WARN', `Tracking link not found: ${cleanId}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestedUrl: req.originalUrl
      });
      return res.status(404).send("Tracking link not found");
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = (req.headers['x-forwarded-for'] || req.ip || 'unknown').split(',')[0].trim();

    // 1. Basic Bot Detection
    const bots = /bot|crawler|spider|slurp|facebookexternalhit|whatsapp|linkpreview/i;
    const isBot = bots.test(userAgent);

    // 2. Simple OS Detection
    let os = 'Unknown OS';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    else if (userAgent.includes('Macintosh')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';

    // 3. Anti-Spam Check (Ignore clicks from same IP within 10 seconds for the same link)
    if (!link.clickDetails) link.clickDetails = [];
    const lastClick = link.clickDetails.length > 0 ? link.clickDetails[link.clickDetails.length - 1] : null;
    const isSpam = lastClick && lastClick.ip === ip && (now.getTime() - new Date(lastClick.timestamp).getTime() < 10000);

    // 4. Expanded Geo Lookup
    let country = '', city = '', region = '';
    try {
      if (ip && ip !== 'unknown' && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,regionName`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          country = geoData.country || '';
          city = geoData.city || '';
          region = geoData.regionName || '';
        }
      }
    } catch (err) {
      console.error('[TRACKING] Geo-lookup failed:', err);
    }

    // 5. Update Link Data
    // Only increment global clicks if it's a real user and not a rapid repeat
    if (!isBot && !isSpam) {
      link.clicks = (Number(link.clicks) || 0) + 1;
    }

    link.clickDetails.push({
      timestamp: nowIso,
      userAgent: userAgent,
      referer: req.headers['referer'] || 'direct',
      ip: ip,
      country: country,
      city: city,
      region: region,
      os: os,
      isBot: isBot,
      isSpam: isSpam
    });
    link.lastClickedAt = nowIso;


    if (link.clickDetails.length > 10000) {
      link.clickDetails = link.clickDetails.slice(-10000);
    }

    link.markModified('clickDetails');
    await link.save();

    addSystemLog('INFO', `Tracking Click: ${cleanId} [Total: ${link.clicks}]`, {
      id: cleanId,
      url: link.originalUrl,
      userId: link.userId,
      subreddit: link.subreddit
    });
    console.log(`[TRACKING DATA] Click Recorded: ${cleanId} | New Total: ${link.clicks} | User: ${link.userId}`);

    res.redirect(302, link.originalUrl);
  } catch (e) {
    res.status(500).send("Error");
  }
});

// ─── Create Tracking Link ──────────────────────────────────────────────────
app.post('/api/tracking/create', async (req, res) => {
  try {
    const { userId, originalUrl, subreddit, postId, type } = req.body;
    if (!userId || !originalUrl) return res.status(400).json({ error: 'Missing required fields' });

    const user = await User.findOne({ id: userId.toString() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userPlan = await Plan.findOne({ $or: [{ id: user.plan }, { name: user.plan }] });

    if (user.role !== 'admin' && userPlan && userPlan.allowTracking === false) {
      return res.status(403).json({ error: 'Link tracking is not included in your current plan.' });
    }

    let baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;

    const id = Math.random().toString(36).substring(2, 8);
    const trackingUrl = `${baseUrl}/t/${id}`;

    const newLink = new TrackingLink({
      id,
      userId: userId.toString(),
      originalUrl,
      trackingUrl,
      subreddit,
      postId,
      type,
      createdAt: new Date().toISOString(),
      clicks: 0,
      clickDetails: []
    });

    await newLink.save();
    console.log(`[TRACKING] Created Link: ${id} | User: ${userId} | Target: ${originalUrl}`);
    res.json({ id, trackingUrl });
  } catch (e) {
    console.error('Create tracking tracking link error: ', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tracking/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userLinks = await TrackingLink.find({ userId: userId.toString() }).sort({ createdAt: -1 });
    res.json(userLinks);
  } catch (e) {
    console.error('Fetch user tracking link error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Superuser enforcement
const setupAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) return;

    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      adminUser = new User({
        id: 'admin-' + Math.random().toString(36).substring(2, 7),
        name: 'Super Admin',
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        status: 'Active',
        plan: 'Professional',
        credits: 100000,
        hasCompletedOnboarding: true
      });
      await adminUser.save();
      console.log(`✅ Default Admin user (${adminEmail}) created successfully!`);
    } else {
      // Force verified and admin role for the designated email
      let needsSave = false;
      if (adminUser.role !== 'admin') { adminUser.role = 'admin'; needsSave = true; }
      if (!adminUser.isVerified) { adminUser.isVerified = true; needsSave = true; }
      if (!adminUser.hasCompletedOnboarding) { adminUser.hasCompletedOnboarding = true; needsSave = true; }

      if (needsSave) await adminUser.save();
      console.log(`--- ADMIN ACCOUNT READY: ${adminEmail} ---`);
    }
  } catch (e) {
    console.error('Error setting up admin account:', e);
  }
};
setupAdmin();

// ─── Middleware & Logic ───

// General Auth Middleware to enforce Bans/Suspensions on every request
const generalAuth = async (req, res, next) => {
  const path = req.path.replace(/\/$/, '');

  // Run Global Check periodically (hourly)
  runGlobalCheck().catch(e => console.error('Global check error:', e));

  // Exempt public routes explicitly
  const publicRoutes = ['/api/auth/login', '/api/auth/resend-2fa', '/api/auth/verify-2fa', '/api/auth/signup', '/api/auth/verify-email', '/api/auth/resend-verification', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/health', '/api/webhook', '/api/paypal/webhook'];
  if (publicRoutes.includes(path)) return next();

  // Try to extract user from token or ID
  const authHeader = req.headers.authorization;
  let userId = req.body?.userId || req.query?.userId || req.params?.id;
  let decodedUser = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      decodedUser = jwt.verify(token, JWT_SECRET);
      if (!userId) userId = decodedUser.id;
    } catch (e) {
      // Token invalid or expired
    }
  }

  // If we have a userId, check status
  if (userId) {
    try {
      const user = await User.findOne({
        $or: [{ id: userId.toString() }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
      });

      if (user) {
        req.userEmail = user.email;
        req.user = user; // Attach user object to request for easier access

        // 🛑 Handle Suspensions/Bans
        if (user.status === 'Banned' || user.status === 'Suspended' || user.isSuspended) {
          console.log(`[AUTH] Blocked ${user.status} user: ${user.email}`);
          return res.status(403).json({
            error: `Your account has been ${user.status === 'Suspended' || user.isSuspended ? 'suspended' : 'banned'}.`,
            reason: user.statusMessage || 'Contact support for details.'
          });
        }

        // 🔄 Handle Account Deletion Status
        if (user.deletionScheduledDate) {
          // Keep the info in logs, but don't cancel it here.
          // The user must cancel it manually from the settings page.
          console.log(`[AUTH] User ${user.email} is pending deletion.`);
        }
      }
    } catch (e) {
      console.error('Error in generalAuth:', e);
    }
  }

  // Admin check
  if (decodedUser?.role === 'admin' || req.user?.role === 'admin') {
    req.isAdmin = true;
  }

  next();
};

app.use(generalAuth);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: new RegExp('^' + email + '$', 'i') });

    if (user) {
      let isMatch = false;
      if (user.password.startsWith('$2')) {
        // It's a bcrypt hash
        isMatch = await bcrypt.compare(password, user.password);
      } else {
        // Plain text legacy fallback
        isMatch = (user.password === password);
        if (isMatch) {
          user.password = await bcrypt.hash(password, 10);
          await user.save();
        }
      }

      if (!isMatch) {
        addSystemLog('WARN', `Failed login attempt (wrong password) for: ${email}`);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Check if user is banned or suspended
      if (user.status === 'Banned' || user.status === 'Suspended') {
        addSystemLog('WARN', `[LOGIN] Blocked ${user.status} user: ${user.email}`);
        console.log(`[LOGIN] Blocked ${user.status} user: ${user.email}`);
        return res.status(403).json({
          error: `Your account has been ${user.status.toLowerCase()}.`,
          reason: user.statusMessage || 'No specific reason provided.'
        });
      }

      // Check if user is verified
      if (!user.isVerified) {
        return res.status(403).json({
          error: 'Email not verified.',
          reason: 'Please check your inbox to verify your email address before logging in.',
          isUnverified: true
        });
      }

      let updated = false;
      if (user.subscriptionEnd && new Date() > new Date(user.subscriptionEnd)) {
        addSystemLog('INFO', `[Subscription] User ${user.email} subscription expired. Downgrading to Starter.`);

        const oldPlan = user.plan;
        user.plan = 'Starter';
        // We preserve remaining credits instead of resetting them to default starter credits
        // This is more user-friendly as they paid for those credits.
        user.status = 'Active';
        user.autoRenew = true; // Default for free plan
        user.subscriptionEnd = null; // No end date for free plan
        updated = true;

        sendEmail('plan_expired_notice', user.email, {
          name: user.name || 'there',
          plan_name: oldPlan,
          upgrade_link: `${process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000'}/pricing`
        }).catch(err => console.error('Error sending expiration email:', err));
      }

      if (updated) {
        await user.save();
      }

      // Check for 2FA
      if (user.twoFactorEnabled) {
        const crypto = await import('crypto');
        const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.twoFactorCode = mfaCode;
        user.twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        await user.save();

        await sendEmail('two_factor_code', user.email, {
          name: user.name || 'there',
          code: mfaCode
        });

        addSystemLog('INFO', `2FA Code sent to ${user.email}`);
        return res.json({ requires2fa: true, email: user.email });
      }

      addSystemLog('INFO', `User logged in: ${user.email}`, { userId: user.id || user._id, role: user.role });

      const userObj = user.toObject();
      delete userObj.password;
      userObj.id = user.id || user._id.toString();

      // Implement real JWT
      const payload = { id: userObj.id, email: userObj.email, role: userObj.role };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      res.json({ user: userObj, token });
    } else {
      addSystemLog('WARN', `Failed login attempt for: ${email}`);
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/resend-2fa', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: new RegExp('^' + email + '$', 'i') });
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ error: 'User not found or 2FA not enabled' });
    }

    // Rate limit
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!checkRateLimit(ip, user.email, 'resend_2fa')) {
      return res.status(429).json({ error: 'Too many requests. Please try again after 15 minutes.' });
    }

    const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.twoFactorCode = mfaCode;
    user.twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendEmail('two_factor_code', user.email, {
      name: user.name || 'there',
      code: mfaCode
    });

    addSystemLog('INFO', `2FA Code resent to ${user.email}`);
    res.json({ success: true, message: 'Verification code resent!' });
  } catch (err) {
    console.error('Resend 2FA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: new RegExp('^' + email + '$', 'i') });
    if (existingUser) {
      if (existingUser.status === 'Banned' || existingUser.status === 'Suspended') {
        addSystemLog('WARN', `[SIGNUP] Blocked signup attempt for banned email: ${email}`);
        console.log(`[SIGNUP] Blocked ${existingUser.status} user: ${existingUser.email}`);
        return res.status(403).json({
          error: `Your account has been ${existingUser.status.toLowerCase()}.`,
          reason: existingUser.statusMessage || 'Contact support for details.'
        });
      }
      addSystemLog('WARN', `Signup failed: Email already exists (${email})`);
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const tempId = Math.random().toString(36).substring(2, 9);

    const crypto = await import('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = new User({
      id: tempId,
      name,
      email,
      password: hashedPassword,
      role: 'user',
      plan: 'Starter',
      billingCycle: 'monthly',
      status: 'Active',
      credits: 100, // Grant initial credits upon signup
      subscriptionStart: new Date().toISOString(),
      subscriptionEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
      hasCompletedOnboarding: false,
      dailyUsage: 0,
      dailyUsagePoints: 0,
      customDailyLimit: 0,
      lastUsageDate: new Date().toISOString().split('T')[0],
      transactions: [],
      usageStats: { fill: true },
      isVerified: false,
      verificationToken: verificationToken,
      verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    await newUser.save();
    addSystemLog('SUCCESS', `New user registered (unverified): ${email}`, { userId: newUser.id || newUser._id });

    // Build verification link
    const host = req.get('host');
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
    const verifyLink = `${baseUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    // Send Verification Email
    sendEmail('verify_email', email, { name: name || 'there', verify_link: verifyLink });

    // Don't log them in yet, they must verify first
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.'
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// ─── Rate Limiting for Emails ───
const emailRateLimits = new Map();

const checkRateLimit = (ip, email, action) => {
  const key = `${action}_${ip}_${email}`;
  const now = Date.now();
  const limitWindow = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 3;

  if (!emailRateLimits.has(key)) {
    emailRateLimits.set(key, { count: 1, resetAt: now + limitWindow });
    return true; // allowed
  }

  const record = emailRateLimits.get(key);
  if (now > record.resetAt) {
    emailRateLimits.set(key, { count: 1, resetAt: now + limitWindow });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // blocked
  }

  record.count += 1;
  return true;
};

// ─── Auth Endpoints ───

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token, email } = req.body;
    if (!token || !email) {
      return res.status(400).json({ error: 'Token and email are required' });
    }

    const user = await User.findOne({
      email: new RegExp('^' + email + '$', 'i'),
      verificationToken: token,
      verificationExpires: { $gt: new Date() } // Must not be expired
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification link.' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    addSystemLog('SUCCESS', `User verified email: ${user.email}`);

    // SEND WELCOME EMAIL NOW (Upon successful verification)
    sendEmail('welcome', user.email, { name: user.name || 'there' });

    res.json({ success: true, message: 'Email successfully verified. You can now log in.' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/verify-2fa', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const user = await User.findOne({
      email: new RegExp('^' + email + '$', 'i'),
      twoFactorCode: code,
      twoFactorExpires: { $gt: new Date() }
    });

    if (!user) {
      addSystemLog('WARN', `Invalid 2FA attempt for ${email}`);
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Clear code
    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    await user.save();

    addSystemLog('INFO', `2FA Login successful: ${user.email}`);

    const userObj = user.toObject();
    delete userObj.password;
    userObj.id = user.id || user._id.toString();

    const payload = { id: userObj.id, email: userObj.email, role: userObj.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ user: userObj, token });
  } catch (err) {
    console.error('2FA Verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: new RegExp('^' + email + '$', 'i') });
    if (!user) {
      return res.status(400).json({ error: 'User not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Account is already verified.' });
    }

    // Rate Limiting
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!checkRateLimit(ip, user.email, 'resend_verify')) {
      return res.status(429).json({ error: 'Too many requests. Please try again after 15 minutes.' });
    }

    // Generate new token
    const crypto = await import('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');

    user.verificationToken = verificationToken;
    user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    const host = req.get('host');
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
    const verifyLink = `${baseUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

    await sendEmail('verify_email', user.email, { name: user.name || 'there', verify_link: verifyLink });

    res.json({ success: true, message: 'Verification email resent. Please check your inbox.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: new RegExp('^' + email + '$', 'i') });

    if (user) {
      // Rate limit check
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      if (!checkRateLimit(ip, user.email, 'forgot_password')) {
        return res.status(429).json({ error: 'Too many requests. Please try again after 15 minutes.' });
      }

      // Check if user is banned or suspended
      if (user.status === 'Banned' || user.status === 'Suspended') {
        return res.status(403).json({
          error: `Your account has been ${user.status.toLowerCase()}.`,
          reason: user.statusMessage || 'Contact support for details.'
        });
      }

      // Generate a secure random token
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save token to DB
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = expiresAt;
      await user.save();

      // Build reset link
      const host = req.get('host');
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

      addSystemLog('INFO', `[Password Reset] Token generated for: ${user.email}`);

      // Send email using the reset_password template
      const emailResult = await sendEmail('reset_password', user.email, {
        name: user.name || 'User',
        reset_link: resetLink
      });

      if (emailResult) {
        addSystemLog('SUCCESS', `[Password Reset] Email sent to: ${user.email}`);
      } else {
        addSystemLog('WARN', `[Password Reset] Email not sent (SMTP not configured?) - Token: ${resetToken}`);
        console.log(`[Password Reset] Reset link (for debug): ${resetLink}`);
      }
    }

    // Always return generic message for security (don't reveal if account exists)
    res.json({ message: 'If an account with this email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password with token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;
    if (!token || !email || !newPassword) {
      return res.status(400).json({ error: 'Token, email, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      email: new RegExp('^' + email + '$', 'i'),
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() } // token must not be expired
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset link. Please request a new one.' });
    }

    // Hash and save the new password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save(); // CRITICAL FIX: Save the new password to DB

    addSystemLog('SUCCESS', `[Password Reset] Password successfully reset for: ${user.email}`);

    // SECURITY NOTIFICATION
    sendEmail('password_updated', user.email, {
      name: user.name || 'there',
      time: new Date().toLocaleString()
    });

    res.json({ success: true, message: 'Your password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.post('/api/user/complete-onboarding', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findOne({ id: userId.toString() });

    if (user) {
      user.hasCompletedOnboarding = true;
      await user.save();
      addSystemLog('INFO', `User completed onboarding: ${user.email}`);
      res.json({
        success: true,
        hasCompletedOnboarding: true,
        credits: user.credits
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Onboarding error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/user/brand-profile', async (req, res) => {
  try {
    const { userId, ...brandData } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const user = await User.findOne({ id: userId.toString() });

    if (user) {
      let bonusAwarded = false;
      const isProfileEmpty = !user.brandProfile || Object.keys(user.brandProfile).length === 0;

      if (!user.hasCompletedOnboarding || (user.credits <= 100 && isProfileEmpty)) {
        if (!user.hasCompletedOnboarding) {
          user.credits = (user.credits || 0) + 100;
          bonusAwarded = true;
        }
      }

      user.brandProfile = brandData;
      user.hasCompletedOnboarding = true;
      user.markModified('brandProfile');

      // Ensure tracking in BrandProfile collection for completeness, though User embedded is main
      await BrandProfile.findOneAndUpdate(
        { userId: userId.toString() },
        { ...brandData, userId: userId.toString() },
        { upsert: true, new: true }
      );

      await user.save();

      console.log(`[BRAND] Profile updated for user ${userId} (${user.email}). Bonus: ${bonusAwarded}`);
      addSystemLog('INFO', `Brand profile updated for: ${user.email}`, {
        userId,
        brandName: brandData.brandName,
        bonusAwarded
      });

      res.json({
        success: true,
        credits: user.credits,
        bonusAwarded,
        brandProfile: user.brandProfile
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Brand profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

let aiSettings = savedData.ai || {
  provider: 'google',
  model: 'gemini-1.5-flash',
  temperature: 0.75,
  maxOutputTokens: 1000,
  systemPrompt: `IDENTITY: You are a Reddit growth expert acting as a highly helpful, authentic power-user. You don't sell; you solve.

CORE STRATEGY:
1. VALUE FIRST: Address the OP's pain point immediately with a non-obvious, actionable insight.
2. AUTHENTICITY: Write like a human — vary sentence length, use contractions (it's, I've), and avoid corporate jargon.
3. SUBTLE MARKETING: Mention the product only if it directly solves a problem mentioned. Frame it as "I found this tool" or "I've been using X for this".
4. ANTI-AI RULES: Never use "Great question!", "leverage", "game-changer", "delve into", or "hope this helps".

STRUCTURE:
- Hook: Direct answer or relatable comment.
- Meat: 1-2 specific points of value.
- The Bridge: A natural transition to the tool/brand (if applicable).
- Closing: A low-friction question or a "tldr" statement.`,
  apiKey: process.env.GEMINI_API_KEY || '',
  baseUrl: 'https://openrouter.ai/api/v1',
  creditCosts: {
    comment: 1,
    post: 2,
    image: 5
  }
};

// Ensure creditCosts always exists and is fully populated
aiSettings.creditCosts = {
  comment: Number(aiSettings.creditCosts?.comment) || 1,
  post: Number(aiSettings.creditCosts?.post) || 2,
  image: Number(aiSettings.creditCosts?.image) || 5,
  ...aiSettings.creditCosts
};

// Stripe Settings (In-memory storage for demo)
let stripeSettings = savedData.stripe || {
  publishableKey: '',
  secretKey: '',
  webhookSecret: '',
  isSandbox: true,
  enabled: true
};

// PayPal Settings
let paypalSettings = savedData.paypal || {
  clientId: '',
  secretKey: '',
  webhookId: '',
  isSandbox: true,
  enabled: false
};

// Reddit Settings (In-memory)
let redditSettings = savedData.reddit || {
  clientId: '',
  clientSecret: '',
  redirectUri: '',
  userAgent: 'RedigoApp/1.0',
  minDelay: 5,
  maxDelay: 15,
  antiSpam: true
};

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const getDynamicUserAgent = (userId) => {
  const base = redditSettings.userAgent || 'RedigoApp/1.0';
  return userId ? `${base} (UID: ${userId})` : base;
};

const getPaypalAccessToken = async () => {
  const { clientId, secretKey, isSandbox } = paypalSettings;
  const auth = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
  const url = isSandbox ? "https://api-m.sandbox.paypal.com/v1/oauth2/token" : "https://api-m.paypal.com/v1/oauth2/token";
  const response = await fetch(url, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  const data = await response.json();
  return data.access_token;
};

const createPaypalOrder = async (plan, billingCycle, user) => {
  const accessToken = await getPaypalAccessToken();
  const { isSandbox } = paypalSettings;
  const url = isSandbox ? "https://api-m.sandbox.paypal.com/v2/checkout/orders" : "https://api-m.paypal.com/v2/checkout/orders";

  const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const baseUrl = process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000';

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: price.toString(),
        },
        description: `${plan.name} Plan (${billingCycle})`,
        custom_id: JSON.stringify({
          userId: user.id,
          planId: plan.id,
          billingCycle
        })
      },
    ],
    application_context: {
      return_url: `${baseUrl}/settings?success=true&gateway=paypal`,
      cancel_url: `${baseUrl}/pricing?cancel=true`,
    }
  };

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }
  return response.json();
};

const getPlanCredits = async (planName) => {
  const plan = await Plan.findOne({ name: { $regex: new RegExp('^' + planName + '$', 'i') } });
  return plan ? plan.credits : 0;
};

const applyPlanToUser = async ({ email, planName, billingCycle, transactionId, gateway, amount, currency, metadata = {} }) => {
  try {
    const dbUser = await User.findOne({ email: new RegExp('^' + email + '$', 'i') });
    if (!dbUser) {
      console.error(`[Activation] User not found: ${email}`);
      return false;
    }

    let creditsToAdd = metadata.credits ? parseInt(metadata.credits) : await getPlanCredits(planName);

    // UPFRONT CREDITS FOR YEARLY
    if (billingCycle === 'yearly') {
      creditsToAdd = creditsToAdd * 12;
      addSystemLog('INFO', `[Activation] Yearly billing detected for ${email}. Credits: ${creditsToAdd}`);
    }

    const currentCredits = dbUser.credits || 0;

    // LOGIC FIX: Handle Subscription Extension
    // If user already has a future expiration date, add the new period to it
    // instead of resetting to Now + Period.
    let startDate = new Date();
    if (dbUser.subscriptionEnd && new Date(dbUser.subscriptionEnd) > startDate) {
      startDate = new Date(dbUser.subscriptionEnd);
      addSystemLog('INFO', `[Activation] Existing active period found for ${email}. Extending expiration date.`);
    }

    const expirationDate = new Date(startDate);
    if (billingCycle === 'yearly') expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    else expirationDate.setMonth(expirationDate.getMonth() + 1);

    dbUser.plan = planName;
    dbUser.billingCycle = billingCycle || 'monthly';
    dbUser.status = 'Active';
    dbUser.credits = currentCredits + creditsToAdd;
    dbUser.lowCreditsNotified = false;
    dbUser.subscriptionStart = new Date().toISOString(); // Tracks when the *transaction* happened
    dbUser.subscriptionEnd = expirationDate.toISOString();
    dbUser.autoRenew = true;

    if (!dbUser.transactions) dbUser.transactions = [];
    const newBalance = dbUser.credits;

    dbUser.transactions.push({
      id: transactionId,
      date: new Date().toISOString(),
      amount: amount || 0,
      currency: currency || 'USD',
      type: `${gateway}_payment`,
      description: `Payment for ${planName} (${billingCycle}) plan successful.`,
      subDescription: `Previous: ${currentCredits} + New: ${creditsToAdd} = ${newBalance} Credits`,
      creditsAdded: creditsToAdd,
      previousBalance: currentCredits,
      finalBalance: newBalance,
      planName: planName,
      gateway
    });

    await dbUser.save();
    addSystemLog('SUCCESS', `[Activation] User ${email} upgraded to ${planName} via ${gateway}`);

    const shortTxId = transactionId.startsWith('cs_') || transactionId.length > 20
      ? `INV-${transactionId.substring(transactionId.length - 8).toUpperCase()}`
      : transactionId;

    sendEmail('payment_success', email, {
      plan_name: planName,
      credits_added: creditsToAdd.toString(),
      final_balance: newBalance.toString(),
      transaction_id: shortTxId,
      amount: (amount || 0).toFixed(2),
      currency: (currency || 'USD').toUpperCase(),
      settings_url: `${process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000'}/settings?tab=billing`
    });

    return true;
  } catch (err) {
    console.error(`[Activation] Error applying plan to ${email}:`, err);
    return false;
  }
};

const revokePlanFromUser = async ({ email, transactionId, gateway, reason = 'refund' }) => {
  try {
    const dbUser = await User.findOne({ email: new RegExp('^' + email + '$', 'i') });
    if (!dbUser) return false;

    // Find the original transaction to see how many credits were added
    const originalTx = dbUser.transactions?.find(t => t.id === transactionId);
    const creditsToRevoke = originalTx?.creditsAdded || 0;

    const previousCredits = dbUser.credits || 0;
    dbUser.plan = 'Starter';
    dbUser.billingCycle = 'monthly';
    dbUser.credits = Math.max(0, previousCredits - creditsToRevoke);
    dbUser.subscriptionEnd = null;
    dbUser.autoRenew = true;

    if (!dbUser.transactions) dbUser.transactions = [];
    dbUser.transactions.push({
      id: `REV-${Date.now()}`,
      date: new Date().toISOString(),
      amount: 0,
      type: 'plan_revoked',
      description: `Plan revoked due to ${reason}.`,
      subDescription: `Revoked ${creditsToRevoke} credits. New balance: ${dbUser.credits}`,
      gateway
    });

    await dbUser.save();
    addSystemLog('WARN', `[Revocation] User ${email} downgraded due to ${reason} on ${gateway}`, { transactionId });

    if (reason === 'refund') {
      const shortTxId = transactionId.startsWith('cs_') || transactionId.length > 20
        ? `REF-${transactionId.substring(transactionId.length - 8).toUpperCase()}`
        : transactionId;

      sendEmail('refund_processed', email, {
        name: dbUser.name || 'there',
        transaction_id: shortTxId
      });
    }

    return true;
  } catch (err) {
    console.error(`[Revocation] Error revoking plan from ${email}:`, err);
    return false;
  }
};

// SMTP Settings (In-memory)
let smtpSettings = savedData.smtp || {
  host: '',
  port: 587,
  user: '',
  pass: '',
  from: '',
  secure: false
};

// Store user Reddit tokens (Initialized from DB/Cache)
if (!settingsCache.userRedditTokens) settingsCache.userRedditTokens = {};
const userRedditTokens = settingsCache.userRedditTokens;

// Plans API Endpoints
// Public configuration for UI
app.get('/api/config', (req, res) => {
  res.json({
    creditCosts: aiSettings.creditCosts,
    gateways: {
      stripe: stripeSettings.enabled,
      paypal: paypalSettings.enabled
    }
  });
});

app.get('/api/plans', async (req, res) => {
  try {
    const plansDb = await Plan.find({});
    res.json(plansDb);
  } catch (err) {
    console.error('Error fetching plans:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/plans', async (req, res) => {
  try {
    const { id, name, monthlyPrice, yearlyPrice, credits, dailyLimitMonthly, dailyLimitYearly, features, isPopular, highlightText, allowImages, allowTracking, purchaseEnabled, isVisible, maxAccounts } = req.body;

    if (!id || !name || monthlyPrice === undefined || yearlyPrice === undefined || credits === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingPlan = await Plan.findOne({ id });
    if (existingPlan) {
      return res.status(400).json({ error: 'Plan ID already exists' });
    }

    const newPlanDb = new Plan({
      id,
      name,
      monthlyPrice: parseFloat(monthlyPrice),
      yearlyPrice: parseFloat(yearlyPrice),
      credits: parseInt(credits),
      dailyLimitMonthly: parseInt(dailyLimitMonthly) || 0,
      dailyLimitYearly: parseInt(dailyLimitYearly) || 0,
      features: features || [],
      isPopular: !!isPopular,
      highlightText: highlightText || '',
      allowImages: Boolean(allowImages || false),
      allowTracking: Boolean(allowTracking || false),
      purchaseEnabled: purchaseEnabled !== undefined ? Boolean(purchaseEnabled) : true,
      isVisible: isVisible !== undefined ? Boolean(isVisible) : true,
      maxAccounts: parseInt(maxAccounts) || 1,
      isCustom: true
    });

    await newPlanDb.save();
    addSystemLog('INFO', `New plan created: ${newPlanDb.name} (${newPlanDb.id})`);
    res.status(201).json(newPlanDb);
  } catch (err) {
    console.error('Error creating plan:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const planDb = await Plan.findOne({ id });

    if (!planDb) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const { name, monthlyPrice, yearlyPrice, credits, dailyLimitMonthly, dailyLimitYearly, features, isPopular, highlightText, allowImages, allowTracking, purchaseEnabled, isVisible, maxAccounts } = req.body;

    planDb.name = name || planDb.name;
    if (monthlyPrice !== undefined) planDb.monthlyPrice = parseFloat(monthlyPrice);
    if (yearlyPrice !== undefined) planDb.yearlyPrice = parseFloat(yearlyPrice);
    if (credits !== undefined) planDb.credits = parseInt(credits);
    if (dailyLimitMonthly !== undefined) planDb.dailyLimitMonthly = parseInt(dailyLimitMonthly);
    if (dailyLimitYearly !== undefined) planDb.dailyLimitYearly = parseInt(dailyLimitYearly);
    if (features) planDb.features = features;
    if (isPopular !== undefined) planDb.isPopular = Boolean(isPopular);
    if (highlightText !== undefined) planDb.highlightText = String(highlightText);
    if (allowImages !== undefined) planDb.allowImages = Boolean(allowImages);
    if (allowTracking !== undefined) planDb.allowTracking = Boolean(allowTracking);
    if (purchaseEnabled !== undefined) planDb.purchaseEnabled = Boolean(purchaseEnabled);
    if (isVisible !== undefined) planDb.isVisible = Boolean(isVisible);
    if (maxAccounts !== undefined) planDb.maxAccounts = parseInt(maxAccounts);
    planDb.isCustom = true;

    await planDb.save();
    addSystemLog('INFO', `Plan updated: ${planDb.name} (${id})`);
    res.json(planDb);
  } catch (err) {
    console.error('Error updating plan:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const planDb = await Plan.findOne({ id });

    if (!planDb) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Check if any users are on this plan
    const usersOnPlan = await User.find({ plan: { $regex: new RegExp('^' + planDb.name + '$', 'i') } });
    if (usersOnPlan.length > 0) {
      return res.status(400).json({ error: 'Cannot delete plan with active users' });
    }

    const deletedPlanName = planDb.name;
    await Plan.deleteOne({ id });
    addSystemLog('WARN', `Plan deleted: ${deletedPlanName} (${id})`);
    res.json({ success: true, message: 'Plan deleted' });
  } catch (err) {
    console.error('Error deleting plan:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/user/subscribe', async (req, res) => {
  try {
    const { userId, planId, billingCycle, gateway } = req.body;
    if (!userId || !planId) return res.status(400).json({ error: 'Missing required fields' });

    const user = await User.findOne({ id: userId.toString() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const plan = await Plan.findOne({ id: planId });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    if (plan.purchaseEnabled === false) {
      return res.status(403).json({ error: 'This plan is currently not available for purchase.' });
    }

    // If plan is free, activate immediately
    if (plan.monthlyPrice === 0 && plan.yearlyPrice === 0) {
      const oldPlan = user.plan;
      user.plan = plan.name;
      // We don't reset credits if they have more, but we ensure they have at least the plan minimum
      user.credits = Math.max(user.credits || 0, plan.credits);
      user.status = 'Active';
      user.autoRenew = true; // Default for free plan
      user.subscriptionStart = new Date().toISOString();
      user.subscriptionEnd = null;

      await user.save();

      await sendEmail(oldPlan ? 'plan_changed' : 'welcome', user.email, {
        name: user.name || 'User',
        plan_name: plan.name,
        credits: user.credits.toString(),
        settings_url: `${process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000'}/settings?tab=billing`
      });

      addSystemLog('INFO', `User switched/activated free plan: ${user.email} (${plan.name}) from ${oldPlan}`);
      return res.json({ success: true, user, message: 'Free plan activated' });
    }

    if (gateway === 'paypal') {
      if (!paypalSettings.enabled || !paypalSettings.clientId) {
        return res.status(400).json({ error: 'PayPal is currently disabled' });
      }
      try {
        const order = await createPaypalOrder(plan, billingCycle, user);
        return res.json({
          paypalOrderId: order.id,
          checkoutUrl: order.links.find(l => l.rel === 'approve')?.href
        });
      } catch (err) {
        console.error('[PayPal Error]', err);
        return res.status(500).json({ error: 'PayPal initialization failed' });
      }
    }

    // Default to Stripe
    const stripe = getStripe();
    if (!stripe || !stripeSettings.enabled) {
      if (!stripe) {
        // Test mode fallback
        console.warn('[Stripe] Keys missing. Activating plan instantly for testing.');
        user.plan = plan.name;
        const currentCredits = user.credits || 0;
        user.credits = currentCredits + plan.credits;
        user.status = 'Active';

        const now = new Date();
        const end = new Date(now);
        if (billingCycle === 'yearly') end.setFullYear(end.getFullYear() + 1);
        else end.setMonth(end.getMonth() + 1);

        user.subscriptionStart = now.toISOString();
        user.subscriptionEnd = end.toISOString();

        await user.save();
        addSystemLog('WARN', `[TEST MODE] User activated plan: ${user.email} -> ${plan.name}`);
        return res.json({ success: true, user, message: 'Plan activated (Test Mode)' });
      }
      return res.status(400).json({ error: 'Stripe is currently disabled' });
    }

    try {
      const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
      const baseUrl = process.env.BASE_URL || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

      addSystemLog('INFO', `User initiated Stripe checkout: ${user.email} for ${plan.name} (${billingCycle})`);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.name} Plan (${billingCycle})`,
              description: `Includes ${plan.credits} new credits. Your existing ${user.credits || 0} credits will be carried over.`
            },
            unit_amount: price * 100, // Cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        customer_email: user.email,
        metadata: {
          userEmail: user.email,
          plan: plan.name,
          billingCycle: billingCycle,
          credits: plan.credits.toString()
        },
        success_url: `${baseUrl}/settings?success=true&plan=${plan.name}`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
      });

      return res.json({ checkoutUrl: session.url });
    } catch (error) {
      console.error('[Stripe Error]', error);
      return res.status(500).json({ error: 'Payment initialization failed' });
    }
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Brand Profiles per user
let brandProfiles = savedData.brandProfiles || {};

// Brand Profile Endpoints
// Default Profile fallback
const DEFAULT_BRAND_PROFILE = {
  brandName: 'RedditGo',
  description: 'AI-powered Reddit marketing tool that helps SaaS founders find leads and engage authentically in relevant conversations.',
  targetAudience: 'SaaS founders, indie hackers, and marketers',
  problem: 'Struggling to find relevant Reddit discussions and engaging without seeming like spam.',
  website: 'https://redditgo.online/',
  primaryColor: '#EA580C',
  secondaryColor: '#1E293B',
  brandTone: 'Helpful Peer'
};

app.get('/api/user/brand-profile', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const user = await User.findOne({ id: userId.toString() });
    let profile = user ? user.brandProfile : null;

    // Fallback to separate collection if not in user document
    if (!profile || Object.keys(profile).length === 0) {
      profile = await BrandProfile.findOne({ userId: userId.toString() });
    }

    res.json(profile && (profile.brandName || profile.website || Object.keys(profile).length > 2) ? profile : DEFAULT_BRAND_PROFILE);
  } catch (err) {
    console.error('Error fetching brand profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// (Duplicate POST /api/user/brand-profile removed as it's now handled above)

const saveTokens = async (userId, username, tokenData) => {
  if (!userRedditTokens[userId]) userRedditTokens[userId] = {};
  userRedditTokens[userId][username] = tokenData;
  saveSettings({ userRedditTokens });

  try {
    const user = await User.findOne({ id: userId.toString() });
    if (user && user.connectedAccounts) {
      const acc = user.connectedAccounts.find(a => a.username === username);
      if (acc) {
        acc.accessToken = tokenData.accessToken;
        acc.refreshToken = tokenData.refreshToken;
        acc.expiresAt = tokenData.expiresAt;
        user.markModified('connectedAccounts');
        await user.save();
      }
    }
  } catch (err) {
    console.error('Error saving tokens to DB:', err);
  }
};

// Initialize Stripe Client dynamically
const getStripe = () => {
  if (!stripeSettings.secretKey) return null;
  return new Stripe(stripeSettings.secretKey);
};

// Auth Middleware for Admin Routes
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ error: 'Unauthorized access to admin API' });

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Unauthorized access to admin API' });
    }
  } catch (err) {
    res.status(403).json({ error: 'Unauthorized access to admin API' });
  }
};

// Admin Stats
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Optimization: Use countDocuments for simple totals
    const totalUsers = await User.countDocuments({});
    const totalTickets = await Ticket.countDocuments({});

    const activeSubs = await User.countDocuments({
      status: 'Active',
      plan: { $ne: 'Starter' },
      email: { $ne: process.env.ADMIN_EMAIL }
    });

    const allPlans = await Plan.find({});

    // Optimization: Only fetch fields needed for capacity calculation to save memory
    const usageData = await User.find({ status: 'Active' }, {
      dailyUsagePoints: 1,
      lastUsageDate: 1,
      plan: 1,
      billingCycle: 1,
      customDailyLimit: 1
    });

    let totalPointsSpentToday = 0;
    let totalDailyCapacity = 0;

    usageData.forEach(u => {
      if (u.lastUsageDate === today) {
        totalPointsSpentToday += (u.dailyUsagePoints || 0);
      }
      const plan = allPlans.find(p => (p.name || '').toLowerCase() === (u.plan || '').toLowerCase());
      const planLimit = u.billingCycle === 'yearly' ? plan?.dailyLimitYearly : plan?.dailyLimitMonthly;
      const effectiveLimit = (Number(u.customDailyLimit) > 0) ? Number(u.customDailyLimit) : (Number(planLimit) || 0);
      totalDailyCapacity += effectiveLimit;
    });

    const apiUsagePercent = totalDailyCapacity > 0
      ? Math.min(100, Math.round((totalPointsSpentToday / totalDailyCapacity) * 100))
      : 0;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentErrors = await SystemLog.countDocuments({
      timestamp: { $gte: oneHourAgo },
      level: 'ERROR'
    });

    let healthStatus = 'Healthy';
    let healthPercent = '100%';

    if (recentErrors > 15) {
      healthStatus = 'Critical';
      healthPercent = '65%';
    } else if (recentErrors > 5) {
      healthStatus = 'Degraded';
      healthPercent = '88%';
    } else if (recentErrors > 0) {
      healthStatus = 'Stable';
      healthPercent = '99%';
    }

    const ticketStats = {
      total: totalTickets,
      open: await Ticket.countDocuments({ status: 'open' }),
      inProgress: await Ticket.countDocuments({ status: 'in_progress' }),
      resolved: await Ticket.countDocuments({ status: 'resolved' }),
      closed: await Ticket.countDocuments({ status: 'closed' })
    };

    res.json({
      totalUsers,
      activeSubscriptions: activeSubs,
      apiUsage: apiUsagePercent,
      systemHealth: healthPercent,
      healthLabel: healthStatus,
      ticketStats
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/analytics', adminAuth, async (req, res) => {
  try {
    const allUsers = await User.find({});

    // 1. Revenue & Transactions
    let totalRevenue = 0;
    const revenueByDay = {}; // Last 30 days
    const transactions = [];

    // 2. Consumption (Credits Spent)
    const consumptionByDay = {}; // Last 30 days

    // 3. Plan Distribution
    const planDistribution = {};

    // 4. Totals & Activity
    let totalPaidCreditsCirculating = 0;
    let totalFreeCreditsCirculating = 0;
    const liveFeed = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    allUsers.forEach(u => {
      // Calculate circulation excluding admins
      if (u.role !== 'admin') {
        const pName = (u.plan || 'Free').toLowerCase();
        const isPaid = pName !== 'starter' && pName !== 'free';

        if (isPaid) {
          totalPaidCreditsCirculating += (u.credits || 0);
        } else {
          totalFreeCreditsCirculating += (u.credits || 0);
        }
      }

      // Plan distribution
      const pName = u.plan || 'Free';
      planDistribution[pName] = (planDistribution[pName] || 0) + 1;

      // Transactions (Revenue)
      if (u.transactions && Array.isArray(u.transactions)) {
        u.transactions.forEach(tx => {
          const txDate = new Date(tx.date);
          if (tx.amount) {
            totalRevenue += tx.amount;
            if (txDate >= thirtyDaysAgo) {
              const dateKey = txDate.toISOString().split('T')[0];
              revenueByDay[dateKey] = (revenueByDay[dateKey] || 0) + tx.amount;
            }
          }
          if (txDate >= thirtyDaysAgo) {
            transactions.push({
              userName: u.name,
              userEmail: u.email,
              ...tx
            });
          }
        });
      }

      // Consumption stats
      if (u.usageStats && u.usageStats.history) {
        u.usageStats.history.forEach(h => {
          const hDate = new Date(h.date);
          if (hDate >= thirtyDaysAgo) {
            const dateKey = hDate.toISOString().split('T')[0];
            consumptionByDay[dateKey] = (consumptionByDay[dateKey] || 0) + (h.cost || 0);
          }
          // Add to live feed
          liveFeed.push({
            userName: u.name,
            userEmail: u.email,
            ...h
          });
        });
      }
    });

    // Top Consumers
    const topConsumers = allUsers
      .filter(u => u.role !== 'admin')
      .map(u => ({
        name: u.name,
        email: u.email,
        totalSpent: u.usageStats?.totalSpent || 0,
        credits: u.credits,
        plan: u.plan
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Sort activity and transactions
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    liveFeed.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Prepare chart data for last 30 days
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      chartData.push({
        date: key,
        displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: revenueByDay[key] || 0,
        consumption: consumptionByDay[key] || 0
      });
    }

    res.json({
      totalRevenue,
      totalPaidCreditsCirculating,
      totalFreeCreditsCirculating,
      totalUsers: allUsers.length,
      planDistribution: Object.entries(planDistribution).map(([name, value]) => ({ name, value })),
      chartData,
      topConsumers,
      recentActivity: liveFeed.slice(0, 20),
      recentTransactions: transactions.slice(0, 50)
    });
  } catch (err) {
    console.error('Error fetching admin analytics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Announcement Management (Admin) ───────────────────────────────────────────
app.get('/api/admin/announcements', adminAuth, async (req, res) => {
  try {
    const list = await Announcement.find({}).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

app.post('/api/admin/announcements', adminAuth, async (req, res) => {
  try {
    const { title, content, type, imageUrl, targetPlan, isActive } = req.body;
    const id = `ann_${Date.now()}`;
    const newAnn = new Announcement({
      id,
      title,
      content,
      type: type || 'update',
      imageUrl,
      targetPlan: targetPlan || 'all',
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date()
    });
    await newAnn.save();
    addSystemLog('INFO', `Announcement created: ${title}`, { id });
    res.status(201).json(newAnn);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

app.put('/api/admin/announcements/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const ann = await Announcement.findOne({ id });
    if (!ann) return res.status(404).json({ error: 'Announcement not found' });

    const updates = req.body;
    Object.assign(ann, updates);
    await ann.save();
    res.json(ann);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

app.delete('/api/admin/announcements/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await Announcement.deleteOne({ id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

app.get('/api/admin/announcements/:id/stats', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const ann = await Announcement.findOne({ id });
    if (!ann) return res.status(404).json({ error: 'Announcement not found' });

    const filter = ann.targetPlan === 'all'
      ? {}
      : { plan: { $regex: new RegExp('^' + ann.targetPlan + '$', 'i') } };

    const totalTargeted = await User.countDocuments(filter);
    const dismissedCount = await User.countDocuments({
      ...filter,
      dismissedAnnouncements: id
    });

    const users = await User.find(filter, 'plan dismissedAnnouncements');
    const planBreakdown = {};
    users.forEach(u => {
      const p = u.plan || 'Starter';
      if (!planBreakdown[p]) planBreakdown[p] = { total: 0, dismissed: 0 };
      planBreakdown[p].total++;
      if (u.dismissedAnnouncements && u.dismissedAnnouncements.includes(id)) {
        planBreakdown[p].dismissed++;
      }
    });

    res.json({
      id,
      title: ann.title,
      totalTargeted,
      dismissedCount,
      remainingCount: totalTargeted - dismissedCount,
      planBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcement stats' });
  }
});

app.post('/api/admin/announcements/upload', adminAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ─── Announcement Client Endpoints ─────────────────────────────────────────────
app.get('/api/user/announcements/latest', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'UserId required' });

    const user = await User.findOne({ id: userId.toString() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userPlan = user.plan || 'Starter';
    const dismissed = user.dismissedAnnouncements || [];

    // Find the latest active announcement for this user
    const announcement = await Announcement.findOne({
      isActive: true,
      id: { $nin: dismissed },
      $or: [
        { targetPlan: 'all' },
        { targetPlan: { $regex: new RegExp('^' + userPlan + '$', 'i') } }
      ]
    }).sort({ createdAt: -1 });

    res.json(announcement || null);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/user/announcements/dismiss', async (req, res) => {
  try {
    const { userId, announcementId } = req.body;
    if (!userId || !announcementId) return res.status(400).json({ error: 'Missing fields' });

    const user = await User.findOne({ id: userId.toString() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.dismissedAnnouncements) user.dismissedAnnouncements = [];
    if (!user.dismissedAnnouncements.includes(announcementId)) {
      user.dismissedAnnouncements.push(announcementId);
      user.markModified('dismissedAnnouncements');
      await user.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Logs
app.get('/api/admin/logs', adminAuth, async (req, res) => {
  try {
    const logs = await SystemLog.find({}).sort({ timestamp: -1 }).limit(2000);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

app.delete('/api/admin/logs', adminAuth, async (req, res) => {
  try {
    await SystemLog.deleteMany({});
    addSystemLog('WARN', 'System logs cleared by administrator');
    res.json({ success: true, message: 'All logs have been cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// User Management
app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const allUsers = await User.find({});
    res.json(allUsers);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const newUser = new User({ id: Math.random().toString(36).substring(2, 9), ...req.body });
    await newUser.save();
    addSystemLog('INFO', `[Admin] Created new user: ${newUser.email}`, { admin: 'Superuser' });
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    let user = await User.findOne({ id: id.toString() });

    if (user) {
      const updateData = { ...req.body };
      if (!updateData.password) {
        delete updateData.password;
      }

      const oldPlanName = user.plan;
      const oldCredits = user.credits || 0;

      if (req.body.status) {
        // SafeGuard: Never suspend the primary admin
        if (user.email === process.env.ADMIN_EMAIL && (req.body.status === 'Suspended' || req.body.status === 'Banned')) {
          return res.status(403).json({ error: 'The primary administrator account cannot be suspended or banned.' });
        }
        updateData.status = req.body.status;
        if (req.body.status === 'Suspended' || req.body.status === 'Banned') {
          updateData.isSuspended = true;
        } else {
          updateData.isSuspended = false;
        }
      }
      if (req.body.statusMessage !== undefined) updateData.statusMessage = req.body.statusMessage;

      if (updateData.plan && updateData.plan !== oldPlanName) {
        updateData.autoRenew = true; // Reset auto-renewal state on plan change
        const newPlanObj = await Plan.findOne({ name: updateData.plan });
        const newPlanCredits = newPlanObj?.credits ?? oldCredits;
        updateData.credits = newPlanCredits;

        if (!user.transactions) updateData.transactions = [];
        const txs = user.transactions || [];
        txs.push({
          id: `tx_admin_plan_${Date.now()}`,
          date: new Date().toISOString(),
          amount: 0, currency: 'USD',
          type: 'admin_plan_change',
          description: `Plan changed by Admin: ${oldPlanName} → ${updateData.plan}`,
          subDescription: `Credits reset to ${newPlanCredits} pts (was ${oldCredits} pts).`,
          creditsAdded: newPlanCredits - oldCredits,
          finalBalance: newPlanCredits,
          previousBalance: oldCredits,
          adjustmentType: 'plan_reset',
          planName: updateData.plan,
          isAdjustment: true
        });
        updateData.transactions = txs;
      }

      if (updateData.extraCreditsToAdd !== undefined && parseInt(updateData.extraCreditsToAdd) > 0) {
        const extra = parseInt(updateData.extraCreditsToAdd);
        const baseCredits = updateData.credits ?? oldCredits;
        const finalCredits = baseCredits + extra;
        updateData.credits = finalCredits;

        const txs = updateData.transactions || user.transactions || [];
        txs.push({
          id: `tx_admin_extra_${Date.now()}`,
          date: new Date().toISOString(),
          amount: 0, currency: 'USD',
          type: 'admin_credit_adjustment',
          description: 'Extra Credits Added by Admin',
          subDescription: `${baseCredits} + ${extra} = ${finalCredits} pts.`,
          creditsAdded: extra,
          finalBalance: finalCredits,
          previousBalance: baseCredits,
          adjustmentType: 'add_extra',
          planName: updateData.plan || user.plan,
          isAdjustment: true
        });
        updateData.transactions = txs;
      }

      delete updateData.extraCreditsToAdd;
      delete updateData.creditAdjustmentType;
      const oldStatus = user.status;

      Object.assign(user, updateData);
      await user.save();

      // Send Notification Emails
      if (req.body.status && req.body.status !== oldStatus) {
        // Status changed (Banned, Suspended, Active)
        sendEmail('account_status_changed', user.email, {
          name: user.name || 'there',
          status: req.body.status,
          reason: req.body.statusMessage || 'Administrative action.'
        });
      }

      if (updateData.plan && updateData.plan !== oldPlanName) {
        sendEmail('plan_upgraded', user.email, {
          name: user.name || 'there',
          plan_name: updateData.plan,
          credits: user.credits.toString(),
          settings_url: `${process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000'}/settings`
        });
      }

      if (req.body.status && req.body.status !== 'Active') {
        addSystemLog('WARN', `[Admin] User ${user.email} status changed to ${req.body.status}`);
      } else if (req.body.credits !== undefined) {
        addSystemLog('INFO', `[Admin] Adjusted credits for ${user.email} (New Balance: ${user.credits})`);
      } else {
        addSystemLog('INFO', `[Admin] Updated user profile: ${user.email}`);
      }

      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get detailed user stats
app.get('/api/admin/users/:id/stats', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ id: id.toString() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const safeUser = user.toObject();
    delete safeUser.password;

    const stats = user.usageStats || { posts: 0, comments: 0, images: 0, postsCredits: 0, commentsCredits: 0, imagesCredits: 0, totalSpent: 0, history: [] };

    const history = stats.history || [];
    let avgPerDay = 0;
    if (history.length > 0) {
      const oldest = new Date(history[0].date);
      const days = Math.max(1, Math.ceil((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24)));
      avgPerDay = Math.round(stats.totalSpent / days);
    }

    const planObj = await Plan.findOne({ name: user.plan });

    res.json({
      ...safeUser,
      usageStats: stats,
      avgPerDay,
      planCredits: planObj?.credits ?? 0,
      transactions: user.transactions || []
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Get Single User Profile (Safe)
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ id: id.toString() });

    if (user) {
      // PROACTIVE DAILY LIMIT RESET
      const today = new Date().toISOString().split('T')[0];
      if (user.role !== 'admin' && user.lastUsageDate !== today) {
        user.dailyUsage = 0;
        user.dailyUsagePoints = 0;
        user.lastUsageDate = today;
        await user.save();
      }

      // PROACTIVE MONTHLY CREDIT RENEWAL
      if ((user.plan === 'Starter' || user.plan === 'starter') && user.subscriptionEnd && new Date() > new Date(user.subscriptionEnd)) {
        const now = new Date();
        const nextEnd = new Date(now);
        nextEnd.setMonth(nextEnd.getMonth() + 1);

        const freePlan = await Plan.findOne({ id: 'starter' });
        const resetCredits = freePlan ? freePlan.credits : 100;

        user.credits = resetCredits;
        user.subscriptionStart = now.toISOString();
        user.subscriptionEnd = nextEnd.toISOString();

        if (!user.transactions) user.transactions = [];
        user.transactions.push({
          id: `renew_starter_${Date.now()}`,
          date: now.toISOString(),
          amount: 0,
          currency: 'USD',
          type: 'monthly_renewal',
          description: 'Monthly Free Plan Credit Renewal',
          subDescription: 'Your 100 monthly credits have been refilled.',
          creditsAdded: resetCredits,
          finalBalance: resetCredits,
          planName: 'Starter'
        });

        await user.save();
        addSystemLog('SUCCESS', `[Renewal] Monthly credits refilled for Starter user: ${user.email}`);
      }

      // PROACTIVE PAID PLAN EXPIRATION CHECK
      if (user.plan && user.plan.toLowerCase() !== 'starter' && user.subscriptionEnd && new Date() > new Date(user.subscriptionEnd)) {
        addSystemLog('WARN', `[Expiry] Plan expired for user: ${user.email}. Reverting to Starter.`);

        user.plan = 'Starter';
        user.billingCycle = 'monthly';
        const freePlan = await Plan.findOne({ id: 'starter' });
        // Optional: you can either reset to 100 or keep the remaining credits but lock features.
        // Here we'll reset to Starter default to encourage upgrade.
        user.credits = freePlan ? freePlan.credits : 100;
        user.subscriptionEnd = null;
        user.autoRenew = true; // Reset to true so it doesn't show 'Cancelling soon'

        if (!user.transactions) user.transactions = [];
        user.transactions.push({
          id: `expired_${Date.now()}`,
          date: new Date().toISOString(),
          amount: 0,
          type: 'plan_expired',
          description: 'Subscription Expired',
          subDescription: 'Your premium plan has expired. You have been returned to the Starter plan.',
          creditsAdded: 0,
          planName: 'Starter'
        });

        await user.save();

        sendEmail('plan_expired', user.email, {
          name: user.name || 'there',
          upgrade_link: `${process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000'}/pricing`
        });
      }

      const safeUser = user.toObject();
      delete safeUser.password;
      res.json(safeUser);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Self-Update Endpoint
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ id: id.toString() });

    if (user) {
      const { name, avatar } = req.body;
      if (name) user.name = name;
      if (avatar !== undefined) user.avatar = avatar;

      await user.save();
      const safeUser = user.toObject();
      delete safeUser.password;
      res.json(safeUser);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change Password Endpoint
app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const user = await User.findOne({ id: id.toString() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    let isMatch = false;
    if (user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(currentPassword, user.password);
    } else {
      isMatch = (user.password === currentPassword);
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    addSystemLog('INFO', `User changed password: ${user.email}`);

    // SECURITY NOTIFICATION
    sendEmail('password_updated', user.email, {
      name: user.name || 'there',
      time: new Date().toLocaleString()
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id/2fa', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    // Authorization check
    let authorized = false;
    if (req.isAdmin) {
      authorized = true;
    } else {
      const decoded = req.headers.authorization ? jwt.verify(req.headers.authorization.substring(7), JWT_SECRET) : null;
      if (decoded && decoded.id === id.toString()) authorized = true;
    }

    if (!authorized) return res.status(403).json({ error: 'Unauthorized' });

    const user = await User.findOne({ id: id.toString() });

    if (!user) return res.status(404).json({ error: 'User not found' });

    user.twoFactorEnabled = !!enabled;
    await user.save();

    // SECURITY NOTIFICATION
    sendEmail('two_factor_updated', user.email, {
      name: user.name || 'there',
      status: enabled ? 'enabled' : 'disabled',
      time: new Date().toLocaleString()
    });

    addSystemLog('INFO', `User ${user.email} ${enabled ? 'enabled' : 'disabled'} 2FA`);
    res.json({ success: true, twoFactorEnabled: user.twoFactorEnabled });
  } catch (err) {
    console.error('2FA Toggle error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- NEW SUBSCRIPTION & ACCOUNT MANAGEMENT ENDPOINTS ---

// 1. Cancel Auto-Renewal (User)
app.post('/api/user/cancel-subscription', async (req, res) => {
  try {
    const { userId, reason, comment } = req.body;
    const user = await User.findOne({
      $or: [{ id: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Stop Auto-Renewal
    user.autoRenew = false;
    user.statusMessage = `Cancelled (Ends: ${user.subscriptionEnd?.toLocaleDateString() || 'N/A'})`;
    await user.save();

    // Save Feedback
    const feedback = new CancellationFeedback({
      userId: user.id || user._id,
      userEmail: user.email,
      plan: user.plan,
      reason: reason || 'Not specified',
      comment: comment || '',
      usageAtCancellation: user.dailyUsagePoints || 0
    });
    await feedback.save();

    // Send Confirmation Email
    await sendEmail('cancellation_confirmed', user.email, {
      name: user.name || 'User',
      plan_name: user.plan,
      expiry_date: user.subscriptionEnd?.toLocaleDateString() || 'End of Period',
      settings_url: `${process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000'}/settings?tab=billing`
    });

    addSystemLog('INFO', `User ${user.email} cancelled auto-renewal. Reason: ${reason}`);
    res.json({ success: true, message: 'Auto-renewal cancelled successfully.' });
  } catch (err) {
    console.error('Cancellation error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// 2. Schedule Account Deletion (User)
app.post('/api/user/schedule-deletion', async (req, res) => {
  try {
    const { userId, password } = req.body;
    const user = await User.findOne({
      $or: [{ id: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify password
    const isMatch = user.password.startsWith('$2')
      ? await bcrypt.compare(password, user.password)
      : user.password === password;

    if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });

    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 14); // 14 days from now

    user.deletionScheduledDate = deletionDate;
    await user.save();

    await sendEmail('deletion_scheduled', user.email, {
      name: user.name || 'User',
      deletion_date: deletionDate.toLocaleDateString()
    });

    addSystemLog('WARN', `User ${user.email} scheduled account deletion for ${deletionDate.toLocaleDateString()}`);
    res.json({ success: true, message: 'Account deletion scheduled for 14 days from now.' });
  } catch (err) {
    console.error('Deletion scheduling error:', err);
    res.status(500).json({ error: 'Failed to schedule deletion' });
  }
});

// 2b. Cancel Account Deletion (User)
app.post('/api/user/cancel-deletion', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findOne({
      $or: [{ id: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    user.deletionScheduledDate = null;
    await user.save();

    await sendEmail('deletion_cancelled', user.email, {
      name: user.name || 'User'
    });

    addSystemLog('INFO', `User ${user.email} cancelled account deletion.`);
    res.json({ success: true, message: 'Account deletion cancelled.' });
  } catch (err) {
    console.error('Cancellation error:', err);
    res.status(500).json({ error: 'Failed to cancel deletion' });
  }
});


// 3. Process Manual Refund (Admin)
app.post('/api/admin/process-refund', adminAuth, async (req, res) => {
  try {
    const { transactionId, userId, amount, force } = req.body;

    // Check Policy (if not forced)
    const policy = loadSettings().refundPolicy || { days: 7, usageLimit: 20 };
    const user = await User.findOne({
      $or: [{ id: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const tx = (user.transactions || []).find(t => t.id === transactionId);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    if (!force) {
      const txDate = new Date(tx.date);
      const diffDays = Math.ceil(Math.abs(Date.now() - txDate.getTime()) / (1000 * 60 * 60 * 24));

      const usage = user.dailyUsagePoints || 0;
      const planCredits = tx.creditsAdded || 1; // avoid div by zero
      const usagePercent = (usage / planCredits) * 100;

      if (diffDays > policy.days || usagePercent > policy.usageLimit) {
        return res.status(400).json({
          policyViolation: true,
          message: `Policy violation: ${diffDays} days passed (Limit: ${policy.days}), ${usagePercent.toFixed(1)}% usage (Limit: ${policy.usageLimit}%)`
        });
      }
    }

    // Process Refund Logic (Mocking actual gateway call, we focus on DB state)
    // In real-world, call Stripe/PayPal API here.

    await revokePlanFromUser({
      email: user.email,
      transactionId,
      gateway: tx.type === 'stripe_payment' ? 'stripe' : 'paypal',
      reason: 'refund'
    });

    addSystemLog('SUCCESS', `Admin refunded transaction ${transactionId} for ${user.email}`);
    res.json({ success: true, message: 'Refund processed and plan revoked.' });
  } catch (err) {
    console.error('Refund processing error:', err);
    res.status(500).json({ error: 'Refund failed' });
  }
});

// 4. Suspend User (Admin)
app.patch('/api/admin/users/:id/suspend', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isSuspended, reason } = req.body;

    const user = await User.findOne({
      $or: [{ id: id }, { _id: mongoose.isValidObjectId(id) ? id : null }]
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Safeguard: Prevent admin from suspending themselves
    if (isSuspended && req.user && (user.email === req.user.email || user.id === req.user.id)) {
      return res.status(403).json({ error: 'You cannot suspend your own administrative account. This is a safety measure to prevent lockout.' });
    }

    user.isSuspended = isSuspended;
    user.status = isSuspended ? 'Suspended' : 'Active';
    user.statusMessage = reason || '';
    await user.save();

    addSystemLog('WARN', `Admin ${isSuspended ? 'suspended' : 'unsuspended'} user ${user.email}. Reason: ${reason}`);
    res.json({ success: true, isSuspended: user.isSuspended });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update suspension status' });
  }
});

// 5. Get Cancellation Feedback (Admin)
app.get('/api/admin/cancellation-feedback', adminAuth, async (req, res) => {
  try {
    const feedback = await CancellationFeedback.find().sort({ date: -1 });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// 6. Manage Refund Policy (Admin)
app.post('/api/admin/payment-policy', adminAuth, async (req, res) => {
  try {
    const { days, usageLimit } = req.body;
    saveSettings({ refundPolicy: { days, usageLimit } });
    res.json({ message: 'Policy updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

app.get('/api/admin/payment-policy', adminAuth, async (req, res) => {
  res.json(loadSettings().refundPolicy || { days: 7, usageLimit: 20 });
});

app.delete('/api/admin/users/:id', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id.toString();

    // Cascade delete: Remove user, their replies, and their posts
    await Promise.all([
      User.deleteOne({ id: userId }),
      RedditReply.deleteMany({ userId: userId }),
      RedditPost.deleteMany({ userId: userId })
    ]);

    addSystemLog('WARN', `[Admin] Permanently deleted user ${userId} and all associated data.`);
    res.status(204).send();
  } catch (err) {
    console.error('Delete User Cascade Error:', err);
    res.status(500).json({ error: 'Internal error during deletion' });
  }
});

// AI Settings
app.get('/api/admin/ai-settings', adminAuth, (req, res) => {
  const safeSettings = { ...aiSettings };
  if (safeSettings.apiKey) {
    safeSettings.apiKey = safeSettings.apiKey.substring(0, 4) + '****************' + safeSettings.apiKey.substring(safeSettings.apiKey.length - 4);
  }
  res.json(safeSettings);
});

app.post('/api/admin/ai-settings', adminAuth, (req, res) => {
  const newSettings = { ...req.body };
  // If API key is masked (contains asterisks), don't update it
  if (newSettings.apiKey && newSettings.apiKey.includes('****')) {
    delete newSettings.apiKey;
  }
  // Deep merge creditCosts if present
  if (newSettings.creditCosts) {
    newSettings.creditCosts = {
      comment: Number(newSettings.creditCosts.comment) || (aiSettings.creditCosts?.comment || 1),
      post: Number(newSettings.creditCosts.post) || (aiSettings.creditCosts?.post || 2),
      image: Number(newSettings.creditCosts.image) || (aiSettings.creditCosts?.image || 5)
    };
  }

  aiSettings = { ...aiSettings, ...newSettings };
  saveSettings({ ai: aiSettings });
  res.json({ message: 'Settings updated', settings: aiSettings });
});

// Stripe Settings Management
app.get('/api/admin/stripe-settings', adminAuth, (req, res) => {
  const safe = { ...stripeSettings };
  if (safe.secretKey) safe.secretKey = '********' + safe.secretKey.substring(safe.secretKey.length - 4);
  if (safe.webhookSecret) safe.webhookSecret = '********' + safe.webhookSecret.substring(safe.webhookSecret.length - 4);
  res.json(safe);
});

app.post('/api/admin/stripe-settings', adminAuth, (req, res) => {
  const newSettings = { ...req.body };
  // If keys are masked, don't update them
  if (newSettings.secretKey && newSettings.secretKey.includes('****')) delete newSettings.secretKey;
  if (newSettings.webhookSecret && newSettings.webhookSecret.includes('****')) delete newSettings.webhookSecret;

  stripeSettings = { ...stripeSettings, ...newSettings };
  saveSettings({ stripe: stripeSettings });
  console.log('[Stripe] Configuration updated');
  res.json({ message: 'Stripe settings updated', settings: stripeSettings });
});

// PayPal Settings Management
app.get('/api/admin/paypal-settings', adminAuth, (req, res) => {
  const safe = { ...paypalSettings };
  if (safe.secretKey) safe.secretKey = '********' + safe.secretKey.substring(safe.secretKey.length - 4);
  if (safe.webhookId) safe.webhookId = '********' + safe.webhookId.substring(safe.webhookId.length - 4);
  res.json(safe);
});

app.post('/api/admin/paypal-settings', adminAuth, (req, res) => {
  const newSettings = { ...req.body };
  if (newSettings.secretKey && newSettings.secretKey.includes('****')) delete newSettings.secretKey;
  if (newSettings.webhookId && newSettings.webhookId.includes('****')) delete newSettings.webhookId;

  paypalSettings = { ...paypalSettings, ...newSettings };
  saveSettings({ paypal: paypalSettings });
  console.log('[PayPal] Configuration updated');
  res.json({ message: 'PayPal settings updated', settings: paypalSettings });
});

// Reddit Settings Management
app.get('/api/admin/reddit-settings', adminAuth, (req, res) => {
  const safe = { ...redditSettings };
  if (safe.clientSecret) safe.clientSecret = '********' + safe.clientSecret.substring(safe.clientSecret.length - 4);
  res.json(safe);
});

app.post('/api/admin/reddit-settings', adminAuth, (req, res) => {
  const newSettings = { ...req.body };
  if (newSettings.clientSecret && newSettings.clientSecret.includes('****')) delete newSettings.clientSecret;

  // Convert numeric strings to numbers for safety
  if (newSettings.minDelay) newSettings.minDelay = Number(newSettings.minDelay);
  if (newSettings.maxDelay) newSettings.maxDelay = Number(newSettings.maxDelay);

  redditSettings = { ...redditSettings, ...newSettings };
  saveSettings({ reddit: redditSettings });
  console.log('[Reddit] Configuration updated');
  res.json({ message: 'Reddit settings updated', settings: redditSettings });
});

// SMTP Settings Management
app.get('/api/admin/smtp-settings', adminAuth, (req, res) => {
  const safe = { ...smtpSettings };
  if (safe.pass) safe.pass = '********';
  res.json(safe);
});

app.post('/api/admin/smtp-settings', adminAuth, (req, res) => {
  const newSettings = { ...req.body };
  if (newSettings.pass && newSettings.pass.includes('****')) delete newSettings.pass;

  smtpSettings = { ...smtpSettings, ...newSettings };
  saveSettings({ smtp: smtpSettings });
  console.log('[SMTP] Configuration updated');
  res.json({ message: 'SMTP settings updated', settings: smtpSettings });
});

// Email Template Management
app.get('/api/admin/email-templates', adminAuth, (req, res) => {
  res.json(getEmailTemplates());
});

app.post('/api/admin/email-templates', adminAuth, (req, res) => {
  const templates = req.body;
  saveSettings({ emailTemplates: templates });
  res.json({ message: 'Email templates updated' });
});

app.post('/api/admin/email-templates/test', adminAuth, async (req, res) => {
  const { templateId, to, variables } = req.body;
  try {
    const info = await sendEmail(templateId, to, variables || {
      name: 'Admin Tester',
      subject: 'Test Subject',
      reply_message: 'This is a test reply from the admin dashboard.',
      ticket_id: '1234',
      plan_name: 'Pro Plan',
      credits_added: '500',
      final_balance: '1200',
      balance: '150'
    });
    if (info) res.json({ success: true, message: 'Test email sent!' });
    else res.status(400).json({ error: 'Failed to send email. Check SMTP settings or template status.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Support Ticketing System ---

app.get('/api/support/tickets', async (req, res) => {
  try {
    const { email, role } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });

    if (role?.toLowerCase() === 'admin') {
      const authHeader = req.headers.authorization;
      if (authHeader !== 'Bearer mock-jwt-token-123') {
        return res.status(403).json({ error: 'Admin role requires valid authorization' });
      }
      const allTickets = await Ticket.find({}).sort({ createdAt: -1 });
      res.json(allTickets);
    } else {
      const userTickets = await Ticket.find({ userEmail: email }).sort({ createdAt: -1 });
      res.json(userTickets);
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/support/tickets', async (req, res) => {
  try {
    const newTicket = new Ticket({
      ...req.body,
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    });
    await newTicket.save();
    res.status(201).json(newTicket);

    // Send Ticket Confirmation Email
    sendEmail('ticket_created', newTicket.userEmail || newTicket.email, {
      name: newTicket.userName || 'Customer',
      ticket_id: newTicket.id,
      subject: newTicket.subject
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/support/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findOne({ id });

    if (ticket) {
      const isNewAdminMessage =
        req.body.messages &&
        req.body.messages.length > (ticket.messages || []).length;

      let lastAdminMsg = null;
      if (isNewAdminMessage) {
        const lastMsg = req.body.messages[req.body.messages.length - 1];
        if (lastMsg.sender === 'Admin') {
          lastAdminMsg = lastMsg.text;
        }
      }

      Object.assign(ticket, req.body);
      ticket.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
      await ticket.save();

      if (lastAdminMsg) {
        sendEmail('admin_reply', ticket.userEmail || ticket.email, {
          name: ticket.userName || 'Customer',
          ticket_id: ticket.id,
          subject: ticket.subject,
          reply_message: lastAdminMsg
        });
        addSystemLog('INFO', `Admin reply email sent for Ticket ${ticket.id}`);
      }

      res.json(ticket);
    } else {
      res.status(404).json({ error: 'Ticket not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/support/tickets/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findOneAndDelete({ id });
    if (ticket) {
      addSystemLog('INFO', `Ticket deleted: ${id}`);
      res.json({ success: true, message: 'Ticket deleted successfully' });
    } else {
      res.status(404).json({ error: 'Ticket not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Reddit OAuth2 Flow ---

app.get('/api/auth/reddit/url', (req, res) => {
  if (!redditSettings.clientId) {
    return res.status(500).json({ error: 'Reddit Client ID not configured by Admin' });
  }

  const host = req.get('host');
  const protocol = host.includes('localhost') ? 'http' : 'https';
  // Use configured URI if available, otherwise construct dynamic one
  const redirectUri = redditSettings.redirectUri && redditSettings.redirectUri.trim() !== ''
    ? redditSettings.redirectUri
    : `${protocol}://${host}/auth/reddit/callback`;

  const state = Math.random().toString(36).substring(7);
  const scope = 'identity read submit';
  const url = `https://www.reddit.com/api/v1/authorize?client_id=${redditSettings.clientId}&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&duration=permanent&scope=${scope}`;

  // Return the redirectUri used so frontend can store it if needed (optional)
  res.json({ url, redirectUri });
});

app.post('/api/auth/reddit/callback', async (req, res) => {
  const { code, userId } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });

  const host = req.get('host');
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = redditSettings.redirectUri && redditSettings.redirectUri.trim() !== ''
    ? redditSettings.redirectUri
    : `${protocol}://${host}/auth/reddit/callback`;

  try {
    const auth = Buffer.from(`${redditSettings.clientId}:${redditSettings.clientSecret}`).toString('base64');
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': getDynamicUserAgent(userId)
      },
      body: params
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const meRes = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${data.access_token}`,
        'User-Agent': getDynamicUserAgent(userId)
      }
    });

    const meData = await meRes.json();
    const redditUsername = meData.name;
    const redditIcon = meData.icon_img;

    const user = await User.findOne({ id: userId.toString() });
    if (user) {
      let limit = 1;
      if (user.plan) {
        const userPlan = await Plan.findOne({ name: { $regex: new RegExp('^' + user.plan + '$', 'i') } });
        if (userPlan) limit = userPlan.maxAccounts || 1;
      }

      const currentAccounts = user.connectedAccounts || [];
      const alreadyConnected = currentAccounts.find(a => a.username === redditUsername);

      if (!alreadyConnected && currentAccounts.length >= limit) {
        return res.status(403).json({ error: `Account limit reached for ${user.plan} plan (${limit} accounts max).` });
      }

      if (alreadyConnected) {
        alreadyConnected.icon = redditIcon;
        alreadyConnected.lastSeen = new Date().toISOString();
      } else {
        if (!user.connectedAccounts) user.connectedAccounts = [];
        user.connectedAccounts.push({
          username: redditUsername,
          icon: redditIcon,
          connectedAt: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        });
      }
      await user.save();
    }

    saveTokens(userId, redditUsername, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    });

    res.json({ success: true, username: redditUsername });
  } catch (error) {
    console.error('[Reddit OAuth Error]', error);
    res.status(500).json({ error: error.message });
  }
});

const getValidToken = async (userId, username) => {
  let targetAccount = null;
  const user = await User.findOne({ id: userId.toString() });

  if (user && user.connectedAccounts && user.connectedAccounts.length > 0) {
    targetAccount = username
      ? user.connectedAccounts.find(a => a.username === username)
      : user.connectedAccounts[0];
  }

  // Fallback to memory if not found in DB or DB missing tokens
  if (!targetAccount || !targetAccount.accessToken) {
    if (userRedditTokens[userId]) {
      const uName = username || Object.keys(userRedditTokens[userId])[0];
      if (userRedditTokens[userId][uName]) {
        targetAccount = { ...userRedditTokens[userId][uName], username: uName };
      }
    }
  }

  if (!targetAccount || !targetAccount.accessToken) return null;

  if (Date.now() < targetAccount.expiresAt - 60000) {
    return targetAccount.accessToken;
  }

  // Refresh token
  try {
    const auth = Buffer.from(`${redditSettings.clientId}:${redditSettings.clientSecret}`).toString('base64');
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': redditSettings.userAgent
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: targetAccount.refreshToken
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const newTokens = {
      accessToken: data.access_token,
      refreshToken: targetAccount.refreshToken,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };

    await saveTokens(userId, targetAccount.username || username, newTokens);
    return data.access_token;
  } catch (err) {
    console.error('[Reddit Token Refresh Error]', err);
    return null;
  }
};

app.get('/api/user/reddit/status', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const user = await User.findOne({ id: userId.toString() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const accounts = user.connectedAccounts || [];

    res.json({
      connected: accounts.length > 0,
      accounts: accounts
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/user/reddit/disconnect', async (req, res) => {
  try {
    const { userId, username } = req.body;
    if (!userId || !username) return res.status(400).json({ error: 'Missing userId or username' });

    const user = await User.findOne({ id: userId.toString() });
    if (user && user.connectedAccounts) {
      user.connectedAccounts = user.connectedAccounts.filter(a => a.username !== username);
      await user.save();
    }

    if (userRedditTokens[userId]) {
      delete userRedditTokens[userId][username];
      saveSettings({ userRedditTokens });
    }

    addSystemLog('INFO', `User disconnected Reddit account: ${username}`, { userId });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, context, userId, type } = req.body; // type can be 'comment' or 'post'
    const keyToUse = aiSettings.apiKey || process.env.GEMINI_API_KEY;

    if (!keyToUse) {
      return res.status(500).json({ error: 'AI provider is not configured. Please contact the administrator.' });
    }

    // SAFETY: Anti-Spam pre-check (Only for comments)
    if (redditSettings.antiSpam && type === 'comment') {
      const postId = context?.postId || (typeof context === 'string' && context.match(/post_id: (\w+)/)?.[1]);
      if (postId) {
        const alreadyReplied = await RedditReply.findOne({ userId: userId.toString(), postId: postId });
        if (alreadyReplied) {
          return res.status(409).json({
            error: 'DOUBLE_POST_PREVENTION',
            message: 'You have already replied to this post with this account. Double-posting is blocked to protect your account from Reddit bans.'
          });
        }
      }
    }

    const user = await User.findOne({ id: userId.toString() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const rawCost = (aiSettings.creditCosts && aiSettings.creditCosts[type]);
    const cost = Number(rawCost) || (type === 'post' ? 2 : 1);
    const today = new Date().toISOString().split('T')[0];

    // Reset daily usage if date changed (FOR EVERYONE)
    if (user.lastUsageDate !== today) {
      user.dailyUsage = 0;
      user.dailyUsagePoints = 0;
      user.lastUsageDate = today;
    }

    if (user.role !== 'admin') {
      const plan = await Plan.findOne({ $or: [{ id: user.plan }, { name: user.plan }] });
      const planLimit = user.billingCycle === 'yearly' ? plan?.dailyLimitYearly : plan?.dailyLimitMonthly;
      const dailyLimit = (Number(user.customDailyLimit) > 0) ? Number(user.customDailyLimit) : (Number(planLimit) || 0);

      if (dailyLimit > 0 && ((user.dailyUsagePoints || 0) + cost) > dailyLimit) {
        addSystemLog('WARN', `Daily limit reached for user: ${user.email}`, { dailyLimit, usagePoints: user.dailyUsagePoints, cost });
        return res.status(429).json({
          error: `Daily limit reached. Your ${Number(user.customDailyLimit) > 0 ? 'Custom' : user.plan} plan allows ${dailyLimit} credits per day.`,
          used: user.dailyUsagePoints,
          limit: dailyLimit
        });
      }

      if ((user.credits || 0) < cost) {
        return res.status(402).json({ error: `Insufficient credits. This action requires ${cost} credits.` });
      }
    }

    let text = '';

    if (aiSettings.provider === 'google') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(keyToUse);
      const model = genAI.getGenerativeModel({
        model: aiSettings.model,
        generationConfig: {
          temperature: aiSettings.temperature,
          maxOutputTokens: aiSettings.maxOutputTokens,
        }
      });

      const result = await model.generateContent([
        aiSettings.systemPrompt,
        `Context: ${JSON.stringify(context)}`,
        `User Prompt: ${prompt}`
      ]);
      const response = await result.response;
      text = response.text();
    } else {
      // OpenAI or OpenRouter (OpenAI compatible API)
      const url = aiSettings.provider === 'openai'
        ? 'https://api.openai.com/v1/chat/completions'
        : `${aiSettings.baseUrl}/chat/completions`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToUse}`,
          'HTTP-Referer': `https://redditgo.online`, // Specific for this app production or dynamic
          'X-Title': 'RedditGo Content Architect'
        },
        body: JSON.stringify({
          model: aiSettings.model,
          messages: [
            { role: 'system', content: aiSettings.systemPrompt },
            { role: 'user', content: `Context: ${JSON.stringify(context)}\n\nPrompt: ${prompt}` }
          ],
          temperature: aiSettings.temperature,
          max_tokens: aiSettings.maxOutputTokens
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'AI API Error');
      }
      if (data.choices && data.choices[0] && data.choices[0].message) {
        text = data.choices[0].message.content;
      } else {
        throw new Error('AI returned an empty or malformed response');
      }
    }

    // ATOMIC UPDATE: Deduct credits and update usage atomically to prevent race conditions
    const updatedUser = await User.findOneAndUpdate(
      {
        id: userId.toString(),
        $or: [
          { role: 'admin' },
          { credits: { $gte: cost } }
        ]
      },
      {
        $inc: {
          credits: user.role === 'admin' ? 0 : -cost,
          dailyUsage: 1,
          dailyUsagePoints: cost,
          "usageStats.posts": type === 'post' ? 1 : 0,
          "usageStats.comments": type === 'post' ? 0 : 1,
          "usageStats.postsCredits": type === 'post' ? cost : 0,
          "usageStats.commentsCredits": type === 'post' ? 0 : cost,
          "usageStats.totalSpent": cost
        },
        $set: { lastUsageDate: today },
        $push: { "usageStats.history": { date: new Date().toISOString(), type, cost } }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(402).json({ error: 'Insufficient credits or update conflict. Please try again.' });
    }

    addSystemLog('INFO', `AI Generation (${type}) by User ${userId}`, { cost, creditsRemaining: updatedUser.credits, role: updatedUser.role });

    // Check low credits (fire and forget)
    checkLowCredits(updatedUser).catch(e => console.error('Low credits check error:', e));

    res.json({
      text,
      credits: updatedUser.credits,
      dailyUsage: updatedUser.dailyUsage,
      dailyUsagePoints: updatedUser.dailyUsagePoints
    });
  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, userId } = req.body;
    const keyToUse = aiSettings.apiKey || process.env.GEMINI_API_KEY;

    if (!keyToUse || !keyToUse.startsWith('sk-')) {
      return res.status(400).json({ error: 'OpenAI API Key required for image generation.' });
    }

    // CHECK CREDITS
    const user = await User.findOne({ id: userId.toString() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const plan = await Plan.findOne({ $or: [{ id: user.plan }, { name: user.plan }] });

    // PLAN FEATURE CHECK
    if (user.role !== 'admin' && plan && plan.allowImages === false) {
      addSystemLog('WARN', `Feature Blocked: Image generation attempted by ${user.plan} user: ${user.email}`);
      return res.status(403).json({
        error: 'AI Image Generation is not included in your current plan.',
        requiredPlan: 'Professional'
      });
    }

    const cost = Number(aiSettings.creditCosts?.image) || 5;
    const today = new Date().toISOString().split('T')[0];

    // Reset daily usage if date changed (FOR EVERYONE)
    if (user.lastUsageDate !== today) {
      await User.updateOne({ id: userId.toString() }, {
        $set: { dailyUsage: 0, dailyUsagePoints: 0, lastUsageDate: today }
      });
      user.dailyUsage = 0;
      user.dailyUsagePoints = 0;
    }

    if (user.role !== 'admin') {
      const planLimit = user.billingCycle === 'yearly' ? plan?.dailyLimitYearly : plan?.dailyLimitMonthly;
      const dailyLimit = (Number(user.customDailyLimit) > 0) ? Number(user.customDailyLimit) : (Number(planLimit) || 0);

      if (dailyLimit > 0 && ((user.dailyUsagePoints || 0) + cost) > dailyLimit) {
        addSystemLog('WARN', `Daily limit reached (Image) for user: ${user.email}`, { dailyLimit, usagePoints: user.dailyUsagePoints, cost });
        return res.status(429).json({
          error: `Daily limit reached. Your ${Number(user.customDailyLimit) > 0 ? 'Custom' : user.plan} plan allows ${dailyLimit} credits per day.`,
          used: user.dailyUsagePoints,
          limit: dailyLimit
        });
      }

      if ((user.credits || 0) < cost) {
        return res.status(402).json({ error: `Insufficient credits. Image generation requires ${cost} credits.` });
      }
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${keyToUse}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024"
      })
    });

    const responseData = await response.json();
    if (!response.ok) throw new Error(responseData.error?.message || 'Image AI API Error');

    const imageUrl = responseData.data?.[0]?.url;
    if (!imageUrl) throw new Error('No image URL returned from AI');

    // ATOMIC UPDATE: Deduct credits and update usage atomically
    const updatedUser = await User.findOneAndUpdate(
      {
        id: userId.toString(),
        $or: [
          { role: 'admin' },
          { credits: { $gte: cost } }
        ]
      },
      {
        $inc: {
          credits: user.role === 'admin' ? 0 : -cost,
          dailyUsage: 1,
          dailyUsagePoints: cost,
          "usageStats.images": 1,
          "usageStats.imagesCredits": cost,
          "usageStats.totalSpent": cost
        },
        $set: {
          lastUsageDate: today,
          latestImage: {
            url: imageUrl,
            prompt: prompt,
            date: new Date().toISOString()
          }
        },
        $push: { "usageStats.history": { date: new Date().toISOString(), type: 'image', cost } }
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error('Insufficient credits or update conflict. Please try again.');
    }

    addSystemLog('INFO', `AI Image Generated by User ${userId}`, { cost, creditsRemaining: updatedUser.credits, role: updatedUser.role });

    // Check low credits (fire and forget)
    checkLowCredits(updatedUser).catch(e => console.error('Low credits check error:', e));

    res.json({
      url: imageUrl,
      credits: updatedUser.credits,
      dailyUsage: updatedUser.dailyUsage,
      dailyUsagePoints: updatedUser.dailyUsagePoints
    });
  } catch (error) {
    console.error("Image Gen Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user/latest-image', async (req, res) => {
  try {
    const { userId } = req.query;
    const user = await User.findOne({ id: userId.toString() });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.latestImage || null);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reddit Fetching Proxy (Free JSON Method)
// Post Reply to Reddit
app.post('/api/reddit/reply', async (req, res) => {
  try {
    const { userId, postId, comment, postTitle, subreddit, productMention, redditUsername } = req.body;
    if (!userId || !comment) return res.status(400).json({ error: 'Missing required fields' });

    console.log(`[Reddit] Posting reply for user ${userId} (account: ${redditUsername || 'default'}) on post ${postId}`);

    const token = await getValidToken(userId, redditUsername);
    let redditCommentId = null;

    // If it's a real Reddit post (not from MOCK_POSTS), attempt real API call
    if (token && postId && !['1', '2', '3', '4'].includes(postId)) {
      // SAFETY: Double-Reply Check (Final Guard before API call)
      if (redditSettings.antiSpam) {
        const doubleCheck = await RedditReply.findOne({ userId: userId.toString(), postId: postId });
        if (doubleCheck) throw new Error('You have already replied to this post. Double-replying is blocked.');
      }

      // SAFETY: Randomized Delay (Human Touch)
      const min = redditSettings.minDelay || 5;
      const max = redditSettings.maxDelay || 15;
      const waitTime = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
      console.log(`[Reddit] Humanizing... waiting ${waitTime / 1000}s before sending reply.`);
      await sleep(waitTime);

      const response = await fetch('https://oauth.reddit.com/api/comment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': getDynamicUserAgent(userId)
        },
        body: new URLSearchParams({
          api_type: 'json',
          text: comment,
          thing_id: `t3_${postId}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Reddit Reply Error]', errorData);
        throw new Error('Failed to post to Reddit API');
      }

      const redditResponse = await response.json();
      try {
        const commentData = redditResponse.json?.data?.things?.[0]?.data;
        if (commentData && commentData.id) {
          redditCommentId = `t1_${commentData.id}`;
        }
      } catch (e) {
        console.error('Error parsing Reddit comment ID:', e);
      }
    }

    // Save to history
    const entry = new RedditReply({
      id: Math.random().toString(36).substr(2, 9),
      userId: userId.toString(),
      postId,
      redditCommentId,
      postTitle: postTitle || 'Reddit Post',
      postUrl: req.body.postUrl || '#',
      postContent: req.body.postContent || '',
      subreddit: subreddit || 'unknown',
      comment,
      productMention,
      redditUsername: redditUsername || 'unknown',
      deployedAt: new Date().toISOString(),
      status: 'Sent',
      ups: 0,
      replies: 0,
      sentiment: 'Neutral'
    });

    await entry.save();
    addSystemLog('SUCCESS', `Reddit Reply sent by User ${userId}`, { subreddit, postTitle });

    res.json({ success: true, entry });
  } catch (error) {
    addSystemLog('ERROR', `Reddit Reply Failed: ${error.message}`);
    console.error('Reddit Reply Posting Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch User Reply History
app.get('/api/user/replies', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const history = await RedditReply.find({ userId: userId.toString() }).sort({ deployedAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create New Reddit Post
app.post('/api/reddit/post', async (req, res) => {
  try {
    const { userId, subreddit, title, text, kind, redditUsername } = req.body;
    if (!userId || !subreddit || !title) return res.status(400).json({ error: 'Missing required fields' });

    const token = await getValidToken(userId, redditUsername);
    if (!token) return res.status(401).json({ error: 'Reddit account not linked' });

    // SAFETY: Anti-Spam / Double-Post Check
    if (redditSettings.antiSpam) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentPost = await RedditPost.findOne({
        userId: userId.toString(),
        postTitle: title,
        deployedAt: { $gt: oneHourAgo }
      });
      if (recentPost) throw new Error('You have already posted a topic with this exact title recently. Please wait a bit or change the title.');
    }

    const bodyParams = new URLSearchParams({
      api_type: 'json',
      sr: subreddit,
      title: title,
      kind: kind || 'self',
    });

    if (kind === 'link') bodyParams.append('url', text);
    else bodyParams.append('text', text);

    // SAFETY: Randomized Delay (Human Touch)
    const min = redditSettings.minDelay || 5;
    const max = redditSettings.maxDelay || 15;
    const waitTime = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
    console.log(`[Reddit] Humanizing... waiting ${waitTime / 1000}s before submitting post.`);
    await sleep(waitTime);

    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': getDynamicUserAgent(userId)
      },
      body: bodyParams
    });

    const redditResponse = await response.json();
    if (!response.ok) throw new Error(redditResponse.json?.errors?.[0]?.[1] || 'Failed to submit to Reddit API');

    const entry = new RedditPost({
      id: Math.random().toString(36).substring(2, 11),
      userId: userId.toString(),
      subreddit,
      postTitle: title,
      postContent: text,
      postUrl: `https://reddit.com${redditResponse.json.data.url || ''}`,
      redditUsername: redditUsername || 'unknown',
      redditCommentId: redditResponse.json.data.id || redditResponse.json.data.name || null,
      deployedAt: new Date().toISOString(),
      status: 'Sent',
      ups: 0,
      replies: 0,
      sentiment: 'Neutral'
    });

    await entry.save();
    addSystemLog('SUCCESS', `Reddit Post submitted: ${title}`, { subreddit });

    res.json({ success: true, redditResponse });
  } catch (error) {
    addSystemLog('ERROR', `Reddit Post Failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Fetch User Posts History
app.get('/api/user/posts', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const history = await RedditPost.find({ userId: userId.toString() }).sort({ deployedAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync History for Posts with Real Reddit Data
app.get('/api/user/posts/sync', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const userPosts = await RedditPost.find({ userId: userId.toString(), redditCommentId: { $ne: null } });

    if (userPosts.length > 0) {
      const token = await getValidToken(userId);
      if (token) {
        const ids = userPosts.map(r => r.redditCommentId.startsWith('t3_') ? r.redditCommentId : `t3_${r.redditCommentId}`).join(',');
        const response = await fetch(`https://oauth.reddit.com/api/info?id=${ids}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': redditSettings.userAgent
          }
        });

        if (response.ok) {
          const data = await response.json();
          const liveItems = data.data.children;

          for (const child of liveItems) {
            const liveData = child.data;
            const entryIdMatch = liveData.name || `t3_${liveData.id}`;
            await RedditPost.updateOne(
              { $or: [{ redditCommentId: entryIdMatch }, { redditCommentId: entryIdMatch.replace('t3_', '') }] },
              { $set: { ups: liveData.ups, replies: liveData.num_comments || 0 } }
            );
          }
        }
      }
    }

    const updatedHistory = await RedditPost.find({ userId: userId.toString() }).sort({ deployedAt: -1 });
    res.json(updatedHistory);
  } catch (error) {
    console.error('[Reddit Post Sync Error]', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Sync History with Real Reddit Data
app.get('/api/user/replies/sync', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const userReplies = await RedditReply.find({ userId: userId.toString(), redditCommentId: { $ne: null } });

    if (userReplies.length > 0) {
      const token = await getValidToken(userId);
      if (token) {
        const ids = userReplies.map(r => r.redditCommentId).join(',');
        const response = await fetch(`https://oauth.reddit.com/api/info?id=${ids}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': redditSettings.userAgent
          }
        });

        if (response.ok) {
          const data = await response.json();
          const liveItems = data.data.children;

          for (const child of liveItems) {
            const liveData = child.data;
            await RedditReply.updateOne(
              { redditCommentId: liveData.name },
              { $set: { ups: liveData.ups, replies: liveData.num_comments || 0 } }
            );
          }
        }
      }
    }

    const updatedHistory = await RedditReply.find({ userId: userId.toString() }).sort({ deployedAt: -1 });
    res.json(updatedHistory);
  } catch (error) {
    console.error('[Reddit Sync Error] Non-critical sync failure:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Fetch Real-time Reddit Profile (Karma)
app.get('/api/user/reddit/profile', async (req, res) => {
  const { userId, username } = req.query;
  if (!userId) return res.status(400).json({ error: 'User ID required' });

  try {
    const token = await getValidToken(userId, username);
    if (!token) return res.status(401).json({ error: 'Reddit account not linked' });

    const response = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': redditSettings.userAgent
      }
    });

    if (!response.ok) throw new Error('Failed to fetch Reddit profile');
    const data = await response.json();

    res.json({
      name: data.name,
      commentKarma: data.comment_karma,
      linkKarma: data.link_karma,
      totalKarma: data.total_karma,
      hasModMail: data.has_mod_mail,
      icon: data.icon_img
    });
  } catch (error) {
    console.error('Profile Fetch Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reddit/posts', async (req, res) => {
  try {
    const { subreddit = 'saas', keywords = '', userId } = req.query;
    console.log(`[Reddit] Fetching for User ${userId} from r/${subreddit}`);

    const token = userId ? await getValidToken(userId) : null;

    let url, headers;

    if (token) {
      // Use Official API with OAuth Token
      const searchQuery = keywords ? `${keywords} subreddit:${subreddit}` : `subreddit:${subreddit}`;
      url = `https://oauth.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(searchQuery)}&sort=new&limit=25`;
      headers = {
        'Authorization': `Bearer ${token}`,
        'User-Agent': getDynamicUserAgent(userId)
      };
    } else {
      return res.status(401).json({ error: 'Reddit account not linked. Please go to Settings to link your account.' });
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Reddit Error] Status: ${response.status} - ${errorText.substring(0, 100)}`);
      throw new Error(`Reddit API Blocked (Status ${response.status}). Please link your Reddit account in Dashboard.`);
    }

    const data = await response.json();
    const keywordList = keywords.toLowerCase().split(',').map(k => k.trim()).filter(k => k);

    const posts = data.data.children.map(child => {
      const post = child.data;

      // Relevance & Opportunity Scoring
      let score = 0;
      const content = (post.title + ' ' + post.selftext).toLowerCase();

      // Keyword matching
      let matchCount = 0;
      keywordList.forEach(word => {
        if (content.includes(word)) {
          score += 40;
          matchCount++;
        }
      });

      // Intent Detection
      let intent = 'General';
      if (content.match(/alternative|instead of|replace|better than/i)) intent = 'Seeking Alternative';
      else if (content.match(/how to|help|question|issue|problem/i)) intent = 'Problem Solving';
      else if (content.match(/recommend|best|any advice|suggestion/i)) intent = 'Request Advice';
      else if (content.match(/built|show|made|launched/i)) intent = 'Product Launch';

      // Score for intent
      if (intent !== 'General') score += 20;

      // Engagement score (capped)
      score += Math.min(post.ups / 5, 20);
      score += Math.min(post.num_comments * 2, 20);

      // Final normalized score (0-100)
      const opportunityScore = Math.min(Math.round(score), 100);

      // Competitor Detection (Mock list for demo, could be dynamic)
      const competitors = ['hubspot', 'salesforce', 'buffer', 'hootsuite'];
      const mentionedCompetitors = competitors.filter(c => content.includes(c));

      return {
        id: post.id,
        title: post.title,
        author: post.author,
        subreddit: post.subreddit,
        ups: post.ups,
        num_comments: post.num_comments,
        selftext: post.selftext,
        url: `https://reddit.com${post.permalink}`,
        created_utc: post.created_utc,
        opportunityScore,
        intent,
        isHot: post.ups > 100 || post.num_comments > 50,
        competitors: mentionedCompetitors
      };
    });

    res.json(posts.sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 20));
  } catch (error) {
    console.error('Reddit Fetch Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));

  app.get(/.*/, (req, res) => {
    // Prevent unhandled API routes from returning HTML, avoiding SyntaxError JSON parse crashes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ SERVER ERROR:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    path: req.path
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
