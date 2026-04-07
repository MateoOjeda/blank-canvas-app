import { useAuth } from "@/hooks/useAuth";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Users, Dumbbell, ClipboardList, BarChart3, CalendarCheck, 
  Trophy, Zap, Bell, Sparkles, Camera, FileText, Home, Utensils 
} from "lucide-react";

const trainerItems = [
  { title: "Alumnos", url: "/trainer/students", icon: Users },
  { title: "Rutinas", url: "/trainer/routines", icon: Dumbbell },
  { title: "Planes", url: "/trainer/plans", icon: ClipboardList },
  { title: "Seguimiento", url: "/trainer/tracking", icon: BarChart3 },
  { title: "Grupos", url: "/trainer/groups", icon: Users },
  { title: "Encuestas", url: "/trainer/surveys", icon: FileText }
];

const studentItems = [
  { title: "Inicio", url: "/student/home", icon: Home },
  { title: "Rutina de Hoy", url: "/student/today", icon: CalendarCheck },
  { title: "Rutinas", url: "/student/routines", icon: Dumbbell },
  { title: "Comidas", url: "/student/meals", icon: Utensils },
  { title: "Encuestas", url: "/student/surveys", icon: ClipboardList },
  { title: "Progreso", url: "/student/progress", icon: Zap }
];

export function MobileNav() {
  const { role, user } = useAuth();
  const location = useLocation();
  
  if (!user) return null;
  
  const isTrainer = role === "trainer";
  const items = isTrainer ? trainerItems : studentItems;

  return (
    <nav className="md:hidden fixed bottom-2 left-4 right-4 z-50 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl h-[68px] px-2 flex flex-row items-center justify-between shadow-2xl shadow-black/20">
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
              "flex flex-col items-center justify-center transition-all duration-500 ease-spring flex-1 min-w-0 h-full relative",
              isActive ? "scale-105" : "scale-100 opacity-70 hover:opacity-100"
            )}
          >
            <div className={cn(
              "relative h-10 w-10 rounded-2xl transition-all duration-500 flex items-center justify-center mb-1",
              isActive 
                ? "bg-primary border border-primary/20 shadow-lg shadow-primary/20 -translate-y-2" 
                : "bg-transparent border-none"
            )}>
              <item.icon className={cn(
                "h-5 w-5 transition-all duration-500", 
                isActive ? "text-primary-foreground" : "text-muted-foreground"
              )} />
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary-foreground rounded-full animate-pulse shadow-sm" />
              )}
            </div>
            <span className={cn(
              "text-[8px] font-black transition-all duration-500 uppercase tracking-[0.1em] truncate w-full text-center px-1",
              isActive ? "text-primary opacity-100 -translate-y-1" : "text-muted-foreground opacity-0"
            )}>
              {item.title}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
