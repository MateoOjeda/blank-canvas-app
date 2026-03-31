-- Migración para encuestas personalizadas
CREATE TABLE custom_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE survey_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES custom_surveys(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('text', 'multiple_choice')),
    options JSONB,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE survey_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES custom_surveys(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(survey_id, student_id)
);

CREATE TABLE survey_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES survey_assignments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, question_id)
);

-- Habilitar RLS
ALTER TABLE custom_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_answers ENABLE ROW LEVEL SECURITY;

-- Políticas para custom_surveys
CREATE POLICY "Trainers can manage own surveys" ON custom_surveys FOR ALL USING (trainer_id = auth.uid());
CREATE POLICY "Students can view assigned surveys" ON custom_surveys FOR SELECT USING (
    id IN (SELECT survey_id FROM survey_assignments WHERE student_id = auth.uid())
);

-- Políticas para survey_questions
CREATE POLICY "Trainers can manage survey questions" ON survey_questions FOR ALL USING (
    survey_id IN (SELECT id FROM custom_surveys WHERE trainer_id = auth.uid())
);
CREATE POLICY "Students can view assigned survey questions" ON survey_questions FOR SELECT USING (
    survey_id IN (SELECT survey_id FROM survey_assignments WHERE student_id = auth.uid())
);

-- Políticas para survey_assignments
CREATE POLICY "Trainers can manage assignments for their surveys" ON survey_assignments FOR ALL USING (
    survey_id IN (SELECT id FROM custom_surveys WHERE trainer_id = auth.uid())
);
CREATE POLICY "Students can view own assignments" ON survey_assignments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can update own assignments" ON survey_assignments FOR UPDATE USING (student_id = auth.uid());

-- Políticas para survey_answers
CREATE POLICY "Trainers can view answers for their surveys" ON survey_answers FOR SELECT USING (
    assignment_id IN (SELECT id FROM survey_assignments WHERE survey_id IN (SELECT id FROM custom_surveys WHERE trainer_id = auth.uid()))
);
CREATE POLICY "Students can manage own answers" ON survey_answers FOR ALL USING (
    assignment_id IN (SELECT id FROM survey_assignments WHERE student_id = auth.uid())
);
