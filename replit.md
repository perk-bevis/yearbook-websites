Digital Yearbook Platform

A digital yearbook platform designed for a broad audience, enabling students, classes, schools, and communities to create, customize, preserve, and share their memories online. The platform aims to scale beyond a single class to serve a large and growing user base.

Architecture

Layer| Technology
Frontend| React + Vite + TypeScript, Tailwind CSS 4, Framer Motion, shadcn/ui
Backend| Python FastAPI, Uvicorn, psycopg2
Database| PostgreSQL (Replit Managed Database)
API Client| Orval code generation → TanStack Query hooks ("lib/api-client-react")
Frontend Routing| wouter
Monorepo| pnpm workspaces

Project Structure

artifacts/
  yearbook/          # React + Vite frontend (preview path: /)
  api-server/        # FastAPI backend (preview path: /api)
  mockup-sandbox/    # Canvas component preview server
lib/
  api-spec/           # openapi.yaml — single source of truth for the API
  api-client-react/   # Generated TanStack Query hooks
  api-zod/            # Generated Zod schemas

Pages and Features

- "/" — Home page with a hero section, platform statistics, featured students, and recent memories.
- "/students" — Student directory with search, role badges, and profile frames.
- "/students/:id" — Individual student profile pages.
- "/gallery" — Photo gallery with category filters and a lightbox viewer.
- "/memories" — Digital guestbook for sharing long-form memories and messages.
- "/events" — Timeline of important events and milestones.
- "/teachers" — Messages and notes from teachers.
- "/frames" — Photo frame marketplace featuring free and premium options.
- "/admin" — Admin dashboard with CRUD operations for students, gallery items, memories, events, teachers, and photo frames.

Technical Notes

- Date parsing: The "birth_date" and "event_date" fields are stored in the database using the "dd/MM/yyyy" format. Use "parse(str, "dd/MM/yyyy", new Date())" from "date-fns" instead of "new Date(str)" to avoid parsing issues.
- Photo frames: The "image_url" field for photo frames contains CSS gradient strings. The frontend uses a CSS mask technique to create decorative circular borders around avatars.
- Authentication: The admin panel currently has no authentication and is publicly accessible. Authentication and authorization must be implemented before deploying the platform for public use.
- API specification: "lib/api-spec/openapi.yaml" serves as the single source of truth for API definitions. Generated API clients and Zod schemas should remain synchronized with this specification.

User Interface and Design

- Language: Vietnamese.
- Visual style: Bright, warm, friendly, and nostalgic.
- Heading font: Caveat for handwritten-style headings.
- Body font: Plus Jakarta Sans for readable, modern content.
- Emojis: Not used in the interface.

Product Vision

The goal is to build a scalable digital yearbook platform that goes beyond a single class or school.

The platform should enable users to:

- Create and manage yearbooks for their own classes, schools, or communities.
- Customize yearbook pages, student profiles, photo galleries, and memory collections.
- Share meaningful memories and milestones with classmates, teachers, and friends.
- Personalize their yearbooks with themes, photo frames, and other visual elements.
- Preserve their school memories in a centralized digital space that can be accessed and shared online.

The long-term vision is to support multiple independent yearbooks, accommodate a growing number of users, and provide a reliable, secure, and user-friendly experience at scale.
