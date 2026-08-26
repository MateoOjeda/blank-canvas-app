import { useAuth } from "@/hooks/useAuth";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Users, Dumbbell, ClipboardList, BarChart3, 
  FileText, Home, Utensils, Zap
} from "lucide-react";

const trainerItems = [
  { title: "Alumnos", url: "/trainer/students", icon: Users },
  { title: "Planes", url: "/trainer/plans", icon: ClipboardList },
  { title: "Seguimiento", url: "/trainer/tracking", icon: BarChart3 },
  { title: "Grupos", url: "/trainer/groups", icon: Users },
  { title: "Encuestas", url: "/trainer/surveys", icon: FileText }
];

const studentItems = [
  { title: "Inicio", url: "/student/home", icon: Home },
  { title: "Rutina", url: "/student/routines", icon: Dumbbell },
  { title: "Comidas", url: "/student/meals", icon: Utensils },
  { title: "Progreso", url: "/student/progress", icon: Zap },
  { title: "Planes", url: "/student/plans", icon: FileText }
];

export function MobileNav() {
  const { role, user } = useAuth();
  const location = useLocation();
  
  if (!user) return null;
  
  const isTrainer = role === "trainer";
  const items = isTrainer ? trainerItems : studentItems;

  return (
    <nav className="md:hidden fixed bottom-2 left-4 right-4 z-50 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl h-[64px] px-3 flex items-center justify-between shadow-lg shadow-black/10">
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
              "flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-xl transition-all duration-200",
              isActive 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon 
              className="h-5 w-5 transition-all duration-200" 
              strokeWidth={isActive ? 2.2 : 1.8}
            />
            <span className={cn(
              "text-[10px] font-semibold uppercase tracking-wider truncate transition-all duration-200",
              isActive ? "text-primary" : ""
            )}>
              {item.title}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
