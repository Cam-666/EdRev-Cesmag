-- =============================================================================
-- EdRev Cesmag · Migración para bases ya creadas (ejecutar UNA vez sobre «edrev»)
--   · plantilla.fin: para qué sirve cada plantilla (no cambia aunque no esté en uso)
--   · quita revista.firma_nombre y revista.firma_cargo (la firma es una imagen de la plantilla, no texto)
-- Una base nueva ya trae todo esto en 01_esquema.sql; no necesita este archivo.
-- =============================================================================
BEGIN;

ALTER TABLE plantilla ADD COLUMN IF NOT EXISTS fin VARCHAR(14);
UPDATE plantilla SET fin = COALESCE(
  tipo,
  CASE WHEN clase = 'archivo' THEN 'constancia'
       WHEN lower(nombre) LIKE '%agradec%' THEN 'agradecimiento'
       ELSE 'invitacion' END)
 WHERE fin IS NULL;
ALTER TABLE plantilla ALTER COLUMN fin SET NOT NULL;
ALTER TABLE plantilla DROP CONSTRAINT IF EXISTS ck_tipo_de_su_clase;
ALTER TABLE plantilla DROP CONSTRAINT IF EXISTS ck_fin_de_su_clase;
ALTER TABLE plantilla DROP CONSTRAINT IF EXISTS ck_en_uso_es_su_fin;
ALTER TABLE plantilla DROP CONSTRAINT IF EXISTS plantilla_fin_check;
ALTER TABLE plantilla ADD CONSTRAINT plantilla_fin_check CHECK (fin IN ('invitacion','agradecimiento','constancia'));
ALTER TABLE plantilla ADD CONSTRAINT ck_fin_de_su_clase CHECK ((fin = 'constancia') = (clase = 'archivo'));
ALTER TABLE plantilla ADD CONSTRAINT ck_en_uso_es_su_fin CHECK (tipo IS NULL OR tipo = fin);

ALTER TABLE revista DROP COLUMN IF EXISTS firma_nombre;
ALTER TABLE revista DROP COLUMN IF EXISTS firma_cargo;

COMMIT;
