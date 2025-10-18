# Technical Context

## Technology Stack

### Frontend Framework
- **React 19.2.0** - Modern hooks-based architecture
- **Vite 6.3.6** - Build tool and dev server
- **React Router** - Not used (single-page canvas)

### Canvas Rendering
- **Konva.js 10.0.2** - 2D canvas library
- **react-konva 19.0.10** - React bindings for Konva
- Supports shapes, transforms, events, layers

### Backend Services
- **Firebase 12.4.0**
  - Firestore - Persistent shape storage
  - Realtime Database - Cursors, presence, ephemeral data
  - Authentication - Google OAuth
  - Hosting - Static site deployment

### AI Integration
- **LangChain 0.3.36** - AI orchestration framework
- **@langchain/openai 0.6.16** - OpenAI integration
- **OpenAI GPT-4o** - Language model for AI assistant (via API)
- **Claude 3.5 Haiku** - Selected for background code analysis (not yet implemented)
- **Zod 3.25.76** - Schema validation for AI tools

**Model Selection Rationale**:
- **GPT-4o**: Canvas AI assistant - Complex reasoning, tool calling
- **Claude 3.5 Haiku**: Background DRY agent - Code analysis, cost-effective ($1/$5 per M tokens), 200K context
- **Embeddings (planned)**: OpenAI text-embedding-3-small - Fast pre-filtering ($0.02/M tokens)

### Styling
- **Tailwind CSS 4.1.14** - Utility-first CSS
- **PostCSS 8.5.6** - CSS processing
- **Custom CSS variables** - Design system tokens (preferred over Tailwind for reliability)

### Development Tools
- **Vitest 3.2.4** - Unit testing
- **Playwright 1.56.0** - E2E testing
- **@testing-library/react 16.3.0** - Component testing utilities
- **ESLint** - Code linting
- **dotenv 17.2.3** - Environment variables

### Code Quality Tools
- **Cursor Rules** - Modern `.cursor/rules/*.mdc` structure
  - `general-dry-rules.mdc` - Auto-applies to all coding
  - `dry-enforcement.mdc` - Background agent analysis (683 lines)
  - `ai-tools-maintenance.mdc` - AI tools sync protocol
- **Background DRY Agent** (Designed, not yet implemented)
  - Claude 3.5 Haiku for semantic code analysis
  - Automated duplication detection
  - Impact-driven prioritization
  - Generates `DRY_OPPORTUNITIES.md` reports

### Utilities
- **lucide-react 0.545.0** - Icon library

## Development Setup

### Environment Variables
Required in `.env`:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_DATABASE_URL=...

# OpenAI (for AI assistant)
VITE_OPENAI_API_KEY=...

# Optional: LangSmith (for AI debugging)
VITE_LANGSMITH_API_KEY=...
VITE_LANGSMITH_PROJECT=...
```

### Firebase Configuration

#### Firestore Rules (`firestore.rules`)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /canvas/{canvasId} {
      allow read, write: if request.auth != null;
      
      match /shapes/{shapeId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

#### Realtime Database Rules (`database.rules.json`)
```json
{
  "rules": {
    "sessions": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "cursors": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "drag-previews": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "drawing-previews": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "disconnect-cleanup": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### Local Development

#### Start Dev Server
```bash
npm run dev
# Opens http://localhost:5173
```

#### Run Tests
```bash
# Unit tests
npm test

# E2E tests (requires dev server running)
npm run test:e2e
npm run test:e2e:ui      # Interactive mode
npm run test:e2e:headed  # Watch tests run
```

#### Build for Production
```bash
npm run build
# Output: dist/
```

#### Deploy to Firebase
```bash
# Production deployment (includes security rules)
./deploy-production.sh

# Beta deployment (testing channel)
./deploy-beta.sh

# Or manually:
npm run build
firebase deploy --only hosting              # Production
firebase hosting:channel:deploy beta        # Beta
```

## Project Structure

```
src/
├── components/          # React components
│   ├── AI/             # AI assistant UI
│   ├── Auth/           # Login/signup forms
│   ├── Canvas/         # Canvas and shapes
│   ├── Collaboration/  # Cursors, presence
│   ├── Error/          # Error boundaries, toasts
│   ├── Layout/         # Sidebars, panels, navbar
│   └── UI/             # Reusable UI components
│
├── contexts/           # React Context providers
│   ├── AuthContext.jsx
│   ├── CanvasContext.jsx
│   ├── CanvasModeContext.jsx
│   ├── ErrorContext.jsx
│   └── ThemeContext.jsx
│
├── hooks/              # Custom React hooks
│   ├── useAuth.js
│   ├── useCanvas.js
│   ├── useCursors.js
│   ├── useFirebaseCanvas.js
│   ├── useKeyboardShortcuts.js
│   └── usePresence.js
│
├── services/           # Firebase & external services
│   ├── aiAgent.js      # LangChain AI integration
│   ├── auth.js         # Firebase Auth
│   ├── canvas.js       # Firestore shape operations
│   ├── cursors.js      # RTDB cursor sync
│   ├── firebase.js     # Firebase initialization
│   └── presence.js     # RTDB presence tracking
│
└── utils/              # Utility functions
    ├── clearCanvas.js  # Canvas reset utilities
    ├── constants.js    # App constants
    ├── designSystem.js # Design tokens
    └── helpers.js      # Misc helpers

tests/
├── e2e/                # Playwright E2E tests
│   ├── ai-assistant.spec.js
│   ├── multi-user.spec.js
│   ├── shape-operations.spec.js
│   └── undo-redo.spec.js
│
├── helpers/            # Test utilities
│   ├── auth-helpers.js
│   ├── canvas-helpers.js
│   └── multi-user-helpers.js
│
└── unit/               # Vitest unit tests
    ├── components/
    ├── contexts/
    ├── hooks/
    └── services/
```

## Technical Constraints

### Firebase Limitations
- **Firestore**: 1 write/second per document (why we use per-shape docs)
- **RTDB**: 1000 concurrent connections per database (free tier)
- **Auth**: Google OAuth popup can be blocked
- **Hosting**: Static files only, no server-side code

### Browser Support
- **Modern browsers** - Chrome 90+, Firefox 88+, Safari 14+
- **Konva requirements** - Canvas API support
- **Firebase requirements** - IndexedDB for offline persistence

### Performance Considerations
- **Large canvas** - 5000×5000px can be memory-intensive
- **Many shapes** - 100+ shapes may slow rendering
- **Real-time sync** - Network latency affects collaboration
- **AI operations** - OpenAI API can take 2-5 seconds

## Dependencies Rationale

### Why Konva?
- **Mature**: Battle-tested canvas library
- **React integration**: Official react-konva bindings
- **Feature-rich**: Transforms, events, layers, filters
- **Performance**: Better than raw Canvas API for complex scenes
- **Alternative considered**: Fabric.js (chose Konva for React support)

### Why Firebase?
- **No backend needed**: Client-side only architecture
- **Real-time sync**: Built-in WebSocket connections
- **Offline support**: IndexedDB persistence
- **Authentication**: Managed OAuth flows
- **Scalability**: Handles concurrent users well
- **Alternative considered**: Supabase (chose Firebase for RTDB + Firestore combo)

### Why LangChain?
- **Tool abstraction**: Clean way to define AI capabilities
- **Provider agnostic**: Could swap OpenAI for Anthropic
- **Schema validation**: Zod integration ensures type safety
- **Debugging**: LangSmith tracing for AI behavior
- **Alternative considered**: Direct OpenAI API (chose LangChain for structure)

### Why Tailwind?
- **Rapid prototyping**: Utility classes speed development
- **Consistency**: Design system baked in
- **Performance**: PurgeCSS removes unused styles
- **Note**: User prefers CSS variables for critical styling due to Tailwind v4 reliability issues

### Why Vite?
- **Fast HMR**: Instant hot module replacement
- **Modern**: ES modules, no bundling in dev
- **Plugin ecosystem**: React, PostCSS support
- **Build speed**: Much faster than Webpack
- **Alternative considered**: Create React App (deprecated)

## Known Technical Debt

### 1. Authentication in Tests
- Current: Manual login required for E2E tests
- Ideal: Firebase Auth emulator with test accounts
- Impact: Can't run tests in CI/CD easily
- Priority: Medium

### 2. No Backend Validation
- Current: All validation client-side
- Risk: Malicious clients could send invalid data
- Mitigation: Firestore rules provide some protection
- Priority: Low (MVP scope)

### 3. Viewport Culling Disabled
- Current: All shapes render always
- Impact: Performance degrades with 500+ shapes
- Reason: User preference for simplicity
- Priority: Re-enable if performance issues arise

### 4. No Conflict Resolution
- Current: Last write wins
- Risk: Rare race conditions with simultaneous edits
- Mitigation: Object locking prevents most issues
- Priority: Low (rarely occurs in practice)

### 5. AI Token Costs
- Current: Each command calls GPT-4o (expensive)
- Improvement: Could use cheaper models for simple tasks
- Impact: ~$0.01-0.05 per command
- Priority: Low for MVP

## Development Workflow

### Git Workflow
```bash
# Main branch = production
# Direct commits (single developer)
git add .
git commit -m "Descriptive message"
git push origin main
```

### Deployment Process
```bash
# Option 1: Deploy to beta for testing
./deploy-beta.sh
# Test at: https://collabcanvas-5b9fb--beta-[UNIQUE_ID].web.app

# Option 2: Deploy to production
./deploy-production.sh
# Live at: https://collabcanvas-5b9fb.web.app

# Both scripts handle:
# - Build process
# - Firebase authentication
# - Environment validation
# - Deployment
```

### Debugging Tools
- **React DevTools** - Component inspection
- **Firebase Console** - Database inspection
- **LangSmith** - AI agent tracing
- **Chrome DevTools** - Network, performance
- **Playwright Inspector** - E2E test debugging

### Common Issues & Solutions

#### "Port already in use"
```bash
lsof -ti:5173 | xargs kill -9
npm run dev
```

#### "Firebase not initialized"
```bash
# Check .env file exists
# Verify all VITE_FIREBASE_* variables set
```

#### "AI assistant not responding"
```bash
# Check VITE_OPENAI_API_KEY in .env
# Verify API key has credits
# Check network tab for API errors
```

#### "Shapes not syncing"
```bash
# Check Firebase console for rules errors
# Verify user is authenticated
# Check browser console for errors
```

## Future Technical Improvements

### Short Term
- [ ] Firebase emulator setup for tests
- [ ] Automated deployment pipeline
- [ ] Error monitoring (Sentry integration)

### Medium Term
- [ ] TypeScript migration
- [ ] Component library (Storybook)
- [ ] Performance monitoring
- [ ] E2E tests in CI/CD

### Long Term
- [ ] Backend API for validation
- [ ] WebSocket server for lower latency
- [ ] Advanced shapes (paths, images)
- [ ] Export to SVG/PNG

