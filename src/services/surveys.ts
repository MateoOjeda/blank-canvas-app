import { db, auth } from "@/lib/firebase";
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
  orderBy
} from "firebase/firestore";
import { chunkArray, ChunkedBatch } from "@/lib/chunking";
import { createNotification } from "./notifications";

// Simple in-memory cache to minimize Firestore read operations on static definitions
const surveyCache = new Map<string, any>();
const questionsCache = new Map<string, any[]>();

/** Sentinel value stored in survey_questions.options[] to mark a free-text answer slot.
 *  Detected by TakeSurveyDialog to render a Textarea instead of a radio button. */
export const FREE_TEXT_OPTION_SENTINEL = "__free_text__";

async function getDocsInChunks(collectionName: string, field: string, values: any[]) {
  if (values.length === 0) return { docs: [] };
  const uniqueValues = Array.from(new Set(values));
  const chunks = chunkArray(uniqueValues, 30);
  const promises = chunks.map(chunk => 
    getDocs(query(collection(db, collectionName), where(field, "in", chunk)))
  );
  
  const snaps = await Promise.all(promises);
  return {
    docs: snaps.flatMap(snap => snap.docs)
  };
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: "text" | "multiple_choice";
  options: string[] | null;
  order_index: number;
}

export interface CustomSurvey {
  id: string;
  trainer_id: string;
  title: string;
  description: string | null;
  created_at: string;
  is_global?: boolean;
  questions?: SurveyQuestion[];
}

export interface SurveyAssignment {
  id: string;
  survey_id: string;
  student_id: string;
  completed: boolean;
  completed_at: string | null;
  student?: { display_name: string; avatar_url: string | null };
}

export interface SurveyAnswer {
  id: string;
  assignment_id: string;
  question_id: string;
  answer_text: string;
}

export async function fetchTrainerSurveys(trainerId: string): Promise<CustomSurvey[]> {
  const q = query(
    collection(db, "custom_surveys"), 
    where("trainer_id", "==", trainerId), 
    orderBy("created_at", "desc")
  );
  const snap = await getDocs(q);
  const surveys = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomSurvey));

  if (surveys.length === 0) return [];

  // Fetch only questions for these surveys
  const surveyIds = surveys.map(s => s.id);
  const questionsSnap = await getDocsInChunks("survey_questions", "survey_id", surveyIds);
  const allQuestions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SurveyQuestion));

  return surveys.map(s => ({
    ...s,
    questions: allQuestions
      .filter(q => q.survey_id === s.id)
      .sort((a, b) => a.order_index - b.order_index)
  }));
}

export async function createSurvey(
  trainerId: string, 
  title: string, 
  description: string, 
  questions: Omit<SurveyQuestion, "id" | "survey_id" | "order_index">[],
  isGlobal: boolean = false
) {
  const batch = new ChunkedBatch(db);
  const surveyRef = doc(collection(db, "custom_surveys"));
  const now = new Date().toISOString();

  batch.set(surveyRef, {
    trainer_id: trainerId,
    title,
    description,
    is_global: isGlobal,
    created_at: now
  });

  questions.forEach((q, idx) => {
    const qRef = doc(collection(db, "survey_questions"));
    batch.set(qRef, {
      survey_id: surveyRef.id,
      trainer_id: trainerId,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      order_index: idx
    });
  });

  await batch.commit();
  return { id: surveyRef.id, trainer_id: trainerId, title, description, is_global: isGlobal, created_at: now };
}

export async function fetchSurveyAssignments(surveyId: string): Promise<SurveyAssignment[]> {
  const q = query(collection(db, "survey_assignments"), where("survey_id", "==", surveyId));
  const snap = await getDocs(q);
  const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() } as SurveyAssignment));

  if (assignments.length === 0) return [];
  
  const studentIds = assignments.map((a) => a.student_id);
  // Fetch profiles only for those specific students
  const profilesSnap = await getDocsInChunks("profiles", "user_id", studentIds);
  const profiles = profilesSnap.docs.map(d => d.data() as any);
    
  return assignments.map((a) => {
    const student = profiles.find(p => p.user_id === a.student_id);
    if (!student) return null;
    return {
      ...a,
      student
    };
  }).filter(Boolean) as SurveyAssignment[];
}

export async function assignSurveyToStudents(surveyId: string, studentIds: string[]) {
  if (studentIds.length === 0) return;
  const trainerId = auth.currentUser?.uid;
  if (!trainerId) throw new Error("No authenticated user");
  
  const batch = new ChunkedBatch(db);
  studentIds.forEach(id => {
    const docId = `${surveyId}_${id}`;
    batch.set(doc(db, "survey_assignments", docId), {
      survey_id: surveyId,
      trainer_id: trainerId,
      student_id: id,
      completed: false,
      completed_at: null,
      created_at: new Date().toISOString()
    }, { merge: true });
  });

  await batch.commit();

  // Notify each student about the new survey assignment
  studentIds.forEach(id => {
    createNotification({
      userId: id,
      type: "survey",
      title: "Nueva encuesta",
      message: "Tu entrenador te ha asignado una nueva encuesta.",
      relatedId: surveyId,
    }).catch(() => {});
  });
}

export async function removeSurveyAssignment(surveyId: string, studentId: string) {
  const docId = `${surveyId}_${studentId}`;
  await deleteDoc(doc(db, "survey_assignments", docId));
}

export async function deleteSurvey(surveyId: string) {
  // Invalidate cache
  surveyCache.delete(surveyId);
  questionsCache.delete(surveyId);

  const deleteQueue: any[] = [];
  
  // 1. Fetch associated questions and assignments in parallel
  const [qSnap, aSnap] = await Promise.all([
    getDocs(query(collection(db, "survey_questions"), where("survey_id", "==", surveyId))),
    getDocs(query(collection(db, "survey_assignments"), where("survey_id", "==", surveyId)))
  ]);
  
  // 2. Fetch associated answers for these assignments
  const assignmentIds = aSnap.docs.map(d => d.id);

  if (assignmentIds.length > 0) {
    const chunks = chunkArray(assignmentIds, 30);
    const answersPromises = chunks.map(chunk => 
      getDocs(query(collection(db, "survey_answers"), where("assignment_id", "in", chunk)))
    );
    const answersSnaps = await Promise.all(answersPromises);
    answersSnaps.forEach(snap => {
      snap.docs.forEach(d => deleteQueue.push(d.ref));
    });
  }

  // 3. Add questions and assignments to delete queue
  qSnap.docs.forEach(d => deleteQueue.push(d.ref));
  aSnap.docs.forEach(d => deleteQueue.push(d.ref));

  // 4. Add the main survey doc reference at the very end to guarantee it's deleted last
  const surveyDocRef = doc(db, "custom_surveys", surveyId);
  deleteQueue.push(surveyDocRef);

  // 5. Commit deletes automatically chunked by ChunkedBatch
  const batch = new ChunkedBatch(db);
  deleteQueue.forEach(ref => batch.delete(ref));

  try {
    await batch.commit();
  } catch (err: any) {
    console.error("Error deleting survey:", surveyId, err);
    throw err;
  }
}

export async function fetchSurveyAnswers(surveyId: string) {
  const q = query(collection(db, "survey_assignments"), where("survey_id", "==", surveyId));
  const asSnap = await getDocs(q);
  const assignments = asSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    
  if (assignments.length === 0) return [];
  
  const assignmentIds = assignments.map((a: any) => a.id);
  // Partition into chunks to avoid Firebase 'in' limit (30)
  const chunks = chunkArray(assignmentIds, 30);
  const answersSnaps = await Promise.all(
    chunks.map(chunk => getDocs(query(collection(db, "survey_answers"), where("assignment_id", "in", chunk))))
  );
  
  const answers = answersSnaps.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    
  return answers.map((ans: any) => ({
    ...ans,
    student_id: assignments.find((a: any) => a.id === ans.assignment_id)?.student_id
  }));
}

export async function fetchStudentPendingSurveys(studentId: string) {
  const q = query(
    collection(db, "survey_assignments"), 
    where("student_id", "==", studentId), 
    where("completed", "==", false)
  );
  const snap = await getDocs(q);
  const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  
  if (assignments.length === 0) return [];

  const surveyIds = assignments.map(a => a.survey_id);

  // Fetch surveys and questions in parallel — both only depend on surveyIds computed above
  const [surveysSnap, questionsSnap] = await Promise.all([
    getDocsInChunks("custom_surveys", "__name__", surveyIds),
    getDocsInChunks("survey_questions", "survey_id", surveyIds),
  ]);
  const allSurveys = surveysSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const allQuestions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  return assignments.map(a => {
    const survey = allSurveys.find(s => s.id === a.survey_id);
    if (!survey) return null;
    
    survey.questions = allQuestions
      .filter(q => q.survey_id === survey.id)
      .sort((x, y) => x.order_index - y.order_index);
      
    return {
      ...a,
      survey
    };
  }).filter(Boolean);
}

export async function fetchSurveyWithQuestions(surveyId: string) {
  const sSnap = await getDoc(doc(db, "custom_surveys", surveyId));
  if (!sSnap.exists()) throw new Error("Survey not found");
  const data = sSnap.data() as any;
  data.id = sSnap.id;

  const qSnap = await getDocs(query(collection(db, "survey_questions"), where("survey_id", "==", surveyId)));
  data.questions = qSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .sort((a, b) => a.order_index - b.order_index);
    
  return data;
}

export async function submitSurveyAnswers(assignmentId: string, answers: { question_id: string, answer_text: string }[], trainerId: string) {
  const studentId = auth.currentUser?.uid;
  if (!studentId) throw new Error("No authenticated user");
  
  const batch = new ChunkedBatch(db);
  const submittedAt = new Date().toISOString();

  answers.forEach(a => {
    // Deterministic ID: one document per (assignment, question) pair.
    // setDoc with merge:true makes this idempotent — re-submitting the same
    // answer updates the existing document instead of creating a duplicate.
    const answerId = `${assignmentId}_${a.question_id}`;
    const ansRef = doc(db, "survey_answers", answerId);
    batch.set(ansRef, {
      assignment_id: assignmentId,
      student_id: studentId,
      trainer_id: trainerId,
      question_id: a.question_id,
      answer_text: a.answer_text,
      created_at: submittedAt,
    }, { merge: true });
  });
  
  batch.update(doc(db, "survey_assignments", assignmentId), { 
    completed: true, 
    status: "completada",
    completed_at: submittedAt,
  });
    
  await batch.commit();
}

export async function fetchStudentSurveyResults(studentId: string) {
  const q = query(
    collection(db, "survey_assignments"), 
    where("student_id", "==", studentId), 
    where("completed", "==", true),
    orderBy("completed_at", "desc")
  );
  const snap = await getDocs(q);
  const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  if (assignments.length === 0) return [];

  const surveyIds = assignments.map(a => a.survey_id);
  const assignmentIds = assignments.map(a => a.id);

  // Fetch only needed surveys, questions and answers (unsliced)
  const targetSurveyIds = surveyIds;
  const targetAssignmentIds = assignmentIds;

  // Find missing survey definitions from cache
  const missingSurveyIds = targetSurveyIds.filter(id => !surveyCache.has(id));
  const missingQuestionSurveyIds = targetSurveyIds.filter(id => !questionsCache.has(id));

  const [surveysSnap, questionsSnap, answersSnap] = await Promise.all([
    missingSurveyIds.length > 0
      ? getDocsInChunks("custom_surveys", "__name__", missingSurveyIds)
      : Promise.resolve({ docs: [] }),
    missingQuestionSurveyIds.length > 0
      ? getDocsInChunks("survey_questions", "survey_id", missingQuestionSurveyIds)
      : Promise.resolve({ docs: [] }),
    getDocsInChunks("survey_answers", "assignment_id", targetAssignmentIds)
  ]);

  // Update caches
  surveysSnap.docs.forEach(d => {
    surveyCache.set(d.id, { id: d.id, ...d.data() });
  });
  if (missingQuestionSurveyIds.length > 0) {
    const fetchedQs = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    missingQuestionSurveyIds.forEach(id => {
      const qs = fetchedQs.filter((q: any) => q.survey_id === id);
      questionsCache.set(id, qs);
    });
  }

  const allAnswers = answersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  return assignments.map((a: any) => {
    if (!targetSurveyIds.includes(a.survey_id)) return null;

    const survey = surveyCache.get(a.survey_id);
    if (!survey) return null;

    const questions = [...(questionsCache.get(survey.id) || [])]
      .sort((x: any, y: any) => x.order_index - y.order_index);

    return {
      ...a,
      answers: allAnswers.filter((ans: any) => ans.assignment_id === a.id),
      survey: {
        ...survey,
        questions
      }
    };
  }).filter(Boolean);
}

