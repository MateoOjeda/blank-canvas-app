import { useAuth } from "@/hooks/useAuth";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Users, Users2, Dumbbell, ClipboardList, BarChart3, CalendarCheck, 
  Trophy, Zap, Bell, Sparkles, Camera, FileText, Home 
} from "lucide-react";

const trainerItems = [
  { title: "Inicio", url: "/", icon: Home },
  { title: "Alumnos", url: "/trainer/students", icon: Users },
  { title: "Rutinas", url: "/trainer/routines", icon: Dumbbell },
  { title: "Planes", url: "/trainer/plans", icon: ClipboardList },
  { title: "Seguimiento", url: "/trainer/tracking", icon: BarChart3 },
  { title: "Grupos", url: "/trainer/groups", icon: Users2 },
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex flex-row overflow-x-auto overflow-y-hidden hide-scrollbar">
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
              "flex flex-col items-center justify-center flex-1 py-3 px-2 text-muted-foreground hover:bg-secondary/20 transition-all duration-300 ease-in-out",
              isActive ? "min-w-[76px]" : "min-w-[56px]"
            )}
            activeClassName="text-primary neon-text"
          >
            <item.icon className={cn("h-5 w-5 transition-transform duration-300", isActive && "mb-1 scale-110")} />
            {isActive && (
              <span className="text-[10px] font-medium truncate w-full text-center animate-in fade-in slide-in-from-bottom-1 font-display tracking-wider">
                {item.title}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
