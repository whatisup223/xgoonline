
export interface XTweet {
  id: string;
  title?: string;
  author?: string;
  topic?: string;
  likes?: number;
  num_replies?: number;
  text?: string;
  url?: string;
  created_at?: number;
  // Extended fields used in Comments agent
  subX?: string;
  ups?: number;
  num_comments?: number;
  selftext?: string;
  created_utc?: number;
  opportunityScore?: number;
  intent?: string;
}

export interface GeneratedReply {
  reply?: string;
  comment?: string;
  tone?: string;
  actionable_points?: string[];
  keywords?: string[];
}

export interface ScheduledPost {
  id: string;
  postId: string;
  postTitle: string;
  topic: string;
  replyContent: string;
  scheduledTime: string;
  status: 'pending' | 'posted' | 'failed';
  engagement?: {
    likes: number;
    replies: number;
  };
}

export interface UserSettings {
  xLinked: boolean;
  xHandle: string | null;
  subscriptionPlan: 'free' | 'pro' | 'business';
  trackedKeywords: string[];
  autoReplyEnabled: boolean;
}

export enum AppRoute {
  LANDING = '/',
  DASHBOARD = '/dashboard',
  ANALYTICS = '/analytics',
  SETTINGS = '/settings',
  ADMIN = '/admin'
}
