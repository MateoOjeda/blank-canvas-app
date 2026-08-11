---
name: vercel-react-best-practices
description: React and Vite performance optimization guidelines from Vercel Engineering. Serves as a technical performance reference for React components, bundle optimization, and re-renders in CIP FITS (coordinated by cip-fits-performance).
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
---

# Vercel React Best Practices (Reference for CIP FITS)

Guía de referencia general para la optimización de rendimiento en React. En el proyecto CIP FITS, esta skill sirve como **referencia técnica secundaria**, siendo `cip-fits-performance` la skill principal y específica del proyecto.

## Áreas Principales de Referencia

1. **Eliminating Waterfalls** (`async-parallel`, `async-defer-await`): Reemplazar await secuenciales por `Promise.all`.
2. **Bundle Size Optimization** (`bundle-barrel-imports`, `bundle-dynamic-imports`): Carga perezosa de librerías pesadas (Recharts) y vistas mediante `React.lazy`.
3. **Re-render Optimization** (`rerender-memo`, `rerender-functional-setstate`, `rerender-derived-state-no-effect`): Evitar renderizaciones innecesarias en listas y componentes UI.
4. **Rendering Performance** (`rendering-conditional-render`): Preferir ternarios antes que `&&` en renderizado condicional JSX.

---

Para reglas específicas del bundle de CIP FITS (~929 KB) y React Query caching, consultar siempre: [cip-fits-performance](file:///c:/Users/mateo/Desktop/aplicacion/cip-fits-app/.agents/skills/cip-fits-performance/SKILL.md).
