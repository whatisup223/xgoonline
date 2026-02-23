import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    id: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    name: String,
    company: String,
    plan: { type: String, default: 'Starter' },
    billingCycle: { type: String, default: 'monthly' },
    credits: { type: Number, default: 0 },
    customDailyLimit: Number,
    subscriptionStart: Date,
    subscriptionEnd: Date,
    status: { type: String, default: 'Active' },
    statusMessage: String,
    avatar: String,
    createdAt: { type: Date, default: () => new Date() },
    allowImages: Boolean,
    allowTracking: Boolean,
    dailyUsagePoints: { type: Number, default: 0 },
    dailyUsage: { type: Number, default: 0 },
    lastUsageDate: String,
    hasCompletedOnboarding: { type: Boolean, default: false },
    usageStats: mongoose.Schema.Types.Mixed,
    accounts: [{
        username: String,
        accessToken: String,
        refreshToken: String,
        tokenExpiry: Number
    }],
    history: [mongoose.Schema.Types.Mixed],
    postsHistory: [mongoose.Schema.Types.Mixed],
    transactions: [mongoose.Schema.Types.Mixed],
    prompts: [mongoose.Schema.Types.Mixed],
    brandProfile: mongoose.Schema.Types.Mixed,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationExpires: Date,
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorCode: String,
    twoFactorExpires: Date,
    lowCreditsNotified: { type: Boolean, default: false },
    dismissedAnnouncements: [String],
    autoRenew: { type: Boolean, default: true },
    deletionScheduledDate: Date,
    cancellationReason: mongoose.Schema.Types.Mixed,
    isSuspended: { type: Boolean, default: false }
}, { strict: false }); // strict: false allows dynamic data from the old version safely

const AnnouncementSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: String,
    content: String,
    type: { type: String, enum: ['update', 'promotion', 'maintenance', 'welcome'], default: 'update' },
    imageUrl: String,
    targetPlan: { type: String, default: 'all' },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: String
}, { strict: false });

const TrackingLinkSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: String,
    originalUrl: String,
    trackingUrl: String,
    postId: String,
    commentId: String,
    subreddit: String,
    redditUsername: String,
    clicks: { type: Number, default: 0 },
    createdAt: Date,
    clickDetails: [mongoose.Schema.Types.Mixed]
}, { strict: false });

const BrandProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    brandName: String,
    website: String,
    description: String,
    targetAudience: String,
    problem: String,
    primaryColor: String,
    secondaryColor: String
});

const PlanSchema = new mongoose.Schema({
    id: String,
    name: String,
    description: String,
    monthlyPrice: Number,
    yearlyPrice: Number,
    credits: Number,
    dailyLimitMonthly: Number,
    dailyLimitYearly: Number,
    features: [String],
    isPopular: Boolean,
    highlightText: String,
    isCustom: Boolean,
    allowImages: Boolean,
    allowTracking: Boolean,
    purchaseEnabled: { type: Boolean, default: true },
    isVisible: { type: Boolean, default: true },
    maxAccounts: { type: Number, default: 1 }
});

const TicketSchema = new mongoose.Schema({
    id: String,
    subject: String,
    description: String,
    message: String,
    email: String,
    userEmail: String,
    userName: String,
    userId: String,
    status: { type: String, default: 'open' },
    priority: { type: String, default: 'medium' },
    category: { type: String, default: 'General' },
    messages: [mongoose.Schema.Types.Mixed],
    replies: [mongoose.Schema.Types.Mixed],
    createdAt: String,
    updatedAt: String
}, { strict: false });

const RedditReplySchema = new mongoose.Schema({
    id: String,
    userId: String,
    postId: String,
    redditCommentId: String,
    postTitle: String,
    postUrl: String,
    postContent: String,
    subreddit: String,
    comment: String,
    productMention: String,
    redditUsername: String,
    deployedAt: Date,
    status: String,
    ups: { type: Number, default: 0 },
    replies: { type: Number, default: 0 },
    sentiment: String
}, { strict: false });

const RedditPostSchema = new mongoose.Schema({
    id: String,
    userId: String,
    subreddit: String,
    postTitle: String,
    postContent: String,
    postUrl: String,
    redditUsername: String,
    redditCommentId: String,
    deployedAt: Date,
    status: String,
    ups: { type: Number, default: 0 },
    replies: { type: Number, default: 0 },
    sentiment: String
}, { strict: false });

const SystemLogSchema = new mongoose.Schema({
    id: String,
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['INFO', 'WARN', 'ERROR', 'SUCCESS', 'DEBUG'], default: 'INFO' },
    message: String,
    metadata: mongoose.Schema.Types.Mixed
});

const SettingsSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    value: mongoose.Schema.Types.Mixed
}, { strict: false });

const CancellationFeedbackSchema = new mongoose.Schema({
    userId: String,
    userEmail: String,
    plan: String,
    reason: String,
    comment: String,
    usageAtCancellation: Number,
    date: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', UserSchema);
export const TrackingLink = mongoose.model('TrackingLink', TrackingLinkSchema);
export const BrandProfile = mongoose.model('BrandProfile', BrandProfileSchema);
export const Plan = mongoose.model('Plan', PlanSchema);
export const Ticket = mongoose.model('Ticket', TicketSchema);
export const Setting = mongoose.model('Setting', SettingsSchema);
export const RedditReply = mongoose.model('RedditReply', RedditReplySchema);
export const RedditPost = mongoose.model('RedditPost', RedditPostSchema);
export const SystemLog = mongoose.model('SystemLog', SystemLogSchema);
export const Announcement = mongoose.model('Announcement', AnnouncementSchema);
export const CancellationFeedback = mongoose.model('CancellationFeedback', CancellationFeedbackSchema);

