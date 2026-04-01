import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { Outlet, useNavigate } from "react-router-dom";
import { AppContext } from "@/lib/context";
import { useAppState } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import UserSettingsDialog from "@/components/UserSettingsDialog";
import { useAppTheme } from "@/hooks/useAppTheme";

export function AppLayout() {
  const { role } = useAuth();
  const appState = useAppState();
  const navigate = useNavigate();
  useAppTheme();
  
  const isTrainer = role === "trainer";

  return (
    <AppContext.Provider value={appState}>
      <SidebarProvider>
        <div className="h-screen flex w-full pb-[72px] md:pb-0 overflow-hidden relative">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
              {isTrainer ? (
                <>
                  <Button variant="ghost" size="icon" onClick={() => navigate("/trainer/notifications")} className="md:hidden text-muted-foreground hover:text-primary">
                    <Bell className="h-5 w-5" />
                  </Button>
                  <div className="flex-1" />
                  <div className="md:hidden">
                    <UserSettingsDialog />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1" />
                  <div className="md:hidden">
                    <UserSettingsDialog />
                  </div>
                </>
              )}
            </header>
            <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden hide-scrollbar">
              <Outlet />
            </main>
          </div>
          <MobileNav />
        </div>
      </SidebarProvider>
    </AppContext.Provider>
  );
}
