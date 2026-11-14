-- =============================================================================
-- EdRev Cesmag · Datos iniciales: las dos revistas, las cuentas de la dependencia y
-- las plantillas de cada revista. Se ejecuta después de 01_esquema.sql.
--
-- Contraseña inicial de las dos cuentas: Editorial2026*  (cámbiela con
-- «¿Olvidó su contraseña?» antes de la puesta en marcha). Se guarda cifrada
-- con bcrypt (RNF-04) mediante pgcrypto.
-- =============================================================================

-- Revistas (D9: sigla, ISSN, logo y colores viven en el código de la página).
-- id 1 = Educación y Pedagogía (reep) · id 2 = Investigium IRE (ire)
INSERT INTO revista (id_revista, nombre, correo_remitente) OVERRIDING SYSTEM VALUE VALUES
  (1, 'Revista Electrónica en Educación y Pedagogía', 'revistaeducacionpedagogia@gmail.com'),
  (2, 'Revista Investigium IRE Ciencias Sociales y Humanas', 'revistainvestigiumire@gmail.com');

-- Días de espera de la respuesta del par (RF-29): 5, ajustable en Administración › Configuración
INSERT INTO configuracion (clave, valor) VALUES ('dias_espera_respuesta', '5');

-- Cuentas de la dependencia (RF-40)
INSERT INTO usuario (nombre, correo, contrasena_hash, rol) VALUES
  ('Ma. Camila Mendoza', 'maria.mendoza@unicesmag.edu.co',
   crypt('Editorial2026*', gen_salt('bf', 10)), 'administrador'),
  ('Andrea Villota', 'andrea.villota@unicesmag.edu.co',
   crypt('Editorial2026*', gen_salt('bf', 10)), 'auxiliar');

-- Plantillas en uso de cada revista (RF-45). El PDF de fondo de la constancia es un
-- marcador de posición: la Administradora sube el real desde Administración › Plantillas.
INSERT INTO plantilla (id_revista, nombre, tipo, asunto, cuerpo, fondo_pdf, en_uso)
SELECT r.id_revista, p.nombre, p.tipo, p.asunto, p.cuerpo,
       CASE WHEN p.tipo = 'constancia' THEN convert_to('%PDF-1.4 fondo pendiente', 'UTF8') END,
       TRUE
FROM revista r
CROSS JOIN (VALUES
  ('Invitación a evaluar', 'invitacion',
   'Invitación a evaluar un artículo · {{revista}}',
   E'Apreciado(a) {{par}}, {{profesion}} de la {{universidad}}:\n\nLa {{revista}} lo(a) invita a participar como par evaluador del artículo «{{articulo}}» (solicitud {{numero}}). Si acepta, recibirá los documentos desde el OJS.\n\nResponda con un clic:\n\n{{botones}}\n\nDependencia de Editorial'),
  ('Agradecimiento', 'agradecimiento',
   'Gracias por su evaluación · {{revista}}',
   E'Apreciado(a) {{par}}:\n\nAgradecemos su participación como par evaluador del artículo «{{articulo}}». Adjuntamos su constancia.\n\nDependencia de Editorial'),
  ('Constancia de participación', 'constancia', NULL,
   E'HACE CONSTAR QUE\n\n{{par}}\n\nparticipó como par evaluador del artículo «{{articulo}}» de la {{revista}} y entregó su concepto.')
) AS p(nombre, tipo, asunto, cuerpo);
