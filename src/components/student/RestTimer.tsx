import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";

const PRESETS = [30, 60, 90, 120];

export default function RestTimer() {
  const [seconds, setSeconds] = useState(60);
  const [remaining, setRemaining] = useState(60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false);
            // Play a beep
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              osc.frequency.value = 880;
              osc.connect(ctx.destination);
              osc.start();
              setTimeout(() => osc.stop(), 200);
            } catch {}
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, remaining]);

  const toggle = () => setRunning((r) => !r);
  const reset = () => {
    setRunning(false);
    setRemaining(seconds);
  };
  const selectPreset = (s: number) => {
    setSeconds(s);
    setRemaining(s);
    setRunning(false);
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = seconds > 0 ? (remaining / seconds) * 100 : 0;

  return (
    <Card className="card-glass neon-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Cronómetro de Descanso</span>
        </div>

        {/* Display */}
        <div className="relative flex items-center justify-center">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
              transform="rotate(-90 60 60)"
              className="transition-all duration-1000"
            />
          </svg>
          <span className="absolute text-2xl font-bold font-display tabular-nums">
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
        </div>

        {/* Presets */}
        <div className="flex gap-2 justify-center">
          {PRESETS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={seconds === p ? "default" : "outline"}
              className="text-xs h-7 px-2"
              onClick={() => selectPreset(p)}
            >
              {p}s
            </Button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          <Button size="sm" variant="outline" onClick={reset} className="gap-1">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={toggle} className="gap-1">
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {running ? "Pausar" : "Iniciar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
