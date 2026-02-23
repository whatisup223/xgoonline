import { GeneratedReply, RedditPost } from "../types";

// ─── Brand Profile Helper ────────────────────────────────────────────────────
export interface BrandProfile {
  brandName?: string;
  description?: string;
  targetAudience?: string;
  problem?: string;
  website?: string;
  primaryColor?: string;
  secondaryColor?: string;
  brandTone?: string;
  customTone?: string;
}

export const fetchBrandProfile = async (userId: string | number): Promise<BrandProfile> => {
  try {
    const res = await fetch(`/api/user/brand-profile?userId=${userId}&_t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
};

// Merges saved profile with override fields — override wins on non-empty values
const mergeProfiles = (saved: BrandProfile, override?: Partial<BrandProfile>): BrandProfile => {
  if (!override) return saved;
  const merged: BrandProfile = { ...saved };
  (Object.keys(override) as (keyof BrandProfile)[]).forEach(key => {
    const val = override[key];
    if (val && val.trim() !== '') (merged as any)[key] = val;
  });
  return merged;
};

const buildBrandContext = (profile: BrandProfile): string => {
  if (!profile || !profile.brandName) return '';
  const tone = profile.brandTone === 'custom' && profile.customTone
    ? profile.customTone
    : profile.brandTone || 'conversational';
  return `
BRAND INTELLIGENCE (internalize this — do NOT parrot it back verbatim):
- Brand: ${profile.brandName}
- Core value proposition: ${profile.description || 'Not specified'}
- Ideal customer: ${profile.targetAudience || 'Not specified'}
- Pain point addressed: ${profile.problem || 'Not specified'}
- Website: ${profile.website || 'Not specified'}
- Brand communication style: ${tone}
`;
};

const buildImageBrandContext = (profile: BrandProfile): string => {
  if (!profile || !profile.brandName) {
    return 'CRITICAL: Use Redditgo brand colors ONLY: Vibrant Orange (#EA580C) for primary elements/highlights, Deep Slate Navy (#1E293B) for backgrounds/contrast, and White for text/details.';
  }
  const primary = profile.primaryColor || '#EA580C';
  const secondary = profile.secondaryColor || '#1E293B';
  return `CRITICAL VISUAL IDENTITY: Strictly use the brand colors for ${profile.brandName}: Primary Color ${primary} (use for main objects and highlights), Secondary Color ${secondary} (use for backgrounds and accents), and White. Ensure the palette is dominated by these specific hex codes to maintain brand consistency.`;
};

// ─── Tone Strategy Builder ────────────────────────────────────────────────────
const buildToneStrategy = (tone: string): string => {
  const strategies: Record<string, string> = {
    helpful_peer: `
TONE STRATEGY — HELPFUL PEER:
You are a knowledgeable friend who genuinely wants to help, not sell.
- Write in first person. Use "I've found that..." or "What worked for me was..."
- Keep paragraphs to 2-3 lines max. Reddit readers skim.
- ONE specific, actionable tip that actually helps the OP.
- Sound like you're typing a message to a smart friend, not writing an essay.
- Casual punctuation is fine. Imperfect language is authentic.
- If mentioning a product, frame it as a personal recommendation: "I've been using X for this and it's saved me hours"
`,
    thought_leader: `
TONE STRATEGY — THOUGHT LEADER:
You have real expertise and you're sharing a structured perspective.
- Open with a counterintuitive or insightful observation about the topic.
- Use a clear structure: short intro → 2-3 numbered insights → brief conclusion.
- Each insight should be specific and non-obvious.
- Avoid generic advice. Give the OP something they can implement TODAY.
- If mentioning a product, do it as part of a broader recommendation, not the main point.
- Sound like someone who has done the work, not just read about it.
`,
    storyteller: `
TONE STRATEGY — STORYTELLER:
Draw the reader in with a relatable human moment before delivering the value.
- Open with: a quick personal struggle, "I remember when...", or a specific scene.
- The story should connect directly to the OP's problem (2-3 sentences max).
- Transition naturally into the lesson learned or solution found.
- End with an empowering note or question that invites engagement.
- If mentioning a product, let it emerge as "the thing that helped me solve this exact problem."
- Make it feel like a conversation, not a narrative essay.
`,
    skeptic: `
TONE STRATEGY — SKEPTIC / CHALLENGER:
Challenge a common assumption, then offer a better perspective.
- Open by respectfully reframing the premise of the original post.
- Example: "Most people think X, but in practice Y is usually the issue."
- Back it up with ONE specific reasoning or example.
- Then pivot to your solution/recommendation as the logical alternative.
- This tone should feel intellectually honest, not contrarian for the sake of it.
- If mentioning a product, position it as the solution that follows your logical argument.
`,
  };
  return strategies[tone] || strategies['helpful_peer'];
};

// ─── Generate Reddit Reply ───────────────────────────────────────────────────
export const generateRedditReply = async (
  post: RedditPost,
  topic: string,
  tone: string,
  audience: string,
  userId?: string | number,
  overrideProfile?: Partial<BrandProfile>,
  language: string = 'English',
  includeBrandName: boolean = true,
  includeLink: boolean = true,
  useTracking: boolean = false
): Promise<GeneratedReply & { credits?: number; dailyUsagePoints?: number; dailyUsage?: number }> => {
  try {
    const savedProfile = userId ? await fetchBrandProfile(userId) : {};
    const effectiveProfile = mergeProfiles(savedProfile, overrideProfile);
    const brandContext = buildBrandContext(effectiveProfile);
    const toneStrategy = buildToneStrategy(tone);

    let effectiveWebsite = effectiveProfile.website || 'https://redditgo.online/';

    // LINK TRACKING INTEGRATION
    if (useTracking && includeLink && userId) {
      try {
        const trackRes = await fetch('/api/tracking/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            originalUrl: effectiveWebsite,
            subreddit: post.subreddit,
            postId: post.id,
            type: 'comment'
          })
        });
        if (trackRes.ok) {
          const trackData = await trackRes.json();
          effectiveWebsite = trackData.trackingUrl;
        }
      } catch (err) {
        console.warn('Tracking link creation failed, falling back to direct link:', err);
      }
    }

    const hasBrand = includeBrandName && !!effectiveProfile.brandName;
    const hasLink = includeLink && !!effectiveWebsite;

    let brandInstructions = '';
    if (hasBrand && hasLink) {
      brandInstructions = `
BRAND INTEGRATION (STRICT REQUIREMENT):
- You MUST use the brand name: "${effectiveProfile.brandName}".
- You MUST use the URL: "${effectiveWebsite}".
- Mention "${effectiveProfile.brandName}" as a tool or discovery that helped you achieve a specific result.
- Embed the link ONCE, naturally in a sentence: [${effectiveProfile.brandName}](${effectiveWebsite}).
- DO NOT hallucinate any other brand names, product names, or websites.
- DO NOT use marketing superlatives (best, amazing, game-changer).
- Frame it as an 'afterthought' or a 'side note': "By the way, I used [${effectiveProfile.brandName}](${effectiveWebsite}) to handle the X part of this, and it worked well."
- Redditgo is your internal identity, but your public recommendation is "${effectiveProfile.brandName}".`;
    } else if (hasBrand) {
      brandInstructions = `
BRAND INTEGRATION (STRICT REQUIREMENT):
- Mention "${effectiveProfile.brandName}" organically ONCE as a personal recommendation.
- Do NOT include any links.
- Keep it casual: "I've been using ${effectiveProfile.brandName} for this" — not "You should buy ${effectiveProfile.brandName}".
- DO NOT mention any other products or brands.`;
    } else if (hasLink) {
      brandInstructions = `
LINK INTEGRATION (STRICT REQUIREMENT):
- Include ONE natural link using ONLY this URL: "${effectiveWebsite}".
- Use natural anchor text: [this tool](${effectiveWebsite}) or [here](${effectiveWebsite}).
- Embed it mid-sentence, not as a standalone or footer.
- DO NOT mention any brand name if none was provided.`;
    } else {
      brandInstructions = `NO BRAND/LINK ALLOWED: Do not mention any product name, brand name, or include any links/URLs. Focus 100% on providing pure, expert advice.`;
    }

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type: 'comment',
        prompt: `You are writing a Reddit comment as a real, thoughtful community member.

POST BEING REPLIED TO:
Title: ${post.title}
Body: ${post.selftext.substring(0, 800)}
Community: r/${post.subreddit}

${toneStrategy}

${brandContext}

LANGUAGE: Write the entire reply in ${language}. Non-negotiable.

${brandInstructions}

AUTHENTICITY RULES (Human Machine Protocol):
1. NO CORPORATE RADIANCE: Avoid "Absolutely!", "Great question!", or excessive enthusiasm. Real Redditors are helpful but casual/dry.
2. IMPERFECT RHYTHM: Use sentence fragments. Vary length. Real people don't write in 4 identical paragraphs.
3. VALUE-FIRST: 80% of the content must be pure value/advice. Only the last 20% should bridge to the solution.
4. SLANG & LINGO: Use (tbh, tldr, etc.) appropriately if it fits the tone.
5. NO MARKETING TERMS: Never use "leverage", "utilize", "holistic", "game-changer", "synergy", "seamless". These are AI/Marketing dead giveaways.
6. CTA: Don't use a Call to Action. Use a "Call to Connection" — ask a follow-up question or share a relatable opinion.
7. LENGTH: Aim for 2-4 high-value paragraphs (roughly 100-200 words). Do not be overly brief; provide enough context to be genuinely helpful.

Return STRICT JSON (no markdown code blocks, no extra text outside the JSON):
{
  "comment": "the actual comment text here",
  "tone": "${tone}",
  "actionable_points": ["key takeaway 1", "key takeaway 2"],
  "keywords": ["relevant", "keywords"],
  "reddit_strategy": "brief note on why this approach works for this post"
}`,
        context: { postId: post.id, subreddit: post.subreddit }
      })
    });

    if (response.status === 402) throw new Error('OUT_OF_CREDITS');
    if (response.status === 429) throw new Error('DAILY_LIMIT_REACHED');
    if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);

    const data = await response.json();
    const cleanJson = data.text.replace(/```json\n?|`\n?```/g, '').trim();
    const result = JSON.parse(cleanJson) as GeneratedReply;
    return { ...result, credits: data.credits, dailyUsagePoints: data.dailyUsagePoints, dailyUsage: data.dailyUsage };
  } catch (error) {
    console.error("Error generating reply via backend:", error);
    throw error;
  }
};

// ─── Generate Reddit Post ────────────────────────────────────────────────────
export const generateRedditPost = async (
  subreddit: string,
  goal: string,
  tone: string,
  productMention?: string,
  productUrl?: string,
  userId?: string | number,
  overrideProfile?: Partial<BrandProfile>,
  language: string = 'English',
  includeBrandName: boolean = true,
  includeLink: boolean = true,
  useTracking: boolean = false
): Promise<{ title: string; content: string; imagePrompt: string; credits?: number; dailyUsagePoints?: number; dailyUsage?: number }> => {
  try {
    const savedProfile = userId ? await fetchBrandProfile(userId) : {};

    const implicitOverride: Partial<BrandProfile> = {};
    if (productMention && productMention.trim() !== '') implicitOverride.brandName = productMention;
    if (productUrl && productUrl.trim() !== '') implicitOverride.website = productUrl;

    const effectiveProfile = mergeProfiles(savedProfile, { ...overrideProfile, ...implicitOverride });
    const brandContext = buildBrandContext(effectiveProfile);
    const imageColorContext = buildImageBrandContext(effectiveProfile);
    const toneStrategy = buildToneStrategy(tone);

    const finalBrandName = effectiveProfile.brandName || '';
    const finalUrl = effectiveProfile.website || '';
    let effectiveWebsite = finalUrl || 'https://redditgo.online/';

    // LINK TRACKING INTEGRATION
    if (useTracking && includeLink && userId) {
      try {
        const trackRes = await fetch('/api/tracking/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            originalUrl: effectiveWebsite,
            subreddit,
            type: 'post'
          })
        });
        if (trackRes.ok) {
          const trackData = await trackRes.json();
          effectiveWebsite = trackData.trackingUrl;
        }
      } catch (err) {
        console.warn('Tracking link creation failed, falling back to direct:', err);
      }
    }

    const hasBrand = includeBrandName && !!finalBrandName;
    const hasLink = includeLink && !!effectiveWebsite;

    let brandInstructions = '';
    if (hasBrand && hasLink) {
      brandInstructions = `
BRAND INTEGRATION IN POST BODY (STRICT REQUIREMENT):
- You MUST use the brand name: "${finalBrandName}".
- You MUST use the URL: "${effectiveWebsite}".
- The post MUST feel like it is written by a community member, NOT by the brand itself.
- Mention "${finalBrandName}" as a natural discovery or tool you found, not as a promotion.
- Embed the link ONCE, naturally in the post body: [${finalBrandName}](${effectiveWebsite})
- Anchor text = exact brand name. No exceptions.
- DO NOT use any other brand names or websites.
- GOOD: "After trying a bunch of things, [${finalBrandName}](${effectiveWebsite}) was the one that actually clicked for me."
- BAD: "Try out our tool [${finalBrandName}](${effectiveWebsite})!" — this is promotional and will be flagged.`;
    } else if (hasBrand) {
      brandInstructions = `BRAND MENTION (STRICT): Reference "${finalBrandName}" once, casually, as something that worked for you. Do NOT use any other brand names or links.`;
    } else if (hasLink) {
      brandInstructions = `LINK INTEGRATION (STRICT): Include ONE organic link using ONLY this URL: "${effectiveWebsite}". Avoid generic "click here". Do NOT use any brand names.`;
    } else {
      brandInstructions = `PURE VALUE POST (STRICT): No brand mention, no links, no URLs. Focus 100% on high-quality storytelling and insight.`;
    }

    const goalGuide: Record<string, string> = {
      'Engagement': 'Ask a question or share a polarizing opinion that sparks discussion. The goal is replies, not agreement.',
      'Lead Gen': 'Share a story or insight that demonstrates expertise. The CTA should feel organic, not forced.',
      'Problem Solving': 'Present a specific problem with a structured solution. Show you have lived experience with this.',
      'Product Launch': 'Frame this as a personal project or experiment you are sharing with the community, not an ad.',
      'Storytelling': "Open with a compelling hook that mirrors the Reddit community's shared experience or frustration.",
    };

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type: 'post',
        prompt: `You are crafting a high-quality Reddit post as an authentic community member in r/${subreddit}.

POST GOAL: ${goal}
GOAL STRATEGY: ${goalGuide[goal] || goalGuide['Engagement']}

${toneStrategy}

${brandContext}

LANGUAGE: Write the entire post (title AND body) in ${language}. Non-negotiable.

${brandInstructions}

REDDIT GROWTH CRAFT RULES:
1. THE HOOK: The first sentence must be a relatable observation or a direct answer. NO "INTRODUCTIONS".
2. NO MARKETING SPEAK: If it sounds like a blog post or a press release, you've failed. It must sound like someone sharing a win or a struggle.
3. THE MENTION: Mention "${finalBrandName}" as a side-note or a tool that helped you skip a tedious step.
4. VISUALIZATION: Describe a specific scene or result (e.g., "I finally had a free weekend" instead of "it improved my efficiency").
5. NO AI TELLS: Avoid "delve", "leverage", "utilize", "comprehensive", "innovative".
6. CLOSING: End with a specific question that makes people want to share their own experience.
7. SUBSTANCE: Aim for 250-450 words of high-quality storytelling and insight. Avoid one-liners.

IMAGE PROMPT:
- Return a highly specific DALL-E prompt for a visual that supports the post message.
- Style: Modern, minimal, premium SaaS aesthetic. Glassmorphism elements welcome.
- ${imageColorContext}
- The image should communicate the post core idea at a glance.

Return STRICT JSON (no markdown code blocks, no extra text):
{
  "title": "the post title",
  "content": "the full post body with Reddit markdown",
  "imagePrompt": "detailed DALL-E generation prompt"
}`,
        context: { subreddit }
      })
    });

    if (response.status === 402) throw new Error('OUT_OF_CREDITS');
    if (response.status === 429) throw new Error('DAILY_LIMIT_REACHED');
    if (!response.ok) throw new Error('Generation failed');

    const data = await response.json();
    const cleanJson = data.text.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleanJson);
    return { ...result, credits: data.credits, dailyUsagePoints: data.dailyUsagePoints, dailyUsage: data.dailyUsage };
  } catch (error) {
    console.error("Error generating post:", error);
    throw error;
  }
};
