import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Camera, Loader2, Plus, Upload, X, ImageIcon } from "lucide-react";
import { PhotoSession, PhotoSessionPhotos, uploadSessionPhoto } from "@/services/photoSessions";
import { Assessment } from "@/services/tracking";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PhotoPosition = "front" | "back" | "left" | "right";
type SnapshotKey = "weight" | "body_fat" | "muscle_mass" | "arm" | "chest" | "waist" | "hips" | "thigh" | "calf";

interface PhotoUploadZone {
  position: PhotoPosition;
  label: string;
}

const POSITIONS: PhotoUploadZone[] = [
  { position: "front", label: "Frente" },
  { position: "back",  label: "Espalda" },
  { position: "left",  label: "Lateral izq." },
  { position: "right", label: "Lateral der." },
];

const SNAPSHOT_FIELDS: { key: SnapshotKey; label: string; unit: string }[] = [
  { key: "weight",      label: "Peso",        unit: "kg" },
  { key: "body_fat",    label: "Grasa corp.", unit: "%" },
  { key: "muscle_mass", label: "Masa musc.",  unit: "kg" },
  { key: "waist",       label: "Cintura",     unit: "cm" },
  { key: "hips",        label: "Cadera",      unit: "cm" },
  { key: "arm",         label: "Brazo",       unit: "cm" },
  { key: "chest",       label: "Pecho",       unit: "cm" },
  { key: "thigh",       label: "Muslo",       unit: "cm" },
  { key: "calf",        label: "Pantorrilla", unit: "cm" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: string;
  trainerId: string;
  latestAssessment?: Assessment | null;
  existingSession?: PhotoSession | null; // for edit mode
  onSave: (
    date: string,
    notes: string,
    photos: PhotoSessionPhotos,
    snapshot: Record<SnapshotKey, number | null>
  ) => Promise<void>;
}

export default function PhotoSessionDialog({
  open, onClose, studentId, trainerId,
  latestAssessment, existingSession, onSave
}: Props) {
  const [sessionDate, setSessionDate] = useState(
    existingSession?.session_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState(existingSession?.notes ?? "");
  const [saving, setSaving] = useState(false);

  // Photo state: maps position → { preview URL, File (if new), existingUrl }
  const [photoState, setPhotoState] = useState<Record<PhotoPosition, { preview: string | null; file: File | null; existing: string | null }>>({
    front: { preview: existingSession?.photos.front ?? null, file: null, existing: existingSession?.photos.front ?? null },
    back:  { preview: existingSession?.photos.back  ?? null, file: null, existing: existingSession?.photos.back  ?? null },
    left:  { preview: existingSession?.photos.left  ?? null, file: null, existing: existingSession?.photos.left  ?? null },
    right: { preview: existingSession?.photos.right ?? null, file: null, existing: existingSession?.photos.right ?? null },
  });

  // Snapshot fields (pre-populate from latest assessment if creating new)
  const initSnap = (key: SnapshotKey): string => {
    if (existingSession?.snapshot?.[key] != null) return String(existingSession.snapshot[key]);
    if (latestAssessment?.[key] != null) return String(latestAssessment[key]);
    return "";
  };
  const [snapshot, setSnapshot] = useState<Record<SnapshotKey, string>>(
    Object.fromEntries(SNAPSHOT_FIELDS.map(({ key }) => [key, initSnap(key)])) as Record<SnapshotKey, string>
  );

  const [uploading, setUploading] = useState<Record<PhotoPosition, boolean>>({
    front: false, back: false, left: false, right: false
  });

  const fileInputRefs = useRef<Record<PhotoPosition, HTMLInputElement | null>>({
    front: null, back: null, left: null, right: null
  });

  const handleFileChange = useCallback(
    (position: PhotoPosition, file: File | null) => {
      if (!file) return;
      const preview = URL.createObjectURL(file);
      setPhotoState((prev) => ({
        ...prev,
        [position]: { ...prev[position], preview, file },
      }));
    },
    []
  );

  const handleRemovePhoto = (position: PhotoPosition) => {
    setPhotoState((prev) => ({
      ...prev,
      [position]: { preview: null, file: null, existing: null },
    }));
  };

  const handleSave = async () => {
    if (!sessionDate) {
      toast.error("Selecciona una fecha para la sesión");
      return;
    }
    setSaving(true);
    try {
      // Collect built photos object — we'll generate a temp session ID for uploads
      const tempId = existingSession?.id ?? `temp_${Date.now()}`;
      const finalPhotos: PhotoSessionPhotos = {};

      for (const { position } of POSITIONS) {
        const state = photoState[position];
        if (state.file) {
          // Upload new file
          setUploading((prev) => ({ ...prev, [position]: true }));
          const url = await uploadSessionPhoto(tempId, position, state.file);
          setUploading((prev) => ({ ...prev, [position]: false }));
          finalPhotos[position] = url;
        } else if (state.existing) {
          finalPhotos[position] = state.existing;
        }
      }

      const snapshotRecord = Object.fromEntries(
        SNAPSHOT_FIELDS.map(({ key }) => [key, snapshot[key] ? Number(snapshot[key]) : null])
      ) as Record<SnapshotKey, number | null>;

      await onSave(sessionDate, notes, finalPhotos, snapshotRecord);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar la sesión");
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!existingSession;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-bold">
            <Camera className="h-4 w-4 text-primary" />
            {isEditing ? "Editar sesión de fotos" : "Nueva sesión de fotos"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Date + Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Fecha de la sesión *</Label>
              <Input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="h-9 text-xs border-border/50 bg-secondary/15"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Notas (opcional)</Label>
              <Textarea
                placeholder="Observaciones sobre esta sesión..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-xs border-border/50 bg-secondary/15 resize-none"
              />
            </div>
          </div>

          {/* Photo upload zones */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Fotos de progreso
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {POSITIONS.map(({ position, label }) => {
                const state = photoState[position];
                const isUploading = uploading[position];
                return (
                  <div key={position} className="space-y-1">
                    <p className="text-[9px] text-center font-bold text-muted-foreground uppercase">{label}</p>
                    <div
                      className={cn(
                        "relative aspect-[3/4] rounded-xl border-2 overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all",
                        state.preview
                          ? "border-primary/40 bg-black"
                          : "border-dashed border-border/50 bg-muted/10 hover:bg-muted/20 hover:border-primary/30"
                      )}
                      onClick={() => fileInputRefs.current[position]?.click()}
                    >
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      ) : state.preview ? (
                        <>
                          <img src={state.preview} alt={label} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemovePhoto(position); }}
                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive/80 text-white flex items-center justify-center hover:bg-destructive transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground/60">
                          <ImageIcon className="h-6 w-6" />
                          <span className="text-[9px]">Subir foto</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={(el) => { fileInputRefs.current[position] = el; }}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFileChange(position, e.target.files?.[0] ?? null)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Physical snapshot */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Métricas físicas de la sesión
            </p>
            {latestAssessment && !isEditing && (
              <p className="text-[9px] text-muted-foreground mb-2">
                Valores pre-cargados desde la última evaluación — puedes editarlos.
              </p>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {SNAPSHOT_FIELDS.map(({ key, label, unit }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
                    {label} ({unit})
                  </Label>
                  <Input
                    type="number"
                    placeholder="—"
                    value={snapshot[key]}
                    onChange={(e) => setSnapshot((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="h-8 text-xs border-border/50 bg-secondary/15"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="font-bold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear sesión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
