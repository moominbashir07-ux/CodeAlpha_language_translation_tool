# Premium Language Translation Web Application

A robust, enterprise-grade Language Translation Web Application featuring a glassmorphism user interface, an asynchronous Node.js/Express backend service, and an automatic multi-provider fallback translation engine. Built with vanilla HTML/CSS/JavaScript on the frontend and Express on the backend, the application is designed to be fully accessible, responsive, and resilient to API outages.

---

## Technical Architecture Map

The application is structured as a decoupled client-server architecture. The backend acts as a proxy and failover manager to interact with public/private translation APIs, avoiding CORS restrictions and hiding sensitive API credentials.

```mermaid
graph TD
    Client[Web Browser Frontend] -->|HTTP POST /api/translate| Router[Express Router]
    Router -->|Dispatch| Service[Translation Service]
    Service -->|Query| Manager[Provider Manager]
    Manager -->|Select Provider Queue| Queue[Failover Queue]
    Queue -->|Primary Choice| MS[Microsoft Provider (Multi-Key fallback)]
    Queue -->|Secondary Fallback| Libre[LibreTranslate Provider]
    Queue -->|Tertiary Fallback| MyMemory[MyMemory Provider]
    MS -->|Fail / Success| Service
    Libre -->|Fail / Success| Service
    MyMemory -->|Success / Fail| Service
    Service -->|Structured Response + Telemetry| Router
    Router -->|JSON Response + Correlation ID| Client
```

---

## Core Features & Core Capabilities

- **Glassmorphism Theme System**: Built-in system support for Light & Dark mode settings. Styled using CSS backdrop-filters (`blur(16px)`) and variable mapping.
- **Failover-Resilient Translation Engine**: Automatic routing across providers. If a primary API returns an error or hits a rate limit, the application cascades down the priority queue to prevent user-facing downtime.
- **Multi-Key Microsoft Azure Integration**: Configured to load multiple Azure Cognitive Services API keys. If the primary key is rate-limited or disabled, the provider automatically falls back to secondary keys.
- **Dynamic Language Detection**: Auto-detects the source language using API capabilities, updating language codes on the fly.
- **Localized Speech Synthesis (TTS)**: Incorporates the browser's native `SpeechSynthesis` API. It maps language codes to regional locales (e.g., `hi-IN` for Hindi) to load corresponding voice packages, with full control support (Play, Pause, Resume, Stop).
- **Persistent Local History**: Fast browser-local storage caching for recent translations (up to 50 items) with immediate reload capabilities.
- **Comprehensive Quality and Stress testing Suite**: Built-in endpoints to run test suites validating translation accuracy, language script validation, and multi-user concurrent stress testing.
- **Keyboard Optimization**: Quick execution support using `Ctrl + Enter` (or `Cmd + Enter` on macOS).
- **Downloadable Translations**: Single-click downloading of target translations as UTF-8 encoded text files.
- **Full Accessibility (A11y)**: Built with semantic HTML elements, custom visible focus outlines (`focus-visible`), standard tab indices, screen-reader headings (`sr-only`), and user media queries (`prefers-reduced-motion`).

---

## Directory Structure

```text
translater/
│
├── public/                     # Frontend Assets & Client Logic
│   ├── css/
│   │   ├── style.css           # Global variable declarations, base styles, and layouts
│   │   └── responsive.css      # Viewport media queries (stacked/vertical layout overrides)
│   ├── js/
│   │   ├── api.js              # Client-side API request wrapper (interacts with Express)
│   │   ├── app.js              # Main application controller & event bindings
│   │   ├── speech.js           # Speech Synthesis wrapper and localized map
│   │   └── ui.js               # Theme, animations, counters, and toasts UI manager
│   └── index.html              # Entry semantic HTML5 document
│
├── server/                     # Backend Logic & Providers
│   ├── server.js               # Application entry point, Express configs, and middleware
│   ├── providers/
│   │   ├── microsoftProvider.js# Microsoft Azure Translator API adapter (Multi-key support)
│   │   ├── libreProvider.js    # LibreTranslate API adapter
│   │   ├── mymemoryProvider.js # MyMemory API adapter
│   │   └── providerManager.js  # Determines priority queue and language capabilities mapping
│   ├── routes/
│   │   └── translateRoutes.js  # Main Express endpoints (translation, stress-test, validations)
│   └── services/
│       ├── translationService.js # Translation execution wrapper with retry-backoff logic
│       ├── matrixValidator.js  # Simple pair-wise language translation and auto-detection validator
│       ├── qualityValidator.js # Evaluates Unicode script correctness and detect accuracy
│       ├── qualityMatrixValidator.js # Full permutation quality validation matrix
│       ├── stressTester.js     # Executes high-concurrency translation loads (Mocked/Live)
│       └── edgeTester.js       # Performs validation checks (overflow limits, empty inputs)
│
├── .env.example                # Blueprint for local configuration variables
├── package.json                # Project dependencies, startup, and testing scripts
└── README.md                   # Technical documentation (this file)
```

---

## Installation & Local Setup

### Prerequisites
- Node.js (v18.x or higher)
- npm (v9.x or higher)

### Step 1: Clone and Install Dependencies
Navigate to the directory and run:
```bash
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the root of the project (copying from `.env.example`):
```env
PORT=3000

# Choose preferred default provider: microsoft, libre, mymemory
TRANSLATION_PROVIDER=microsoft

# Azure Cognitive Services configuration
MICROSOFT_TRANSLATOR_KEY=YOUR_PRIMARY_KEY
MICROSOFT_TRANSLATOR_KEY_2=YOUR_BACKUP_KEY
MICROSOFT_TRANSLATOR_REGION=eastasia
MICROSOFT_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com

# LibreTranslate API Configuration
LIBRE_TRANSLATE_URL=https://libretranslate.de
LIBRE_TRANSLATE_API_KEY=

# Optional: Email parameter to boost rate limits for MyMemory
MYMEMORY_EMAIL=mymemory@translator-app.local
```

---

## Running the Application

### Development Server
Starts the Express server with automatic hot-reloading using `nodemon`:
```bash
npm run dev
```

### Production Deployment
Starts the node server directly:
```bash
npm start
```
Once started, view the web application at [http://localhost:3000](http://localhost:3000).

---

## Testing & Quality Matrix Verification

The project includes an in-depth suite of verification testing scripts to run translation simulations and confirm production compliance:

### Execute Complete Validation Suite
Run the automated quality and accuracy test matrix:
```bash
npm test
```
This script tests 380 language permutations (across 20 languages) to verify:
1. Provider availability and latency metrics.
2. Script script compliance (e.g. confirming target Russian output contains Cyrillic characters).
3. Translation accuracy scores using back-translation semantic overlap calculations.
4. Auto-detection language mapping success rates.

Full reports are saved as a structured `quality_matrix_report.json` document in the root workspace folder.

---

## Non-Functional Certification Specs

### Security (SecOps)
- **Input Validation**: Backend strictly validates character counts, rejecting queries exceeding 5,000 characters with an HTTP 400 bad request.
- **XSS Prevention**: DOM rendering utilizes `.textContent` or `value` injection where possible. Any HTML template generation uses structured regex escaping (`UI.escapeHTML(str)`) to prevent cross-site scripting vulnerabilities.
- **CORS Setup**: Fully restricted routing on Express backend using CORS rules, keeping API keys protected on the server.

### Performance
- **Zero-Dependency UI**: Uses fast, native browser JavaScript and CSS variables. Loads instantly without layout shifts (CLS).
- **Throttling & Backoff**: Server implements an exponential backoff retry mechanism with random jitter for transient errors (429 Rate Limits, timeouts).
- **Active Concurrency Mapping**: Backend tests process concurrently throttled queries via a custom task queue mapper to protect API thresholds.

### Accessibility (A11y)
- Fully navigable via keyboard (`Tab` indexing & custom `:focus-visible` styling).
- Screen reader friendly containing appropriate `aria-label`, `aria-hidden`, and semantic tag elements.
- Media queries mapping support for `prefers-reduced-motion` to cancel CSS transitions and keyframes instantly.

---

## Contributing & License
Released under the [MIT License](LICENSE).
