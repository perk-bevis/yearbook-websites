# 🎓 Yearbook Website
 
An online yearbook website for keeping photos, memories, and messages from teachers and classmates.
 
🌐 **Live demo:** https://yearbook-websites.vercel.app

🌐 **Api demo:** https://yearbook-websites-4zh4.vercel.app/api/healthz

---
 
## ✨ Features
 
- Classmates and friends directory
- Photo gallery with categories: Classroom, Events, Field trips, Teachers, Other
- Memories and a class timeline
- Messages from teachers
- Avatar frame shop (free and Premium frames, including animated ones)
- Class news feed
- Member-to-member messaging
- Sign in / sign out
- Responsive layout for desktop, tablet, and mobile
---
 
## 📄 Pages
 
| Page | Route | Description |
|---|---|---|
| Home | `/` | Class introduction, links to the class list and photo gallery |
| Classmates | `/students` | List of class members |
| Friends | `/friends` | Connect with friends |
| Photo Gallery | `/gallery` | Photos by category, with filtering |
| Memories | `/memories` | Class memories |
| Timeline | `/timeline` | Key events from 2016 to 2019 |
| Teachers' Words | `/teachers` | Messages from teachers |
| Frames | `/frames` | Avatar frame shop (free and Premium) |
| News | `/news` | Announcements and posts |
| Messages | `/tin-nhan` | Messaging (sign-in required) |
| Sign in | `/sign-in` | User authentication |
 
> ⚠️ Only `/gallery`, `/frames`, `/tin-nhan`, and `/sign-in` are confirmed from your screenshots and code. The other routes are examples; check them against your real `app/` directory.
 
---
 
## 🧰 Tech Stack
 
> Inferred from the header code and browser tabs. Adjust if anything differs.
 
| Layer | Technology |
|---|---|
| Framework | Next.js (App Router), React, TypeScript |
| Styling | Tailwind CSS, `cn()` helper (shadcn/ui style) |
| Icons | lucide-react |
| Authentication | Clerk (`Show when="signed-in"` / `"signed-out"`) |
| Database | PostgreSQL on Neon |
| Hosting | Vercel |
 
---
 
## 🗂️ Project Structure
 
> This is a template for a Next.js App Router project. Run `tree -I "node_modules|.next" -L 3` in your project and paste the real output here.
 
```text
yearbook-websites/
├── app/
│   ├── layout.tsx            # Root layout: Header, Footer, providers
│   ├── page.tsx              # Home page
│   ├── globals.css           # Global CSS, color variables, fonts
│   ├── gallery/              # Photo gallery
│   ├── frames/               # Frame shop
│   ├── tin-nhan/             # Messaging
│   ├── sign-in/              # Sign in
│   └── api/                  # API routes (photos, messages, frames...)
├── components/
│   ├── Header.tsx            # Responsive navigation bar
│   ├── Footer.tsx
│   ├── MessagesIcon.tsx      # Messages icon with unread count
│   ├── UserMenu.tsx          # User dropdown menu
│   └── ui/                   # Shared UI components
├── lib/
│   ├── utils.ts              # cn() helper
│   └── db.ts                 # Database connection
├── public/                   # Static assets, favicon
├── .env.local                # Environment variables (not committed)
├── next.config.ts
├── tailwind.config.ts
└── package.json
```
 
---
 
## 🏗️ Architecture
 
```text
┌──────────────────────────────── Browser ────────────────────────────────┐
│  Next.js (React)  →  Header / Pages / Components  →  Tailwind CSS       │
└───────────────┬───────────────────────────────┬─────────────────────────┘
                │ Sign in                        │ API calls / Server Actions
                ▼                                ▼
        ┌──────────────┐               ┌──────────────────────┐
        │    Clerk     │               │  Next.js API Routes  │
        │    (auth)    │               │  (Vercel Functions)  │
        └──────────────┘               └─────────┬────────────┘
                                                 │
                              ┌──────────────────┴──────────────────┐
                              ▼                                     ▼
                    ┌────────────────────┐              ┌───────────────────────┐
                    │ Neon (PostgreSQL)  │              │ Image storage         │
                    │ users, posts,      │              │ (Cloudinary / Blob /  │
                    │ messages, frames   │              │  S3...)               │
                    └────────────────────┘              └───────────────────────┘
```
 
---
 
## 📝 Technical Notes
 
### 1. Responsive header
 
The header uses mobile-first Tailwind breakpoints:
 
| Width | What is shown |
|---|---|
| Below 1024px (`lg`) | Logo, avatar, and a ☰ button that opens a dropdown menu |
| 1024px – 1279px | Horizontal menu with icons only (name shown on hover via `title`) |
| 1280px and up (`xl`) | Horizontal menu with icons and labels |
| 1536px and up (`2xl`) | Site name "Kỷ Yếu Vũ Lăng" shown next to the logo |
 
Key classes that prevent the layout from breaking:
 
- `whitespace-nowrap`: labels never wrap onto a second line
- `shrink-0`: logo, icons, and the auth area are never squeezed
- `min-w-0`: lets the nav shrink inside its flex container
- `container` replaced with `mx-auto w-full max-w-[1536px]` so the width is not capped too narrowly
### 2. Consistent layout when signed in or signed out
 
The right side of the header has different widths in each state (a round avatar vs. a "Sign in" button with text). The sign-in button is reduced to a round `w-9 h-9` icon below 1536px so the menu width stays stable.
 
### 3. Messages page
 
On the messages page the header is hidden on mobile (`hidden md:block`) because that page has its own interface.
 
### 4. Gallery images on Vercel
 
Vercel does not persist files uploaded to the server folder. Images must live in external storage (Vercel Blob, Cloudinary, S3...) and the database should store only the URLs. If you use `next/image`, declare the image domains in `images.remotePatterns` in `next.config`.
 
### 5. Environment variables
 
Create `.env.local` (do not commit it) and add the same variables in Vercel project settings:
 
```env
DATABASE_URL=            # Neon connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
# Add the keys for whichever image storage service you use
```
 
### 6. Conditional rendering by auth state
 
```tsx
<Show when="signed-in"><UserMenu /></Show>
<Show when="signed-out"><LoginButton /></Show>
```
 
---
 
## 🚀 Getting Started
 
```bash
git clone https://github.com/perk-bevis/yearbook-websites.git
cd yearbook-websites
npm install
cp .env.example .env.local   # then fill in the environment variables
npm run dev
```
 
Open http://localhost:3000.
 
### Deployment
 
1. Push the code to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Add the environment variables in Project Settings.
4. Deploy.
---
 
## 💌 Closing words
 
*Yearbook Website*
Keeping the brightest years of our youth.
