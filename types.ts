
export interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  ups: number;
  num_comments: number;
  selftext: string;
  url: string;
  created_utc: number;
}

export interface GeneratedReply {
  comment: string;
  tone: string;
  actionable_points: string[];
  keywords: string[];
}

export interface ScheduledPost {
  id: string;
  postId: string;
  postTitle: string;
  subreddit: string;
  replyContent: string;
  scheduledTime: string;
  status: 'pending' | 'posted' | 'failed';
  engagement?: {
    upvotes: number;
    replies: number;
  };
}

export interface UserSettings {
  redditLinked: boolean;
  redditUsername: string | null;
  subscriptionPlan: 'free' | 'pro' | 'business';
  trackedSubreddits: string[];
  autoReplyEnabled: boolean;
}

export enum AppRoute {
  LANDING = '/',
  DASHBOARD = '/dashboard',
  ANALYTICS = '/analytics',
  SETTINGS = '/settings',
  ADMIN = '/admin'
}
