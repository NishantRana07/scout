# Scout — Student Opportunity Scout via iMessage 🦾

> TechnicalStudent Bounty Drop 001 submission for Photon × TinyFish

**Scout** is an autonomous personal opportunity assistant for students on **iMessage**, powered by **TinyFish** live web research and **Photon Spectrum**. Text Scout to discover verified internships, open-source programs, bounties, hackathons, and student grants in real time.

Now featuring **Scout Bhai** — an authentic, high-energy **Haryanvi Touch**, complete with **Zero-Setup Persistent Storage** and native **iMessage Output Sanitization**!

---

## 📸 Output Gallery & Screenshots

<!-- Add your screenshots here. You can drop images into the docs/images/ folder! -->
<p align="center">
  <img src="https://i.ibb.co/JYWshXb/IMG-2797.png" alt="Scout Bhai iMessage Output Demo" width="380" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://i.ibb.co/q3KrnFF6/IMG-2798.avif" alt="Scout Web Dashboard" width="480" />
</p>

<details open>
<summary><b>📱 Sample iMessage Output Preview</b></summary>

```text
🔍 TinyFish Search: "remote Next.js internship"
Yo dekh bhai! Tere liye 1 verified opportunity kaad ke laaya su: 👇

1. 💼 Frontend Engineer Intern — Acme Corp
   🏷 Type: internship
   📍 Location: Remote (remote)
   💰 Pay: paid — $50/hr
   ⏰ Deadline: 2026-11-15 ✓ verified by TinyFish
   🔗 Apply: https://acme.com/careers/frontend-intern

👉 Kisi ne save karna ho toh likh de "save 1" ya "save 2".
Agla kime dhoondhna ho toh seedha text bhej de, tera bhai betha h! 🦾
```
</details>

> 💡 **To add your own output screenshots**: Place your screenshot files in `docs/images/` (e.g., `docs/images/imessage-demo.png`) and commit them to the repository.

---

## 🌟 Key Highlights

- **🤠 Haryanvi Touch (Scout Bhai)**:
  - Understands and speaks in energetic, witty Haryanvi & Hinglish slang (*"Ram Ram bhai!"*, *"Kisa h laadle?"*, *"Tension na le, tera bhai betha hai!"*, *"Mauj kardi!"*).
  - Smart intent parsing that extracts core search keywords even from natural conversational queries (*"bhai koyi badiya remote internship dhoondh de"* ➔ `"remote internship"`).
  - Toggle between **🤠 Haryanvi Swag** and **👔 Classic Scout** anytime in Settings.

- **📱 Native iMessage Output Sanitization**:
  - Automatically sanitizes markdown into pristine iOS bubbles.
  - Strips raw markdown brackets `[Title](url)` and un-rendered asterisks `**bold**`.
  - Places naked URLs on separate `🔗 Apply:` lines so iOS automatically generates native tap cards and link previews.
  - Rate-limited non-text filtering: Ignores read receipts, typing indicators, and delivery ticks without sending spam replies.

- **💾 Zero-Setup Persistent Storage Engine**:
  - Built-in persistent storage layer (`data/store.json`) with zero external DB dependencies required.
  - Seamlessly persists:
    - 🗄 **Saved Opportunities**: Full opportunity cards, verified deadlines, tags, compensation, and application URLs.
    - 👤 **User Profiles & Preferences**: Skills, locations, work modes, persona choice, and reminder lead times.
    - ⏰ **Deadline Reminders**: Active tickers that alert you directly on iMessage before deadlines expire.
    - 💬 **Conversation Context**: Session history and cached search results for numbered replies (*"save 1"*, *"pehla aala save kar de"*).

---

## 🏗 Architecture

| Layer | Technology | Purpose |
|---|---|---|
| **iMessage Agent** | Photon Spectrum (`spectrum-ts`) | Persistent iMessage listener & sender |
| **Web Research** | TinyFish (Search + Fetch + Agent) | Live web search, Chromium page inspection, and deep autonomous deadline verification |
| **Persistent Storage** | Local JSON File Storage (`data/store.json`) / MongoDB | Stores saved opportunities, user profiles, reminders, and conversation memory |
| **Sanitizer & Persona** | Custom Sanitization Engine + Haryanvi Parser | Clean iOS formatting, entity decoding, and Haryanvi persona |
| **Web Dashboard** | Next.js 16 (App Router) + TypeScript | Neo-brutalist dashboard for browsing saved collections & setting preferences |
| **Worker Process** | Node.js Persistent Daemon (`tsx`) | Real-time bi-directional messaging & deadline ticker |

---

## 📁 Project Structure

```
scout-buddy/
├── app/                      # Next.js App Router
│   ├── api/                  # REST API endpoints
│   │   ├── opportunities/    # Saved opportunity CRUD
│   │   ├── preferences/      # User preferences GET/PUT
│   │   ├── reminders/        # Deadline reminder manager
│   │   ├── status/           # System health check
│   │   └── worker/message/   # Photon webhook endpoint (for testing/serverless)
│   ├── opportunities/        # Filterable saved opportunities collection UI
│   ├── preferences/          # Settings page (Persona toggle, skills, filters)
│   └── page.tsx              # Neo-brutalist dashboard home
├── data/                     # Persistent JSON storage directory
│   ├── store.example.json    # Store template schema
│   └── store.json            # Local active database (git-ignored for privacy)
├── docs/                     # Documentation & visual assets
│   └── images/               # Output screenshots & demos
├── lib/
│   ├── agent/                # Fast intent parser, Haryanvi persona, iMessage sanitizer
│   ├── db/                   # Persistent storage engine & data models
│   └── tinyfish/             # Search, Fetch, and autonomous Agent integration
├── types/                    # Shared TypeScript interfaces
└── worker/                   # Persistent Photon Spectrum worker process
```

---

## 🚀 Quickstart

### 1. Clone and install

```bash
git clone https://github.com/NishantRana07/scout.git
cd scout
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Photon Spectrum credentials (from https://photon.codes)
PHOTON_PROJECT_ID=pr_...
PHOTON_PROJECT_SECRET=sec_...

# TinyFish API key (from https://agent.tinyfish.ai)
TINYFISH_API_KEY=sk-tinyfish-...
```

### 3. Run the Web Dashboard

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view your dashboard, inspect saved opportunities, and configure your persona.

### 4. Run the iMessage Worker

In a separate terminal:

```bash
npm run worker
# or with auto-reload:
npm run worker:watch
```

---

## 💾 Storage & Persistence Explained

Scout uses a persistent storage engine located in [`lib/db/index.ts`](lib/db/index.ts) that writes directly to [`data/store.json`](data/store.json):

1. **Saved Opportunities**: When you text `"save 1"` or `"pehla aala save kar de"` on iMessage, the opportunity is stored with its full payload (title, company, verified deadline, application link, location, salary).
2. **User Preferences**: Stores your target technologies, locations (e.g. Remote / India), work modes, and chosen assistant persona (`"haryanvi"` vs `"classic"`).
3. **Conversational Memory**: Stores the last retrieved batch of search opportunities so you can refer to them by ordinal index (`"save second"`, `"save #1"`).
4. **Scheduled Reminders**: Tracks deadline reminder alerts and ensures notifications are triggered before application deadlines.

*(Note: If `MONGODB_URI` is provided, it can also connect to MongoDB Atlas seamlessly).*

---

## 💬 iMessage Command Examples

| Intent | English | Haryanvi Touch (Scout Bhai) |
|---|---|---|
| **Greeting** | `"Hello Scout"`, `"Hi"` | `"Ram Ram bhai!"`, `"kisa h laadle"` |
| **Search** | `"Find remote React internships"` | `"bhai koyi badiya remote Next.js internship dhoondh de"` |
| **Save** | `"Save the 1st one"`, `"save 2"` | `"pehla aala save kar de"`, `"number 2 save kar"` |
| **View Saved** | `"Show saved"`, `"list"` | `"meri saved list dikha"`, `"ke save kar rakha h"` |
| **Remind** | `"Remind me in 3 days"` | `"deadline ka yaad dila diye bhai"` |

---

## 🎨 Design System

Neo-brutalist visual language:
- **Yellow** `#FFD21F` — primary background
- **Off-white** `#FFFDF7` — content cards
- **Black** `#111111` — high-contrast borders and typography
- **Green** `#42D94A` — verified status & open source
- **Purple** `#8062F5` — hackathons & badges

---

## 🤝 Built for

**TechnicalStudent Bounty Drop 001** — Photon × TinyFish
Built with ❤️ by [Nishant](https://github.com/NishantRana07)
