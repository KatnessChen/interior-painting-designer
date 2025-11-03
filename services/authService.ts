import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth } from './firebaseService';
import { createOrUpdateUser } from './userService';

const googleProvider = new GoogleAuthProvider();

// Configure Google provider for additional scopes if needed
googleProvider.addScope('profile');
googleProvider.addScope('email');

/**
 * Sign in user with Google using popup
 */
export const signInWithGoogle = async () => {
  try {
    // Enable persistence so user stays logged in
    await setPersistence(auth, browserLocalPersistence);

    // Use popup for authentication
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Create or update user in Firestore
    await createOrUpdateUser({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    });

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isEmailVerified: user.emailVerified,
      },
      token: await user.getIdToken(),
    };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign in with Google',
    };
  }
};

/**
 * Sign out current user
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Sign-out error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign out',
    };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

/**
 * Listen to authentication state changes
 */
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get current user's ID token
 */
export const getIdToken = async (forceRefresh = false): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.error('Failed to get ID token:', error);
    return null;
  }
};
