---
name: cip-fits-architecture
description: Documenta y protege la arquitectura por capas y dominios de CIP FITS (pages -> components -> hooks -> services -> Firestore). Define responsabilidades, reglas de dependencias, servicio canónico de rutinas y límites de refactorización.
---

# CIP FITS - Software Architecture Guidelines

Esta skill establece y protege la arquitectura del proyecto CIP FITS (React 18 + Vite + TypeScript + Cloud Firestore).

---

## Estructura por Dominios y Capas

```
[ UI Layer: src/pages ] ──> [ Presentation: src/components ]
          │                                 │
          ▼                                 ▼
   [ Custom Hooks: src/hooks ] (TanStack Query v5 / State)
          │
          ▼
 [ Services Layer: src/services ] (Pure TS / Firestore SDK)
          │
          ▼
   [ Cloud Firestore ]
```

---

## Responsabilidades por Capa

### 1. Vistas y Páginas (`src/pages/`)
- Representan rutas de la aplicación (definidas en `src/App.tsx`).
- Se dividen por el rol del usuario (Trainer vs Student).
- Extraen parámetros de la URL, coordinan hooks de TanStack Query y componen la estructura principal del layout.
- **Prohibido**: Contener lógica directa de consultas NoSQL a Firestore.

### 2. Componentes UI (`src/components/`)
- Módulos presentacionales construidos con React + Tailwind CSS + Radix UI / shadcn.
- Reciben props fuertemente tipadas mediante Interfaces de TypeScript o Esquemas Zod.
- **Prohibido**: Consultar directamente la base de datos Firestore.

### 3. Custom Hooks (`src/hooks/`)
- Encapsulan el estado reactivo de la UI, la integración con TanStack Query v5 (`useQuery`, `useMutation`) y la interacción con Firebase Auth (`useAuth`).
- Manejan la invalidación de caches tras mutaciones exitosas.

### 4. Servicios Canónicos (`src/services/`)
- Módulos TypeScript puros encargados de la comunicación con Cloud Firestore (`firebase/firestore`).
- Ejecutan la validación de esquemas (Zod), mapeo de tipos y preparación de IDs deterministas.
- **Servicio Canónico de Rutinas**: `src/services/routines.ts` contiene TODA la lógica de rutinas. `rutinas.ts` y `routineManager.ts` son wrappers de compatibilidad (`export * from "./routines"`) y **NUNCA deben volver a contener lógica duplicada**.

---

## Reglas de Dependencias y Comunicación

1. `pages` pueden importar `components`, `hooks`, `services` y tipos.
2. `components` pueden importar `components/ui`, `hooks`, utilidades y tipos.
3. `hooks` pueden importar `services`, utilidades y tipos.
4. `services` **solo** interactúan con Cloud Firestore SDK, utilidades de `lib/` y esquemas Zod/TypeScript. No dependen de React ni de Hooks.
5. **No Bypassing**: Está estrictamente prohibido saltearse la capa de `services` para realizar escrituras o lecturas NoSQL directamente desde componentes cuando ya existe un servicio apropiado.

---

## Criterios de Refactorización y Límites de Alcance

### Principio del Cambio Mínimo Seguro
El agente debe aplicar siempre la solución **más pequeña, limpia y directa** que resuelva el problema sin alterar componentes adyacentes no relacionados.

### Límites Explicitos (Prohibición de Sobreasignación):
- ❌ **NO introducir patrones complejos como Clean Architecture / DDD** con capas de abstracción innecesarias en operaciones CRUD simples.
- ❌ **NO agregar gestores de estado globales (Redux, Zustand, Recoil)** cuando TanStack Query v5 y el estado local de React son suficientes.
- ❌ **NO refactorizar código estable y testeado** únicamente por razones estéticas o de preferencia personal.
- ❌ **NO cambiar la infraestructura subyacente** (Firebase, Supabase, Tailwind, Radix).

### ¿Cuándo SÍ refactorizar o extraer código?
- Cuando un archivo supere las ~250-300 líneas y dificulte la mantenibilidad.
- Cuando exista duplicación de lógica idéntica en más de dos componentes.
- Cuando sea necesario reparar un bug demostrado o una falla de seguridad.
