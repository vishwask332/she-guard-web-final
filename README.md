# SHE-GUARD — AI-Powered Women Safety & Emergency Response Web App

A responsive React, TypeScript, Tailwind CSS, and Firebase web application providing manual-first SOS emergency alerts, GPS Google Maps location links, trusted contact outreach, journey check-in monitoring, permanent SOS history, and voluntary server-side AI distress text analysis.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), Lucide Icons
- **Backend / Serverless API:** Express (`server.ts` for local/Node hosting) & Vercel Serverless Function (`api/ai/analyze-distress.ts`)
- **AI:** `@google/genai` (`gemini-4-hydrogen`) running strictly server-side
- **Auth & Database:** Firebase Authentication & Cloud Firestore (supports named Firestore databases via `firestoreDatabaseId`)

---

## Project Structure

```text
├── api/
│   └── ai/analyze-distress.ts     # Vercel serverless endpoint for AI distress check
├── src/
│   ├── assets/images/             # Bundled visual assets
│   ├── components/                # UI pages, navigation shell, and SOS modal
│   ├── context/AuthContext.tsx    # Firebase Auth provider (Google + Email/Password)
│   ├── lib/firebase.ts            # Firebase & named Firestore initialization
│   ├── lib/safetyUtils.ts         # GPS, Google Maps link, SMS/Tel, offline SOS queue
│   ├── services/firestoreService.ts # Firestore queries and mutations
│   ├── types/sheguard.ts          # TypeScript interfaces matching blueprint
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── firebase-applet-config.json    # Firebase Web SDK configuration
├── firebase-blueprint.json        # Firestore schema blueprint
├── firestore.rules                # Firestore security rules reference
├── server.ts                      # Local Express + Vite full-stack server
├── vercel.json                    # Vercel build & SPA rewrite configuration
└── .env.example                   # Environment variable template
```

---

## Local Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Copy `.env.example` to `.env` and set your server-side Gemini key:
   ```bash
   cp .env.example .env
   ```
   Set `GEMINI_API_KEY` in `.env`. Never prefix `GEMINI_API_KEY` with `VITE_`—it is only read on the server (`server.ts` / `api/ai/analyze-distress.ts`).

3. **Run in development**
   ```bash
   npm run dev
   ```
   The app runs on `http://localhost:3000`.

4. **Type-check & build for production**
   ```bash
   npm run lint
   npm run build
   ```

---

## Firebase Configuration & Android Compatibility

The web app reads its public Firebase Web SDK configuration from `firebase-applet-config.json` and connects explicitly to the named database specified in `firestoreDatabaseId` via `getFirestore(app, firebaseConfig.firestoreDatabaseId)`.

To connect to your own or existing Android Firebase project:
1. Open your Firebase Console and register a **Web App** inside the target project.
2. Replace the values in `firebase-applet-config.json` with your Web App's `projectId`, `appId`, `apiKey`, `authDomain`, `storageBucket`, `messagingSenderId`, and exact `firestoreDatabaseId`.
3. Under **Authentication > Sign-in method**, ensure **Google** (and **Email/Password** if desired) is enabled.
4. **Do not overwrite** existing production Firestore security rules blindly—verify collection paths, field names, and rules compatibility first.

---

## Deploying to Vercel

1. Push this project to a GitHub, GitLab, or Bitbucket repository (or import via Vercel CLI).
2. Create a new project in [Vercel](https://vercel.com):
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add **Environment Variables** in Vercel Project Settings:
   - `GEMINI_API_KEY`: your Gemini API key (kept server-side for `/api/ai/analyze-distress`)
4. Deploy.
5. After deployment, copy your `https://<your-app>.vercel.app` domain and add it in **Firebase Console > Authentication > Settings > Authorized domains** so Google Sign-In works on your public URL.
