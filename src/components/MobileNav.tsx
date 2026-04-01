import { useAuth } from "@/hooks/useAuth";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Users, Dumbbell, ClipboardList, BarChart3, CalendarCheck, 
  Trophy, Zap, Bell, Sparkles, Camera, FileText, Home 
} from "lucide-react";

const trainerItems = [
  { title: "Inicio", url: "/", icon: Home },
  { title: "Alumnos", url: "/trainer/students", icon: Users },
  { title: "Rutinas", url: "/trainer/routines", icon: Dumbbell },
  { title: "Planes", url: "/trainer/plans", icon: ClipboardList },
  { title: "Seguimiento", url: "/trainer/tracking", icon: BarChart3 },
  { title: "Grupos", url: "/trainer/groups", icon: Users },
  { title: "Encuestas", url: "/trainer/surveys", icon: FileText }
];

const studentItems = [
  { title: "Inicio", url: "/", icon: Home },
  { title: "Novedades", url: "/student/feed", icon: Bell },
  { title: "Rutinas", url: "/student/routines", icon: Dumbbell },
  { title: "Mi Rutina", url: "/student/today", icon: CalendarCheck },
  { title: "Mis Planes", url: "/student/plans", icon: Trophy },
  { title: "Mi Progreso", url: "/student/progress", icon: Zap },
  { title: "Cambio", url: "/student/personal-change", icon: Sparkles },
  { title: "Transf.", url: "/student/transformation", icon: Camera }
];

export function MobileNav() {
  const { role, user } = useAuth();
  const location = useLocation();
  
  if (!user) return null;
  
  const isTrainer = role === "trainer";
  const items = isTrainer ? trainerItems : studentItems;

  return (
    <nav className="md:hidden fixed bottom-1 left-4 right-4 z-50 bg-background/80 backdrop-blur-lg border border-white/10 rounded-3xl p-2 flex flex-row items-center justify-around shadow-2xl shadow-black/50">
      {items.map((item) => {
        const isActive = item.url === "/" 
          ? location.pathname === "/" 
          : location.pathname.startsWith(item.url);
 
        return (
          <NavLink
            key={`${item.title}-${item.url}`}
            to={item.url}
            end={item.url === "/"}
            className={cn(
              "flex flex-col items-center justify-center transition-all duration-500 ease-spring px-2",
              isActive ? "scale-110" : "scale-100 opacity-60"
            )}
          >
            <div className={cn(
              "relative h-12 w-12 rounded-full transition-all duration-500 flex items-center justify-center",
              isActive 
                ? "bg-background border-[2.5px] border-white shadow-[0_0_20px_rgba(255,255,255,0.25)] -translate-y-4" 
                : "bg-transparent border-none"
            )}>
              <item.icon className={cn(
                "h-6 w-6 transition-all duration-500", 
                isActive ? "text-white rotate-[360deg]" : "text-muted-foreground"
              )} />
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              )}
            </div>
            <span className={cn(
              "text-[9px] font-bold transition-all duration-500 uppercase tracking-tighter mt-0.5",
              isActive ? "text-white opacity-100 -translate-y-3" : "text-muted-foreground opacity-0 "
            )}>
              {item.title}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
