import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import {
  ensureUserProfile,
  subscribeUserProfile,
  updateUserProfile,
} from "../services/firestoreService";
import type { UserProfile } from "../types/sheguard";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  isVerified: boolean;
  authError: string | null;
  clearAuthError: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (params: {
    fullName: string;
    phoneNumber: string;
    email: string;
    password: string;
  }) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  switch (code) {
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was closed before completing sign-in.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Please allow popups for this site and try again.";
    case "auth/operation-not-allowed":
      return "Email/Password sign-in is not yet enabled in your Firebase project. Please use Google Sign-In, or enable Email/Password under Firebase Console > Authentication > Sign-in method.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password. Please check your credentials and try again.";
    case "auth/weak-password":
      return "Please choose a stronger password (at least 6 characters).";
    case "auth/network-request-failed":
      return "Network error while contacting Firebase Authentication. Check your internet connection.";
    default:
      return err instanceof Error ? err.message : "Authentication failed. Please try again.";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      return;
    }

    let unsubProfile: (() => void) | undefined;
    let active = true;

    ensureUserProfile(user)
      .then(() => {
        if (!active) return;
        unsubProfile = subscribeUserProfile(
          user.uid,
          (data) => {
            if (active) setProfile(data);
          },
          (err) => {
            console.error("Profile subscription error:", err);
          }
        );
      })
      .catch((err) => {
        console.error("Error ensuring user profile:", err);
      });

    return () => {
      active = false;
      if (unsubProfile) unsubProfile();
    };
  }, [authReady, user, user?.emailVerified]);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      throw err;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      throw err;
    }
  };

  const registerWithEmail = async (params: {
    fullName: string;
    phoneNumber: string;
    email: string;
    password: string;
  }) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        params.email.trim(),
        params.password
      );
      await updateProfile(cred.user, {
        displayName: params.fullName.trim(),
      });
      await sendEmailVerification(cred.user);
      // Persist pending profile values in sessionStorage so once verified we save phoneNumber immediately
      sessionStorage.setItem(
        `sheguard_pending_profile_${cred.user.uid}`,
        JSON.stringify({
          fullName: params.fullName.trim(),
          phoneNumber: params.phoneNumber.trim(),
          email: params.email.trim(),
        })
      );
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      throw err;
    }
  };

  const resendVerificationEmail = async () => {
    setAuthError(null);
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      throw err;
    }
  };

  const refreshVerificationStatus = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    const updatedUser = auth.currentUser;
    setUser({ ...updatedUser } as User);

    if (updatedUser.emailVerified) {
      await ensureUserProfile(updatedUser);
      const pendingRaw = sessionStorage.getItem(`sheguard_pending_profile_${updatedUser.uid}`);
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          await updateUserProfile(updatedUser.uid, {
            fullName: pending.fullName || updatedUser.displayName || "SHE-GUARD User",
            phoneNumber: pending.phoneNumber || "",
            email: pending.email || updatedUser.email || "",
          });
          sessionStorage.removeItem(`sheguard_pending_profile_${updatedUser.uid}`);
        } catch {
          // Ignore parse errors
        }
      }
      return true;
    }
    return false;
  };

  const logout = async () => {
    setAuthError(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authReady,
        isVerified: Boolean(user?.emailVerified),
        authError,
        clearAuthError: () => setAuthError(null),
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resendVerificationEmail,
        refreshVerificationStatus,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
