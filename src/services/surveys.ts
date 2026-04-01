import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await (supabase as any)
    .from("custom_surveys" as any)
    .select("*, questions:survey_questions(*)")
    .eq("trainer_id", trainerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as any;
}

export async function createSurvey(
  trainerId: string, 
  title: string, 
  description: string, 
  questions: Omit<SurveyQuestion, "id" | "survey_id" | "order_index">[]
) {
  // 1. Create survey
  const { data: survey, error: surveyError } = await (supabase as any)
    .from("custom_surveys" as any)
    .insert({ trainer_id: trainerId, title, description })
    .select()
    .single();

  if (surveyError || !survey) throw surveyError;

  // 2. Create questions
  const qs = questions.map((q, idx) => ({
    survey_id: survey.id,
    question_text: q.question_text,
    question_type: q.question_type,
    options: q.options,
    order_index: idx
  }));

  const { error: qError } = await (supabase as any)
    .from("survey_questions" as any)
    .insert(qs);

  if (qError) throw qError;
  return survey;
}

export async function fetchSurveyAssignments(surveyId: string): Promise<SurveyAssignment[]> {
  const { data: assignments, error } = await (supabase as any)
    .from("survey_assignments" as any)
    .select("*")
    .eq("survey_id", surveyId);
    
  if (error) throw error;
  if (!assignments || !assignments.length) return [];
  
  const studentIds = assignments.map((a: any) => a.student_id);
  const { data: profiles } = await (supabase as any)
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", studentIds);
    
  return assignments.map((a: any) => ({
    ...a,
    student: profiles?.find(p => p.user_id === a.student_id)
  }));
}

export async function assignSurveyToStudents(surveyId: string, studentIds: string[]) {
  if (studentIds.length === 0) return;
  const inserts = studentIds.map(id => ({
    survey_id: surveyId,
    student_id: id
  }));

  const { error } = await (supabase as any)
    .from("survey_assignments" as any)
    .upsert(inserts, { onConflict: "survey_id,student_id" });

  if (error) throw error;
}

export async function removeSurveyAssignment(surveyId: string, studentId: string) {
  const { error } = await (supabase as any)
    .from("survey_assignments" as any)
    .delete()
    .eq("survey_id", surveyId)
    .eq("student_id", studentId);
  if (error) throw error;
}

export async function deleteSurvey(surveyId: string) {
  const { error } = await (supabase as any)
    .from("custom_surveys" as any)
    .delete()
    .eq("id", surveyId);
  if (error) throw error;
}

export async function fetchSurveyAnswers(surveyId: string) {
  const { data: assignments, error: asError } = await (supabase as any)
    .from("survey_assignments" as any)
    .select("id, student_id")
    .eq("survey_id", surveyId);
    
  if (asError || !assignments.length) return [];
  
  const assignmentIds = assignments.map((a: any) => a.id);
  const { data: answers, error: ansError } = await (supabase as any)
    .from("survey_answers" as any)
    .select("*")
    .in("assignment_id", assignmentIds);
    
  if (ansError) throw ansError;
  
  // Attach student_id to each answer for easier mapping
  return answers.map((ans: any) => ({
    ...ans,
    student_id: assignments.find((a: any) => a.id === ans.assignment_id)?.student_id
  }));
}

export async function fetchStudentPendingSurveys(studentId: string) {
  const { data, error } = await (supabase as any)
    .from("survey_assignments" as any)
    .select("id, survey_id, completed, survey:custom_surveys(*)")
    .eq("student_id", studentId)
    .eq("completed", false);
    
  if (error) throw error;
  return data as any;
}

export async function fetchSurveyWithQuestions(surveyId: string) {
  const { data, error } = await (supabase as any)
    .from("custom_surveys" as any)
    .select("*, questions:survey_questions(*)")
    .eq("id", surveyId)
    .single();
    
  if (error) throw error;
  // Sort questions by order_index
  if (data.questions) {
    data.questions.sort((a: any, b: any) => a.order_index - b.order_index);
  }
  return data as any;
}

export async function submitSurveyAnswers(assignmentId: string, answers: { question_id: string, answer_text: string }[]) {
  const inserts = answers.map(a => ({
    assignment_id: assignmentId,
    question_id: a.question_id,
    answer_text: a.answer_text
  }));
  
  const { error: ansError } = await (supabase as any)
    .from("survey_answers" as any)
    .insert(inserts);
    
  if (ansError) throw ansError;
  
  const { error: asstError } = await (supabase as any)
    .from("survey_assignments" as any)
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", assignmentId);
    
  if (asstError) throw asstError;
}

export async function fetchStudentSurveyResults(studentId: string) {
  // Get all completed assignments for this student
  const { data: assignments, error: aError } = await (supabase as any)
    .from("survey_assignments" as any)
    .select("id, survey_id, completed, completed_at, survey:custom_surveys(id, title, description, questions:survey_questions(*))")
    .eq("student_id", studentId)
    .eq("completed", true)
    .order("completed_at", { ascending: false });

  if (aError) throw aError;
  if (!assignments || !assignments.length) return [];

  const assignmentIds = assignments.map((a: any) => a.id);
  const { data: answers, error: ansError } = await (supabase as any)
    .from("survey_answers" as any)
    .select("*")
    .in("assignment_id", assignmentIds);

  if (ansError) throw ansError;

  return assignments.map((a: any) => ({
    ...a,
    answers: (answers || []).filter((ans: any) => ans.assignment_id === a.id),
    survey: a.survey ? {
      ...a.survey,
      questions: a.survey.questions?.sort((x: any, y: any) => x.order_index - y.order_index)
    } : null
  }));
}
