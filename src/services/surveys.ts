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
  writeBatch,
  orderBy
} from "firebase/firestore";

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
  const questionsQ = query(collection(db, "survey_questions"), where("survey_id", "in", surveyIds));
  const questionsSnap = await getDocs(questionsQ);
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
  questions: Omit<SurveyQuestion, "id" | "survey_id" | "order_index">[]
) {
  const batch = writeBatch(db);
  const surveyRef = doc(collection(db, "custom_surveys"));
  const now = new Date().toISOString();

  batch.set(surveyRef, {
    trainer_id: trainerId,
    title,
    description,
    created_at: now
  });

  questions.forEach((q, idx) => {
    const qRef = doc(collection(db, "survey_questions"));
    batch.set(qRef, {
      survey_id: surveyRef.id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      order_index: idx
    });
  });

  await batch.commit();
  return { id: surveyRef.id, trainer_id: trainerId, title, description, created_at: now };
}

export async function fetchSurveyAssignments(surveyId: string): Promise<SurveyAssignment[]> {
  const q = query(collection(db, "survey_assignments"), where("survey_id", "==", surveyId));
  const snap = await getDocs(q);
  const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() } as SurveyAssignment));

  if (assignments.length === 0) return [];
  
  const studentIds = assignments.map((a) => a.student_id);
  // Fetch profiles only for those specific students
  const profilesQ = query(collection(db, "profiles"), where("user_id", "in", studentIds));
  const profilesSnap = await getDocs(profilesQ);
  const profiles = profilesSnap.docs.map(d => d.data() as any);
    
  return assignments.map((a) => ({
    ...a,
    student: profiles.find(p => p.user_id === a.student_id)
  }));
}

export async function assignSurveyToStudents(surveyId: string, studentIds: string[]) {
  if (studentIds.length === 0) return;
  const batch = writeBatch(db);
  studentIds.forEach(id => {
    const docId = `${surveyId}_${id}`;
    batch.set(doc(db, "survey_assignments", docId), {
      survey_id: surveyId,
      student_id: id,
      completed: false,
      completed_at: null,
      created_at: new Date().toISOString()
    }, { merge: true });
  });

  await batch.commit();
}

export async function removeSurveyAssignment(surveyId: string, studentId: string) {
  const docId = `${surveyId}_${studentId}`;
  await deleteDoc(doc(db, "survey_assignments", docId));
}

export async function deleteSurvey(surveyId: string) {
  const batch = writeBatch(db);
  
  // Delete survey
  batch.delete(doc(db, "custom_surveys", surveyId));
  
  // Delete associated questions
  const qSnap = await getDocs(query(collection(db, "survey_questions"), where("survey_id", "==", surveyId)));
  qSnap.docs.forEach(d => batch.delete(d.ref));
  
  // Delete associated assignments
  const aSnap = await getDocs(query(collection(db, "survey_assignments"), where("survey_id", "==", surveyId)));
  aSnap.docs.forEach(d => batch.delete(d.ref));

  await batch.commit();
}

export async function fetchSurveyAnswers(surveyId: string) {
  const q = query(collection(db, "survey_assignments"), where("survey_id", "==", surveyId));
  const asSnap = await getDocs(q);
  const assignments = asSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    
  if (assignments.length === 0) return [];
  
  const assignmentIds = assignments.map((a: any) => a.id);
  // Partition into chunks to avoid Firebase 'in' limit (30)
  const answers: any[] = [];
  for (let i = 0; i < assignmentIds.length; i += 10) {
    const chunk = assignmentIds.slice(i, i + 10);
    const ansQ = query(collection(db, "survey_answers"), where("assignment_id", "in", chunk));
    const ansSnap = await getDocs(ansQ);
    answers.push(...ansSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
  }
    
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
  const surveysQ = query(collection(db, "custom_surveys"), where("__name__", "in", surveyIds));
  const surveysSnap = await getDocs(surveysQ);
  const allSurveys = surveysSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return assignments.map(a => ({
    ...a,
    survey: allSurveys.find(s => s.id === a.survey_id)
  }));
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

export async function submitSurveyAnswers(assignmentId: string, answers: { question_id: string, answer_text: string }[]) {
  const batch = writeBatch(db);
  
  answers.forEach(a => {
    const ansRef = doc(collection(db, "survey_answers"));
    batch.set(ansRef, {
      assignment_id: assignmentId,
      question_id: a.question_id,
      answer_text: a.answer_text,
      created_at: new Date().toISOString()
    });
  });
  
  batch.update(doc(db, "survey_assignments", assignmentId), { 
    completed: true, 
    completed_at: new Date().toISOString() 
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

  // Fetch only needed surveys, questions and answers
  // We use batching/parallelization for larger sets, but for 10 ids "in" works fine
  const [surveysSnap, questionsSnap, answersSnap] = await Promise.all([
    getDocs(query(collection(db, "custom_surveys"), where("__name__", "in", surveyIds.slice(0, 10)))),
    getDocs(query(collection(db, "survey_questions"), where("survey_id", "in", surveyIds.slice(0, 10)))),
    getDocs(query(collection(db, "survey_answers"), where("assignment_id", "in", assignmentIds.slice(0, 10))))
  ]);

  const allSurveys = surveysSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const allQuestions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const allAnswers = answersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  return assignments.map((a: any) => {
    const survey = allSurveys.find((s: any) => s.id === a.survey_id);
    if (!survey) return null;

    const questions = allQuestions
      .filter((q: any) => q.survey_id === survey.id)
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

