# Logist — Container Transport Management

A role-based web application for managing container transport logistics. Built for dispatchers, logists, and drivers to coordinate trips, track shipments, and communicate in real time.

## Features

**Dispatcher**
- Create and manage trips with driver assignment, route, ETA, and container details
- Monitor driver locations on a live map
- View real-time driver status (online / offline / SOS)
- Chat with drivers per trip

**Logist**
- Plan and manage transport routes
- Full trip oversight with status timeline
- Container tracking across trips
- Event log and audit trail

**Driver** (mobile-optimized)
- View active trip details (containers, waypoints, documents)
- Update trip status step by step
- Trigger SOS alerts for emergencies
- Chat with dispatcher

## Tech Stack

- **Vue 3** (Composition API, `<script setup>`)
- **Pinia** — state management
- **Vue Router 4**
- **Firebase** — Auth, Firestore, Realtime Database, Cloud Functions
- **Leaflet** — interactive maps
- **Tailwind CSS** — styling
- **Vite** — build tool

## Roles

| Role | Access |
|------|--------|
| `logist` | Full access — routes, trips, planning, events |
| `dispatcher` | Trips, drivers, map, chat |
| `driver` | Own active trip, status updates, chat |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your Firebase project credentials:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=
```

### 3. Deploy Firestore rules

```bash
npx firebase deploy --only firestore:rules
```

### 4. Run dev server

```bash
npm run dev
```

### 5. Seed demo data

Navigate to `/setup` in the browser to create test users and demo trips:

| Role | Email | Password |
|------|-------|----------|
| Driver | driver@test.com | password123 |
| Dispatcher | dispatcher@test.com | password123 |
| Logist | logist@test.com | password123 |

## Project Structure

```
src/
├── components/       # Shared UI components (modals, buttons, chat, map)
├── firebase/         # Firebase service initializers
├── layouts/          # Per-role app shells
├── stores/           # Pinia stores (auth, trips, events, location)
├── types/            # Status definitions and labels
└── views/
    ├── auth/         # Login, setup
    ├── driver/       # Driver screens
    ├── dispatcher/   # Dispatcher screens
    └── logist/       # Logist screens
```

## Build

```bash
npm run build
```
