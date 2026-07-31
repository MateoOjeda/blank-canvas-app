import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  ArrowLeftRight, Camera, ChevronDown, Edit2, ImageIcon,
  Loader2, Plus, Trash2
} from "lucide-react";
import { PhotoSession, PhotoSessionPhotos, addPhotoSession, updatePhotoSession, deletePhotoSession } from "@/services/photoSessions";
import { Assessment } from "@/services/tracking";
import { usePhotoSessions } from "@/hooks/usePhotoSessions";
import PhotoSessionDialog from "./PhotoSessionDialog";
import PhotoCompareModal from "./PhotoCompareModal";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SnapshotKey = "weight" | "body_fat" | "muscle_mass" | "arm" | "chest" | "waist" | "hips" | "thigh" | "calf";

interface Props {
  studentId: string;
  latestAssessment?: Assessment | null;
}

const POSITION_LABELS = { front: "Frente", back: "Espalda", left: "Lateral izq.", right: "Lateral der." };
const SNAPSHOT_DISPLAY: { key: SnapshotKey; label: string; unit: string }[] = [
  { key: "weight",      label: "Peso",   unit: "kg" },
  { key: "body_fat",    label: "Grasa",  unit: "%" },
  { key: "muscle_mass", label: "Músculo",unit: "kg" },
  { key: "waist",       label: "Cintura",unit: "cm" },
];

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  allSessions,
  onEdit,
  onDelete,
  onCompare,
}: {
  session: PhotoSession;
  allSessions: PhotoSession[];
  onEdit: () => void;
  onDelete: () => void;
  onCompare: (idA: string | null, idB: string | null) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const photoPositions = (["front", "back", "left", "right"] as const).filter(
    (p) => session.photos[p]
  );

  return (
    <>
      <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm overflow-hidden">
        {/* Thumbnail strip */}
        {photoPositions.length > 0 && (
          <div className="flex gap-0.5 h-28 overflow-hidden bg-muted/20">
            {photoPositions.map((pos) => (
              <div key={pos} className="flex-1 relative overflow-hidden">
                <img
                  src={session.photos[pos]}
                  alt={POSITION_LABELS[pos]}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 text-center py-0.5 bg-black/50">
                  <span className="text-[7px] font-bold text-white/80">{POSITION_LABELS[pos]}</span>
                </div>
              </div>
            ))}
            {photoPositions.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
          </div>
        )}

        <CardContent className="p-3 space-y-2.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold">
                {format(parseISO(session.session_date), "d 'de' MMMM yyyy", { locale: es })}
              </p>
              {session.notes && (
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{session.notes}</p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={onEdit}>
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Snapshot metrics */}
          {session.snapshot && (
            <div className="flex flex-wrap gap-1.5">
              {SNAPSHOT_DISPLAY.filter(({ key }) => session.snapshot?.[key] != null).map(({ key, label, unit }) => (
                <Badge key={key} variant="outline" className="text-[9px]">
                  {label}: {session.snapshot![key]}{unit}
                </Badge>
              ))}
            </div>
          )}

          {/* Quick compare buttons */}
          {allSessions.length > 1 && (
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/20">
              <span className="text-[9px] text-muted-foreground self-center shrink-0">Comparar vs:</span>
              {allSessions.filter((s) => s.id !== session.id).slice(0, 3).map((other) => (
                <button
                  key={other.id}
                  onClick={() => onCompare(other.id, session.id)}
                  className="px-2 py-0.5 rounded-md text-[9px] font-bold border border-border/30 bg-muted/20 text-muted-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
                >
                  {format(parseISO(other.session_date), "d MMM", { locale: es })}
                </button>
              ))}
              <button
                onClick={() => onCompare(null, session.id)}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-bold border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-all"
              >
                <ArrowLeftRight className="h-2.5 w-2.5" /> Comparar…
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirm */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la sesión del{" "}
              {format(parseISO(session.session_date), "d 'de' MMMM yyyy", { locale: es })}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PhotoSessionsPanel({ studentId, latestAssessment }: Props) {
  const { user } = useAuth();
  const {
    sessions, loading, loadingMore, hasMore, loadMore,
    addSession, editSession, removeSession,
  } = usePhotoSessions(studentId);

  const [showDialog, setShowDialog] = useState(false);
  const [editingSession, setEditingSession] = useState<PhotoSession | null>(null);
  const [compareIds, setCompareIds] = useState<{ a: string | null; b: string | null } | null>(null);

  const handleSave = async (
    date: string,
    notes: string,
    photos: PhotoSessionPhotos,
    snapshot: Record<SnapshotKey, number | null>
  ) => {
    if (!user) return;

    // Filter snapshot nulls for storage
    const cleanSnapshot = Object.fromEntries(
      Object.entries(snapshot).filter(([, v]) => v !== null)
    );

    if (editingSession) {
      await editSession(editingSession.id, {
        session_date: date,
        notes: notes || undefined,
        photos,
        ...(Object.keys(cleanSnapshot).length > 0 ? { snapshot: cleanSnapshot as any } : {}),
      });
      toast.success("Sesión actualizada");
    } else {
      await addSession({
        trainer_id: user.uid,
        student_id: studentId,
        created_at: new Date().toISOString(),
        session_date: date,
        notes: notes || undefined,
        photos,
        ...(Object.keys(cleanSnapshot).length > 0 ? { snapshot: cleanSnapshot as any } : {}),
      });
      toast.success("Sesión de fotos creada");
    }
    setEditingSession(null);
    setShowDialog(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await removeSession(id);
      toast.success("Sesión eliminada");
    } catch {
      toast.error("Error al eliminar la sesión");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            Sesiones de Fotos
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {sessions.length} sesión{sessions.length !== 1 ? "es" : ""} registrada{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {sessions.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[10px] gap-1.5 font-bold"
              onClick={() => setCompareIds({ a: sessions[1]?.id ?? null, b: sessions[0]?.id ?? null })}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Comparar
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 text-[10px] gap-1.5 font-bold"
            onClick={() => { setEditingSession(null); setShowDialog(true); }}
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva sesión
          </Button>
        </div>
      </div>

      {/* Sessions grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          type="empty"
          title="Sin sesiones de fotos"
          description='Crea la primera sesión con el botón "Nueva sesión".'
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                allSessions={sessions}
                onEdit={() => { setEditingSession(session); setShowDialog(true); }}
                onDelete={() => handleDelete(session.id)}
                onCompare={(a, b) => setCompareIds({ a, b })}
              />
            ))}
          </div>

          {hasMore && (
            <Button
              variant="outline"
              className="w-full h-9 text-xs font-bold rounded-xl"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
              Cargar más sesiones
            </Button>
          )}
        </>
      )}

      {/* Create / Edit dialog */}
      {showDialog && (
        <PhotoSessionDialog
          open={showDialog}
          onClose={() => { setShowDialog(false); setEditingSession(null); }}
          studentId={studentId}
          trainerId={user?.uid ?? ""}
          latestAssessment={latestAssessment}
          existingSession={editingSession}
          onSave={handleSave}
        />
      )}

      {/* Compare modal */}
      {compareIds && sessions.length >= 2 && (
        <PhotoCompareModal
          open={!!compareIds}
          onClose={() => setCompareIds(null)}
          sessions={sessions}
          initialA={compareIds.a}
          initialB={compareIds.b}
        />
      )}
    </div>
  );
}
