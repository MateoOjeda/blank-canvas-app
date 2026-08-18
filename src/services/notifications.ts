import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export type NotificationType = "routine" | "plan" | "survey" | "transformation" | "general";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
}

/**
 * Creates a notification document in Firestore.
 * Called from trainer-facing services when an action affects a student.
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  relatedId,
}: CreateNotificationParams): Promise<void> {
  await addDoc(collection(db, "notifications"), {
    user_id: userId,
    type,
    title,
    message,
    read: false,
    related_id: relatedId || null,
    created_at: new Date().toISOString(),
  });
}
