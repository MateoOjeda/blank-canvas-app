import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { auth, db, googleProvider } from "@/lib/firebase";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  signInWithPopup,
  sendPasswordResetEmail,
  User 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

type AppRole = "trainer" | "student";

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  displayName: string;
  signUp: (email: string, password: string, name: string, role: AppRole) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (role?: AppRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch role
      const roleDoc = await getDoc(doc(db, "user_roles", userId));
      const roleData = roleDoc.data();
      setRole((roleData?.role as AppRole) ?? null);

      // Fetch profile
      const profileDoc = await getDoc(doc(db, "profiles", userId));
      const profileData = profileDoc.data();
      setDisplayName(profileData?.display_name ?? "");
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        fetchUserData(firebaseUser.uid);
      } else {
        setRole(null);
        setDisplayName("");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, role: AppRole) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Create role and profile in Firestore
      await Promise.all([
        setDoc(doc(db, "user_roles", newUser.uid), { role, user_id: newUser.uid }),
        setDoc(doc(db, "profiles", newUser.uid), { 
          display_name: name, 
          user_id: newUser.uid,
          created_at: new Date().toISOString()
        })
      ]);

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signInWithGoogle = async (preferredRole: AppRole = "student") => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user already has a role
      const roleDoc = await getDoc(doc(db, "user_roles", user.uid));
      if (!roleDoc.exists()) {
        // New user from Google, assign preferred role
        await Promise.all([
          setDoc(doc(db, "user_roles", user.uid), { role: preferredRole, user_id: user.uid }),
          setDoc(doc(db, "profiles", user.uid), { 
            display_name: user.displayName || "Usuario", 
            user_id: user.uid,
            avatar_url: user.photoURL,
            created_at: new Date().toISOString()
          })
        ]);
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setRole(null);
    setDisplayName("");
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, displayName, signUp, signIn, signInWithGoogle, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

