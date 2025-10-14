// Debug script for testing presence and cursor systems
// Copy and paste this into your browser console on localhost:5173

console.log('🔍 CollabCanvas Debug Script Loaded');

// Function to check presence data
const checkPresenceData = () => {
  console.log('\n=== PRESENCE DATA CHECK ===');
  
  // Check if Firebase RTDB is accessible
  try {
    const { rtdb } = window.firebase || {};
    if (rtdb) {
      console.log('✅ Firebase RTDB instance found');
    } else {
      console.log('❌ Firebase RTDB instance not found');
    }
  } catch (e) {
    console.log('❌ Firebase not accessible:', e);
  }
  
  // Check current user auth status
  try {
    const auth = firebase.auth?.currentUser;
    console.log('🔐 Auth status:', auth ? `Logged in as ${auth.email}` : 'Not logged in');
  } catch (e) {
    console.log('❌ Auth check failed:', e);
  }
  
  // Check presence hook state (if available)
  console.log('📊 Check the React DevTools for usePresence hook state');
  console.log('📊 Check the React DevTools for useCursors hook state');
};

// Function to manually trigger presence update
const triggerPresence = () => {
  console.log('\n=== MANUAL PRESENCE TRIGGER ===');
  console.log('This will attempt to set user online manually');
  console.log('Run: checkPresenceData() first to verify Firebase access');
};

// Auto-run initial check
checkPresenceData();

console.log('\n🎯 Available debug functions:');
console.log('- checkPresenceData() - Check current presence state');
console.log('- triggerPresence() - Manually trigger presence update');

// Make functions globally available
window.debugPresence = { checkPresenceData, triggerPresence };
