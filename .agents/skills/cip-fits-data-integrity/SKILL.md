---
name: cip-fits-data-integrity
description: Protege la integridad lógica de datos en CIP FITS. Define reglas para IDs deterministas, escrituras idempotentes, prevención de duplicados, documentos huérfanos, condiciones de carrera y migraciones seguras.
---

# CIP FITS - Data Integrity & Consistency Guidelines

Esta skill establece y protege la integridad lógica de los datos en Cloud Firestore para CIP FITS, garantizando consistencia, idempotencia y prevención de datos huérfanos o duplicados.

---

## 1. Identificadores Deterministas para Relaciones Únicas

Para cualquier entidad que represente un vínculo 1-a-1 único entre dos colecciones, **es obligatorio utilizar IDs deterministas**.

### Vínculos Deterministas Existentes en CIP FITS:
1. `trainer_students/${trainerId}_${studentId}`: Vínculo único Entrenador - Alumno.
2. `training_group_members/${groupId}_${studentId}`: Vínculo único Grupo - Alumno.
3. `survey_assignments/${surveyId}_${studentId}`: Asignación única Cuestionario - Alumno.

### Regla de Construcción:
- **Creación/Actualización**: `doc(db, "coleccion", `${idEntidadA}_${idEntidadB}`)` + `setDoc(docRef, data, { merge: true })`.
- **Prohibido**: Utilizar `addDoc()` para estas relaciones, ya que genera IDs aleatorios y permite registros duplicados en condiciones de carrera.

---

## 2. Escrituras Idempotentes y Prevención de Envíos Duplicados

Todas las escrituras NoSQL deben ser seguras para re-ejecutarse múltiples veces sin corromper el estado de la base de datos ni generar duplicados.

- **Client-side Guards**: Inhabilitar visualmente controles o botones de envío (`disabled={isSubmitting}`) durante mutaciones asíncronas para evitar dobles clics.
- **Transacciones e Idempotencia**:
  - Utilizar `runTransaction` cuando una escritura dependa del estado anterior (ej. actualizar contadores o balances).
- **IDs Deterministas Implementados (servicio → colección)**:
  - `survey_answers`: `setDoc(doc(db, "survey_answers", \`${assignmentId}_${questionId}\`), data, { merge: true })`. Previene duplicados ante dobles envíos o re-intentos de red. El ID garantiza exactamente una respuesta por pregunta por asignación.
- **Oportunidades Futuras de Mejora (Identificadas pero NO aplicadas en esta tarea)**:
  - `plan_levels`: Evaluar en el futuro IDs deterministas como `${planId}_level${levelIndex}`.

---

## 3. Prevención de Documentos Huérfanos

Un documento huérfano ocurre cuando se elimina una entidad padre (ej. un grupo o encuesta) manteniendo vivos sus documentos hijos (miembros, asignaciones, preguntas).

### Protocolo de Limpieza en Cascada:
1. **Borrado Atómico con `writeBatch()`**: Al eliminar un `training_groups`, se deben eliminar en el mismo lote sus miembros asociados en `training_group_members`.
2. **Asignaciones de Encuestas**: Al eliminar un `custom_surveys`, se deben limpiar o deshabilitar sus `survey_assignments` y `survey_questions`.
3. **Límite de Batch**: Recordar que `writeBatch` soporta un máximo de 500 operaciones por lote. Si los hijos superan los 500 documentos, fragmentar en múltiples lotes.

---

## 4. Manejo de Condiciones de Carrera y Concurrencia

- **Actualizaciones Paralelas**: Evitar modificar un mismo documento desde múltiples clientes sin utilizar `runTransaction()` o `arrayUnion()` / `arrayRemove()` / `increment()`.
- **React Query Rollbacks**: Al implementar mutaciones optimistas en la interfaz, guardar la captura del estado anterior (`onMutate`) y revertir el cache (`onError`) si Firestore rechaza la operación.

---

## 5. Integridad de Datos Legacy e Invariantes

- **Colecciones Deprecadas (`seguimiento_personal`)**: Nunca escribir nuevos registros. Preservar la colección exclusivamente en modo lectura mientras se migran las funcionalidades a `tracking_*` y `weight_history`.
- **Consistencia entre `profiles` y `user_roles`**: Todo `userId` activo debe contar con su correspondiente registro en `profiles/${userId}` y `user_roles/${userId}`.
- **Enfoque de Mínimo Cambio Seguro**: Aplicar siempre la modificación más pequeña y segura que garantice la integridad de los datos sin reestructurar el sistema de forma innecesaria.
