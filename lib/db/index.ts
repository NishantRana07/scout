// ─── Local JSON File Storage ───────────────────────────────────────────────
// Replaces MongoDB with zero-setup local persistent JSON file storage.
// Data is persisted directly to data/store.json

import fs from "fs";
import path from "path";
import type {
  UserPreferences,
  Opportunity as ISavedOppType,
  Reminder as IReminderType,
  ConversationMessage,
} from "../../types";

export interface ISavedOpportunity {
  _id: string;
  userId: string;
  name: string;
  company: string;
  type: string;
  sourceUrl: string;
  applicationUrl: string;
  deadline?: string;
  deadlineVerified: boolean;
  location?: string;
  workMode: "remote" | "hybrid" | "onsite" | "unknown";
  paidStatus: "paid" | "unpaid" | "unknown";
  compensation?: string;
  description: string;
  eligibility?: string;
  savedAt: string;
}

export interface IReminder {
  _id: string;
  userId: string;
  opportunityId?: string;
  opportunityName: string;
  deadline: string;
  remindAt: string;
  leadDays: number;
  delivered: boolean;
  deliveredAt?: string;
  cancelled: boolean;
  createdAt: string;
}

export interface IUser {
  _id: string;
  photonUserId: string;
  displayName?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface IConversation {
  _id: string;
  userId: string;
  messages: ConversationMessage[];
  updatedAt: string;
}

interface StoreData {
  users: IUser[];
  opportunities: ISavedOpportunity[];
  reminders: IReminder[];
  conversations: IConversation[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

function getDefaultPreferences(): UserPreferences {
  return {
    skills: ["TypeScript", "Next.js", "Python"],
    location: "Remote",
    workMode: "any",
    opportunityTypes: ["internship", "open-source", "hackathon"],
    paidOnly: false,
    experienceLevel: "any",
    interests: ["AI", "Web Development", "Open Source"],
    reminderLeadDays: 2,
    timezone: "UTC",
    persona: "haryanvi",
  };
}

function loadStore(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      const initial: StoreData = {
        users: [
          {
            _id: "default-user",
            photonUserId: "dashboard-demo",
            displayName: "Scout Student",
            preferences: getDefaultPreferences(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        opportunities: [
          {
            _id: "opp-1",
            userId: "dashboard-demo",
            name: "Full Stack Engineering Intern (Summer 2026)",
            company: "Vercel",
            type: "internship",
            sourceUrl: "https://vercel.com/careers",
            applicationUrl: "https://vercel.com/careers",
            deadline: "2026-11-15",
            deadlineVerified: true,
            location: "Remote",
            workMode: "remote",
            paidStatus: "paid",
            compensation: "$55/hr",
            description: "Work on Next.js core, Turbopack, and AI SDK developer tooling.",
            eligibility: "Enrolled in undergraduate or graduate CS program",
            savedAt: new Date().toISOString(),
          },
          {
            _id: "opp-2",
            userId: "dashboard-demo",
            name: "Google Summer of Code 2026",
            company: "Google / Open Source",
            type: "open-source",
            sourceUrl: "https://summerofcode.withgoogle.com",
            applicationUrl: "https://summerofcode.withgoogle.com",
            deadline: "2026-04-02",
            deadlineVerified: true,
            location: "Global",
            workMode: "remote",
            paidStatus: "paid",
            compensation: "Stipend ($1500 - $3000)",
            description: "12-week open source programming project with mentorship.",
            eligibility: "Open to 18+ students and open source newcomers",
            savedAt: new Date().toISOString(),
          },
        ],
        reminders: [],
        conversations: [],
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading store.json:", e);
    return { users: [], opportunities: [], reminders: [], conversations: [] };
  }
}

function saveStore(data: StoreData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving store.json:", e);
  }
}

// ─── Connection stub ────────────────────────────────────────────────────────
export async function connectDB() {
  // Local storage is always ready!
  return true;
}

// ─── Opportunity Operations ────────────────────────────────────────────────
export const SavedOpportunity = {
  find(filter: Partial<ISavedOpportunity> = {}) {
    const store = loadStore();
    let res = store.opportunities.filter((o) => {
      for (const [key, val] of Object.entries(filter)) {
        if ((o as any)[key] !== val) return false;
      }
      return true;
    });

    return {
      sort(sortObj: Record<string, number>) {
        if (sortObj.savedAt === -1) {
          res.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        }
        return {
          limit(n: number) {
            return Promise.resolve(res.slice(0, n));
          },
          then(resolve: (val: ISavedOpportunity[]) => any) {
            return Promise.resolve(resolve(res));
          },
        };
      },
      limit(n: number) {
        return Promise.resolve(res.slice(0, n));
      },
      then(resolve: (val: ISavedOpportunity[]) => any) {
        return Promise.resolve(resolve(res));
      },
    };
  },

  async create(doc: Omit<ISavedOpportunity, "_id" | "savedAt">) {
    const store = loadStore();
    const item: ISavedOpportunity = {
      ...doc,
      _id: `opp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      savedAt: new Date().toISOString(),
    };
    store.opportunities.unshift(item);
    saveStore(store);
    return item;
  },

  async deleteOne(filter: { _id?: string; userId?: string }) {
    const store = loadStore();
    const initialLen = store.opportunities.length;
    store.opportunities = store.opportunities.filter((o) => {
      if (filter._id && o._id !== filter._id) return true;
      if (filter.userId && o.userId !== filter.userId) return true;
      return false;
    });
    saveStore(store);
    return { deletedCount: initialLen - store.opportunities.length };
  },

  async findByIdAndDelete(id: string) {
    return this.deleteOne({ _id: id });
  },
};

// ─── User Operations ───────────────────────────────────────────────────────
export const User = {
  async findOne(filter: { photonUserId?: string; _id?: string }) {
    const store = loadStore();
    const user = store.users.find((u) => {
      if (filter.photonUserId && u.photonUserId === filter.photonUserId) return true;
      if (filter._id && u._id === filter._id) return true;
      return false;
    });
    return user || null;
  },

  async findOneAndUpdate(
    filter: { photonUserId: string },
    update: any,
    options: { upsert?: boolean; new?: boolean } = {}
  ) {
    const store = loadStore();
    let idx = store.users.findIndex((u) => u.photonUserId === filter.photonUserId);

    if (idx === -1 && options.upsert) {
      const newUser: IUser = {
        _id: `user_${Date.now()}`,
        photonUserId: filter.photonUserId,
        displayName: update.$setOnInsert?.displayName,
        preferences: update.$setOnInsert?.preferences || update.preferences || getDefaultPreferences(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.users.push(newUser);
      saveStore(store);
      return newUser;
    }

    if (idx !== -1) {
      if (update.preferences) {
        store.users[idx].preferences = {
          ...store.users[idx].preferences,
          ...update.preferences,
        };
      }
      if (update.displayName) {
        store.users[idx].displayName = update.displayName;
      }
      store.users[idx].updatedAt = new Date().toISOString();
      saveStore(store);
      return store.users[idx];
    }

    return null;
  },
};

// ─── Reminder Operations ───────────────────────────────────────────────────
export const Reminder = {
  find(filter: any = {}) {
    const store = loadStore();
    let res = store.reminders.filter((r) => {
      if (filter.userId && r.userId !== filter.userId) return false;
      if (filter.delivered !== undefined && r.delivered !== filter.delivered) return false;
      if (filter.cancelled !== undefined && r.cancelled !== filter.cancelled) return false;
      if (filter.remindAt?.$lte) {
        if (r.remindAt > filter.remindAt.$lte) return false;
      }
      return true;
    });

    return {
      limit(n: number) {
        return Promise.resolve(res.slice(0, n));
      },
      then(resolve: (val: IReminder[]) => any) {
        return Promise.resolve(resolve(res));
      },
    };
  },

  async create(doc: Omit<IReminder, "_id" | "createdAt">) {
    const store = loadStore();
    const item: IReminder = {
      ...doc,
      _id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    store.reminders.push(item);
    saveStore(store);
    return item;
  },

  async findByIdAndUpdate(id: string, update: Partial<IReminder>) {
    const store = loadStore();
    const idx = store.reminders.findIndex((r) => r._id === id);
    if (idx !== -1) {
      store.reminders[idx] = { ...store.reminders[idx], ...update };
      saveStore(store);
      return store.reminders[idx];
    }
    return null;
  },

  async deleteOne(filter: { _id?: string; userId?: string }) {
    const store = loadStore();
    const len = store.reminders.length;
    store.reminders = store.reminders.filter((r) => {
      if (filter._id && r._id !== filter._id) return true;
      if (filter.userId && r.userId !== filter.userId) return true;
      return false;
    });
    saveStore(store);
    return { deletedCount: len - store.reminders.length };
  },
};

// ─── Conversation Operations ───────────────────────────────────────────────
export const Conversation = {
  async findOne(filter: { userId: string }) {
    const store = loadStore();
    const conv = store.conversations.find((c) => c.userId === filter.userId);
    return conv || null;
  },

  async findOneAndUpdate(
    filter: { userId: string },
    update: any,
    options: { upsert?: boolean; new?: boolean } = {}
  ) {
    const store = loadStore();
    let idx = store.conversations.findIndex((c) => c.userId === filter.userId);

    if (idx === -1 && options.upsert) {
      const newConv: IConversation = {
        _id: `conv_${Date.now()}`,
        userId: filter.userId,
        messages: update.$push?.messages ? [update.$push.messages] : [],
        updatedAt: new Date().toISOString(),
      };
      store.conversations.push(newConv);
      saveStore(store);
      return newConv;
    }

    if (idx !== -1) {
      if (update.$push?.messages) {
        store.conversations[idx].messages.push(update.$push.messages);
        if (store.conversations[idx].messages.length > 30) {
          store.conversations[idx].messages = store.conversations[idx].messages.slice(-30);
        }
      }
      store.conversations[idx].updatedAt = new Date().toISOString();
      saveStore(store);
      return store.conversations[idx];
    }

    return null;
  },
};
