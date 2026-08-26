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
  addDoc
} from "firebase/firestore";
import { chunkArray, ChunkedBatch } from "@/lib/chunking";

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
  planCambioFisico: string;
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

  // Divide array of IDs into chunks of 30 for 'in' operator
  const chunks = chunkArray(studentIds, 30);

  // Fetch profiles, group memberships and the trainer's groups in parallel
  const profilesPromises = chunks.map(chunk => 
    getDocs(query(collection(db, "profiles"), where("user_id", "in", chunk)))
  );
  
  const membershipsPromises = chunks.map(chunk => 
    getDocs(query(collection(db, "training_group_members"), where("student_id", "in", chunk)))
  );

  const groupsQuery = query(collection(db, "training_groups"), where("trainer_id", "==", trainerId));

  const [profilesSnaps, membershipsSnaps, groupsSnap] = await Promise.all([
    Promise.all(profilesPromises),
    Promise.all(membershipsPromises),
    getDocs(groupsQuery)
  ]);

  const profiles = profilesSnaps.flatMap(snap => snap.docs.map(d => d.data()));
  const groupMembers = membershipsSnaps.flatMap(snap => snap.docs.map(d => d.data()));

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
      planCambioFisico: link?.plan_cambio_fisico || "none",
      linkId: link?.id || "",
      paymentStatus: link?.payment_status || "pendiente",
      groupName: groupName || null,
    };
  });
}

export async function fetchAvailableStudents(trainerId: string): Promise<AvailableStudent[]> {
  const linksQuery = query(collection(db, "trainer_students"), where("trainer_id", "==", trainerId));
  const rolesQuery = query(collection(db, "user_roles"), where("role", "==", "student"));
  
  // Parallelize initial queries
  const [linksSnap, rolesSnap] = await Promise.all([
    getDocs(linksQuery),
    getDocs(rolesQuery)
  ]);

  const linkedIds = linksSnap.docs.map(d => d.data().student_id);
  const excludeIds = [...linkedIds, trainerId];

  const studentUserIds = rolesSnap.docs
    .map(d => d.data().user_id)
    .filter(id => !excludeIds.includes(id));

  if (studentUserIds.length === 0) return [];

  // Fetch profiles in parallel chunks of 30
  const chunks = chunkArray(studentUserIds, 30);

  const profilePromises = chunks.map(chunk => 
    getDocs(query(collection(db, "profiles"), where("user_id", "in", chunk)))
  );
  
  const profilesSnaps = await Promise.all(profilePromises);
  const profiles = profilesSnaps.flatMap(snap => snap.docs.map(d => d.data() as AvailableStudent));

  return profiles;
}

export async function linkStudent(trainerId: string, studentId: string) {
  const linkId = `${trainerId}_${studentId}`;
  await setDoc(doc(db, "trainer_students", linkId), {
    trainer_id: trainerId,
    student_id: studentId,
    created_at: new Date().toISOString(),
    payment_status: "pendiente",
    plan_entrenamiento: "none",
    plan_alimentacion: "none",
    plan_cambio_fisico: "none"
  }, { merge: true });
}

export async function unlinkStudent(trainerId: string, studentId: string) {
  const batch = new ChunkedBatch(db);

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
  const deleteQueue: any[] = [];
  
  // 1. Collections directly tied to student_id + trainer_id
  const collectionsWithTrainer = [
    "exercise_logs", 
    "exercises", 
    "plan_levels", 
    "trainer_changes", 
    "routine_day_config",
    "trainer_students",
    "routines"
  ];

  // 2. Collections tied to student_id only
  const collectionsStudentOnly = [
    "student_meals",
    "training_group_members",
    "notifications",
    "tracking_assessments",
    "tracking_injuries",
    "tracking_goals",
    "tracking_notes",
    "student_notes",
    "weight_history",
    "tracking_recovery",
    "change_readings",
    "seguimiento_personal",
    "photo_sessions"
  ];

  // 3. Extra queries
  const qRole = query(collection(db, "user_roles"), where("user_id", "==", studentId));
  const qAssignments = query(collection(db, "survey_assignments"), where("student_id", "==", studentId));

  // Query all in parallel to minimize roundtrips
  const trainerPromises = collectionsWithTrainer.map(coll => 
    getDocs(query(collection(db, coll), where("student_id", "==", studentId), where("trainer_id", "==", trainerId)))
  );

  const studentPromises = collectionsStudentOnly.map(coll => 
    getDocs(query(collection(db, coll), where("student_id", "==", studentId)))
  );

  const [
    roleSnap,
    assignmentsSnap,
    ...collectionsSnaps
  ] = await Promise.all([
    getDocs(qRole),
    getDocs(qAssignments),
    ...trainerPromises,
    ...studentPromises
  ]);

  // Collect documents to delete from all collections
  collectionsSnaps.forEach(snap => {
    snap.docs.forEach(d => deleteQueue.push(d.ref));
  });

  // Collect role documents
  roleSnap.docs.forEach(d => deleteQueue.push(d.ref));

  // Collect survey assignments and query their answers in parallel chunks
  if (!assignmentsSnap.empty) {
    assignmentsSnap.docs.forEach(d => deleteQueue.push(d.ref));
    
    const assignmentIds = assignmentsSnap.docs.map(d => d.id);
    const chunks = chunkArray(assignmentIds, 30);
    const answersPromises = chunks.map(chunk => 
      getDocs(query(collection(db, "survey_answers"), where("assignment_id", "in", chunk)))
    );
    
    const answersSnaps = await Promise.all(answersPromises);
    answersSnaps.forEach(snap => {
      snap.docs.forEach(d => deleteQueue.push(d.ref));
    });
  }

  // Profile doc
  deleteQueue.push(doc(db, "profiles", studentId));

  // Commit deletes automatically chunked by ChunkedBatch
  const batch = new ChunkedBatch(db);
  deleteQueue.forEach(ref => batch.delete(ref));
  await batch.commit();
}


export async function updatePaymentStatus(linkId: string, status: "pagado" | "pendiente") {
  await updateDoc(doc(db, "trainer_students", linkId), { payment_status: status });
}

export async function updatePlanLevel(
  linkId: string,
  field: "plan_entrenamiento" | "plan_alimentacion" | "plan_cambio_fisico",
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
  
  const batch = new ChunkedBatch(db);
  
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
  const linkId = `${trainerId}_${studentId}`;
  const linkRef = doc(db, "trainer_students", linkId);
  batch.set(linkRef, {
    trainer_id: trainerId,
    student_id: studentId,
    created_at: new Date().toISOString(),
    payment_status: "pendiente",
    plan_entrenamiento: "none",
    plan_alimentacion: "none",
    plan_cambio_fisico: "none"
  }, { merge: true });
  
  await batch.commit();
  return studentId;
}

