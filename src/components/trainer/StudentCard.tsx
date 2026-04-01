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
  size?: "sm" | "md" | "lg";
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
  size = "md",
}: StudentCardProps) {
  const isLarge = size === "lg";
  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "flex items-center transition-all duration-200 border group",
        isSmall ? "p-2 gap-2 rounded-lg" : isLarge ? "p-4 gap-4 rounded-2xl" : "p-3 gap-3 rounded-xl",
        active
          ? "bg-accent/10 border-accent/30 shadow-sm shadow-accent/5"
          : "bg-card/40 border-transparent hover:bg-white/5 hover:border-border/50 shadow-sm",
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      <Avatar className={cn(
        "border transition-colors flex-shrink-0 shadow-sm",
        isSmall ? "h-8 w-8" : isLarge ? "h-14 w-14" : "h-10 w-10",
        active ? "border-accent/40" : "border-accent/10 group-hover:border-accent/30"
      )}>
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className={cn(
          "bg-accent/5 text-accent font-bold",
          isSmall ? "text-[10px]" : isLarge ? "text-sm" : "text-xs"
        )}>
          {avatarInitials || name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-bold truncate leading-none transition-colors",
          isSmall ? "text-xs" : isLarge ? "text-base" : "text-sm",
          active ? "text-accent" : "group-hover:text-primary"
        )}>
          {name}
        </p>
        {subtitle && (
          <div className={cn(
            "flex flex-wrap gap-1 items-center",
            isSmall ? "mt-1" : isLarge ? "mt-2" : "mt-1.5"
          )}>
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
