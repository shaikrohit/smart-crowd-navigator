# 🏟️ Smart Crowd Navigator Assistant

An AI-driven stadium navigation system that provides real-time crowd routing recommendations. Built for hackathon submission — lightweight, secure, and fully functional.

## ✨ What It Does

Users select their **current location** and **desired action** (entry, exit, food, restroom, navigation). The system fetches live stadium data from Firebase, scores all options using a multi-factor algorithm, and instantly recommends the best choice with a confidence rating.

## 🏗 Architecture

```text
┌─────────────────────────────────┐
│   Browser UI (index.html)       │
│   └─ User selects location +   │
│      intent from dropdowns      │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Decision Engine (assistant.js)│
│   └─ Sanitize → Fetch → Score  │
│      → Rank → Recommend         │
└────────────┬────────────────────┘
             │
     ┌───────┴───────┐
     │               │
┌────▼─────┐  ┌──────▼──────┐
│ Firebase │  │  data.json  │
│  RTDB    │  │  (fallback) │
└──────────┘  └─────────────┘
```

## 📁 File Structure

| File | Purpose |
|------|---------|
| `index.html` | Frontend UI with ARIA accessibility and Google Maps integration |
| `assistant.js` | Core decision engine with input validation, caching, and test suite |
| `server.js` | Express server with security headers, rate limiting, and structured logging |
| `data.json` | Offline fallback dataset matching Firebase schema |
| `package.json` | Project config with `npm start` and `npm test` commands |

## ⚙️ How the Scoring Algorithm Works

Each option is scored based on intent type (lower score = better):

| Intent | Factors | Formula |
|--------|---------|---------|
| **Entry/Exit** | Crowd density, distance, congestion status | `density + (distance × 2) + (congested ? 200 : 0)` |
| **Food/Restroom** | Wait time (4× weight), crowd density | `(waitTime × 4) + density` |
| **Navigation** | Congestion level (2×), estimated time (6×) | `(congestion × 2) + (time × 6)` |

## 🔒 Security Implementation

- **Input sanitization**: Whitelist-based validation rejects unknown intents and strips unsafe characters
- **Fetch timeout**: AbortController enforces a 3.5-second network timeout
- **HTTP headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- **Rate limiting**: Zero-dependency IP rate limiter (100 req / 15 min window)
- **Error masking**: Internal stack traces are never exposed to clients

## ⚡ Efficiency Optimizations

- **In-memory cache**: 5-second TTL prevents redundant Firebase calls
- **Browser caching**: Static assets cached for 24 hours with ETag support
- **Preconnect hints**: DNS prefetch for Google Fonts reduces load time
- **Zero heavy dependencies**: Only Express (for Cloud Run hosting)

## 🧪 Testing

Run the full test suite:

```bash
npm test
```

**8 automated tests** using Node.js built-in `assert` module:

| # | Test | Category |
|---|------|----------|
| 1 | Valid entry returns gate + Google Maps link | Functionality |
| 2 | Food request returns recommendation without Maps link | Functionality |
| 3 | Navigation returns path with time info | Functionality |
| 4 | Malicious input is rejected | Security |
| 5 | Empty input is rejected | Security |
| 6 | Null input is rejected | Security |
| 7 | Cache returns data within TTL | Efficiency |
| 8 | Response contains all required fields | Code Quality |

## ♿ Accessibility Features

- Semantic HTML: `<header>`, `<main>`, `<section>` with proper hierarchy
- ARIA attributes: `aria-live="polite"`, `aria-atomic`, `aria-required`, `aria-busy`, `aria-label`
- Screen reader support: `.sr-only` class for loading context
- `<noscript>` fallback for JavaScript-disabled browsers
- Focus management: Results card receives focus when rendered
- High contrast: WCAG-compliant color ratios
- Keyboard navigable: All interactive elements are tab-accessible with visible focus rings

## 🌐 Google Services Integration

| Service | How It's Used |
|---------|---------------|
| **Google Cloud Run** | Production hosting with auto-scaling |
| **Google Cloud Logging** | Structured JSON logs (`severity`, `message`) for monitoring |
| **Google Maps URL API** | Dynamic gate routing links for entry/exit recommendations |
| **Firebase Realtime Database** | Live stadium data source (REST API, no SDK) |
| **Google Fonts** | Inter font family for the UI |

## 🚀 Deployment

**Local development:**
```bash
npm install
npm start        # Starts server on port 8080
npm test         # Runs automated test suite
```

**Google Cloud Run (via Cloud Shell):**
```bash
git clone https://github.com/shaikrohit/smart-crowd-navigator.git
cd smart-crowd-navigator
gcloud run deploy smart-crowd-navigator --source . --region us-central1 --allow-unauthenticated
```