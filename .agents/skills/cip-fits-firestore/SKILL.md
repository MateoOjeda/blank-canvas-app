---
name: cip-fits-firestore
description: Documenta la estructura NoSQL de Cloud Firestore en CIP FITS, reglas de IDs deterministas, límites de consultas, optimización de waterfalls, prevención de documentos huérfanos y verificación del inventario de colecciones.
---

# CIP FITS - Firestore Data Architecture

Esta skill define el modelo de datos de Cloud Firestore para CIP FITS, garantizando consistencia NoSQL, seguridad y rendimiento.

---

## 1. Verificación Dinámica del Inventario de Colecciones

> [!IMPORTANT]
> El inventario de colecciones de Firestore **NO es una constante fija e inmutable**. El agente debe verificar dinámicamente el catálogo de colecciones cruzando:
> 1. `firestore.rules` (fuente primaria de coincidencia de rutas y reglas de seguridad).
> 2. `src/services/` (servicios que interactúan con Firestore).
> 3. `src/hooks/` (hooks que consumen servicios o datos NoSQL).
> 4. Documentación del proyecto.

El recuento de colecciones debe tratarse como información derivada y verificable en tiempo de ejecución de la tarea.

---

## 2. Principios Fundamentales de Firestore en CIP FITS

1. **IDs Deterministas para Relaciones Únicas**: Toda colección que represente un vínculo 1-a-1 único entre dos entidades DEBE utilizar una clave compuesta explícita (ej: `doc(db, collection, `${idA}_${idB}`)`).
2. **Prohibición de `addDoc()` en Relaciones Únicas**: Nunca usar `addDoc()` (IDs aleatorios) para colecciones relacionales como `trainer_students`, `training_group_members` o `survey_assignments`. Usar `setDoc(docRef, data, { merge: true })`.
3. **Manejo del Límite `in` (Máximo 30)**: Las cláusulas `where("id", "in", array)` tienen un límite de **30 elementos**. Para arreglos mayores, se debe fragmentar en trozos de 30 mediante `Promise.all()`.
4. **Evitar Waterfalls de Consultas**: Las consultas independientes deben ejecutarse en paralelo usando `Promise.all()`.
5. **Idempotencia**: Todas las escrituras deben ser seguras para re-ejecutar sin duplicar estado ni corromper datos.

---

## 3. Catálogo Verificado de Colecciones Principales

A continuación se detalla el catálogo actual derivado de `firestore.rules` y `src/services/`:

### Colecciones Relacionales (IDs Deterministas)
- `trainer_students`: Vínculo Entrenador - Alumno. ID determinista: `${trainerId}_${studentId}`.
- `training_group_members`: Miembros de grupos de entrenamiento. ID determinista: `${groupId}_${studentId}`.
- `survey_assignments`: Asignación de cuestionarios. ID determinista: `${surveyId}_${studentId}`.

### Usuarios y Autenticación
- `profiles`: Perfiles principales de usuario (`userId`).
- `user_roles`: Asignación de rol (`trainer` o `student`) (`userId`).

### Entrenamientos y Grupos
- `routines`: Rutinas de entrenamiento (`src/services/routines.ts` es el servicio canónico).
- `routine_day_config`: Configuración diaria de ejercicios por rutina.
- `exercises`: Biblioteca de ejercicios.
- `training_groups`: Grupos de entrenamiento.
- `group_exercises`: Ejercicios asignados a grupos.
- `global_plans`: Macrociclos o planes globales.
- `plan_levels`: Niveles de dificultad en planes.

### Encuestas e Históricos de Seguimiento
- `custom_surveys`: Plantillas de cuestionarios.
- `survey_questions`: Preguntas de cuestionarios.
- `survey_answers`: Respuestas enviadas por alumnos.
- `tracking_assessments`: Evaluaciones físicas y antropometría.
- `tracking_injuries`: Registro de lesiones.
- `tracking_goals`: Objetivos de acondicionamiento.
- `tracking_notes`: Notas del entrenador.
- `tracking_recovery`: Métricas de recuperación y descanso.
- `weight_history`: Histórico de peso del alumno.
- `photo_sessions`: Fotos de progreso físico.
- `notifications` (`trainer_changes`): Notificaciones (inmutables).
- `exercise_logs`: Registros de ejecución de ejercicios por el alumno.
- `student_meals`: Registro diario de comidas.
- `student_notes`: Notas personales del alumno.

### Colección Deprecada
- `seguimiento_personal`: **DEPRECATED**. No escribir nuevos registros. Usar `tracking_*` / `weight_history`.

---

## 4. Guía de Implementación en Servicios (`src/services/`)

### Fragmentación de Consultas `in` (>30 IDs)

```typescript
export async function getStudentsByIds(studentIds: string[]) {
  if (studentIds.length === 0) return [];
  
  const CHUNK_SIZE = 30;
  const chunks = [];
  for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
    chunks.push(studentIds.slice(i, i + CHUNK_SIZE));
  }

  const results = await Promise.all(
    chunks.map(chunk => 
      getDocs(query(collection(db, "profiles"), where(documentId(), "in", chunk)))
    )
  );

  return results.flatMap(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
}
```

### Guardado con IDs Deterministas

```typescript
export async function addStudentToGroup(groupId: string, studentId: string) {
  const linkId = `${groupId}_${studentId}`;
  const docRef = doc(db, "training_group_members", linkId);
  await setDoc(docRef, {
    group_id: groupId,
    student_id: studentId,
    created_at: new Date().toISOString()
  }, { merge: true });
}
```
