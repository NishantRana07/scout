// ─── Shared TypeScript interfaces for Scout ──────────────────────────────────

export type OpportunityType =
  | "internship"
  | "job"
  | "open-source"
  | "hackathon"
  | "bounty"
  | "grant"
  | "fellowship"
  | "other";

export type WorkMode = "remote" | "hybrid" | "onsite" | "unknown";
export type PaidStatus = "paid" | "unpaid" | "unknown";

export interface Opportunity {
  _id?: string;
  name: string;
  company: string;
  type: OpportunityType;
  description: string;
  location?: string;
  workMode: WorkMode;
  paidStatus: PaidStatus;
  compensation?: string;
  deadline?: string; // ISO date string — ONLY set when verified
  deadlineVerified: boolean;
  eligibility?: string;
  applicationUrl: string;
  sourceUrl: string;
  savedAt?: string;
  userId?: string;
  tags: string[];
  relevanceScore?: number;
}

export interface UserPreferences {
  skills: string[];
  location?: string;
  workMode: WorkMode | "any";
  opportunityTypes: OpportunityType[];
  paidOnly: boolean;
  experienceLevel: "beginner" | "intermediate" | "advanced" | "any";
  interests: string[];
  reminderLeadDays: number; // days before deadline to remind
  timezone: string;
  persona?: "haryanvi" | "classic";
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Reminder {
  _id?: string;
  userId: string;
  opportunityId: string;
  opportunityName: string;
  deadline: string; // ISO date string — verified
  remindAt: string; // ISO date string
  delivered: boolean;
  deliveredAt?: string;
  cancelled: boolean;
  cancelledAt?: string;
}

export interface TinyFishSearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export interface TinyFishSearchResponse {
  results: TinyFishSearchResult[];
}

export interface TinyFishFetchResult {
  url: string;
  content: string; // Markdown
  title?: string;
  statusCode?: number;
}

export interface TinyFishFetchResponse {
  results: TinyFishFetchResult[];
}

export interface TinyFishAgentResponse {
  result: string;
  steps?: Array<{ action: string; result: string }>;
  success: boolean;
}

export type MessageIntent =
  | "search"
  | "save"
  | "list"
  | "remind"
  | "compare"
  | "follow_up"
  | "preferences"
  | "unknown";

export interface ParsedIntent {
  intent: MessageIntent;
  query?: string;
  filters?: Partial<UserPreferences>;
  targetIndex?: number; // e.g. "save the second one" → 1
  reminderDays?: number;
}
