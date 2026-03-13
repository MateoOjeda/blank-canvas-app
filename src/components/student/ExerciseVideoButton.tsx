import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";

interface Props {
  exerciseName: string;
}

export default function ExerciseVideoButton({ exerciseName }: Props) {
  const searchQuery = encodeURIComponent(`cómo hacer ${exerciseName} ejercicio forma correcta`);
  const url = `https://www.youtube.com/results?search_query=${searchQuery}`;

  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8 text-muted-foreground hover:text-primary"
      onClick={(e) => {
        e.stopPropagation();
        window.open(url, "_blank", "noopener");
      }}
      title={`Ver video guía: ${exerciseName}`}
    >
      <Video className="h-4 w-4" />
    </Button>
  );
}
