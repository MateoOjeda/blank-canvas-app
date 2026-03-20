import { createContext, useContext } from "react";
import { useAppState } from "@/lib/store";

type AppContextType = ReturnType<typeof useAppState>;

export const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
