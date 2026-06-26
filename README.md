# WIA Instagram Growth OS

A legal AI-powered growth assistant for Instagram creators and agencies. Built with Next.js, TypeScript, Tailwind CSS, Supabase, and OpenAI.

**No fake followers. No automated engagement. Authentic growth only.**

## Features

- **Dashboard** — Overview of leads, calls booked, best content, daily ideas, and follow-ups
- **AI Content Generator** — Hooks, reel scripts, captions, CTAs, hashtags, stories, and DM templates
- **Reel Script Generator** — Timestamped scripts with style and duration options
- **Stories Generator** — Turn one idea into a 5-slide story sequence
- **Lead CRM** — Manually save and track leads (new → contacted → call booked → client)
- **Engagement Planner** — Discover accounts to engage with authentically by niche
- **Analytics** — Manually log post performance (views, likes, comments, saves, shares, leads)
- **Settings** — Brand profile and API configuration

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS 4
- Supabase
- OpenAI API
- Lucide React icons

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

### 3. Run the development server

```bash
npm run dev
```

Or use the cross-platform helper, which installs dependencies if needed:

```bash
npm run dev:local
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── (app)/           # App pages with shared layout
│   │   ├── dashboard/
│   │   ├── content-generator/
│   │   ├── reel-scripts/
│   │   ├── stories/
│   │   ├── leads/
│   │   ├── engagement/
│   │   ├── analytics/
│   │   └── settings/
│   └── api/             # API routes (OpenAI integration)
├── components/
│   ├── layout/          # Sidebar, Header, AppShell
│   └── ui/              # Reusable UI components
├── data/                # Dummy data for development
├── lib/                 # Supabase, OpenAI, utilities
└── types/               # TypeScript types
```

## Design

Premium dark theme with lime green (`#a3e635`) accent color. Built for creators and agencies who want a professional growth command center.

## Legal & Ethical

This tool is designed for **legal, authentic Instagram growth**:

- ✅ AI content generation
- ✅ Manual lead tracking
- ✅ Authentic engagement suggestions
- ✅ Manual performance tracking
- ❌ No fake followers or likes
- ❌ No automated mass follow/unfollow
- ❌ No bot comments or engagement
