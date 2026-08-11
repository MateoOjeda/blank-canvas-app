---
name: firebase-security-rules-auditor
description: Auditor especializado para analizar y auditar firestore.rules y storage.rules en CIP FITS. Coordinado por cip-fits-engineering y cip-fits-firestore para evaluar vulnerabilidades, bypass de roles y escalado de privilegios.
metadata:
  category: CloudSecurity
---

# Firebase Security Rules Auditor (CIP FITS Edition)

Esta skill actúa como auditor especializado de seguridad para evaluar `firestore.rules` y `storage.rules` en CIP FITS.

## Coordinación en CIP FITS

- Es invocada por `cip-fits-engineering` o `cip-fits-firestore` cuando se modifica la estructura de una colección NoSQL o se crean nuevos endpoints/rutas.
- Evalúa los cambios frente al archivo de reglas del proyecto: [firestore.rules](file:///c:/Users/mateo/Desktop/aplicacion/cip-fits-app/firestore.rules).

---

## Lista de Verificación del Auditor en CIP FITS

1. **Bypass de Creación vs Actualización (Update Bypass)**:
   - ¿Puede un usuario crear un documento válido y luego hacer un `update` para cambiar su rol a `trainer` o modificar campos protegidos?
2. **Fuente de Autoridad (`user_roles`)**:
   - Confirmar que las reglas consultan la función helper `getRole(userId)` en `user_roles` y NO confían en datos enviados en `request.resource.data`.
3. **Validación de Enlaces de Entrenador-Alumno**:
   - Verificar que `isTrainerOfStudent(studentId)` o `isStudentOfTrainer(trainerId)` validen la existencia del documento en `trainer_students/${trainerId}_${studentId}`.
4. **Protección de Datos Sensibles**:
   - `profiles`: Solo leíble por el propio usuario, entrenadores vinculados o alumnos del entrenador.
   - `seguimiento_personal`: Acceso restringido al alumno o su entrenador.
   - `trainer_changes`: Colección inmutable (`allow update: if false;`).

---

## Formato de Evaluación de Auditoría

```json
{
  "score": 1-5,
  "summary": "Evaluación general de seguridad de firestore.rules",
  "findings": [
    {
      "check": "Regla auditada",
      "severity": "critical|major|moderate|minor",
      "issue": "Descripción del riesgo",
      "recommendation": "Solución propuesta en firestore.rules"
    }
  ]
}
```
