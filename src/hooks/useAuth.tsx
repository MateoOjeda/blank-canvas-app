import { useState, useEffect, createContext, useContext, ReactNode, useRef } from "react";
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
  signUp: (email: string, password: string, name: string, trainerCode?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  
  // Referencia mutable para rastrear la petición activa y evitar race conditions
  const activeFetchId = useRef<number>(0);

  const fetchUserData = async (userId: string, fetchId: number) => {
    try {
      setLoading(true);
      
      const [roleDoc, profileDoc] = await Promise.all([
        getDoc(doc(db, "user_roles", userId)),
        getDoc(doc(db, "profiles", userId))
      ]);

      // Descartar silenciosamente si hay una nueva petición o el usuario se deslogueó
      if (activeFetchId.current !== fetchId) return;

      const roleData = roleDoc.data();
      const profileData = profileDoc.data();

      setRole((roleData?.role as AppRole) ?? null);
      setDisplayName(profileData?.display_name ?? "");
    } catch (err) {
      if (activeFetchId.current === fetchId) {
        console.error("Error fetching user data:", err);
      }
    } finally {
      if (activeFetchId.current === fetchId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      // Incrementar el ID de petición para invalidar cualquier fetch anterior en vuelo
      const currentFetchId = ++activeFetchId.current;
      
      if (firebaseUser) {
        fetchUserData(firebaseUser.uid, currentFetchId);
      } else {
        setRole(null);
        setDisplayName("");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, trainerCode?: string) => {
    try {
      // Validar código de entrenador si se proporcionó
      let assignedRole: AppRole = "student";
      if (trainerCode && trainerCode.trim()) {
        const validCode = import.meta.env.VITE_TRAINER_CODE;
        if (trainerCode.trim() !== validCode) {
          return { error: new Error("Código de entrenador incorrecto") };
        }
        assignedRole = "trainer";
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      await Promise.all([
        setDoc(doc(db, "user_roles", newUser.uid), { role: assignedRole, user_id: newUser.uid }),
        setDoc(doc(db, "profiles", newUser.uid), { 
          display_name: name, 
          user_id: newUser.uid,
          created_at: new Date().toISOString()
        })
      ]);

      // Al crear los docs, actualizamos el estado e invalidamos el fetch de onAuthStateChanged
      // que pudo haber consultado la DB antes de que los documentos existieran.
      const currentFetchId = ++activeFetchId.current;
      setRole(assignedRole);
      setDisplayName(name);
      setLoading(false);

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

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const roleDoc = await getDoc(doc(db, "user_roles", user.uid));
      if (!roleDoc.exists()) {
        await Promise.all([
          setDoc(doc(db, "user_roles", user.uid), { role: "student", user_id: user.uid }),
          setDoc(doc(db, "profiles", user.uid), { 
            display_name: user.displayName || "Usuario", 
            user_id: user.uid,
            avatar_url: user.photoURL,
            created_at: new Date().toISOString()
          })
        ]);
        
        // Similar a signUp, invalidamos el fetch en vuelo y actualizamos el estado
        const currentFetchId = ++activeFetchId.current;
        setRole("student");
        setDisplayName(user.displayName || "Usuario");
        setLoading(false);
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    // Al hacer signOut manual, incrementamos el contador para abortar peticiones en vuelo
    ++activeFetchId.current;
    await firebaseSignOut(auth);
    setUser(null);
    setRole(null);
    setDisplayName("");
    setLoading(false);
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

