/*
 * textoConstancia — el texto inicial de la plantilla de constancia, igual a la constancia que entrega la
 * dependencia («constancias pares.pdf»): título con la revista y su ISSN, «CERTIFICA QUE», los cuatro párrafos,
 * lugar y fecha, la firma con el nombre y el cargo de la editora encima de su parte baja y, más abajo, «Proyectó».
 * El nombre y el cargo son texto que la Administradora puede cambiar en Administración › Plantillas.
 *
 * ANTERIOR es el texto inicial de versiones previas: al arrancar, la API cambia por el nuevo solo las constancias
 * que todavía tienen ese texto sin modificar (las que la Administradora ya editó se respetan).
 */
export const TEXTO_CONSTANCIA = [
  '[centro]**LA EDITORA DE LA {{REVISTA}}**\n**ISSN {{issn}} (en línea)**',
  '[centro]**CERTIFICA QUE**',
  '[justificado]**{{PAR}}** participó como evaluador(a) académico(a) del artículo titulado **“{{articulo}}”**, postulado para publicación en una de las ediciones correspondientes al año {{anio}} de la {{revista}}.',
  '[justificado]Su participación se desarrolló en el marco del proceso editorial de evaluación por pares bajo la modalidad de doble ciego, y constituyó un valioso aporte al aseguramiento de la calidad, el rigor y la pertinencia científica de los contenidos publicados por la Revista.',
  '[justificado]Cabe destacar que la {{revista}} se encuentra indexada y referenciada en reconocidos sistemas de información, directorios y bases de datos académicas, entre ellos: {{indexaciones}}.',
  '[justificado]La presente certificación se expide a solicitud del interesado(a), para los fines académicos y profesionales que estime pertinentes.',
  'San Juan de Pasto, {{fecha}}.',
  'Cordialmente,',
  '[centro]{{firma}}',
  '[centro]Jenny Alejandra Mera Cordoba PhD.\nEditora Revista Investigium IRE: Ciencias Sociales y Humanas',
  // Dos renglones en blanco antes de «Proyectó», como en la constancia de la dependencia.
  '',
  '',
  '__Proyectó__: __Jenny Mera__\n              __Editora__',
].join('\n\n')

export const TEXTO_CONSTANCIA_ANTERIOR = [
  '[centro]**LA EDITORA DE LA {{REVISTA}}**\n**ISSN {{issn}} (en línea)**',
  '[centro]**CERTIFICA QUE**',
  '[justificado]**{{PAR}}** participó como evaluador(a) académico(a) del artículo titulado **«{{articulo}}»**, postulado para publicación en una de las ediciones correspondientes al año {{anio}} de la {{revista}}.',
  '[justificado]Su participación se desarrolló en el marco del proceso editorial de evaluación por pares bajo la modalidad de doble ciego, y constituyó un valioso aporte al aseguramiento de la calidad, el rigor y la pertinencia científica de los contenidos publicados por la Revista.',
  '[justificado]Cabe destacar que la {{revista}} se encuentra indexada y referenciada en reconocidos sistemas de información, directorios y bases de datos académicas, entre ellos: {{indexaciones}}.',
  '[justificado]La presente certificación se expide a solicitud del interesado(a), para los fines académicos y profesionales que estime pertinentes.',
  'San Juan de Pasto, {{fecha}}.',
  'Cordialmente,',
  '[centro]{{firma}}',
  '[centro]Editor(a) de la {{revista}}',
].join('\n\n')
