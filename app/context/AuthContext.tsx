'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  AuthError,
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, database } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface ExtendedUserData {
  name: string | null;
  email: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  createdAt: string;
  lastLogin: string;
  provider: string;
  providerId: string;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize persistence
  useEffect(() => {
    const initializePersistence = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log("Firebase persistence initialized");
      } catch (error) {
        console.error("Error initializing persistence:", error);
      }
    };
    initializePersistence();
  }, []);

  // Save user data to realtime database
  const saveUserToDatabase = async (user: User, additionalData?: any) => {
    try {
      const userRef = ref(database, `users/${user.uid}`);
      
      // First check if user data exists
      const snapshot = await get(userRef);
      const now = new Date().toISOString();

      // Get existing data to preserve polygons and other fields
      const existingData = snapshot.exists() ? snapshot.val() : {};

      const userData: ExtendedUserData = {
        name: user.displayName || existingData.name || null,
        email: user.email || existingData.email || null,
        photoURL: user.photoURL || existingData.photoURL || null,
        phoneNumber: user.phoneNumber || existingData.phoneNumber || null,
        createdAt: existingData.createdAt || now,
        lastLogin: now,
        provider: user.providerData[0]?.providerId || existingData.provider || 'unknown',
        providerId: user.uid,
      };

      // Preserve existing polygons if any
      if (existingData.polygons) {
        // We don't update the userData with polygons directly to avoid overwriting the entire user data
        // Instead we will set only the specific fields we want to update
        await set(ref(database, `users/${user.uid}/name`), userData.name);
        await set(ref(database, `users/${user.uid}/email`), userData.email);
        await set(ref(database, `users/${user.uid}/photoURL`), userData.photoURL);
        await set(ref(database, `users/${user.uid}/phoneNumber`), userData.phoneNumber);
        await set(ref(database, `users/${user.uid}/createdAt`), userData.createdAt);
        await set(ref(database, `users/${user.uid}/lastLogin`), userData.lastLogin);
        await set(ref(database, `users/${user.uid}/provider`), userData.provider);
        await set(ref(database, `users/${user.uid}/providerId`), userData.providerId);
      } else {
        // If no polygons exist yet, we can safely set the entire user data
        await set(userRef, userData);
      }
      
      // Save additional Google profile data if available and valid
      if (additionalData?.googleProfile) {
        const googleProfile = {
          locale: additionalData.googleProfile.locale || null,
          picture: additionalData.googleProfile.picture || null,
          given_name: additionalData.googleProfile.given_name || null,
          family_name: additionalData.googleProfile.family_name || null,
          verified_email: additionalData.googleProfile.verified_email || false
        };

        // Only save Google profile if we have at least one valid field
        if (Object.values(googleProfile).some(value => value !== null)) {
          const profileRef = ref(database, `users/${user.uid}/googleProfile`);
          await set(profileRef, googleProfile);
        }
      }

    } catch (error) {
      console.error("Error saving user to database:", error);
      throw error; // Re-throw to handle in the calling function
    }
  };

  // Google Sign In
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      
      // Request additional scopes for more user information
      provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential) {
        // Get additional profile information
        const token = credential.accessToken;
        const user = result.user;
        
        // Get additional Google profile data
        if (token) {
          try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const googleProfile = await response.json();
              
              // Save user with additional Google profile data
              await saveUserToDatabase(user, {
                googleProfile: {
                  locale: googleProfile.locale,
                  picture: googleProfile.picture,
                  given_name: googleProfile.given_name,
                  family_name: googleProfile.family_name,
                  verified_email: googleProfile.email_verified,
                }
              });
            }
          } catch (error) {
            console.error("Error fetching Google profile:", error);
          }
        }
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  // Email Sign Up
  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result.user) {
        await updateProfile(result.user, { displayName: name });
        await saveUserToDatabase(result.user);
      }
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  };

  // Email Login
  const loginWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user) {
        await saveUserToDatabase(result.user);
      }
    } catch (error) {
      console.error('Error logging in with email:', error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If user exists, ensure their data is in the database
        await saveUserToDatabase(user);
      }
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    signInWithGoogle,
    signUpWithEmail,
    loginWithEmail,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 