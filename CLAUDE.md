# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator. Users describe a component in a chat interface, Claude generates it using tool calls, and a live preview renders it instantly via an in-browser virtual file system.

## Setup & Commands

```bash
npm run setup       # First-time setup: install deps, generate Prisma client, run migrations
npm run dev         # Start dev server (Turbopack) at http://localhost:3000
npm run build       # Production build
npm run lint        # ESLint
npm run test        # Run all tests (watch mode)
npm run test -- --run              # Run tests once
npm run test -- src/lib/file-system.test.ts  # Run a single test file
npm run db:reset    # Reset SQLite database
```

**Environment:** Copy `.env` and optionally add `ANTHROPIC_API_KEY`. Without an API key, the app falls back to a `MockLanguageModel` that generates dummy components.

## Architecture

### Three-Panel Layout

The UI is three resizable panels: **Chat** (left) | **Preview or Code Editor** (right, toggleable).

`src/app/main-content.tsx` is the root client component. It wraps everything in two context providers:
1. `FileSystemProvider` — manages the virtual file system state
2. `ChatProvider` — manages messages and AI streaming via Vercel AI SDK's `useChat`

### Data Flow

```
User chat input
  → POST /api/chat (streaming)
  → Claude (claude-haiku-4-5) with system prompt + two tools
  → Tool calls mutate the VirtualFileSystem (str_replace_editor, file_manager)
  → FileSystemContext state updates
  → PreviewFrame re-renders (iframe) | CodeEditor + FileTree update
```

### Virtual File System

`src/lib/file-system.ts` — an in-memory file tree (`VirtualFileSystem` class). Files are never written to disk. The filesystem is serialized to JSON and stored in the database (`Project.data`) when a user is authenticated. Anonymous work is tracked via `localStorage` (`src/lib/anon-work-tracker.ts`).

### AI Tool Integration (`src/lib/tools/`)

Two tools are registered on the `/api/chat` endpoint:
- **`str_replace_editor`** (`str-replace.ts`): Create files, replace text, insert lines — Claude's primary way to write/edit code.
- **`file_manager`** (`file-manager.ts`): Rename and delete files.

The system prompt is in `src/lib/prompts/generation.tsx`.

### Preview Rendering

`src/components/preview/PreviewFrame.tsx` renders the virtual filesystem in an `<iframe>`. It uses `src/lib/transform/jsx-transformer.ts` to convert the virtual files to a single HTML document with Babel standalone for runtime JSX compilation.

### Authentication

JWT sessions stored in HttpOnly cookies (`src/lib/auth.ts` using `jose`). Server actions in `src/actions/index.ts` handle signUp/signIn/signOut/getUser. Passwords are hashed with bcrypt.

### LLM Provider

`src/lib/provider.ts` returns an Anthropic provider (via `@ai-sdk/anthropic`) if `ANTHROPIC_API_KEY` is set, otherwise a `MockLanguageModel`. The mock generates static placeholder components.

### Database

Prisma with SQLite (`prisma/dev.db`). Two models:
- **`User`**: email + hashed password
- **`Project`**: belongs to optional User; stores `messages` (JSON) and `data` (serialized VirtualFileSystem JSON)

## Key Technology Choices

- **Next.js 15 App Router** with React 19 and TypeScript
- **Vercel AI SDK** (`ai` package) for streaming and tool-call orchestration
- **Tailwind CSS v4** — config is in `postcss.config.mjs`, no `tailwind.config.js`
- **shadcn/ui** (new-york style, Radix UI primitives) — components live in `src/components/ui/`
- **Monaco Editor** (`@monaco-editor/react`) for the code view
- **Vitest + Testing Library** with jsdom for all tests

## Path Alias

`@/*` maps to `src/*` (configured in `tsconfig.json`).

## Code Style

Use comments sparingly. Only comment complex code.
