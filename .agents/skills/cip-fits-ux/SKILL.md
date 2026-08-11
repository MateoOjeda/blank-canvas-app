---
name: cip-fits-ux
description: Guía de UX/UI y diseño de interfaz específica para CIP FITS. Adapta las directrices de impeccable a los dominios de Entrenador y Alumno, garantizando accesibilidad, estados de carga/error/vacíos, experiencia móvil y consistencia visual.
---

# CIP FITS - User Experience & Design Guidelines

Esta skill adapta los principios generales de diseño UI/UX (`impeccable`, `web-design-guidelines`) al producto fitness **CIP FITS**.

---

## Mapeo de Dominios de Producto

### 1. Dominio Entrenador (Trainer)
- **Vistas Principales**: Dashboard, Lista de Alumnos (`/students`), Grupos de Entrenamiento (`/groups`), Gestión de Rutinas (`/routines`), Macrociclos y Planes (`/plans`), Cuestionarios (`/surveys`), Centro de Seguimiento (`/tracking`).
- **Enfoque UX**: **Productividad, Densidad de Información Controlada y Acciones Rápidas**. El entrenador necesita ver el estado global de sus alumnos de un vistazo, asignar rutinas rápidamente y revisar avances sin perderse en menús profundos.

### 2. Dominio Alumno (Student)
- **Vistas Principales**: Dashboard Principal, Rutina Diaria (`/routines`), Progreso y Peso (`/progress`), Registro de Comidas (`/meals`), Diagnósticos (`/tracking`), Transformación Visual (`/photos`), Cuestionarios Pendientes (`/surveys`).
- **Enfoque UX**: **Simplicidad Mobile-First, Motivación y Cero Ficción**. El alumno utiliza la app principalmente desde su dispositivo móvil mientras entrena en el gimnasio o registra su peso al levantarse.

---

## Criterios Visuales y Componentes UI

### 1. Responsividad y UX Móvil
- **Touch Targets**: Todos los botones, iconos de checks de series y selectores deben tener una zona táctil de al menos **44x44px**.
- **Modales en Móvil**: Usar cajones inferiores (Drawers a través de `vaul`) en pantallas pequeñas en lugar de modales flotantes apretados.
- **Tablas Responsivas**: Convertir tablas densas de datos (ej. lista de alumnos o logs) en Tarjetas (Cards) bien estructuradas en vistas móviles (`< md`).

### 2. Estados de Carga (Loading States)
- **Skeleton Loaders**: Reemplazar spinners centrados por esqueletos UI que imiten exactamente la forma del contenido entrante (`<Skeleton className="h-12 w-full" />`).
- **Estados de Botón**: Al enviar un formulario, el botón debe mostrar un spinner sutil con texto "Guardando...", manteniendo su dimensión original para evitar saltos de layout.

### 3. Estados Vacíos (Empty States)
- Todo listado o contenedor sin datos (ej. "Sin rutinas creadas", "No hay fotos registradas") DEBE contener:
  1. Un icono visual representativo en tono atenuado.
  2. Un título claro y descriptivo.
  3. Un botón de acción principal (CTA) para crear o asignar el elemento.

### 4. Manejo de Errores y Feedback (Toast Notifications)
- Usar `sonner` para tostadas de confirmación o error.
- **Éxito**: "Rutina guardada correctamente" (Toast verde/oscuro de corta duración).
- **Error**: "No se pudo actualizar el peso. Revisa tu conexión" (Toast rojo de error con detalle).
- **Validación de Formularios**: Errores inline debajo del campo correspondiente manejados con `react-hook-form` y `zod`.

### 5. Accesibilidad (a11y)
- Utilizar primitivas de Radix UI (`@radix-ui/react-*`) para modales, menús desplegables y acordes.
- Garantizar estados de foco visibles para navegación por teclado (`focus-visible:ring-2 focus-visible:ring-primary`).
- Incluir atributos `aria-label` en botones que solo contengan iconos (ej. botón de eliminar ejercicio o cerrar modal).

---

## Estándares para Formulario de Ejercicios y Rutinas

```tsx
// Estructura limpia para items de rutinas con React Hook Form + Zod
<Card className="p-4 border-border/60 hover:border-primary/40 transition-colors">
  <div className="flex items-center justify-between">
    <h4 className="font-semibold text-base">{exercise.name}</h4>
    <Badge variant="outline">{exercise.target_sets} Series</Badge>
  </div>
  {/* Detalle de repeticiones y cargas */}
</Card>
```
