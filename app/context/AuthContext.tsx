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
  const saveUserToDatabase = async (user: User) => {
    try {
      const userRef = ref(database, `users/${user.uid}`);
      
      // First check if user data exists
      const snapshot = await get(userRef);
      if (!snapshot.exists()) {
        // Only save if user data doesn't exist
        await set(userRef, {
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        });
      }
    } catch (error) {
      console.error("Error saving user to database:", error);
    }
  };

  // Google Sign In
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await saveUserToDatabase(result.user);
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  // Email/Password Sign Up
  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result.user) {
        await updateProfile(result.user, {
          displayName: name,
        });
        await saveUserToDatabase(result.user);
      }
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  };

  // Email/Password Login
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