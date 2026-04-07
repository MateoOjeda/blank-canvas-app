import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  addDoc,
  writeBatch
} from "firebase/firestore";

export interface StudentProfile {
  user_id: string;
  display_name: string;
  avatar_initials: string | null;
  avatar_url: string | null;
  weight: number | null;
  age: number | null;
}

export interface LinkedStudent extends StudentProfile {
  linked_at: string;
  planEntrenamiento: string;
  planAlimentacion: string;
  linkId: string;
  paymentStatus: string;
  groupName?: string | null;
}

export interface AvailableStudent {
  user_id: string;
  display_name: string;
  avatar_initials: string | null;
  avatar_url: string | null;
}

export async function fetchLinkedStudents(trainerId: string): Promise<LinkedStudent[]> {
  const linksQuery = query(collection(db, "trainer_students"), where("trainer_id", "==", trainerId));
  const linksSnap = await getDocs(linksQuery);
  const links = linksSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  if (links.length === 0) return [];

  const studentIds = links.map((l) => l.student_id);
  const profiles: any[] = [];
  
  // Firestore allows up to 30 values in an 'in' query
  // For larger sets, we'd need to batch, but for a trainer's student list, this is usually enough.
  for (let i = 0; i < studentIds.length; i += 30) {
    const chunk = studentIds.slice(i, i + 30);
    const q = query(collection(db, "profiles"), where("user_id", "in", chunk));
    const snap = await getDocs(q);
    profiles.push(...snap.docs.map(d => d.data()));
  }

  // Fetch group memberships efficiently
  const groupMembers: any[] = [];
  for (let i = 0; i < studentIds.length; i += 30) {
    const chunk = studentIds.slice(i, i + 30);
    const q = query(collection(db, "training_group_members"), where("student_id", "in", chunk));
    const snap = await getDocs(q);
    groupMembers.push(...snap.docs.map(d => d.data()));
  }

  // Group names mapping (cached or fetched once)
  const groupsSnap = await getDocs(collection(db, "training_groups"));
  const groups = groupsSnap.docs.reduce((acc, d) => {
    acc[d.id] = d.data().name;
    return acc;
  }, {} as Record<string, string>);

  return profiles.map((p: any) => {
    const link = links.find((l) => l.student_id === p.user_id);
    const membership = groupMembers.find((gm) => gm.student_id === p.user_id);
    const groupName = membership ? groups[membership.group_id] : null;

    return {
      ...p,
      linked_at: link?.created_at || "",
      planEntrenamiento: link?.plan_entrenamiento || "none",
      planAlimentacion: link?.plan_alimentacion || "none",
      linkId: link?.id || "",
      paymentStatus: link?.payment_status || "pendiente",
      groupName: groupName || null,
    };
  });
}

export async function fetchAvailableStudents(trainerId: string): Promise<AvailableStudent[]> {
  const linksQuery = query(collection(db, "trainer_students"), where("trainer_id", "==", trainerId));
  const linksSnap = await getDocs(linksQuery);
  const linkedIds = linksSnap.docs.map(d => d.data().student_id);
  
  const excludeIds = [...linkedIds, trainerId];

  const rolesSnap = await getDocs(query(collection(db, "user_roles"), where("role", "==", "student")));
  const studentUserIds = rolesSnap.docs
    .map(d => d.data().user_id)
    .filter(id => !excludeIds.includes(id));

  if (studentUserIds.length === 0) return [];

  // Fetch profiles in chunks of 30 to avoid Firestore limits
  const profiles: AvailableStudent[] = [];
  for (let i = 0; i < studentUserIds.length; i += 30) {
    const chunk = studentUserIds.slice(i, i + 30);
    const q = query(collection(db, "profiles"), where("user_id", "in", chunk));
    const snap = await getDocs(q);
    profiles.push(...snap.docs.map(d => d.data() as AvailableStudent));
  }

  return profiles;
}

export async function linkStudent(trainerId: string, studentId: string) {
  await addDoc(collection(db, "trainer_students"), {
    trainer_id: trainerId,
    student_id: studentId,
    created_at: new Date().toISOString(),
    payment_status: "pendiente",
    plan_entrenamiento: "none",
    plan_alimentacion: "none"
  });
}

export async function unlinkStudent(trainerId: string, studentId: string) {
  const batch = writeBatch(db);

  // 1. Unlink from trainer
  const qLink = query(
    collection(db, "trainer_students"), 
    where("trainer_id", "==", trainerId), 
    where("student_id", "==", studentId)
  );
  const snapLink = await getDocs(qLink);
  snapLink.docs.forEach(doc => batch.delete(doc.ref));

  // 2. Remove group memberships tied to this trainer
  // Since training_group_members doesn't have trainer_id directly, we assume unlinking
  // removes ALL group memberships for this student (in this app architecture, 1 trainer per student).
  const qMem = query(collection(db, "training_group_members"), where("student_id", "==", studentId));
  const snapMem = await getDocs(qMem);
  snapMem.docs.forEach(d => batch.delete(d.ref));

  // 3. Mark routines as archived instead of deleting them entirely?
  // Since unlinking means they leave the trainer, we should archive active routines.
  const qRout = query(
    collection(db, "routines"), 
    where("trainer_id", "==", trainerId), 
    where("target_type", "==", "ALUMNO"),
    where("target_id", "==", studentId),
    where("status", "==", "ACTIVA")
  );
  const snapRout = await getDocs(qRout);
  snapRout.docs.forEach(d => batch.update(d.ref, { status: "ARCHIVADA" }));

  await batch.commit();
}

export async function deleteStudentPermanently(trainerId: string, studentId: string) {
  // To avoid exceeding the 500 write limit in a single batch, we might execute multiple batches.
  // But for standard student data, one batch is usually enough. Let's use an array of promises for chunked batching.
  const deleteQueue: any[] = [];
  
  // 1. Collections directly tied to student_id
  const collections = [
    "exercise_logs", 
    "exercises", 
    "plan_levels", 
    "trainer_changes", 
    "routine_day_config",
    "trainer_students",
    "student_meals",
    "training_group_members",
    "routines"
  ];

  for (const coll of collections) {
    // If collection naturally has trainer_id, filter by it. Otherwise just student_id.
    let q;
    if (["exercise_logs", "exercises", "plan_levels", "trainer_changes", "routine_day_config", "trainer_students", "routines"].includes(coll)) {
       q = query(collection(db, coll), where("student_id", "==", studentId), where("trainer_id", "==", trainerId));
    } else {
       q = query(collection(db, coll), where("student_id", "==", studentId));
    }
    const snap = await getDocs(q);
    snap.docs.forEach(d => deleteQueue.push(d.ref));
  }

  // 2. Survey Assignments and Answers
  const qAssignments = query(collection(db, "survey_assignments"), where("student_id", "==", studentId));
  const snapAssignments = await getDocs(qAssignments);
  
  if (!snapAssignments.empty) {
    snapAssignments.docs.forEach(d => deleteQueue.push(d.ref));
    
    // Get answers for these assignments
    const assignmentIds = snapAssignments.docs.map(d => d.id);
    for (let i = 0; i < assignmentIds.length; i += 30) {
      const chunk = assignmentIds.slice(i, i + 30);
      const qAnswers = query(collection(db, "survey_answers"), where("assignment_id", "in", chunk));
      const snapAnswers = await getDocs(qAnswers);
      snapAnswers.docs.forEach(d => deleteQueue.push(d.ref));
    }
  }

  // 3. User Role & Profile
  deleteQueue.push(doc(db, "profiles", studentId));
  
  const qRole = query(collection(db, "user_roles"), where("user_id", "==", studentId));
  const snapRole = await getDocs(qRole);
  snapRole.docs.forEach(d => deleteQueue.push(d.ref));

  // Commit deletes in batches of 500
  for (let i = 0; i < deleteQueue.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = deleteQueue.slice(i, i + 500);
    chunk.forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}


export async function updatePaymentStatus(linkId: string, status: "pagado" | "pendiente") {
  await updateDoc(doc(db, "trainer_students", linkId), { payment_status: status });
}

export async function updatePlanLevel(
  linkId: string,
  field: "plan_entrenamiento" | "plan_alimentacion",
  value: string
) {
  await updateDoc(doc(db, "trainer_students", linkId), { [field]: value });
}

export async function fetchStudentProfile(studentId: string): Promise<StudentProfile | null> {
  const snap = await getDoc(doc(db, "profiles", studentId));
  if (!snap.exists()) return null;
  return snap.data() as StudentProfile;
}

export async function createStudentProfile(trainerId: string, data: { name: string; weight?: number; age?: number }) {
  // Generate a random ID for a "shadow" user if they haven't registered yet
  const studentId = `student_${Math.random().toString(36).substr(2, 9)}`;
  
  const batch = writeBatch(db);
  
  // 1. Profile
  const profileRef = doc(db, "profiles", studentId);
  batch.set(profileRef, {
    user_id: studentId,
    display_name: data.name,
    weight: data.weight || null,
    age: data.age || null,
    avatar_url: null,
    created_at: new Date().toISOString()
  });
  
  // 2. Role
  const roleRef = doc(collection(db, "user_roles"));
  batch.set(roleRef, {
    user_id: studentId,
    role: "student",
    created_at: new Date().toISOString()
  });
  
  // 3. Link to trainer
  const linkRef = doc(collection(db, "trainer_students"));
  batch.set(linkRef, {
    trainer_id: trainerId,
    student_id: studentId,
    created_at: new Date().toISOString(),
    payment_status: "pendiente",
    plan_entrenamiento: "none",
    plan_alimentacion: "none"
  });
  
  await batch.commit();
  return studentId;
}

