# Workflow — CIP FITS

## Regla principal

Todos los cambios deben realizarse y probarse primero en **local**. La página web publicada debe mantenerse sin modificaciones hasta que los cambios hayan sido verificados correctamente.

## Flujo de trabajo obligatorio

### 1. Modo Plan
- Analiza el problema o cambio solicitado
- Revisa archivos y dependencias involucradas
- Explica brevemente qué se va a modificar y por qué
- No realices cambios todavía

### 2. Implementación local
- Solo después de aprobar el Plan
- Cambios únicamente en entorno local
- No hacer deploy ni modificar producción automáticamente
- Mantener intactas las funcionalidades no relacionadas

### 3. Pruebas
- Verificar que los cambios funcionen en local
- Comprobar que no se hayan roto otras funcionalidades
- Si hay errores, corregirlos en local antes de continuar

### 4. Preparación para producción
- Revisar los cambios realizados
- Comprobar que no haya archivos innecesarios, errores o cambios accidentales
- Indicar qué cambios están listos para subir

### 5. Producción
- Solo después de verificar todo en local
- No sobrescribir ni modificar producción durante desarrollo
- Después del deploy, verificar que la versión publicada coincida con la local

## Prioridad

`Plan → Local → Pruebas → Revisión → Deploy → Verificación en producción`

## Reglas importantes

- No hacer cambios directos sobre la página publicada mientras se desarrolla
- Si un cambio requiere modificar backend, frontend, BD o configuración: primero probar todo en local, luego llevar a producción
- Nunca asumir que algo funciona: siempre verificar
