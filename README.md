# CollabCanvas

A real-time collaborative design tool built with React, Firebase, and Konva.js. Create and edit shapes together on a 5000x5000px canvas with real-time cursor tracking, presence awareness, and object locking.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mfuechec/collabcanvas.git
   cd collabcanvas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password + Google)
   - Create Firestore Database (Test mode)
   - Create Realtime Database (Test mode)
   - Get your web app config from Project Settings

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your Firebase configuration in `.env`:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com/
   VITE_FIREBASE_PROJECT_ID=your_project_id_here
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456789012345
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## ✨ Features

### Current Features (MVP Complete)
- ✅ **User Authentication** - Email/password and Google sign-in
- ✅ **Canvas with Pan/Zoom** - 5000x5000px canvas with boundary constraints
- ✅ **Shape Creation** - Rectangle shapes with drawing preview
- ✅ **Shape Manipulation** - Select, drag, and delete shapes
- ✅ **Real-time Synchronization** - Instant shape updates across users
- ✅ **Object Locking** - First-come-first-serve shape locking during edits
- ✅ **Multiplayer Cursors** - Real-time cursor tracking with user colors
- ✅ **Presence Awareness** - Online user indicators with activity tracking
- ✅ **Dark/Light Theme** - System preference with manual toggle (dark default)
- ✅ **Keyboard Shortcuts** - Efficient workflow with hotkeys
- ✅ **Error Handling** - User-friendly error messages and retry logic
- ✅ **Cross-browser Support** - Chrome, Firefox, Safari compatibility

### Keyboard Shortcuts
- **D** - Switch to Draw mode
- **V** - Switch to Move/Select mode  
- **R** - Reset canvas view
- **Ctrl/Cmd + 0** - Reset canvas view (alternative)
- **Delete/Backspace** - Delete selected shape
- **Escape** - Cancel drawing or deselect shape

## 🛠️ Tech Stack

- **Frontend**: React 19 + Vite
- **Canvas**: Konva.js + React-Konva  
- **Styling**: Tailwind CSS v4 + CSS Variables
- **Backend**: Firebase (Auth + Firestore + Realtime Database)
- **State Management**: React Context API + Custom Hooks
- **Testing**: Vitest + React Testing Library
- **Deployment**: Firebase Hosting

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── Auth/           # Login, Signup components
│   ├── Canvas/         # Canvas, Shape, CanvasInfo, CanvasToolbar
│   ├── Collaboration/  # Cursor, PresenceList components
│   ├── Error/          # ErrorBoundary, ErrorToast
│   └── Layout/         # Navbar component
├── contexts/           # React contexts
│   ├── AuthContext.jsx      # Authentication state
│   ├── CanvasContext.jsx    # Canvas state management
│   ├── CanvasModeContext.jsx # Drawing/move modes
│   ├── ErrorContext.jsx     # Global error handling
│   └── ThemeContext.jsx     # Light/dark theme
├── services/           # Firebase services
│   ├── auth.js         # Authentication operations
│   ├── canvas.js       # Shape CRUD operations
│   ├── cursor.js       # Cursor tracking
│   ├── presence.js     # User presence management
│   └── firebase.js     # Firebase configuration
├── hooks/              # Custom React hooks
│   ├── useAuth.js      # Authentication hook
│   ├── useCanvas.js    # Canvas operations hook
│   ├── useCursors.js   # Cursor tracking hook
│   └── usePresence.js  # Presence management hook
├── utils/              # Helper functions
│   ├── constants.js    # App constants
│   ├── helpers.js      # Utility functions
│   └── clearCanvas.js  # Debug utilities
└── App.jsx            # Main application component
```

## 🎨 UI/UX Design

### Layout
- **Top Navigation Bar** - App title, welcome message, presence indicators, theme toggle, sign out
- **Floating Panels** - Canvas info (top-left) and toolbar (near info panel)
- **Glass Effect Design** - Semi-transparent panels with backdrop blur
- **Responsive Design** - Adapts to different screen sizes

### Canvas Features
- **5000x5000px Canvas** - Large workspace with boundary enforcement
- **12% Initial Zoom** - Shows full canvas on load
- **Visual Feedback** - Shape selection, locking indicators, drawing preview
- **Theme Adaptation** - Canvas background differentiates in light/dark modes

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

### Code Style
- **CSS Variables** - Used for reliable theming (Tailwind v4 compatibility issues)
- **Error Boundaries** - Comprehensive error handling with user-friendly messages
- **Loading States** - Visual feedback for all async operations
- **Accessibility** - ARIA labels, keyboard navigation, focus management

## 🐛 Known Issues & Troubleshooting

### Authentication Issues
**Problem**: Google sign-in popup gets blocked
- **Solution**: Allow popups in browser settings for the domain
- **Alternative**: Use email/password authentication

**Problem**: Loading screen persists after canceling Google sign-in
- **Status**: ✅ Fixed - Popup cancellation now clears loading immediately

### Canvas Issues
**Problem**: Shapes appear in wrong position while drawing
- **Status**: ✅ Fixed - Unified coordinate system prevents race conditions

**Problem**: Canvas disappears when panning to lower-right and zooming out
- **Status**: ✅ Fixed - Improved boundary constraints and position handling

### Browser Compatibility
**Problem**: SVG icons don't display in Safari
- **Status**: ✅ Fixed - Added Safari-specific SVG attributes (xmlns, role, aria-hidden)

**Problem**: Tailwind classes not applying consistently
- **Workaround**: Using CSS variables with inline styles for critical UI elements

### Performance Considerations
- **Shape Limit**: Tested with 100+ shapes, performance remains smooth
- **Network**: Optimized with throttled cursor updates and retry logic
- **Memory**: Automatic cleanup of disconnected users and expired locks

### Firestore/Firebase Issues
**Problem**: "Permission denied" errors
- **Solution**: Ensure Firestore rules allow authenticated read/write
- **Check**: Verify user is properly authenticated before canvas operations

**Problem**: Presence indicators show stale data
- **Status**: ✅ Fixed - Implemented heartbeat system with activity tracking

## 🚀 Live Demo

**🌐 [Try CollabCanvas Live](https://collabcanvas-5b9fb.web.app)**

Experience real-time collaborative editing with multiple users:
- Open the link in multiple browser tabs/windows
- Sign in with different accounts (or use Google sign-in)
- Create and move shapes to see real-time synchronization
- Watch cursors and presence indicators update live

## 🚀 Deployment

### Production Setup
The app is deployed on Firebase Hosting with the following architecture:
- **Frontend**: React SPA hosted on Firebase Hosting
- **Authentication**: Firebase Auth (Email/Password + Google OAuth)
- **Database**: 
  - Firestore for persistent canvas state (shapes, metadata)
  - Realtime Database for live updates (cursors, presence)
- **Security**: Production-ready Firestore and Database security rules

### Deploy Your Own Instance

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login and configure**
   ```bash
   firebase login
   firebase use --add  # Select or create Firebase project
   ```

3. **Set up environment variables**
   - Copy `ENV_SETUP.md` instructions
   - Create `.env` with your Firebase config
   - Update `.firebaserc` with your project ID

4. **Deploy security rules**
   ```bash
   firebase deploy --only firestore:rules,database
   ```

5. **Build and deploy app**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### Environment Variables for Production
- Create production Firebase project at [Firebase Console](https://console.firebase.google.com)
- Enable Authentication (Email/Password + Google OAuth)
- Create Firestore Database (production mode)
- Create Realtime Database (production mode)
- Update `.env` with production Firebase config (see `ENV_SETUP.md`)
- Deploy security rules before first deployment

## 🧪 Testing

### Manual Testing Checklist
- [ ] **Multi-user Testing** - 2-5 concurrent users creating/moving shapes
- [ ] **Performance** - 100+ shapes with smooth interactions
- [ ] **Persistence** - Shapes remain after browser close/reopen
- [ ] **Cross-browser** - Chrome, Firefox, Safari compatibility
- [ ] **Network Issues** - Offline/online transitions, connection failures

### Automated Testing
- Unit tests for core services (auth, canvas, presence)
- Component tests for UI interactions
- Error handling and edge case coverage

## 📈 Future Enhancements

### Post-MVP Features
- **Multiple Shape Types** - Circles, lines, text, images
- **Advanced Editing** - Resize handles, rotation, styling options
- **Collaboration Features** - Comments, version history, user permissions
- **Performance** - Virtual rendering for large canvases, shape clustering
- **Export/Import** - Save/load canvas as JSON, export as image

### Technical Improvements
- **Undo/Redo System** - Command pattern implementation
- **Offline Support** - Progressive Web App with offline canvas editing
- **Real-time Voice/Video** - WebRTC integration for team collaboration
- **Advanced Animations** - Shape transitions, collaborative cursors effects

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

This project was built as part of an AI bootcamp submission. Contributions are welcome!

### Development Guidelines
- Follow existing code patterns and CSS variable usage
- Add tests for new features
- Update documentation for API changes
- Ensure cross-browser compatibility

---

**Built with ❤️ for collaborative design**