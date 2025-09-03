# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Regatta Clock is a Next.js 15 application for managing rowing regatta races, teams, and entries. The application uses:
- **Framework**: Next.js 15 with App Router and Turbopack
- **Database**: Supabase for data management and authentication
- **UI**: Tailwind CSS with shadcn/ui components
- **Language**: TypeScript with strict mode enabled
- **Package Manager**: pnpm (evident from pnpm-lock.yaml)

## Development Commands

```bash
# Start development server with Turbopack
pnpm dev  # or npm run dev

# Build for production with Turbopack  
pnpm build  # or npm run build

# Start production server
pnpm start  # or npm run start
```

## Architecture Overview

### Directory Structure
- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - React components (UI components in `ui/` subdirectory)
- `src/lib/` - Client-side utilities (Supabase client, utils)
- `utils/` - Server-side utilities and type definitions
  - `utils/types/` - TypeScript type definitions for core entities
  - `utils/supabase/` - Server-side Supabase utilities and middleware
  - `utils/races/`, `utils/teams/`, `utils/boats/` - Entity-specific utilities

### Key Components
- **NavBar**: Main navigation component used in root layout
- **RacesTable**: Client-side component displaying race data with entry counts
- **Race Detail Pages**: Dynamic routes at `/race/[id]` for individual race management

### Data Models
The application manages three core entities:
- **Races**: With status (scheduled, ready, started, finished, etc.) and types (time_trial, head_race, sprint)
- **Teams**: Participating organizations/crews
- **Boats**: Individual entries linked to teams and races with status tracking

### Supabase Integration
- Authentication handled via middleware (`middleware.ts`) using `utils/supabase/middleware.ts`
- Client-side data access through `src/lib/supabase.ts`
- Server-side operations through `utils/supabase/server.ts`
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Configuration
- **UI Components**: Configured via `components.json` using shadcn/ui with New York style
- **Path Aliases**: `@/*` maps to `src/*` (defined in tsconfig.json)
- **Middleware**: Handles session management for all routes except static assets and images

## Development Notes

- Uses TypeScript with strict mode and `target: "ES2017"`
- Components use both client-side (`'use client'`) and server-side rendering
- Type definitions include enums for status values (RaceStatus, BoatStatus, RaceType)
- Authentication state is managed through Supabase middleware
- The app follows the shadcn/ui component architecture with custom styling