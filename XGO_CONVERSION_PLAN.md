# 🚀 XGo Project Conversion Plan: From Reddit to X (Twitter)

This document tracks the complete migration of the platform from a Reddit-focused tool to an **X (Twitter) Growth Agent**.

---

## 🏗️ Phase 1: Global Branding & UI Migration
- [x] Rename "RedditGo" to "XGo" across all files (Frontend & Backend).
- [ ] Replace all Reddit icons (`lucide-react` icons like `Reddit`) with X/Twitter icons. (Need to double-check all components)
- [x] Update Typography and Brand Colors (Move from Reddit Orange to X Black/Primary styles).
- [x] Update Landing Page content (Headlines, Hero section, Feature lists).
- [x] Update Meta tags, Titles, and SEO descriptions in `index.html` and components.
- [x] Replace "Subreddits" terminology with "Topics" or "Niches".
- [x] Replace "Posts/Comments" terminology with "Tweets/Replies".

## 🛡️ Phase 2: Database & Type System Overhaul
- [x] Rename Database Models:
    - [x] Rename `RedditPost` to `XPost`.
    - [x] Rename `RedditReply` to `XReply`.
- [ ] Update Mongoose Schemas to reflect X-specific fields (e.g., `tweetId` instead of `redditId`). (Reviewing server/models.js)
- [x] Update TypeScript Interfaces in `types.ts` to reflect the new X structures.
- [ ] Clean up existing Reddit data migration scripts (if any).
- [x] Update User model fields (e.g., `redditLinked` -> `xLinked`, `redditUsername` -> `xHandle`).

## ⚙️ Phase 3: Backend & API Integration
- [ ] Create/Update X API Authentication flow (OAuth 2.0 PKCE). (Currently using placeholders)
- [ ] Implement X API endpoints for:
    - [ ] Posting Tweets.
    - [ ] Replying to Tweets.
    - [ ] Searching/Tracking Tweets by Keywords.
- [x] Delete/Disable all old Reddit-specific API routes (`/api/reddit/...`).
- [ ] Update Webhooks for X integration.

## 🤖 Phase 4: AI & Content Generation (Gemini Service)
- [x] Update `geminiService.ts` prompts to focus on X writing style (short, punchy, hashtags).
- [x] Adjust character limits and formatting for X (280 characters).
- [x] Remove Reddit-specific "Growth Rules" and replace with X-specific strategies.
- [x] Update branding instructions for AI to use "XGo" instead of "Redditgo".

## 🎨 Phase 5: Dashboard & User Interface Refactor
- [x] Refactor "Post Agent" to "Tweet Architect".
- [x] Refactor "Comment Agent" to "Reply Maestro".
- [x] Update Connection cards to show X login status.
- [ ] Update Analytics charts to reflect Tweet engagement (Likes, Retweets, Impressions).

## 🧹 Phase 6: Final Cleanup & Testing
- [ ] Remove dummy `test_user` scripts that refer to Reddit.
- [ ] Run full project search for "Reddit" and "Redigo" to ensure 0 remaining references.
- [ ] Test the full X flow from generation to posting.
- [ ] Final UI Polish (Ensure all icons and colors feel premium).

---
*Last update: 2026-02-23*
*Next Step: Fix X API Logic and Social Auth in server/index.js.*
