import { useState, useEffect } from "react";
import { Users, Dumbbell, ClipboardList, BarChart3, CalendarCheck, Trophy, User, Zap, LogOut, Bell, Sparkles, Camera } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload";
import TrainerSettingsDialog from "@/components/TrainerSettingsDialog";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from
"@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const trainerItems = [
{ title: "Alumnos", url: "/trainer/students", icon: Users },
{ title: "Rutinas", url: "/trainer/routines", icon: Dumbbell },
{ title: "Planes", url: "/trainer/plans", icon: ClipboardList },
{ title: "Seguimiento", url: "/trainer/tracking", icon: BarChart3 }];


const studentItems = [
{ title: "Novedades", url: "/student/feed", icon: Bell },
{ title: "Mi Rutina Hoy", url: "/student/today", icon: CalendarCheck },
{ title: "Mis Planes", url: "/student/plans", icon: Trophy },
{ title: "Mi Progreso", url: "/student/progress", icon: Zap },
{ title: "Cambio Personal", url: "/student/personal-change", icon: Sparkles },
{ title: "Mi Transformación", url: "/student/transformation", icon: Camera }];


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, role, displayName, signOut } = useAuth();
  const isTrainer = role === "trainer";
  const items = isTrainer ? trainerItems : studentItems;
  const roleLabel = isTrainer ? "Entrenador" : "Alumno";

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : "??";

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url").eq("user_id", user.id).single().then(({ data }) => {
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    });
  }, [user]);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed &&
          <div>
              <h2 className="font-display text-sm font-bold tracking-wider neon-text">CipriFitness</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{roleLabel}</p>
            </div>
          }
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-[10px] uppercase tracking-widest">
            {!collapsed && "Navegación"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) =>
              <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-secondary/80 transition-colors" activeClassName="bg-primary/10 text-primary neon-border">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        {!collapsed &&
        <div className="flex items-center gap-3">
            <ProfilePhotoUpload
            avatarUrl={avatarUrl}
            initials={initials}
            onUploaded={(url) => setAvatarUrl(url)}
            size="sm" />
          
            <div className="text-xs text-muted-foreground truncate flex-1">
              {displayName}
            </div>
            {isTrainer && <TrainerSettingsDialog />}
          </div>
        }
        <Button variant="ghost" size={collapsed ? "icon" : "sm"} className="w-full text-muted-foreground hover:text-destructive" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Cerrar Sesión</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>);

}