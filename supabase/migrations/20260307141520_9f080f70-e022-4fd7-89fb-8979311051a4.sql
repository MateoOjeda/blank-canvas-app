
-- Add mercadopago_alias and whatsapp_number to profiles for trainers
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mercadopago_alias text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number text DEFAULT '';

-- Add plan_type_label (e.g. Personalizado, Estándar) to trainer_students
ALTER TABLE public.trainer_students ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'Estándar';

-- Add price to plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0;
