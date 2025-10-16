/**
 * Authentication helpers for e2e tests
 */

/**
 * Sign in a test user (bypasses Google OAuth for testing)
 * In a real test, you'd use Firebase Auth emulator with test accounts
 */
export async function signInTestUser(page, userEmail = 'test@example.com', displayName = 'Test User') {
  // Navigate to app
  await page.goto('/');
  
  // Wait for login page to load
  await page.waitForSelector('button:has-text("Sign in with Google")', { timeout: 10000 });
  
  // For now, we'll use the real Google auth
  // TODO: Set up Firebase Auth emulator for true e2e testing
  await page.click('button:has-text("Sign in with Google")');
  
  // Wait for redirect to Google OAuth
  await page.waitForURL('**/accounts.google.com/**', { timeout: 15000 });
  
  // Fill in email (adjust selectors based on Google's current UI)
  await page.fill('input[type="email"]', userEmail);
  await page.click('button:has-text("Next")');
  
  // Note: This requires actual Google credentials
  // For CI/CD, you'd want to use Firebase Auth emulator instead
}

/**
 * Sign in using Firebase Auth emulator (recommended for CI/CD)
 */
export async function signInWithEmulator(page, uid = 'test-user-1', email = 'test@example.com') {
  // Inject Firebase Auth token directly (when using emulator)
  await page.goto('/');
  
  await page.evaluate(async ({ uid, email }) => {
    const { getAuth, signInAnonymously } = await import('firebase/auth');
    const auth = getAuth();
    
    // Sign in anonymously or with custom token in emulator
    await signInAnonymously(auth);
  }, { uid, email });
  
  // Wait for canvas to load
  await page.waitForSelector('canvas', { timeout: 10000 });
}

/**
 * Sign out current user
 */
export async function signOut(page) {
  // Click user profile/menu
  await page.click('[data-testid="user-menu"]');
  
  // Click sign out
  await page.click('button:has-text("Sign Out")');
  
  // Wait for redirect to login
  await page.waitForSelector('button:has-text("Sign in with Google")');
}

/**
 * Check if user is signed in
 */
export async function isSignedIn(page) {
  const canvas = await page.$('canvas');
  const signInButton = await page.$('button:has-text("Sign in with Google")');
  
  return canvas !== null && signInButton === null;
}

