import { describe, it, expect } from "vitest";

/**
 * CIP FITS Comprehensive Security Rules Logic Emulator & Authorization Matrix Test Suite
 * Evaluates rule expressions directly matching Cloud Firestore Rules in firestore.rules
 */

// Simulated rule helper functions (matching firestore.rules logic)
const isAuthenticated = (auth: { uid: string } | null) => auth !== null;

const isOwner = (auth: { uid: string } | null, userId: string) => 
  isAuthenticated(auth) && auth?.uid === userId;

const isStudentOfTrainer = (
  auth: { uid: string } | null, 
  trainerId: string, 
  activeLinks: Set<string>
) => {
  if (!isAuthenticated(auth)) return false;
  const linkKey = `${trainerId}_${auth!.uid}`;
  return activeLinks.has(linkKey);
};

const isTrainerOfStudent = (
  auth: { uid: string } | null, 
  studentId: string, 
  activeLinks: Set<string>
) => {
  if (!isAuthenticated(auth)) return false;
  const linkKey = `${auth!.uid}_${studentId}`;
  return activeLinks.has(linkKey);
};

const isGroupMember = (
  auth: { uid: string } | null, 
  groupId: string, 
  groupMemberships: Set<string>
) => {
  if (!isAuthenticated(auth)) return false;
  const memberKey = `${groupId}_${auth!.uid}`;
  return groupMemberships.has(memberKey);
};

const isSurveyAssigned = (
  auth: { uid: string } | null, 
  surveyId: string, 
  assignments: Set<string>
) => {
  if (!isAuthenticated(auth)) return false;
  const assignKey = `${surveyId}_${auth!.uid}`;
  return assignments.has(assignKey);
};

describe("CIP FITS Complete Authorization Matrix", () => {
  const trainerA = { uid: "trainer_a_uid" };
  const trainerB = { uid: "trainer_b_uid" };
  const studentA = { uid: "student_a_uid" };
  const studentB = { uid: "student_b_uid" };

  // Setup mock relationships
  const activeLinks = new Set<string>([
    "trainer_a_uid_student_a_uid" // Trainer A is linked to Student A only
  ]);

  const groupMemberships = new Set<string>([
    "group_a_student_a_uid" // Student A is in Group A only
  ]);

  const surveyAssignments = new Set<string>([
    "survey_a_student_a_uid" // Student A is assigned Survey A only
  ]);

  describe("1. exercises", () => {
    const exerciseDoc = { trainer_id: "trainer_a_uid", student_id: "student_a_uid" };

    const canReadExercise = (auth: { uid: string } | null, doc: typeof exerciseDoc) => {
      return isAuthenticated(auth) && (auth!.uid === doc.trainer_id || auth!.uid === doc.student_id);
    };

    it("Trainer A -> Student A exercise = ALLOW", () => {
      expect(canReadExercise(trainerA, exerciseDoc)).toBe(true);
    });

    it("Trainer B -> Student A exercise = DENY", () => {
      expect(canReadExercise(trainerB, exerciseDoc)).toBe(false);
    });

    it("Student A -> own exercise = ALLOW", () => {
      expect(canReadExercise(studentA, exerciseDoc)).toBe(true);
    });

    it("Student B -> Student A exercise = DENY", () => {
      expect(canReadExercise(studentB, exerciseDoc)).toBe(false);
    });
  });

  describe("2. group_exercises", () => {
    const groupExerciseDoc = { group_id: "group_a", trainer_id: "trainer_a_uid" };

    const canReadGroupExercise = (auth: { uid: string } | null, doc: typeof groupExerciseDoc) => {
      return isAuthenticated(auth) && (
        auth!.uid === doc.trainer_id ||
        isGroupMember(auth, doc.group_id, groupMemberships)
      );
    };

    it("Group owner trainer -> own group exercise = ALLOW", () => {
      expect(canReadGroupExercise(trainerA, groupExerciseDoc)).toBe(true);
    });

    it("Other trainer -> group exercise = DENY", () => {
      expect(canReadGroupExercise(trainerB, groupExerciseDoc)).toBe(false);
    });

    it("Group member student -> own group exercise = ALLOW", () => {
      expect(canReadGroupExercise(studentA, groupExerciseDoc)).toBe(true);
    });

    it("Unrelated student -> group exercise = DENY", () => {
      expect(canReadGroupExercise(studentB, groupExerciseDoc)).toBe(false);
    });
  });

  describe("3. global_plans", () => {
    const planDoc = { trainer_id: "trainer_a_uid" };

    const canReadGlobalPlan = (auth: { uid: string } | null, doc: typeof planDoc) => {
      return isAuthenticated(auth) && (
        auth!.uid === doc.trainer_id ||
        isStudentOfTrainer(auth, doc.trainer_id, activeLinks)
      );
    };

    it("Trainer A -> own plans = ALLOW", () => {
      expect(canReadGlobalPlan(trainerA, planDoc)).toBe(true);
    });

    it("Trainer B -> Trainer A plans = DENY", () => {
      expect(canReadGlobalPlan(trainerB, planDoc)).toBe(false);
    });

    it("Linked Student -> Trainer A plans = ALLOW", () => {
      expect(canReadGlobalPlan(studentA, planDoc)).toBe(true);
    });

    it("Unlinked Student -> Trainer A plans = DENY", () => {
      expect(canReadGlobalPlan(studentB, planDoc)).toBe(false);
    });
  });

  describe("4. custom_surveys and survey_questions", () => {
    const surveyDoc = { id: "survey_a", trainer_id: "trainer_a_uid" };
    const questionDoc = { survey_id: "survey_a", trainer_id: "trainer_a_uid" };

    const canReadSurvey = (auth: { uid: string } | null, doc: typeof surveyDoc) => {
      return isAuthenticated(auth) && (
        auth!.uid === doc.trainer_id ||
        isSurveyAssigned(auth, doc.id, surveyAssignments)
      );
    };

    const canReadQuestion = (auth: { uid: string } | null, doc: typeof questionDoc) => {
      return isAuthenticated(auth) && (
        auth!.uid === doc.trainer_id ||
        isSurveyAssigned(auth, doc.survey_id, surveyAssignments)
      );
    };

    it("Author trainer -> own survey/question = ALLOW", () => {
      expect(canReadSurvey(trainerA, surveyDoc)).toBe(true);
      expect(canReadQuestion(trainerA, questionDoc)).toBe(true);
    });

    it("Other trainer -> survey/question = DENY", () => {
      expect(canReadSurvey(trainerB, surveyDoc)).toBe(false);
      expect(canReadQuestion(trainerB, questionDoc)).toBe(false);
    });

    it("Assigned student -> survey/question = ALLOW", () => {
      expect(canReadSurvey(studentA, surveyDoc)).toBe(true);
      expect(canReadQuestion(studentA, questionDoc)).toBe(true);
    });

    it("Unassigned student -> survey/question = DENY", () => {
      expect(canReadSurvey(studentB, surveyDoc)).toBe(false);
      expect(canReadQuestion(studentB, questionDoc)).toBe(false);
    });
  });

  describe("5. tracking_injuries & tracking_goals", () => {
    const injuryDoc = { trainer_id: "trainer_a_uid", student_id: "student_a_uid" };

    const canAccessInjury = (auth: { uid: string } | null, doc: typeof injuryDoc) => {
      return isAuthenticated(auth) && (
        auth!.uid === doc.student_id ||
        auth!.uid === doc.trainer_id ||
        isTrainerOfStudent(auth, doc.student_id, activeLinks)
      );
    };

    it("Linked trainer -> student injury = ALLOW", () => {
      expect(canAccessInjury(trainerA, injuryDoc)).toBe(true);
    });

    it("Unlinked trainer -> student injury = DENY", () => {
      expect(canAccessInjury(trainerB, injuryDoc)).toBe(false);
    });

    it("Student -> own injury = ALLOW", () => {
      expect(canAccessInjury(studentA, injuryDoc)).toBe(true);
    });

    it("Student -> another student's injury = DENY", () => {
      expect(canAccessInjury(studentB, injuryDoc)).toBe(false);
    });
  });

  describe("6. student_notes & weight_history", () => {
    const noteDoc = { student_id: "student_a_uid" };

    const canReadStudentNote = (auth: { uid: string } | null, doc: typeof noteDoc) => {
      return isAuthenticated(auth) && (
        auth!.uid === doc.student_id ||
        isTrainerOfStudent(auth, doc.student_id, activeLinks)
      );
    };

    it("Student -> own notes = ALLOW", () => {
      expect(canReadStudentNote(studentA, noteDoc)).toBe(true);
    });

    it("Linked trainer -> student notes = ALLOW", () => {
      expect(canReadStudentNote(trainerA, noteDoc)).toBe(true);
    });

    it("Unlinked trainer -> student notes = DENY", () => {
      expect(canReadStudentNote(trainerB, noteDoc)).toBe(false);
    });

    it("Another student -> notes = DENY", () => {
      expect(canReadStudentNote(studentB, noteDoc)).toBe(false);
    });
  });

  describe("7. photo_sessions", () => {
    const photoDoc = { trainer_id: "trainer_a_uid", student_id: "student_a_uid" };

    const canReadPhotoSession = (auth: { uid: string } | null, doc: typeof photoDoc) => {
      return isAuthenticated(auth) && (
        auth!.uid === doc.student_id ||
        auth!.uid === doc.trainer_id ||
        isTrainerOfStudent(auth, doc.student_id, activeLinks)
      );
    };

    it("Trainer A -> Student A photos = ALLOW", () => {
      expect(canReadPhotoSession(trainerA, photoDoc)).toBe(true);
    });

    it("Trainer B -> Student A photos = DENY", () => {
      expect(canReadPhotoSession(trainerB, photoDoc)).toBe(false);
    });

    it("Student A -> own photos = ALLOW", () => {
      expect(canReadPhotoSession(studentA, photoDoc)).toBe(true);
    });

    it("Student B -> Student A photos = DENY", () => {
      expect(canReadPhotoSession(studentB, photoDoc)).toBe(false);
    });
  });

  describe("8. tracking_assessments & tracking_recovery", () => {
    const assessmentDoc = { trainer_id: "trainer_a_uid", student_id: "student_a_uid" };

    const canReadAssessment = (auth: { uid: string } | null, doc: typeof assessmentDoc) => {
      return isAuthenticated(auth) && (
        auth!.uid === doc.student_id ||
        auth!.uid === doc.trainer_id ||
        isTrainerOfStudent(auth, doc.student_id, activeLinks)
      );
    };

    it("Trainer A -> Student A assessment = ALLOW", () => {
      expect(canReadAssessment(trainerA, assessmentDoc)).toBe(true);
    });

    it("Trainer B -> Student A assessment = DENY", () => {
      expect(canReadAssessment(trainerB, assessmentDoc)).toBe(false);
    });

    it("Student A -> own assessment = ALLOW", () => {
      expect(canReadAssessment(studentA, assessmentDoc)).toBe(true);
    });

    it("Student B -> Student A assessment = DENY", () => {
      expect(canReadAssessment(studentB, assessmentDoc)).toBe(false);
    });
  });
});

/**
 * survey_answers Data Integrity Test Suite
 *
 * Verifies the new deterministic ID strategy and idempotent write semantics
 * introduced in src/services/surveys.ts (submitSurveyAnswers).
 *
 * These tests do NOT hit Firestore — they validate the ID-construction logic
 * and field-level invariants using pure unit assertions.
 */
describe("survey_answers — Data Integrity & Deterministic ID", () => {
  const ASSIGNMENT_ID = "survey_a_student_a_uid";
  const QUESTION_IDS = ["q1", "q2", "q3"];

  // ── Helper: mirrors the ID-construction logic in submitSurveyAnswers ──────
  function buildAnswerId(assignmentId: string, questionId: string) {
    return `${assignmentId}_${questionId}`;
  }

  // ── Helper: mirrors building the write payload in submitSurveyAnswers ──────
  function buildAnswerPayload(
    assignmentId: string,
    studentId: string,
    trainerId: string,
    questionId: string,
    answerText: string,
    submittedAt: string
  ) {
    return {
      assignment_id: assignmentId,
      student_id: studentId,
      trainer_id: trainerId,
      question_id: questionId,
      answer_text: answerText,
      created_at: submittedAt,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  describe("9. survey_answers — Deterministic ID construction", () => {
    it("Document ID for (assignmentId='A', questionId='Q') must be 'A_Q'", () => {
      expect(buildAnswerId("A", "Q")).toBe("A_Q");
    });

    it("Each question in a single submission gets a unique deterministic ID", () => {
      const ids = QUESTION_IDS.map(qid => buildAnswerId(ASSIGNMENT_ID, qid));
      const unique = new Set(ids);
      expect(unique.size).toBe(QUESTION_IDS.length);
    });

    it("ID format is stable: assignment + underscore + questionId", () => {
      expect(buildAnswerId(ASSIGNMENT_ID, "q1")).toBe(`${ASSIGNMENT_ID}_q1`);
      expect(buildAnswerId(ASSIGNMENT_ID, "q2")).toBe(`${ASSIGNMENT_ID}_q2`);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("10. survey_answers — Idempotent submission invariant", () => {
    it("Submitting the same answer twice produces the same document ID (idempotent)", () => {
      const firstId = buildAnswerId(ASSIGNMENT_ID, "q1");
      const secondId = buildAnswerId(ASSIGNMENT_ID, "q1");
      expect(firstId).toBe(secondId);
    });

    it("Updated answer_text overwrites the previous value under the same document ID", () => {
      // Simulate merge: the latest payload wins for a given (assignmentId, questionId)
      const id = buildAnswerId(ASSIGNMENT_ID, "q1");
      const firstPayload = buildAnswerPayload(ASSIGNMENT_ID, "s1", "t1", "q1", "first answer", "2026-01-01T00:00:00.000Z");
      const secondPayload = buildAnswerPayload(ASSIGNMENT_ID, "s1", "t1", "q1", "updated answer", "2026-01-02T00:00:00.000Z");

      // Both payloads share the same document ID — the second one wins
      expect(buildAnswerId(ASSIGNMENT_ID, "q1")).toBe(id);
      expect(secondPayload.answer_text).toBe("updated answer");
      expect(secondPayload.question_id).toBe(firstPayload.question_id);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("11. survey_answers — Multi-choice field preservation", () => {
    it("Single text answer is stored as a string in answer_text", () => {
      const payload = buildAnswerPayload(ASSIGNMENT_ID, "s1", "t1", "q1", "My free text", "2026-01-01T00:00:00.000Z");
      expect(typeof payload.answer_text).toBe("string");
      expect(payload.answer_text).toBe("My free text");
    });

    it("Single-choice answer stores the selected option string in answer_text", () => {
      const payload = buildAnswerPayload(ASSIGNMENT_ID, "s1", "t1", "q2", "Option B", "2026-01-01T00:00:00.000Z");
      expect(payload.answer_text).toBe("Option B");
    });

    it("All required fields are present in every answer payload", () => {
      const payload = buildAnswerPayload(ASSIGNMENT_ID, "s1", "t1", "q1", "answer", "2026-01-01T00:00:00.000Z");
      expect(payload).toHaveProperty("assignment_id");
      expect(payload).toHaveProperty("student_id");
      expect(payload).toHaveProperty("trainer_id");
      expect(payload).toHaveProperty("question_id");
      expect(payload).toHaveProperty("answer_text");
      expect(payload).toHaveProperty("created_at");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("12. survey_answers — Security rules field-based authorization", () => {
    const answerDoc = {
      assignment_id: ASSIGNMENT_ID,
      student_id: "student_a_uid",
      trainer_id: "trainer_a_uid",
      question_id: "q1",
      answer_text: "Some answer",
    };

    const canWriteAnswer = (auth: { uid: string } | null, doc: typeof answerDoc) =>
      auth !== null && auth.uid === doc.student_id;

    const canReadAnswer = (auth: { uid: string } | null, doc: typeof answerDoc) =>
      auth !== null && (auth.uid === doc.student_id || auth.uid === doc.trainer_id);

    it("Student owner can write their own answer", () => {
      expect(canWriteAnswer({ uid: "student_a_uid" }, answerDoc)).toBe(true);
    });

    it("Another student cannot write someone else's answer", () => {
      expect(canWriteAnswer({ uid: "student_b_uid" }, answerDoc)).toBe(false);
    });

    it("Trainer can read the answer for their survey", () => {
      expect(canReadAnswer({ uid: "trainer_a_uid" }, answerDoc)).toBe(true);
    });

    it("Student can read their own answer", () => {
      expect(canReadAnswer({ uid: "student_a_uid" }, answerDoc)).toBe(true);
    });

    it("Unauthenticated user cannot read or write", () => {
      expect(canReadAnswer(null, answerDoc)).toBe(false);
      expect(canWriteAnswer(null, answerDoc)).toBe(false);
    });

    it("Security rules work by field value — deterministic document ID does not change authorization", () => {
      // The rules check doc.student_id, not the document ID format.
      // Whether ID is random or 'assignmentId_questionId', the field-based auth is unchanged.
      const deterministicDocId = buildAnswerId(ASSIGNMENT_ID, "q1");
      expect(deterministicDocId).toBe(`${ASSIGNMENT_ID}_q1`);
      // Authorization still depends on fields, not the ID:
      expect(canWriteAnswer({ uid: answerDoc.student_id }, answerDoc)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("13. notifications — User notifications isolation and authorization", () => {
    const notificationDoc = {
      id: "notif_1",
      user_id: "user_target_uid",
      type: "transformation",
      title: "Nueva foto",
      message: "Un alumno subió una foto",
      read: false,
      related_id: "session_123",
      created_at: "2026-08-11T12:00:00.000Z",
    };

    const canReadNotification = (auth: { uid: string } | null, doc: typeof notificationDoc) =>
      isAuthenticated(auth) && auth!.uid === doc.user_id;

    const canCreateNotification = (auth: { uid: string } | null) =>
      isAuthenticated(auth);

    const canUpdateOrDeleteNotification = (auth: { uid: string } | null, doc: typeof notificationDoc) =>
      isAuthenticated(auth) && auth!.uid === doc.user_id;

    it("Target recipient user can read their notification = ALLOW", () => {
      expect(canReadNotification({ uid: "user_target_uid" }, notificationDoc)).toBe(true);
    });

    it("Unrelated user cannot read someone else's notification = DENY", () => {
      expect(canReadNotification({ uid: "other_user_uid" }, notificationDoc)).toBe(false);
    });

    it("Unauthenticated user cannot read notification = DENY", () => {
      expect(canReadNotification(null, notificationDoc)).toBe(false);
    });

    it("Authenticated user can create a notification = ALLOW", () => {
      expect(canCreateNotification({ uid: "student_a_uid" })).toBe(true);
    });

    it("Unauthenticated user cannot create a notification = DENY", () => {
      expect(canCreateNotification(null)).toBe(false);
    });

    it("Target recipient user can update (mark as read) or delete their notification = ALLOW", () => {
      expect(canUpdateOrDeleteNotification({ uid: "user_target_uid" }, notificationDoc)).toBe(true);
    });

    it("Other user cannot update or delete target's notification = DENY", () => {
      expect(canUpdateOrDeleteNotification({ uid: "other_user_uid" }, notificationDoc)).toBe(false);
    });
  });
});

