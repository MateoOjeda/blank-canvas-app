import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { ArrowLeftRight, ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react";
import { PhotoSession } from "@/services/photoSessions";
import { differenceInDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

type PhotoPosition = "front" | "back" | "left" | "right";

const POSITIONS: { key: PhotoPosition; label: string }[] = [
  { key: "front", label: "Frente" },
  { key: "back",  label: "Espalda" },
  { key: "left",  label: "Lateral izq." },
  { key: "right", label: "Lateral der." },
];

interface Props {
  open: boolean;
  onClose: () => void;
  sessions: PhotoSession[];
  initialA?: string | null;  // session ID for A
  initialB?: string | null;  // session ID for B
}

// ─── CSS slider component ─────────────────────────────────────────────────────

function ImageSlider({ urlA, urlB, labelA, labelB }: {
  urlA: string; urlB: string; labelA: string; labelB: string;
}) {
  const [sliderPct, setSliderPct] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setSliderPct(pct);
  }, []);

  const handleMouseDown = () => { dragging.current = true; };
  const handleMouseMove = (e: React.MouseEvent) => { if (dragging.current) updateSlider(e.clientX); };
  const handleMouseUp = () => { dragging.current = false; };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) updateSlider(e.touches[0].clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[3/4] rounded-xl overflow-hidden cursor-col-resize select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
    >
      {/* Image B (right / "after") — full width */}
      <img src={urlB} alt={labelB} className="absolute inset-0 w-full h-full object-cover" />

      {/* Image A (left / "before") — clipped */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPct}%` }}
      >
        <img src={urlA} alt={labelA} className="absolute inset-0 w-full h-full object-cover" style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : "100%" }} />
      </div>

      {/* Divider line + handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg"
        style={{ left: `${sliderPct}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center border border-white/50">
          <ArrowLeftRight className="h-3.5 w-3.5 text-gray-700" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-2 left-2 right-2 flex justify-between pointer-events-none">
        <span className="text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">{labelA}</span>
        <span className="text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">{labelB}</span>
      </div>
    </div>
  );
}

// ─── Delta badge ──────────────────────────────────────────────────────────────

function Delta({ value, unit, label, lowerIsBetter = false }: {
  value: number | null;
  unit: string;
  label: string;
  lowerIsBetter?: boolean;
}) {
  if (value === null) return null;
  const isPositive = lowerIsBetter ? value <= 0 : value >= 0;
  const color = value === 0 ? "border-border/40 text-muted-foreground"
    : isPositive ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
    : "border-destructive/40 text-destructive";

  return (
    <div className="text-center">
      <Badge variant="outline" className={cn("text-[10px] font-bold", color)}>
        {value > 0 ? "+" : ""}{value.toFixed(1)}{unit}
      </Badge>
      <p className="text-[8px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

// ─── Quick preset buttons ─────────────────────────────────────────────────────

function quickPresets(sessions: PhotoSession[], current: PhotoSession | null): {
  label: string; session: PhotoSession | null
}[] {
  if (!sessions.length || !current) return [];
  const sorted = [...sessions].sort((a, b) => a.session_date.localeCompare(b.session_date));
  const now = new Date();
  const findClosest = (daysAgo: number) => {
    const target = new Date(now);
    target.setDate(target.getDate() - daysAgo);
    return sorted.reduce((best: PhotoSession | null, s) => {
      if (s.id === current.id) return best;
      if (!best) return s;
      const d1 = Math.abs(differenceInDays(parseISO(s.session_date), target));
      const d2 = Math.abs(differenceInDays(parseISO(best.session_date), target));
      return d1 < d2 ? s : best;
    }, null);
  };

  return [
    { label: "Primera", session: sorted[0]?.id !== current.id ? sorted[0] ?? null : null },
    { label: "Última", session: sorted[sorted.length - 1]?.id !== current.id ? sorted[sorted.length - 1] ?? null : null },
    { label: "~30d", session: findClosest(30) },
    { label: "~90d", session: findClosest(90) },
  ].filter((p) => p.session !== null);
}

// ─── Session selector ─────────────────────────────────────────────────────────

function SessionSelect({ value, onChange, sessions, exclude }: {
  value: string | null;
  onChange: (id: string) => void;
  sessions: PhotoSession[];
  exclude: string | null;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 h-8 rounded-lg border border-border/50 bg-secondary/15 text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
    >
      <option value="">Seleccionar sesión…</option>
      {sessions
        .filter((s) => s.id !== exclude)
        .map((s) => (
          <option key={s.id} value={s.id}>
            {format(parseISO(s.session_date), "d MMM yyyy", { locale: es })}
            {s.notes ? ` — ${s.notes.slice(0, 20)}` : ""}
          </option>
        ))}
    </select>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PhotoCompareModal({ open, onClose, sessions, initialA, initialB }: Props) {
  const [idA, setIdA] = useState<string | null>(initialA ?? (sessions[1]?.id ?? null));
  const [idB, setIdB] = useState<string | null>(initialB ?? (sessions[0]?.id ?? null));
  const [activePosition, setActivePosition] = useState<PhotoPosition>("front");

  const sessionA = sessions.find((s) => s.id === idA) ?? null;
  const sessionB = sessions.find((s) => s.id === idB) ?? null;

  const imgA = sessionA?.photos[activePosition];
  const imgB = sessionB?.photos[activePosition];

  // Compute deltas (B - A = progress from A to B)
  const delta = (key: string) => {
    const a = (sessionA?.snapshot as any)?.[key] as number | null | undefined;
    const b = (sessionB?.snapshot as any)?.[key] as number | null | undefined;
    if (a == null || b == null) return null;
    return Number((b - a).toFixed(1));
  };

  const presets = quickPresets(sessions, sessionB);

  const daysBetween = sessionA && sessionB
    ? Math.abs(differenceInDays(parseISO(sessionB.session_date), parseISO(sessionA.session_date)))
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-bold">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Comparar sesiones
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Sesión A (antes)</p>
              <SessionSelect value={idA} onChange={setIdA} sessions={sessions} exclude={idB} />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Sesión B (después)</p>
              <div className="flex gap-1.5 flex-wrap">
                {presets.map(({ label, session }) => session && (
                  <button
                    key={label}
                    onClick={() => setIdB(session.id)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[9px] font-bold border transition-all",
                      idB === session.id
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <SessionSelect value={idB} onChange={setIdB} sessions={sessions} exclude={idA} />
            </div>
          </div>

          {/* Days elapsed */}
          {daysBetween !== null && (
            <p className="text-[10px] text-muted-foreground text-center">
              {daysBetween} días entre sesiones
            </p>
          )}

          {/* Position tabs */}
          <div className="flex gap-1 flex-wrap">
            {POSITIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActivePosition(key)}
                className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-bold border transition-all",
                  activePosition === key
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/40"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Image comparison */}
          {imgA && imgB ? (
            <ImageSlider
              urlA={imgA}
              urlB={imgB}
              labelA={sessionA ? format(parseISO(sessionA.session_date), "d MMM yyyy", { locale: es }) : "A"}
              labelB={sessionB ? format(parseISO(sessionB.session_date), "d MMM yyyy", { locale: es }) : "B"}
            />
          ) : (
            <div className="aspect-[3/4] max-w-xs mx-auto rounded-xl border border-dashed border-border/40 bg-muted/10 flex flex-col items-center justify-center gap-2">
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-[10px] text-muted-foreground text-center px-4">
                {!sessionA || !sessionB
                  ? "Selecciona dos sesiones para comparar"
                  : `Foto de ${POSITIONS.find((p) => p.key === activePosition)?.label} no disponible en una o ambas sesiones`}
              </p>
            </div>
          )}

          {/* Visual Progress Summary */}
          {sessionA && sessionB && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Diferencias (B − A)
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Delta value={delta("weight")} unit="kg" label="Peso" lowerIsBetter />
                <Delta value={delta("body_fat")} unit="%" label="% Grasa" lowerIsBetter />
                <Delta value={delta("muscle_mass")} unit="kg" label="Músculo" />
                <Delta value={delta("waist")} unit="cm" label="Cintura" lowerIsBetter />
                <Delta value={delta("hips")} unit="cm" label="Cadera" lowerIsBetter />
                <Delta value={delta("arm")} unit="cm" label="Brazo" />
                <Delta value={delta("chest")} unit="cm" label="Pecho" />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
