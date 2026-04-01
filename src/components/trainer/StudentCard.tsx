import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StudentCardProps {
  name: string;
  avatarUrl?: string | null;
  avatarInitials?: string | null;
  active?: boolean;
  onClick?: () => void;
  subtitle?: ReactNode;
  rightContent?: ReactNode;
  className?: string;
}

export function StudentCard({
  name,
  avatarUrl,
  avatarInitials,
  active,
  onClick,
  subtitle,
  rightContent,
  className,
}: StudentCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 border group",
        active
          ? "bg-accent/10 border-accent/30 shadow-sm shadow-accent/5"
          : "bg-card/40 border-transparent hover:bg-white/5 hover:border-border/50 shadow-sm",
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      <Avatar className={cn(
        "h-10 w-10 border transition-colors flex-shrink-0 shadow-sm",
        active ? "border-accent/40" : "border-accent/10 group-hover:border-accent/30"
      )}>
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className="bg-accent/5 text-accent font-bold text-xs">
          {avatarInitials || name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-bold truncate leading-none transition-colors",
          active ? "text-accent" : "group-hover:text-primary"
        )}>
          {name}
        </p>
        {subtitle && (
          <div className="mt-1.5 flex flex-wrap gap-1 items-center">
            {subtitle}
          </div>
        )}
      </div>

      {rightContent && (
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {rightContent}
        </div>
      )}
    </div>
  );
}
