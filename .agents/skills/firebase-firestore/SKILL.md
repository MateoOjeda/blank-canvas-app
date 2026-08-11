---
name: firebase-firestore
description: Reusable Cloud Firestore knowledge reference (queries, indexes, transactions, batch writes). In CIP FITS, cip-fits-firestore and cip-fits-data-integrity take precedence for project-specific rules and deterministic IDs.
---

# Generic Cloud Firestore Reference

Esta skill contiene conceptos reutilizables y mejores prácticas genéricas de Cloud Firestore NoSQL.

> [!IMPORTANT]
> **Modelo de Precedencia en CIP FITS**:
> Cuando un concepto o recomendación genérica de Firestore entre en conflicto con una regla verificada de CIP FITS (ej. uso de IDs deterministas en relaciones únicas frente a IDs aleatorios con `addDoc()`), **la regla de CIP FITS prevalece siempre**, salvo petición explícita del usuario.
>
> Para la estructura de colecciones y datos del proyecto, consultar siempre: [cip-fits-firestore](file:///c:/Users/mateo/Desktop/aplicacion/cip-fits-app/.agents/skills/cip-fits-firestore/SKILL.md) y [cip-fits-data-integrity](file:///c:/Users/mateo/Desktop/aplicacion/cip-fits-app/.agents/skills/cip-fits-data-integrity/SKILL.md).

---

## Conceptos Reutilizables de Cloud Firestore

### 1. Operadores de Consulta y Limitaciones
- **Filtros Soportados**: `where("field", "==", val)`, `where("field", "in", array)` (máximo 30 elementos), `where("field", "array-contains", val)`.
- **Índices Compuestos**: Requeridos cuando se combinan filtros de desigualdad (`>`, `<`, `!=`) con ordenamientos (`orderBy`) sobre campos distintos.

### 2. Escrituras en Lote (Batch Writes)
- Permiten ejecutar múltiples operaciones `set`, `update` o `delete` de manera atómica.
- Límite de **500 operaciones por lote**. Para lotes mayores, dividir en múltiples instanciaciones de `writeBatch(db)`.

### 3. Transacciones (`runTransaction`)
- Utilizadas para operaciones de lectura-lógica-escritura atómicas (ej. incrementar un contador basándose en el valor actual).
- Reintentan automáticamente si hay escrituras concurrentes.

### 4. Consultas Eficientes y Desuscripción
- Cancelar listeners de `onSnapshot` devolviendo la función de limpieza en `useEffect`.
- Utilizar `limit()` en listas largas o paginación por cursores (`startAfter`).
