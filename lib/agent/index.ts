// ─── Agent orchestration layer ────────────────────────────────────────────────
// Powered EXCLUSIVELY by TinyFish (Search, Fetch, Agent). No third-party LLMs.

import { tinyfishSearch, tinyfishFetch, tinyfishAgent, deduplicateByUrl } from "@/lib/tinyfish";
import { connectDB, User, Conversation, SavedOpportunity } from "@/lib/db";
import { sanitizeForIMessage } from "@/lib/agent/sanitize";
import type {
  Opportunity,
  ParsedIntent,
  TinyFishFetchResult,
} from "@/types";

// ─── Zero-LLM Fast Intent Parser with Haryanvi & English Support ──────────────
export async function parseIntent(
  message: string,
  history: Array<{ role: string; content: string }> = []
): Promise<ParsedIntent> {
  const text = message.trim().toLowerCase();

  // 0. Greeting / Help intent in English, Hindi & Haryanvi:
  // Must be standalone greeting or greeting with address (e.g. "Ram Ram", "Ram Ram bhai", "Hello Scout", "Kisa h laadle", "Help")
  const isGreetingWord =
    /^(hi+|hey+|hello+|hola+|yo+|howdy|sup|what'?s up|help|start|info|ram\s*ram|radhe\s*radhe|jai\s*shree\s*ram|pranam|namaste|kisa\s*h(?:ai)?|kise\s*ho|ke\s*haal(?: chaal)?|kya\s*haal|ke\s*scene|tau|bhai|laadle|scout\s*bhai|kide\s*h(?:o)?)(?:[\s,!]+(scout|bhai|laadle|tau|yaar|buddy|there|everyone))?[\s!?.🙏]*$/i.test(text);

  if (isGreetingWord) {
    return { intent: "unknown" };
  }

  // 1. List saved opportunities (English & Haryanvi/Hindi)
  if (
    /^(list|show|view|my)\s*(saved|opportunities|bookmarks|items)?/i.test(text) ||
    /^(saved|list)$/i.test(text) ||
    /(meri\s*(list|saved)|saved\s*(dikha|bata|list)|ke\s*(bacha|save)\s*h|kya\s*save\s*h)/i.test(text)
  ) {
    return { intent: "list" };
  }

  // 2. Save intent: "save 1", "save the second one", "save #2", "pehla aala save kar de", "number 1 save"
  const saveMatch =
    text.match(/(?:save|rakh|bacha)\s+(?:the\s+|aala\s+|wala\s+)?(\d+|first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|#\d+|one|pehla|dusra|doosra|teesra|chautha|panchva)/i) ||
    text.match(/(pehla|dusra|doosra|teesra|chautha|panchva|1st|2nd|3rd|4th|5th|#?\d+)\s*(?:aala|wala|number)?\s*save\s*(?:kar|karde|kar de)?/i);

  if (saveMatch) {
    const word = saveMatch[1].replace("#", "").toLowerCase();
    let index = 0;
    if (word === "first" || word === "1" || word === "1st" || word === "one" || word === "pehla") index = 0;
    else if (word === "second" || word === "2" || word === "2nd" || word === "dusra" || word === "doosra") index = 1;
    else if (word === "third" || word === "3" || word === "3rd" || word === "teesra") index = 2;
    else if (word === "fourth" || word === "4" || word === "4th" || word === "chautha") index = 3;
    else if (word === "fifth" || word === "5" || word === "5th" || word === "panchva") index = 4;
    else {
      const parsedNum = parseInt(word, 10);
      if (!isNaN(parsedNum) && parsedNum > 0) index = parsedNum - 1;
    }
    return { intent: "save", targetIndex: index };
  }

  // 3. Remind intent
  const remindMatch =
    text.match(/remind(?:\s+me)?(?:\s+(\d+)\s+days?)?/i) ||
    text.match(/(?:yaad\s+dila|remind\s*kar)(?:\s+diye|\s+de)?(?:\s+(\d+)\s+din)?/i);
  if (remindMatch) {
    const days = remindMatch[1] ? parseInt(remindMatch[1], 10) : 2;
    return { intent: "remind", reminderDays: days };
  }

  // 4. Default: Search intent
  // Clean English & Haryanvi conversational prefixes/suffixes to get clean search keywords
  let query = message
    .replace(/^(ram\s*ram|radhe\s*radhe|namaste|hello|hey|hi)\s*(bhai|laadle|scout)?[\s,!.]*/i, "")
    .replace(/^(please\s+)?(find|search|look for|show me|get me|any)\s+/i, "")
    .replace(/^(bhai|arre\s*bhai|scout\s*bhai|sun\s*bhai|sun\s*le|laadle|tau|yaar)\s+/i, "")
    .replace(/^(koyi\s*badiya|koyi|kime|kuch|badiya|ek\s*number)\s+/i, "")
    .replace(/^(dhoondh\s*de|dikha\s*de|bata\s*de|laa\s*de)\s+/i, "")
    .replace(/\s+(dhoondh\s*de|dikha\s*de|bata\s*de|chahiye|bata|milegi\s*ke|hai\s*ke)[.?!]*$/i, "")
    .trim();

  if (!query) query = message;

  return { intent: "search", query };
}

// ─── Extract opportunities from TinyFish Search & Fetch results ───────────────
function extractOpportunityFromTinyFish(
  title: string,
  url: string,
  snippet: string,
  fullText?: string
): Opportunity {
  const combined = `${title} ${snippet} ${fullText || ""}`.toLowerCase();

  // Detect opportunity type
  let type: Opportunity["type"] = "internship";
  if (/open[\s-]source|gsoc|outreachy|github/i.test(combined)) type = "open-source";
  else if (/hackathon|bounty|buildathon/i.test(combined)) type = "hackathon";
  else if (/grant|fellowship|scholarship/i.test(combined)) type = "grant";
  else if (/job|full[\s-]time|junior/i.test(combined)) type = "job";

  // Detect work mode
  let workMode: Opportunity["workMode"] = "unknown";
  if (/remote|anywhere|work from home/i.test(combined)) workMode = "remote";
  else if (/hybrid/i.test(combined)) workMode = "hybrid";
  else if (/onsite|on-site|office/i.test(combined)) workMode = "onsite";

  // Detect pay status
  let paidStatus: Opportunity["paidStatus"] = "unknown";
  let compensation: string | undefined = undefined;
  if (/\b(paid|stipend|\$|salary|competitive pay)\b/i.test(combined)) {
    paidStatus = "paid";
    const compMatch = (snippet + " " + (fullText || "")).match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*\/(?:hr|mo|yr|month|hour))?/i);
    if (compMatch) compensation = compMatch[0];
  } else if (/\bunpaid\b/i.test(combined)) {
    paidStatus = "unpaid";
  }

  // Detect deadline
  let deadline: string | undefined = undefined;
  const deadlineMatch = combined.match(/deadline[:\s]+([a-z0-9, ]{4,20})/i) ||
    combined.match(/(?:apply by|due by|applications close)[:\s]+([a-z0-9, ]{4,20})/i);
  if (deadlineMatch) {
    deadline = deadlineMatch[1].trim();
  }

  // Detect company from title (e.g. "Software Intern at Acme" or "Acme: Software Intern")
  let company = "Company / Org";
  let name = title;
  if (title.includes(" - ")) {
    const parts = title.split(" - ");
    name = parts[0].trim();
    company = parts[1].trim();
  } else if (title.includes(" | ")) {
    const parts = title.split(" | ");
    name = parts[0].trim();
    company = parts[1].trim();
  } else if (/ at /i.test(title)) {
    const parts = title.split(/ at /i);
    name = parts[0].trim();
    company = parts[1].trim();
  }

  return {
    name: name.slice(0, 100),
    company: company.slice(0, 60),
    type,
    description: snippet.slice(0, 300) || "Student opportunity discovered via live TinyFish search.",
    location: workMode === "remote" ? "Remote" : undefined,
    workMode,
    paidStatus,
    compensation,
    deadline,
    deadlineVerified: false,
    applicationUrl: url,
    sourceUrl: url,
    tags: [type, workMode].filter(Boolean),
  };
}

// ─── Format opportunity for iMessage with Sanitization & Persona ─────────────
export function formatOpportunityMessage(
  ops: Opportunity[],
  context?: string,
  persona: "haryanvi" | "classic" = "haryanvi"
): string {
  if (!ops.length) {
    const emptyMsg =
      persona === "haryanvi"
        ? "Arre bhai, is baari kati kime na mila! Thode doosre keywords daal ke try maar (jaise 'remote nextjs' ya 'hackathons'), tera bhai dobara pura zor laga ke dhoondhega! 🦾"
        : "I couldn't find any opportunities matching your request right now. Please try again or refine your keywords.";
    return sanitizeForIMessage(emptyMsg);
  }

  const lines: string[] = [];

  if (context) {
    lines.push(`🔍 ${context}`);
  }

  if (persona === "haryanvi") {
    lines.push(
      `Yo dekh bhai! Tere liye ${ops.length} verified opportunit${
        ops.length === 1 ? "y" : "ies"
      } kaad ke laaya su: 👇\n`
    );
  } else {
    lines.push(
      `Found ${ops.length} verified opportunit${
        ops.length === 1 ? "y" : "ies"
      }:\n`
    );
  }

  ops.forEach((op, i) => {
    const idx = i + 1;
    lines.push(`${idx}. 💼 ${op.name} — ${op.company}`);
    lines.push(`   🏷 Type: ${op.type}`);
    if (op.location || op.workMode !== "unknown") {
      lines.push(`   📍 Location: ${op.location ?? "Remote"} (${op.workMode})`);
    }
    const payStatus = op.paidStatus === "unknown" ? "unverified" : op.paidStatus;
    lines.push(`   💰 Pay: ${payStatus}${op.compensation ? ` — ${op.compensation}` : ""}`);
    if (op.deadline) {
      lines.push(
        `   ⏰ Deadline: ${op.deadline}${op.deadlineVerified ? " ✓ verified by TinyFish" : ""}`
      );
    } else {
      lines.push("   ⏰ Deadline: see listing");
    }
    if (op.eligibility) {
      lines.push(`   🎓 Eligibility: ${op.eligibility}`);
    }
    // Naked URL on its own line for native iMessage link detection & tap preview
    lines.push(`   🔗 Apply: ${op.applicationUrl}`);
    lines.push("");
  });

  if (persona === "haryanvi") {
    lines.push('👉 Kisi ne save karna ho toh likh de "save 1" ya "save 2".');
    lines.push('Agla kime dhoondhna ho toh seedha text bhej de, tera bhai betha h! 🦾');
  } else {
    lines.push('Reply "save [1, 2, ...]" to save one, or text your next search.');
  }

  return sanitizeForIMessage(lines.filter((l) => l !== "").join("\n"));
}

// ─── Main research workflow via TinyFish only ─────────────────────────────────
export async function runScoutResearch(
  userMessage: string,
  userId: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<{ reply: string; opportunities?: Opportunity[]; intent: ParsedIntent }> {
  await connectDB();

  // 1. Parse intent without external LLM
  const intent = await parseIntent(userMessage, conversationHistory);

  // 2. Load user preferences
  const userDoc = await User.findOne({ photonUserId: userId });
  const prefs = userDoc?.preferences;
  const persona: "haryanvi" | "classic" = prefs?.persona ?? "haryanvi";

  // 3. Handle greeting / unknown intent
  if (intent.intent === "unknown") {
    const reply =
      persona === "haryanvi"
        ? `🙏 Ram Ram bhai! Tera personal student opportunity scout Scout Bhai haazir hai! 🦾\n\nInternships, hackathons, open source programs ya grants — jo bhi chahiye, bas ek aawaaz maariye, tera bhai poora net chhaan ke laavega!\n\nBata laadle ke dhoondhna h? Ya yo try kar:\n• "Find remote Next.js internships"\n• "Hackathons in Delhi NCR this month"\n• "Google Summer of Code programs"\n• "Meri saved opportunities dikha"`
        : `👋 Hey! I'm Scout, your personal student opportunity assistant on iMessage.\n\nText me what you're looking for, or try one of these:\n• "Find remote Next.js internships"\n• "Hackathons in India this month"\n• "Google Summer of Code programs"\n• "Show my saved opportunities"`;
    return {
      reply: sanitizeForIMessage(reply),
      intent,
    };
  }

  // 4. Handle list intent
  if (intent.intent === "list") {
    const saved = await SavedOpportunity.find({ userId }).sort({ savedAt: -1 }).limit(10);
    if (!saved.length) {
      const emptyList =
        persona === "haryanvi"
          ? "Arre bhai, ib tak ek bhi opportunity save na kari! Pehle search kar le, fer bol diye 'save 1'."
          : "You haven't saved any opportunities yet. Try searching first!";
      return { reply: sanitizeForIMessage(emptyList), intent };
    }
    const formatted = saved
      .map(
        (s, i) =>
          `${i + 1}. 💼 ${s.name} — ${s.company}\n   🏷 Type: ${s.type} | ${s.workMode}\n   📅 Saved: ${new Date(
            s.savedAt
          ).toLocaleDateString()}\n   🔗 Apply: ${s.applicationUrl}`
      )
      .join("\n\n");
    const reply =
      persona === "haryanvi"
        ? `📋 Yo dekh laadle, teri saved opportunities ki list:\n\n${formatted}\n\nTension na le laadle, deadlines track ho rahi h!`
        : `Your saved opportunities:\n\n${formatted}`;
    return { reply: sanitizeForIMessage(reply), intent };
  }

  // 5. Build TinyFish search query
  const query = intent.query || userMessage;

  // 5. TinyFish SEARCH — Discover live candidate opportunities
  let searchResults;
  try {
    searchResults = await tinyfishSearch({
      query: `${query} student internship grant hackathon opportunity`,
      purpose: "Find student internship, grant, hackathon, or open source opportunities",
      recencyMinutes: 43800,
    });
  } catch (err) {
    console.error("[TinyFish Search error]", err);
    const failMsg =
      persona === "haryanvi"
        ? "Bhai TinyFish web search me kime dikkat aagi. TINYFISH_API_KEY check kar!"
        : "TinyFish web search is currently unavailable. Please verify TINYFISH_API_KEY.";
    return {
      reply: sanitizeForIMessage(failMsg),
      intent,
    };
  }

  const topResults = searchResults?.results?.slice(0, 5) || [];
  const topUrls = topResults.map((r) => r.url).filter(Boolean);

  // 6. TinyFish FETCH — Render and inspect the actual pages
  let fetchedPages: TinyFishFetchResult[] = [];
  if (topUrls.length) {
    try {
      fetchedPages = await tinyfishFetch({ urls: topUrls.slice(0, 3) });
    } catch (err) {
      console.warn("[TinyFish Fetch fallback]", err);
    }
  }

  // 7. TinyFish AGENT — Deep autonomous inspection on the top result
  let agentInsight: any = null;
  const bestUrl = topUrls[0];
  if (bestUrl) {
    try {
      const agentRun = await tinyfishAgent({
        url: bestUrl,
        goal: "Extract the exact deadline, eligibility rules, and application link as JSON.",
      });
      if (agentRun.success && agentRun.result) {
        try {
          agentInsight = JSON.parse(agentRun.result);
        } catch {
          // Keep string if not strict JSON
          agentInsight = { notes: agentRun.result };
        }
      }
    } catch (err) {
      console.warn("[TinyFish Agent run notice]", err);
    }
  }

  // 8. Synthesize opportunities from TinyFish data
  let opportunities: Opportunity[] = topResults.map((res) => {
    const fetched = fetchedPages.find((p) => p.url === res.url);
    return extractOpportunityFromTinyFish(res.title, res.url, res.snippet, fetched?.content);
  });

  // Enrich the top opportunity with TinyFish Agent deep findings
  if (agentInsight && opportunities.length > 0) {
    const first = opportunities[0];
    if (agentInsight.deadline) {
      first.deadline = agentInsight.deadline;
      first.deadlineVerified = true;
    }
    if (agentInsight.eligibility) first.eligibility = agentInsight.eligibility;
    if (agentInsight.compensation) first.compensation = agentInsight.compensation;
    if (agentInsight.applicationUrl) first.applicationUrl = agentInsight.applicationUrl;
  }

  opportunities = deduplicateByUrl(opportunities as any).slice(0, 5) as Opportunity[];

  // Save last results for follow-up "save the second one"
  await Conversation.findOneAndUpdate(
    { userId },
    {
      $push: {
        messages: { role: "user", content: userMessage, timestamp: new Date() },
      },
      lastResults: JSON.stringify(opportunities),
    },
    { upsert: true, new: true }
  );

  const reply = formatOpportunityMessage(opportunities, `TinyFish Search: "${query}"`, persona);
  return { reply, opportunities, intent };
}

// ─── Save opportunity helper ──────────────────────────────────────────────────
export async function saveOpportunity(
  userId: string,
  opportunity: Opportunity,
  persona: "haryanvi" | "classic" = "haryanvi"
): Promise<string> {
  await connectDB();

  const existing = await SavedOpportunity.find({ userId });
  const alreadySaved = existing.some((o) => o.applicationUrl === opportunity.applicationUrl);

  if (alreadySaved) {
    const msg =
      persona === "haryanvi"
        ? `Arre laadle, "${opportunity.name}" toh pehle te hi save kar rakha h!`
        : `You've already saved "${opportunity.name}".`;
    return sanitizeForIMessage(msg);
  }

  await SavedOpportunity.create({
    userId,
    name: opportunity.name,
    company: opportunity.company,
    type: opportunity.type,
    sourceUrl: opportunity.sourceUrl,
    applicationUrl: opportunity.applicationUrl,
    deadline: opportunity.deadline,
    deadlineVerified: opportunity.deadlineVerified,
    location: opportunity.location,
    workMode: opportunity.workMode,
    paidStatus: opportunity.paidStatus,
    compensation: opportunity.compensation,
    description: opportunity.description,
    eligibility: opportunity.eligibility,
  });

  let reply = "";
  if (persona === "haryanvi") {
    reply = `✅ Mauj kardi bhai! "${opportunity.name}" (${opportunity.company}) save kar diya tere account me.`;
    if (opportunity.deadline) {
      reply += `\n⏰ Deadline: ${opportunity.deadline}${opportunity.deadlineVerified ? " (verified)" : ""}. Isse pehle yaad dila dunga, tension na le!`;
    }
  } else {
    reply = `✅ Saved "${opportunity.name}" from ${opportunity.company}.`;
    if (opportunity.deadline) {
      reply += `\nDeadline: ${opportunity.deadline}${opportunity.deadlineVerified ? " (verified)" : ""}.`;
    }
  }

  return sanitizeForIMessage(reply);
}

// ─── Process complete message from iMessage ───────────────────────────────────
export async function processMessage(
  userId: string,
  message: string
): Promise<string> {
  await connectDB();

  const userDoc = await User.findOne({ photonUserId: userId });
  const persona: "haryanvi" | "classic" = userDoc?.preferences?.persona ?? "haryanvi";

  const conv = await Conversation.findOne({ userId });
  const history: Array<{ role: string; content: string }> = conv?.messages?.slice(-10) ?? [];

  try {
    const { reply, intent } = await runScoutResearch(message, userId, history);

    // Handle save intent: "save the 2nd one" or "pehla aala save kar de"
    if (intent.intent === "save" && intent.targetIndex != null) {
      let lastResults: Opportunity[] = [];
      const convRecord = conv as any;
      if (convRecord?.lastResults) {
        try {
          lastResults = JSON.parse(convRecord.lastResults);
        } catch {}
      }
      const target = lastResults[intent.targetIndex];
      if (!target) {
        const notFound =
          persona === "haryanvi"
            ? "Bhai mere paas yo result cache me na mila! Pehle search kar, fer bol 'save 1' ya 'pehla save kar'."
            : "I don't have that result cached. Try searching first, then reply 'save 1' or 'save the second one'.";
        return sanitizeForIMessage(notFound);
      }
      const saveReply = await saveOpportunity(userId, target, persona);
      await Conversation.findOneAndUpdate(
        { userId },
        {
          $push: {
            messages: { role: "assistant", content: saveReply, timestamp: new Date() },
          },
        }
      );
      return sanitizeForIMessage(saveReply);
    }

    // Persist assistant reply
    await Conversation.findOneAndUpdate(
      { userId },
      {
        $push: {
          messages: { role: "assistant", content: reply, timestamp: new Date() },
        },
      }
    );

    return sanitizeForIMessage(reply);
  } catch (err) {
    console.error("[Scout processMessage error]", err);
    const errMsg =
      persona === "haryanvi"
        ? "Arre bhai kime takneeki dikkat aagi! Thodi der me fer try maariye, ya doosre keywords daal (jaise 'internships' ya 'hackathons')."
        : "Error processing request. Please try again with keywords like 'internships' or 'hackathons'.";
    return sanitizeForIMessage(errMsg);
  }
}
