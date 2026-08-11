---
name: cip-fits-qa
description: Define la estrategia de calidad y testing para CIP FITS (Vitest, React Testing Library, Firestore Rules Emulator, Playwright y agent-browser). Protege los flujos críticos de Entrenador y Alumno contra regresiones.
---

# CIP FITS - Quality Assurance & Testing Strategy

Esta skill establece la estrategia de pruebas automatizadas y manuales para CIP FITS.

---

## Pirámide de Pruebas en CIP FITS

```
       / \
      /E2E\       <-- Playwright / agent-browser (Flujos Críticos)
     /-----\
    /  INT  \     <-- Vitest + React Testing Library + Rules Emulator
   /---------\
  /   UNIT    \   <-- Vitest (Services, Schemas Zod, Mappers, Utils)
 /-------------\
```

### 1. Pruebas Unitarias (`Vitest`)
- **Comando**: `npm run test`
- **Ubicación**: `src/**/*.test.ts` o `src/**/*.spec.ts`
- **Enfoque**: Probar validaciones Zod, funciones puras en `lib/`, formateadores de fechas, mappers de datos NoSQL y helpers de cálculo antropométrico.

### 2. Pruebas de Integración (Hooks y Servicios)
- Probar que los servicios de `src/services/` interactúan correctamente con los esquemas de datos.
- Probar que los hooks en `src/hooks/` manejan adecuadamente los estados de carga (`isLoading`), error (`isError`) y cache de React Query.

### 3. Pruebas de Firestore Security Rules
- Probar `firestore.rules` utilizando `@firebase/rules-unit-testing` o emuladores locales de Firebase.
- Garantizar que los alumnos no puedan leer rutinas de otros alumnos o modificar roles de usuario.

### 4. Pruebas E2E (End-to-End con Playwright y `agent-browser`)
- **Comando**: `npx playwright test`
- **Browser Subagent**: Utilizar la skill `agent-browser` para recorridos navegados interactivos en entorno de desarrollo.
- **Objetivo**: Validar los flujos punta a punta desde la interfaz gráfica.

---

## Flujos Críticos de Usuario (Critical User Flows)

Estos flujos son la columna vertebral de la aplicación y **NUNCA deben romperse** tras un refactor o modificación.

### Flujos Críticos del Entrenador (Trainer)

1. **Autenticación y Redirección de Rol**:
   - Iniciar sesión como Trainer -> Validar lectura en `user_roles` -> Acceso directo al Dashboard de Entrenador.
2. **Gestión y Asignación de Alumnos**:
   - Listar alumnos en `trainer_students` -> Ver detalle del alumno -> Vincular o desvincular un alumno.
3. **Creación y Asignación de Rutinas (Servicio Canónico `routines.ts`)**:
   - Crear o clonar una rutina -> Configurar días y ejercicios -> Asignar la rutina a un alumno o grupo -> Confirmar persistencia en `routines` y `routine_day_config`.
4. **Gestión de Grupos y Ejercicios de Grupo**:
   - Crear grupo en `training_groups` -> Añadir miembros en `training_group_members` (verificando ID determinista `${groupId}_${studentId}`).
5. **Creación y Asignación de Encuestas**:
   - Diseñar cuestionario en `custom_surveys` + `survey_questions` -> Asignar a un alumno en `survey_assignments` (`${surveyId}_${studentId}`).
6. **Supervisión de Seguimiento**:
   - Consultar gráficos de peso (`weight_history`), métricas (`tracking_*`) y fotos de avance (`photo_sessions`) del alumno.

### Flujos Críticos del Alumno (Student)

1. **Autenticación y Vista Principal**:
   - Iniciar sesión como Student -> Validar redirección a Dashboard de Alumno -> Visualizar la rutina actual asignada.
2. **Registro de Entrenamiento (`exercise_logs`)**:
   - Seleccionar día de rutina -> Marcar series/repeticiones/peso en cada ejercicio -> Guardar log de entrenamiento.
3. **Registro de Peso Corporal (`weight_history`)**:
   - Ingresar nuevo peso corporal -> Verificar actualización de la gráfica e inserción en la colección.
4. **Carga de Fotos de Progreso (`photo_sessions`)**:
   - Subir imagen de progreso -> Confirmar registro en `photo_sessions`.
5. **Respuesta a Encuestas Asignadas (`survey_answers`)**:
   - Abrir encuesta pendiente -> Responder preguntas -> Enviar respuestas y cambiar estado de `survey_assignments` a `completada`.
6. **Registro Diario de Comidas (`student_meals`)**:
   - Registrar ingesta o foto de comida -> Persistir en `student_meals`.

---

## Checklist Obligatorio de Regresión Pre-Merge

Antes de aprobar cualquier cambio significante, el equipo o agente debe ejecutar:

- [ ] `npm run lint` pasa sin advertencias ni errores.
- [ ] `npm run test` pasa el 100% de la suite de pruebas unitarias/integración.
- [ ] `npm run build` genera la build de Vite sin errores de compilación TypeScript.
- [ ] Los flujos críticos modificados fueron probados manualmente o vía `agent-browser`.
