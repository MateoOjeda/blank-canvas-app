---
name: cip-fits-performance
description: Guía de optimización de rendimiento para CIP FITS. Aborda la reducción del bundle de Vite (~929 KB), chunking de Recharts (~372 KB), caching en TanStack Query v5, optimización de lecturas NoSQL y prevención de re-renders.
---

# CIP FITS - Performance Optimization Guidelines

Esta skill aborda las estrategias de rendimiento específicas para CIP FITS (React 18 + Vite + TanStack Query v5 + Cloud Firestore + Recharts).

---

## Diagnóstico del Estado Actual de Rendimiento

- **Tamaño del Bundle Principal (`index`)**: Aproximadamente **929 KB**.
- **Chunk de Recharts**: Aproximadamente **372 KB**.
- **Riesgo**: Tiempos de carga iniciales elevados en conexiones móviles o dispositivos de alumnos.

---

## 1. Estrategia de Code Splitting y Dynamic Imports

### Separación de Rutas con `React.lazy`
Ninguna vista pesada de Entrenador o Alumno debe cargarse en el bundle inicial si el usuario no ha navegado a ella.

```tsx
import { lazy, Suspense } from "react";
import { SkeletonPage } from "@/components/ui/SkeletonPage";

const TrainerDashboard = lazy(() => import("@/pages/trainer/Dashboard"));
const StudentProgress = lazy(() => import("@/pages/student/Progress"));

export function AppRoutes() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <Routes>
        <Route path="/trainer" element={<TrainerDashboard />} />
        <Route path="/student/progress" element={<StudentProgress />} />
      </Routes>
    </Suspense>
  );
}
```

### Dynamic Import de Librerías Pesadas (Recharts)
Recharts solo debe cargarse cuando la pestaña de "Progreso" o "Gráficos" esté visible.

---

## 2. Configuración de Caching y Deduplicación en TanStack Query v5

El proyecto utiliza **TanStack Query v5**. Se deben utilizar los términos oficiales de la v5: `staleTime`, `gcTime` (anteriormente `cacheTime` en v4), invalidadación de consultas (`queryClient.invalidateQueries`), prefetching y deduplicación automática de peticiones.

### Estrategia de `staleTime` y `gcTime` por Tipo de Datos

| Tipo de Datos | `staleTime` Recomendado | `gcTime` Recomendado | Razón |
| :--- | :--- | :--- | :--- |
| **Biblioteca de Ejercicios (`exercises`)** | `1000 * 60 * 30` (30 min) | `1000 * 60 * 60` (60 min) | Datos estáticos que raras veces cambian. |
| **Perfiles / Roles (`user_roles`, `profiles`)** | `1000 * 60 * 15` (15 min) | `1000 * 60 * 30` (30 min) | Cambios poco frecuentes. |
| **Rutinas y Configuración (`routines`)** | `1000 * 60 * 5` (5 min) | `1000 * 60 * 15` (15 min) | Cambian solo al editar una rutina. |
| **Logs Activos (`exercise_logs`, `weight_history`)** | `1000 * 60 * 1` (1 min) | `1000 * 60 * 5` (5 min) | Datos interactivos de uso frecuente. |

```typescript
// Configuración TanStack Query v5
export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: getExercisesService,
    staleTime: 1000 * 60 * 30, // 30 minutos sin refetch automático
    gcTime: 1000 * 60 * 60,    // 60 minutos en memoria antes de garbage collection
  });
}
```

### Prefetching e Invalidación Controlada
- **Query Invalidation**: Tras mutaciones exitosas, invalidar explícitamente solo las claves afectadas (`queryClient.invalidateQueries({ queryKey: ['routines', studentId] })`).
- **Prefetching**: Precargar datos al hacer hover sobre tarjetas de alumnos antes de la navegación.
- **Query Deduplication**: TanStack Query desduplica automáticamente peticiones idénticas activadas al mismo tiempo.

---

## 3. Optimización de Lecturas en Cloud Firestore

1. **Evitar Consultas en Cascadas (Query Waterfalls)**:
   - ❌ **Incorrecto**: `await getTrainer(); await getStudents(); await getRoutines();`
   - ✅ **Correcto**: `const [trainer, students, routines] = await Promise.all([getTrainer(), getStudents(), getRoutines()]);`
2. **Paginación y Limites**: Usar `limit(20)` en históricos extensos.

---

## 4. Prevención de Re-Renders Innecesarios

1. **Memoización de Componentes de Lista**: Usar `React.memo` en tarjetas de alumnos y filas de ejercicios.
2. **Estabilidad de Callbacks**: Usar `useCallback` en funciones pasadas como props a listas largas.
3. **Sin Componentes Internos**: No declarar componentes dentro del render de otros componentes.

---

## 5. Prohibición de Sobreasignación Arquitectónica

- **Cambio Mínimo Seguro**: No reestructurar componentes estables solo por razones estilísticas.
- **Sin Librerías Innecesarias**: No añadir manejadores de estado globales (Redux, Zustand) ni frameworks adicionales sin justificación técnica demostrable.
