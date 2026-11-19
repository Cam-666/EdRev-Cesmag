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
INSERT INTO revista (id_revista, nombre, correo_remitente, issn, indexaciones) OVERRIDING SYSTEM VALUE VALUES
  (1, 'Revista Electrónica en Educación y Pedagogía', 'revistaeducacionpedagogia@gmail.com', '2590-7476',
   'Publindex (categoría B), Redalyc, EBSCO, ERIH PLUS, Dialnet, DOAJ, REDIB, LATINDEX, Actualidad Iberoamericana, EZB, LatinREV, REDIPE, MIAR, LivRe y Ulrichsweb de ProQuest'),
  (2, 'Revista Investigium IRE Ciencias Sociales y Humanas', 'revistainvestigiumire@gmail.com', '2357-5239',
   'Publindex (categoría C), Redalyc, EBSCO, ERIH PLUS, Dialnet, DOAJ, REDIB, LATINDEX, Actualidad Iberoamericana, EZB, LatinREV, REDIPE, MIAR, LivRe y Ulrichsweb de ProQuest');

-- Días de espera de la respuesta del par (RF-29): 5, ajustable en Administración › Configuración
INSERT INTO configuracion (clave, valor) VALUES ('dias_espera_respuesta', '5');

-- Cuentas de la dependencia (RF-40)
INSERT INTO usuario (nombre, correo, contrasena_hash, rol) VALUES
  ('Ma. Camila Mendoza', 'maria.mendoza@unicesmag.edu.co',
   crypt('Editorial2026*', gen_salt('bf', 10)), 'administrador'),
  ('Andrea Villota', 'andrea.villota@unicesmag.edu.co',
   crypt('Editorial2026*', gen_salt('bf', 10)), 'auxiliar');

-- Plantillas en uso de cada revista (RF-45). El encabezado, el pie y la firma de la constancia son
-- imágenes que la Administradora sube desde Administración › Plantillas.
INSERT INTO plantilla (id_revista, nombre, clase, tipo, asunto, cuerpo)
SELECT r.id_revista, p.nombre, CASE WHEN p.tipo = 'constancia' THEN 'archivo' ELSE 'correo' END, p.tipo, p.asunto, p.cuerpo
FROM revista r
CROSS JOIN (VALUES
  ('Invitación a evaluar', 'invitacion',
   'Invitación a evaluar un artículo · {{revista}}',
   E'Apreciado(a) {{par}}, {{profesion}} de la {{universidad}}:\n\nLa {{revista}} lo(a) invita a participar como par evaluador del artículo «{{articulo}}» (solicitud {{numero}}). Si acepta, recibirá los documentos desde el OJS.\n\nResponda con un clic:\n\n{{botones}}\n\nDependencia de Editorial'),
  ('Agradecimiento', 'agradecimiento',
   'Gracias por su evaluación · {{revista}}',
   E'Apreciado(a) {{par}}:\n\nAgradecemos su participación como par evaluador del artículo «{{articulo}}». Adjuntamos su constancia.\n\nDependencia de Editorial'),
  ('Constancia de participación', 'constancia', NULL,
   E'[centro]**LA EDITORA DE LA {{REVISTA}}**\n**ISSN {{issn}} (en línea)**\n\n[centro]**CERTIFICA QUE**\n\n[justificado]**{{PAR}}** participó como evaluador(a) académico(a) del artículo titulado **«{{articulo}}»**, postulado para publicación en una de las ediciones correspondientes al año {{anio}} de la {{revista}}.\n\n[justificado]Su participación se desarrolló en el marco del proceso editorial de evaluación por pares bajo la modalidad de doble ciego, y constituyó un valioso aporte al aseguramiento de la calidad, el rigor y la pertinencia científica de los contenidos publicados por la Revista.\n\n[justificado]Cabe destacar que la {{revista}} se encuentra indexada y referenciada en reconocidos sistemas de información, directorios y bases de datos académicas, entre ellos: {{indexaciones}}.\n\n[justificado]La presente certificación se expide a solicitud del interesado(a), para los fines académicos y profesionales que estime pertinentes.\n\nSan Juan de Pasto, {{fecha}}.\n\nCordialmente,\n\n[centro]{{firma}}\n\n[centro]Editor(a) de la {{revista}}')
) AS p(nombre, tipo, asunto, cuerpo);
