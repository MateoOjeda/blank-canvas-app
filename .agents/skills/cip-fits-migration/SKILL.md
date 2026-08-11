---
name: cip-fits-migration
description: Define el procedimiento seguro de 6 fases para ejecutar migraciones de modelos de datos en Cloud Firestore en CIP FITS (DISCOVER -> BACKUP -> MIGRATE -> VERIFY -> SOAK -> CLEANUP). Prohíbe el borrado de datos legacy sin verificación previa.
---

# CIP FITS - Firestore Data Migration Protocol

Esta skill establece el flujo obligatorio para realizar cambios de esquema o migraciones de datos NoSQL en Cloud Firestore para CIP FITS sin provocar interrupciones de servicio ni pérdida de información.

---

## Flujo de Migración en 6 Fases

```
[ 1. DISCOVER ] ──> [ 2. BACKUP ] ──> [ 3. MIGRATE ]
                                           │
                                           ▼
[ 6. CLEANUP  ] <── [ 5. SOAK   ] <── [ 4. VERIFY  ]
```

---

### Fase 1: DISCOVER (Descubrimiento y Análisis de Consumidores)
1. **Identificar la estructura de origen y de destino**: Analizar qué campos o colecciones cambian.
2. **Escaneo de Código**: Buscar todas las referencias en `src/` (componentes, hooks, servicios) que lean o escriban en la estructura heredada.
3. **Regla de Bloqueo**: Si existe al menos 1 consumidor activo en el código de producción, NO se puede proceder a la fase de borrado.

### Fase 2: BACKUP (Respaldo Preventivo)
1. Exportar la colección afectada mediante scripts de Firebase Admin SDK o respaldo de Firestore en GCP.
2. Guardar un resumen del número total de documentos y ejemplos de documentos representativos antes de cualquier modificación.

### Fase 3: MIGRATE (Ejecución de Migración Dual-Write o Batch)
1. **Escritura Dual (Dual-Write)**: Si la migración es en vivo, actualizar el servicio correspondiente para que escriba tanto en la estructura nueva como en la antigua durante la transición.
2. **Batch Scripts**: Usar `writeBatch()` de Firestore (respetando el límite de 500 operaciones por lote) para transformar documentos existentes hacia los nuevos IDs deterministas o esquemas de datos.

### Fase 4: VERIFY (Verificación Estricta)
1. Conprobar que el número de documentos migrados coincide con la colección de origen (`count()`).
2. Validar la integridad de los campos obligatorios usando esquemas de Zod.
3. Verificar que las reglas de seguridad en `firestore.rules` soporten el nuevo modelo sin bloquear lecturas ni escrituras.

### Fase 5: SOAK (Periodo de Estabilización)
1. Desplegar el código que consume la **nueva** estructura de datos.
2. Mantener la aplicación en producción en observación durante un periodo de prueba.
3. Verificar logs para confirmar que no ocurran errores de campos faltantes (`undefined`).

### Fase 6: CLEANUP (Limpieza Segura)
1. Eliminar el código de soporte heredado o las escrituras duales.
2. **Regla Invariante**: Solo proceder a borrar colecciones o campos obsoletos (ej. `seguimiento_personal`) cuando se haya auditado empíricamente que **ningún componente o servicio lee dichos datos**.

---

## Reglas Invariantes de Migración

1. **No Destrucción Inmediata**: Nunca elimines una colección legacy en un único commit junto con la introducción del nuevo modelo.
2. **Uso de IDs Deterministas**: Al migrar documentos relacionales, la nueva colección debe emplear IDs deterministas (`${idA}_${idB}`).
3. **Manejo de Errores en Batch**: Todo script de migración debe capturar errores por lote y permitir la re-ejecución idempotente sin duplicar documentos.
