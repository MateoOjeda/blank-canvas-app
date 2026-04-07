import { useState, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  avatarUrl: string | null;
  initials: string;
  onUploaded: (url: string) => void;
  size?: "sm" | "lg";
}

export default function ProfilePhotoUpload({ avatarUrl, initials, onUploaded, size = "lg" }: Props) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClass = size === "lg" ? "h-20 w-20" : "h-12 w-12";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe ser menor a 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `profiles/${user.uid}/avatar.${ext}`;
      const storageRef = ref(storage, path);

      const uploadRes = await uploadBytes(storageRef, file);
      const publicUrl = await getDownloadURL(uploadRes.ref);
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      await updateDoc(doc(db, "profiles", user.uid), { 
        avatar_url: urlWithCacheBust,
        updated_at: new Date().toISOString()
      });

      toast.success("Foto actualizada");
      onUploaded(urlWithCacheBust);
    } catch (err) {
      console.error("Error uploading avatar:", err);
      toast.error("Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <Avatar className={`${sizeClass} border-2 border-primary/30`}>
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <Button
        size="icon"
        variant="secondary"
        className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full border border-border"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
