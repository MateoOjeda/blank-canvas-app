---
name: cip-fits-engineering
description: Skill coordinadora principal para CIP FITS. Analiza la tarea, impone el modelo de precedencia de skills, proyecta las reglas del proyecto e impide la sobreasignación arquitectónica.
---

# CIP FITS - Engineering Coordinator

Esta es la skill coordinadora principal del proyecto CIP FITS (React 18 + Vite + TypeScript + Cloud Firestore + TanStack Query v5 + Tailwind CSS).

---

## 1. Modelo Estricto de Precedencia de Skills

Cuando exista una discrepancia o conflicto entre directivas, se debe aplicar el siguiente **orden jerárquico de precedencia**:

```
1. cip-fits-engineering (Coordinación principal e invariantes del proyecto)
   │
   ▼
2. cip-fits-* (Skills especializadas: architecture, firestore, data-integrity, qa, performance, ux, migration)
   │
   ▼
3. Skills específicas del proyecto verificadas
   │
   ▼
4. Skills de ingeniería genéricas (test-driven-development, systematic-debugging, impeccable, web-design-guidelines)
   │
   ▼
5. Skills de mejores prácticas externas/generales (vercel-react-best-practices, firebase-firestore, firebase-basics)
```

> **Regla de Conflicto**: Cuando una skill genérica o de mejores prácticas externas entre en conflicto con una regla verificada específica de CIP FITS, **la regla de CIP FITS prevalece siempre**, salvo que el usuario solicite explícitamente lo contrario.

---

## 2. Matriz de Ruteo de Skills

| Tipo de Tarea | Skill Principal a Activar | Skills Secundarias / Soporte |
| :--- | :--- | :--- |
| **Diseño modular, capas o estructura de componentes** | `cip-fits-architecture` | `writing-plans`, `requesting-code-review` |
| **Consultas, modelos NoSQL, escrituras o índices** | `cip-fits-firestore` | `cip-fits-data-integrity`, `firebase-security-rules-auditor` |
| **Integridad de datos, IDs deterministas, prevención duplicados** | `cip-fits-data-integrity` | `cip-fits-firestore`, `cip-fits-migration` |
| **Planificación de testing, creación de tests o E2E** | `cip-fits-qa` | `test-driven-development`, `agent-browser` |
| **Optimización de bundle, Recharts, TanStack Query v5, re-renders** | `cip-fits-performance` | `vercel-react-best-practices` |
| **UI/UX, vistas Trainer/Student, modales, responsive design** | `cip-fits-ux` | `impeccable`, `web-design-guidelines` |
| **Migración de estructuras o eliminación de datos legacy** | `cip-fits-migration` | `cip-fits-firestore`, `cip-fits-data-integrity` |
| **Diagnóstico de errores, pantallas en blanco o fallos en runtime** | `systematic-debugging` | `cip-fits-qa` |
| **Verificación final previa a completar cualquier tarea** | `verification-before-completion` | `requesting-code-review` |

---

## 3. Prohibición Explicita de Sobreasignación Arquitectónica

El agente **DEBE preferir siempre el cambio más pequeño y seguro** que resuelva el problema solicitado. Está expresamente prohibido:

1. ❌ **Migraciones innecesarias a Clean Architecture / DDD** sin evidencia de requerimiento.
2. ❌ **Adopción de gestores de estado globales (Redux, Zustand)** sin necesidad técnica demostrable.
3. ❌ **Reemplazar Firebase / Supabase** o cambiar el stack fundamental del proyecto.
4. ❌ **Reescribir módulos completos** o la aplicación entera.
5. ❌ **Introducir nuevas librerías o dependencias npm** sin justificación.
6. ❌ **Refactorizar código estable y en funcionamiento** únicamente por razones estilísticas o preferencias personales de formato.

---

## 4. Reglas Invariantes del Proyecto CIP FITS

1. **Servicio Canónico de Rutinas**: El servicio único y canónico para rutinas es `src/services/routines.ts`. Los archivos `rutinas.ts` y `routineManager.ts` son wrappers de compatibilidad (contienen `export * from "./routines"`) y **NUNCA deben volver a contener lógica duplicada**.
2. **Capa de Abstracción de Datos**: Las páginas y componentes UI NO deben realizar llamadas directas a Firestore (`collection()`, `getDocs()`, `doc()`, etc.) si existe un servicio o hook apropiado.
3. **Respeto Absoluto por Firestore Security Rules**: Cualquier cambio en modelos o consultas debe alinearse con `firestore.rules`.
4. **Protección de Datos Legacy**: Campos o colecciones históricas (`seguimiento_personal`) no deben ser borrados sin verificar la ausencia de consumidores en el código.
5. **Verificación Estricta**: Ejecutar `npm run lint`, `npm run test` y `npm run build` antes de declarar éxito.
