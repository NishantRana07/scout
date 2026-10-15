// ─── Photon Spectrum iMessage Worker ─────────────────────────────────────────
// Persistent process that receives iMessages via Spectrum and runs Scout.
// Powered by TinyFish and local storage. No external LLMs or MongoDB required.

try {
  // @ts-ignore
  if (typeof process.loadEnvFile === "function") process.loadEnvFile();
} catch {}

import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { connectDB, User, Reminder } from "../lib/db";
import { processMessage } from "../lib/agent";
import { sanitizeForIMessage } from "../lib/agent/sanitize";

const PROJECT_ID = process.env.PHOTON_PROJECT_ID || "demo_project";
const PROJECT_SECRET = process.env.PHOTON_PROJECT_SECRET || "demo_secret";

// ─── Health status ────────────────────────────────────────────────────────────
let isConnected = false;
let messageCount = 0;
let lastActivity = new Date();

export function getWorkerStatus() {
  return {
    connected: isConnected,
    messageCount,
    lastActivity: lastActivity.toISOString(),
  };
}

// Map of active spaces by user ID for proactive reminder delivery
const activeSpaces = new Map<string, any>();
// Track users who have already received the non-text message to avoid spamming
const warnedNonTextUsers = new Set<string>();

function extractMessageText(message: any): string | null {
  if (!message) return null;
  if (typeof message.text === "string") return message.text;
  if (message.content) {
    if (typeof message.content === "string") return message.content;
    if (message.content.type === "text" && typeof message.content.text === "string") {
      return message.content.text;
    }
    if (message.content.type === "markdown" && typeof message.content.markdown === "string") {
      return message.content.markdown;
    }
  }
  return null;
}

// ─── Reminder delivery loop ───────────────────────────────────────────────────
async function startReminderLoop() {
  console.log("[Reminders] Starting local reminder delivery ticker");

  setInterval(async () => {
    try {
      const now = new Date().toISOString();
      const due = await Reminder.find({
        delivered: false,
        cancelled: false,
        remindAt: { $lte: now },
      }).limit(20);

      for (const reminder of due) {
        try {
          const userSpace = activeSpaces.get(reminder.userId);
          const userDoc = await User.findOne({ photonUserId: reminder.userId });
          const isHaryanvi = (userDoc?.preferences?.persona ?? "haryanvi") === "haryanvi";

          const alert = isHaryanvi
            ? `⏰ Arre laadle, dhyan kade h? "${reminder.opportunityName}" ki deadline aagi (${reminder.deadline})! Jhatpat jaake apply kar de, mauka hath te na jaave!`
            : `⏰ Reminder: The deadline for "${reminder.opportunityName}" is ${reminder.deadline}. Don't forget to apply!`;

          const sanitizedAlert = sanitizeForIMessage(alert);

          if (userSpace) {
            await userSpace.send(sanitizedAlert);
            console.log(`[Reminders] Delivered reminder to ${reminder.userId}`);
          } else {
            console.log(`[Reminders] User ${reminder.userId} pending reconnection for: "${sanitizedAlert}"`);
          }

          await Reminder.findByIdAndUpdate(reminder._id, {
            delivered: true,
            deliveredAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error(`[Reminders] Failed to deliver reminder ${reminder._id}`, err);
        }
      }
    } catch (err) {
      console.error("[Reminders] Loop error", err);
    }
  }, 30_000);
}

// ─── Main worker ──────────────────────────────────────────────────────────────
async function main() {
  await connectDB();
  console.log("[Scout Worker] Local storage initialized ✓");

  if (!process.env.PHOTON_PROJECT_ID || !process.env.PHOTON_PROJECT_SECRET) {
    console.log("\n=======================================================");
    console.log("ℹ️  Ready to connect to Photon iMessage!");
    console.log("👉 Please paste your Photon credentials into .env:");
    console.log("   PHOTON_PROJECT_ID=pr_...");
    console.log("   PHOTON_PROJECT_SECRET=sec_...");
    console.log("   TINYFISH_API_KEY=sk-tinyfish-...");
    console.log("\n   Get your Photon keys from https://photon.codes");
    console.log("   Get your TinyFish key from https://agent.tinyfish.ai");
    console.log("=======================================================\n");
    return;
  }

  const app = await Spectrum({
    projectId: process.env.PHOTON_PROJECT_ID,
    projectSecret: process.env.PHOTON_PROJECT_SECRET,
    providers: [imessage.config()],
  });

  isConnected = true;
  console.log("[Scout Worker] Connected to Photon Spectrum ✓");
  console.log("[Scout Worker] Listening for iMessages...");

  // Start reminder loop
  await startReminderLoop();

  // Main message loop
  for await (const [space, message] of (app as any).messages) {
    const text = extractMessageText(message);
    const userId = (space as any).id || "default_user";

    // Cache active space for proactive reminder delivery
    activeSpaces.set(userId, space);

    // Upsert user preferences in local storage
    const userDoc = await User.findOneAndUpdate(
      { photonUserId: userId },
      {
        $setOnInsert: {
          photonUserId: userId,
          preferences: {
            skills: [],
            location: "",
            workMode: "any",
            opportunityTypes: [],
            paidOnly: false,
            experienceLevel: "any",
            interests: [],
            reminderLeadDays: 2,
            timezone: "UTC",
            persona: "haryanvi",
          },
        },
      },
      { upsert: true, new: true }
    );

    const isHaryanvi = (userDoc?.preferences?.persona ?? "haryanvi") === "haryanvi";

    // Ignore messages sent by the bot itself (echoes) or system events
    const isFromMe = Boolean(
      (message as any)?.isFromMe ||
      (message as any)?.fromMe ||
      (message as any)?.sender === "me" ||
      (message as any)?.sender?.isMe ||
      (message as any)?.sender?.isBot
    );

    if (isFromMe) {
      continue;
    }

    // Skip non-text events (delivery receipts, typing indicators, reactions)
    // Send non-text guidance ONLY if user actually sent media/attachment, and at most ONCE per user
    if (!text || !text.trim()) {
      const hasAttachment = Boolean(
        (message as any)?.attachments?.length ||
        (message as any)?.attachment ||
        (message as any)?.media?.length
      );

      if (hasAttachment && !warnedNonTextUsers.has(userId)) {
        warnedNonTextUsers.add(userId);
        const nonTextMsg = isHaryanvi
          ? "Arre bhai, text message bhej ke bata ke opportunity dhoondh ra h! Scout Bhai text samajhta h."
          : "I can read text messages. Text me what opportunity you're looking for!";
        await space.send(sanitizeForIMessage(nonTextMsg));
      }
      continue;
    }

    lastActivity = new Date();
    messageCount++;

    console.log(`[Scout Worker] Received from ${userId}: "${text}"`);

    // Immediate acknowledgment so user knows Scout received it
    const trimmed = text.trim();
    const isGreeting = /^(hi+|hey+|hello+|yo+|howdy|sup|help|start|ram\s*ram|radhe\s*radhe|kisa\s*h|ke\s*haal|tau|bhai|laadle)\b/i.test(trimmed);
    const isSave = /^(save|rakh|bacha|pehla|dusra|doosra)\b/i.test(trimmed.toLowerCase());
    const isList = /^(list|show|saved|meri\s*list|ke\s*save)\b/i.test(trimmed.toLowerCase());

    if (!isGreeting && !isSave && !isList) {
      const ack = isHaryanvi
        ? `🔍 Rukk laadle, tera bhai "${trimmed.slice(0, 35)}" khatir live net chhaan ra h...`
        : `🔍 Scout is searching live opportunities for "${trimmed.slice(0, 35)}" via TinyFish...`;
      await space.send(sanitizeForIMessage(ack));
    }

    try {
      if (typeof space.startTyping === "function") {
        space.startTyping().catch(() => {});
      }

      const reply = await processMessage(userId, text);

      if (typeof space.stopTyping === "function") {
        space.stopTyping().catch(() => {});
      }

      console.log(`[Scout Worker] Sending reply to ${userId}...`);
      await space.send(sanitizeForIMessage(reply));
      console.log(`[Scout Worker] Reply sent to ${userId} ✓`);
    } catch (err) {
      console.error("[Scout Worker] Error processing message:", err);
      const errMsg = isHaryanvi
        ? "Arre bhai kime takneeki dikkat aagi! Thodi der me fer try maariye, ya doosre keywords daal (jaise 'internships' ya 'hackathons')."
        : "Something went wrong while researching. Please try again with keywords like 'internships' or 'hackathons'.";
      await space.send(sanitizeForIMessage(errMsg));
    }
  }
}

main().catch((err) => {
  console.error("[Scout Worker] Error starting worker:", err);
});
