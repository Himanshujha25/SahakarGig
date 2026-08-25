# SIH 2026 — Prototype Prompts, PPT Content, Video Scripts & HLD


# 🟩 PART B — SIH26043: Societal Challenge Crowdsourcing Platform

**Ministry:** Government of Jharkhand
**Theme:** MedTech / BioTech / HealthTech (categorized), but functionally a
cross-sector civic-tech platform

---

## B1. Prototype Build Prompt (paste into Claude Code / Cursor / any AI coding assistant)

```
Build a MERN stack web application called "SamadhanConnect" — a digital platform
that lets citizens submit local societal challenges (education, healthcare,
agriculture, water, sanitation, infrastructure) which get auto-categorized,
routed to relevant universities, and opened up for industry/startup
collaboration to build real solutions.

TECH STACK:
- Frontend: React (Vite) + Tailwind CSS + React Router + Axios
- Backend: Node.js + Express.js
- Database: MongoDB (Mongoose)
- Auth: JWT-based, role-based access (Citizen, University, Industry Partner, Govt Admin)
- AI categorization: Call a free-tier LLM API (Gemini/Groq/OpenAI) OR a simple
  keyword+embedding classifier if no API key available, to auto-tag each
  submission into a domain (Education/Healthcare/Agriculture/Water/Environment/
  Urban/Public Admin)
- File uploads: Multer for photos/videos/documents attached to a problem
- Maps: Leaflet.js or Google Maps API for geo-tagging submitted problems

USER ROLES:
1. Citizen — submit a problem with photo/video/location, track its status
2. University — view problems routed to their domain, form a project team,
   submit a solution proposal
3. Industry/Startup Partner — browse validated challenges, offer mentorship/
   funding, co-develop with university teams
4. Government Admin (Jharkhand dept) — validate submissions, monitor routing,
   view state-wide analytics dashboard

CORE DATA MODELS:
- User { name, role, email, phone, orgName (for university/industry), verified }
- Problem { title, description, category (AI-tagged), submittedBy, location
  {lat,lng}, mediaUrls[], status (submitted/validated/routed/in-progress/
  resolved/rejected), priorityScore }
- University { name, expertiseDomains[], contactAdmin }
- ProjectTeam { problemId, universityId, facultyMentor, studentMembers[],
  proposalDoc, milestones[] }
- IndustryCollaboration { problemId, industryPartnerId, type (mentorship/
  funding/prototyping), status }
- StatusLog { problemId, changedBy, fromStatus, toStatus, timestamp }

KEY FEATURES TO BUILD:
1. Citizen submission form: title, description, photo/video upload, auto-capture
   geolocation (browser Geolocation API), category shown after AI classification
2. AI Auto-Categorization Service: POST description text → LLM API call with a
   prompt like "Classify this civic problem into one of: Education, Healthcare,
   Agriculture, Water, Environment, Urban Infrastructure, Public Administration.
   Return only the category." → save result to Problem.category
3. Deduplication check: before saving, do a simple text-similarity check
   (e.g., cosine similarity on embeddings, or basic Levenshtein on titles within
   same geo-radius) to flag likely duplicate submissions
4. Government Admin validation queue: approve/reject/merge duplicate submissions
5. Auto-routing: once validated, match Problem.category to
   University.expertiseDomains and notify matched universities
6. University workflow: view routed problems → "Take up this Challenge" →
   form ProjectTeam → submit proposal → update milestones
7. Industry Partner browsing: view validated/in-progress problems, request to
   collaborate, message the ProjectTeam
8. Analytics Dashboard (Admin): submissions by district (map heatmap), category
   distribution (pie chart), resolution rate, top-performing universities
   (use Recharts + Leaflet heatmap)
9. Notification system: email/in-app on every status change
10. Public transparency page: anyone can see aggregate stats (no login needed)

NICE-TO-HAVE (if time permits):
- SMS-based submission fallback (Twilio) for low-connectivity citizens
- Multilingual submission form (Hindi + regional language via i18next)
- Auto-generated "Impact Report" PDF per resolved problem for CSR reporting

DELIVERABLE STRUCTURE:
/client (React app)
/server (Express API: routes/controllers/models/middleware/services/aiClassifier.js)
/server/seed.js — seed script with sample problems, 3 universities, 2 industry
partners, and a full status-lifecycle example
README.md with setup instructions and .env.example (including LLM API key placeholder)

Build this as a working, demoable prototype prioritizing: citizen submission →
AI categorization → admin validation → university routing → analytics
dashboard, in that order.
```

---

## B2. PPT Slide Content (7 slides — SIH standard format)

**Slide 1 — Title**
- SamadhanConnect — AI-Powered Societal Challenge Crowdsourcing Platform
- PS Code: SIH26043 | Theme: Civic-Tech / Innovation Governance | Govt of Jharkhand
- Team Name + Members

**Slide 2 — Problem Statement**
- Citizens identify real local problems every day, but there's no structured
  channel to route them to people who can actually solve them
- Universities have research talent and NEP-2020 mandates community-engaged
  learning, but lack a discovery mechanism for real-world problems
- Industry/CSR funding and academic research remain disconnected from
  ground-level civic needs

**Slide 3 — Proposed Solution**
- A single digital pipeline: **Citizen submits → AI auto-categorizes → Govt
  validates → University adopts → Industry co-funds/mentors → Solution deployed**
- Turns scattered civic complaints into structured, trackable innovation projects
- Every stakeholder (citizen, university, industry, government) has a dedicated
  dashboard and clear role in the pipeline

**Slide 4 — High-Level Architecture (HLD)**
- Diagram: Client (React) ⇄ REST API (Express) ⇄ MongoDB
- AI Classification microservice (LLM API call) sits between submission and routing
- Geo-tagging via Maps API; heatmap analytics via Leaflet + Recharts
- Notification service triggers on every status transition
- Four role-based dashboards sit on top of the same core Problem lifecycle engine

**Slide 5 — Key Features**
- One-tap problem submission with photo + auto-location
- AI-based category tagging + duplicate detection
- Government validation & routing queue
- University project workspace with milestone tracking
- Industry collaboration marketplace
- Public transparency/impact dashboard

**Slide 6 — Feasibility & Impact**
- Feasibility: Open-source MERN + low-cost/free-tier LLM API keeps this
  deployable at state scale with minimal infra spend
- Impact: Faster resolution of civic problems, real-world learning for students
  (aligned with NEP 2020), measurable CSR/industry impact, and a transparent
  public record of governance responsiveness
- Directly supports Jharkhand's push for university-industry-government
  collaborative innovation

**Slide 7 — Tech Stack & Team**
- MongoDB, Express.js, React.js, Node.js, LLM API (Gemini/Groq), Leaflet.js,
  JWT, Tailwind CSS
- Team roles: Frontend / Backend / AI Integration / UI-UX / Presentation

---

## B3. Video Script (≈100 seconds narration)

> "Every day, citizens across Jharkhand spot real problems — a broken water
> system, an unsafe school building, a failing crop — but there's no structured
> way to connect that problem with the people who could actually solve it:
> researchers, students, and industry partners.
>
> We built **SamadhanConnect** — a platform that turns citizen complaints into
> real innovation projects.
>
> Here's the flow: a citizen submits a problem with a photo and their location.
> Our AI engine instantly reads the description and categorizes it — Education,
> Healthcare, Agriculture, Water, or Infrastructure. The government admin
> validates it and, in one click, it's automatically routed to universities with
> matching research expertise.
>
> A university team picks it up, forms a student-faculty group, and submits a
> solution proposal — which industry partners can then co-fund or mentor,
> turning a citizen's complaint into a deployed, real-world solution.
>
> Every stakeholder gets their own dashboard, every problem is tracked from
> submission to resolution, and the public can see the state's innovation impact
> in real time on a live heatmap.
>
> Built on MERN with AI-powered classification, SamadhanConnect closes the loop
> between citizens, academia, industry, and government — turning everyday civic
> problems into India's next generation of research and innovation."

---

## B4. HLD Explanation (Plain-English Walkthrough)

Think of it as a **pipeline with 4 stages**, sitting on the same 4 technical layers:

1. **Client Layer (React app)** — Four different dashboards for four roles, but
   all pointing at the *same* underlying `Problem` object as it moves through its
   lifecycle. This is the key design idea: one object, one status field, many
   viewers.

2. **API Layer (Node.js + Express)** — Handles CRUD for problems, users, teams,
   and collaborations. The important custom endpoint is `/api/problems/classify`
   — this is where a submission gets sent out to an AI service before being saved.

3. **AI Classification Microservice** — This is the "smart" layer that makes it
   stand out from a plain complaint form. When a citizen submits, the backend
   sends the description text to an LLM API with a short prompt asking it to
   pick a category from a fixed list. The category comes back in under a second
   and gets attached to the Problem before it's stored — this is what enables
   automatic routing later.

4. **Data Layer (MongoDB) + Notification Layer** — Every status change (submitted
   → validated → routed → in-progress → resolved) is logged in a `StatusLog`
   collection, so you get a full audit trail. Each transition also fires a
   notification (email/in-app) to the relevant party.

**The one "smart" piece to demo live:** type a real civic problem description
into the submission form and show the AI instantly returning the correct
category — that's the moment that will make judges sit up, because it visibly
proves the "AI-driven routing" claim rather than just describing it on a slide.

---
---

# ✅ Quick Presentation Tips for Both

- Lead your pitch with the **Background paragraph language** from the official
  PS text — judges recognize when you've mapped your solution directly onto
  their stated pain points.
- Always demo the **live/real-time piece** (Socket.io status update for
  SIH26089; AI category tagging for SIH26043) — it's the moment that separates
  you from teams with only static slides.
- Keep the HLD slide to one clean box diagram — don't over-explain it verbally,
  let the visual do the work while you narrate the data flow in one sentence per
  layer.
