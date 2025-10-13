# CollabCanvas

A real-time collaborative design tool built with React, Firebase, and Konva.js. Create and edit shapes together on an infinite canvas with real-time cursor tracking and presence awareness.

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

## 🛠️ Tech Stack

- **Frontend**: React 19 + Vite
- **Canvas**: Konva.js + React-Konva  
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Auth + Firestore + Realtime Database)
- **Deployment**: Firebase Hosting

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── Auth/           # Authentication components
│   ├── Canvas/         # Canvas and shape components
│   ├── Collaboration/  # Cursor and presence components
│   └── Layout/         # Navigation and layout
├── services/           # Firebase and API services
├── hooks/             # Custom React hooks
├── contexts/          # React contexts
├── utils/             # Helper functions
└── App.jsx           # Main application component
```

## 🚧 Development Status

This project is currently in active development as part of an AI bootcamp submission.

### Current Features (MVP)
- [x] Project setup with React + Vite + Firebase
- [x] Tailwind CSS configuration
- [x] Firebase services initialization
- [ ] User authentication
- [ ] Canvas with pan/zoom
- [ ] Shape creation and manipulation
- [ ] Real-time synchronization
- [ ] Multiplayer cursors
- [ ] Presence awareness

### Planned Features (Post-MVP)
- Multiple shape types (circles, text)
- Shape styling and colors
- Resize and rotate functionality
- Undo/redo system
- Multi-select and grouping

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

This is currently a solo project for bootcamp submission, but contributions will be welcome after initial completion!
