# Doodle Frontend Challenge Chat App

This app implements the frontend challenge chat interface with `Next.js`, `React`, and `TypeScript`.

## Features

- Displays chat messages from the API in chronological order
- Sends new messages with a sender name and message body
- Uses Bearer token authentication for all message requests
- Supports loading older messages and polling for newer ones
- Keeps the footer composer fixed on screen with responsive mobile and desktop layout

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

## Prerequisites

- Node.js 20+
- Running backend API from the provided challenge backend

Backend reference: [backend README](/Users/mohammed/Desktop/doodle/backend/README.md)

## Environment

Create `chat-app/.env.local` with:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_AUTH_TOKEN=super-secret-doodle-token
```

If not set, the app defaults to:

- `NEXT_PUBLIC_API_URL=http://localhost:3000`
- `NEXT_PUBLIC_AUTH_TOKEN=super-secret-doodle-token`

## Running The App

From `chat-app/`:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Requirement Notes

- **React + TypeScript:** Implemented throughout the frontend.
- **Sends and displays messages from all senders:** Composer accepts sender name and message text.
- **Responsive:** Layout works on desktop and mobile breakpoints.
- **Accessibility:** Inputs are labeled, keyboard submit is supported, focus states are visible, and validation errors are announced in the UI.
- **Performance:** Message rendering is virtualized and older messages load on demand.
