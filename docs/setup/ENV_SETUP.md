# Environment Variables Setup

Create a `.env` file in the project root with the following variables:

```env
# Firebase Configuration
# Get these values from your Firebase project settings
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com/
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_optional
```

## Instructions:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project or create a new one
3. Go to Project Settings > General > Your apps
4. Select your web app or create one if it doesn't exist
5. Copy the config values to the corresponding variables above
6. Replace all "your_*" placeholders with actual values
7. Save as `.env` in the project root

## Required Variables:

- `VITE_FIREBASE_API_KEY`: Your Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN`: Authentication domain 
- `VITE_FIREBASE_DATABASE_URL`: Realtime Database URL
- `VITE_FIREBASE_PROJECT_ID`: Your Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET`: Storage bucket name
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Messaging sender ID
- `VITE_FIREBASE_APP_ID`: Your Firebase app ID

## Optional Variables:

- `VITE_FIREBASE_MEASUREMENT_ID`: Google Analytics measurement ID
