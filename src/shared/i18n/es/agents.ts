import type { Messages } from '../messages'

export const agents: Messages['agents'] = {
  title: 'Agents',
  viewLabel: 'Vista',
  modeBrowse: 'Resumen',
  modeGuide: 'Guía',
  reload: 'Recargar',
  build: 'Crear agente',
  buildFirst: 'Crear el primer agente',
  subtitle: (count: number, hosts: number): string => `${count} ${count === 1 ? 'agente' : 'agentes'} en ${hosts === 1 ? 'un equipo' : `${hosts} equipos`} · especialistas a los que Claude delega tareas`,
  subtitleIdle: 'Especialistas a los que Claude delega tareas',
  emptyTitle: 'Todavía no hay agentes',
  emptyBody: 'Un agente es un especialista con su propia tarea, sus propias herramientas y su propio contexto. Se buscan en ~/.claude/agents, en los proyectos y en los plugins.',
  noMatchTitle: 'Ningún agente coincide',
  noMatchBody: 'La búsqueda abarca nombre, descripción, resumen, herramientas y Skills.',
  clearSearch: 'Borrar búsqueda',
  detailsAria: 'Detalles del agente',
  pickTitle: 'Elige un agente',
  pickBody: 'Elige un agente a la izquierda: qué hace, cuándo lo usa Claude, herramientas, Skills e instrucciones.',
  searchLabel: 'Buscar agentes',
  searchPlaceholder: 'Nombre, tarea, herramienta o Skill',

  groups: {
    user: 'Propios',
    userHint: 'disponibles en todos los proyectos',
    project: 'Proyecto',
    projectHint: 'solo en este proyecto',
    plugin: 'Plugin',
    pluginHint: 'de un plugin, solo lectura',
    other: 'Otros'
  },
  list: {
    noDescription: 'Sin descripción',
    tools: (n: number): string => `${n} ${n === 1 ? 'herramienta' : 'herramientas'}`,
    allTools: 'todas las herramientas',
    skills: (n: number): string => (n === 1 ? '1 Skill' : `${n} Skills`),
    proactive: 'por iniciativa propia',
    proactiveTitle: 'Claude usa este agente por su cuenta'
  },
  inheritModel: 'Como la sesión principal',

  settingRows: {
    model: 'Modelo',
    effort: 'Esfuerzo',
    permission: 'Permisos',
    maxTurns: 'Turnos máx.',
    memory: 'Memoria',
    isolation: 'Aislamiento',
    background: 'Segundo plano',
    modelInherited: 'Como la sesión principal',
    modelInheritedExplain: 'Sin modelo definido: Claude usa el modelo de la sesión actual.',
    modelCustomExplain: 'ID de modelo personalizado.',
    sessionValue: 'Como la sesión',
    effortInheritedExplain: 'Adopta el esfuerzo de razonamiento de la sesión.',
    permissionInheritedExplain: 'Adopta el modo de permisos de la sesión desde la que se inicia.',
    unlimited: 'Ilimitado',
    turnsUnlimitedExplain: 'Trabaja hasta terminar la tarea.',
    turnsLimitedExplain: 'Se detiene tras este número de pasos y entrega un resultado parcial.',
    memoryOff: 'Desactivada',
    memoryOffExplain: 'Empieza cada vez sin recordar ejecuciones anteriores.',
    isolationWorktree: 'Worktree propio',
    isolationProject: 'En la carpeta del proyecto',
    isolationWorktreeExplain: 'Trabaja en una copia de Git y no molesta al trabajo en paralelo.',
    isolationProjectExplain: 'Modifica los archivos directamente en el proyecto.',
    yes: 'Sí',
    no: 'No',
    backgroundYesExplain: 'Sigue ejecutándose en segundo plano mientras Claude hace otra cosa.',
    backgroundNoExplain: 'Claude espera su resultado.'
  },

  detail: {
    origin: { user: 'Agente propio', project: 'Agente de proyecto', plugin: 'Agente de plugin', synced: 'Sincronizado', disabled: 'Desactivado' },
    pluginOrigin: (name: string): string => `Plugin ${name}`,
    projectOrigin: (name: string): string => `Proyecto ${name}`,
    editCopy: 'Editar como copia',
    edit: 'Editar',
    automate: 'Automatizar',
    delete: 'Eliminar agente',
    whatItDoes: 'Qué hace',
    noSummary: 'Aún no hay resumen. Claude Haiku lee el archivo y lo explica en dos frases.',
    explain: 'Explicar',
    whenUsed: 'Cuándo lo usa Claude',
    noDescription: 'Sin descripción: Claude no puede saber cuándo encaja.',
    proactiveYes: 'Claude le delega por su cuenta las tareas adecuadas.',
    proactiveNo: 'Claude lo usa cuando la tarea encaja con la descripción o cuando lo nombras.',
    callText: (name: string): string => `Llamada directa: \`@agent-${name}\` en el chat, o como sesión completa con \`claude --agent ${name}\`.`,
    settings: 'Ajustes',
    tools: 'Herramientas',
    toolsInheritAll: 'Sin restricción: puede hacer todo lo que puede la sesión, incluidas las herramientas MCP.',
    toolMcp: 'Herramienta de un servidor MCP.',
    toolCustom: 'Herramienta propia o restringida.',
    blocked: 'Bloqueadas:',
    skills: 'Skills',
    noSkills: 'No precarga Skills ni menciona ninguna.',
    skillPreloadedTitle: 'Se carga completa al iniciar',
    skillMentionedTitle: 'Se menciona en las instrucciones',
    preloaded: 'precargada',
    mentioned: 'mencionada',
    skillMissingTitle: 'La Skill no está instalada en este equipo',
    skillMissing: (name: string): string => `${name} · falta`,
    automations: 'Automatizaciones',
    onlyWhenCalled: 'Solo se ejecuta cuando Claude lo llama.',
    runBySchedule: 'Ejecutar según un horario',
    scheduleOff: 'desactivada',
    quality: 'Control de calidad',
    qualityClean: 'Sin observaciones. Bien descrito, restringido con criterio y con indicaciones sobre la salida.',
    instructions: 'Instrucciones',
    showLess: 'Mostrar menos',
    showAll: 'Mostrar todo',
    instructionsEmpty: 'Vacías: el agente trabaja solo con la tarea que Claude le da.',
    fileAria: 'Archivo',
    showInFolder: 'Mostrar en la carpeta',
    preservedKeys: (keys: string): string => `Otros campos del archivo que se conservan al editar: ${keys}`
  },

  finding: { tip: 'Consejo', warn: 'Advertencia', error: 'Error' },
  score: {
    great: 'Muy bien construido',
    fair: 'Aceptable, con margen de mejora',
    gaps: 'Con lagunas',
    incomplete: 'Incompleto',
    meter: 'Calidad'
  },

  builder: {
    back: 'Volver al resumen',
    editTitle: (name: string): string => `Editar ${name || 'agente'}`,
    copyTitle: (name: string): string => `Copia de ${name}`,
    newTitle: 'Nuevo agente',
    unsaved: 'Cambios sin guardar',
    saved: 'Todo guardado',
    notSaved: 'Aún sin guardar',
    cancel: 'Cancelar',
    save: 'Guardar',
    saveTitle: 'Guardar (Ctrl+S)',
    toolsTitle: 'Herramientas',
    toolsExplain: 'Qué puede hacer el agente. Menos es mejor: un revisor no necesita permisos de escritura, un investigador no necesita una shell.',
    sideAria: 'Revisión y vista previa',
    chooseProject: 'Elegir proyecto',
    nameFallback: 'nombre',
    sections: { start: 'Empezar con IA', identity: 'Nombre y uso', place: 'Ubicación', model: 'Modelo y razonamiento', tools: 'Herramientas', skills: 'Skills', rights: 'Permisos y comportamiento', prompt: 'Instrucciones' },

    startNew: 'Empezar con IA',
    startImprove: 'Mejorar con IA',
    startNewExplain: 'Describe con tus palabras qué debe poder hacer el agente. Claude Sonnet elige nombre, herramientas, modelo y permisos y escribe las instrucciones. Después puedes ajustarlo todo.',
    startImproveExplain: 'Claude afina la descripción, las herramientas y las instrucciones según las reglas de los buenos agentes. Si quieres, indica qué debe mejorar.',
    ideaLabel: 'Idea para el agente',
    improveLabel: 'Petición de mejora',
    ideaExample: 'p. ej. «Cada mañana comprueba si fallan las pruebas en mis proyectos y escribe una lista breve con la causa y el archivo.»',
    improveExample: 'p. ej. «Que responda de forma más breve y que nunca modifique archivos.»',
    createDraft: 'Crear borrador',
    improve: 'Mejorar',
    drafting: 'Claude está redactando el agente, suele tardar entre 15 y 40 segundos.',
    revising: 'Claude está revisando el agente, suele tardar entre 15 y 40 segundos.',
    shortcut: 'Ctrl+Intro',
    whyChosen: 'Por qué Claude eligió esto',
    orTemplate: 'O empieza con una plantilla:',

    identityTitle: 'Nombre y uso',
    identityExplain: 'La descripción es lo más importante de todo el agente: Claude decide con ella si una tarea le corresponde.',
    nameLabel: 'Nombre',
    nameHint: 'Minúsculas y guiones. Se convierte en el nombre del archivo y en la llamada (@agent-nombre).',
    colorLabel: 'Color',
    whenLabel: '¿Cuándo debe usarlo Claude?',
    whenHint: (chars: number): string => `Qué hace y cuándo encaja, en 1–3 frases. Ejemplo: «Revisa cambios de código en busca de errores. Use when …» · ${chars} caracteres`,
    whenPlaceholder: 'Revisa los cambios recientes de código en busca de errores y fallos de seguridad. Use when se ha modificado código, antes de hacer commit.',
    proactiveLabel: 'Usar por iniciativa propia',
    proactiveDescription: 'Añade «Use proactively.»: Claude delega las tareas adecuadas sin que se lo pidas. Desactivado: solo cuando la tarea encaja claramente o lo nombras.',

    placeTitle: 'Ubicación',
    placeExplain: 'Los agentes propios valen para todos los proyectos del equipo. Los agentes de proyecto están en el proyecto, viajan con Git y ganan si el nombre coincide.',
    host: 'Equipo',
    appliesTo: 'Se aplica a',
    allProjects: 'Todos los proyectos',
    oneProject: 'Un proyecto',
    project: 'Proyecto',
    noProjects: (host: string): string => `No hay proyectos en ${host}`,

    modelTitle: 'Modelo y razonamiento',
    modelExplain: 'Modelos económicos para tareas simples y masivas; modelos potentes solo donde de verdad hace falta pensar.',
    modelLabel: 'Modelo',
    modelInheritExplain: 'Sin modelo propio: usa el que estés usando con Claude.',
    customModel: 'ID de modelo personalizado en el archivo:',
    customModelReplace: 'Una elección de arriba lo sustituye.',
    effortLabel: 'Esfuerzo',
    sessionLabel: 'Como la sesión',
    effortInheritExplain: 'Adopta el esfuerzo de razonamiento de la sesión en curso.',

    skillsTitle: 'Precargar Skills',
    skillsExplain: 'Los agentes no ven tus Skills automáticamente. Las Skills precargadas entran completas en su contexto al iniciar, así que elige solo lo que necesita casi siempre.',
    skillsChosen: (n: number): string => `${n} seleccionadas`,

    rightsTitle: 'Permisos y comportamiento',
    rightsExplain: 'Cuánto puede hacer sin preguntar y cómo trabaja. Para revisores, «Solo planificar» es el valor seguro.',
    rightsLabel: 'Permisos',
    rightsInheritExplain: 'Adopta los permisos de la sesión desde la que se inicia.',
    memoryLabel: 'Memoria',
    memoryOff: 'Desactivada',
    memoryOffExplain: 'Empieza cada vez sin recuerdos.',
    maxTurnsLabel: 'Máximo de turnos',
    unlimitedPlaceholder: 'ilimitado',
    maxTurnsHint: 'Freno contra bucles infinitos. Después entrega un resultado parcial.',
    worktreeLabel: 'Worktree propio',
    worktreeDescription: 'Trabaja en una copia de Git; útil cuando varios agentes modifican en paralelo.',
    backgroundLabel: 'En segundo plano',
    backgroundDescription: 'Claude no lo espera y sigue trabajando.',

    promptTitle: 'Instrucciones',
    promptExplain: 'Su prompt de sistema. No conoce vuestra conversación, solo esto y la tarea que Claude le da. Rol, procedimiento, forma de la respuesta y límites.',
    insertOutline: 'Insertar estructura',
    promptChars: (n: number): string => `${n} caracteres · Markdown`,
    initialLabel: 'Primer mensaje como agente principal',
    initialPlaceholder: 'opcional, p. ej. «Empieza con git status»',
    initialHint: 'Solo con claude --agent: se envía automáticamente como primer mensaje.',

    sideQuality: 'Control de calidad',
    noFindings: 'Sin observaciones.',
    sectionsNav: 'Secciones',
    filePreviewAria: 'Vista previa del archivo',
    filePreview: 'Así quedará el archivo',
    alsoPreserved: (keys: string): string => `Además se conserva: ${keys}`
  },

  fields: {
    colorGroup: 'Color',
    noColor: 'Sin color',
    presets: 'Selección rápida',
    inheritAllNote: 'Sin selección significa: el agente hereda **todas** las herramientas de la sesión. Marca herramientas para restringirlo.',
    moreTools: 'Más herramientas',
    moreToolsPlaceholder: 'p. ej. mcp__github__get_issue, Bash(git diff *)',
    moreToolsHint: 'Separa las herramientas MCP y los patrones con comas. Claude ignora los errores tipográficos en silencio; el control de calidad los señala.',
    filterSkills: 'Filtrar Skills',
    searchSkill: 'Buscar Skill',
    noSkillMatch: 'Ninguna Skill coincide con la búsqueda.',
    noSkillsFound: 'No se encontraron Skills. El catálogo carga Skills desde ~/.claude/skills y los plugins.'
  },

  toolGroups: { read: 'Lectura', write: 'Escritura', exec: 'Ejecución', web: 'Web', meta: 'Control' },
  tools: {
    Read: { label: 'Leer archivos', explain: 'Abre archivos, también imágenes y PDF.' },
    Grep: { label: 'Buscar contenido', explain: 'Busca texto en muchos archivos a la vez.' },
    Glob: { label: 'Encontrar archivos', explain: 'Encuentra archivos mediante patrones como **/*.ts.' },
    Edit: { label: 'Modificar archivos', explain: 'Sustituye pasajes concretos en archivos existentes.' },
    Write: { label: 'Crear archivos', explain: 'Escribe archivos nuevos o los sobrescribe por completo.' },
    NotebookEdit: { label: 'Modificar notebooks', explain: 'Edita celdas en notebooks de Jupyter.' },
    Bash: { label: 'Ejecutar comandos', explain: 'Ejecuta comandos de shell: pruebas, Git, compilaciones. La herramienta más potente.' },
    PowerShell: { label: 'PowerShell', explain: 'Ejecuta comandos de PowerShell (Windows).' },
    WebSearch: { label: 'Buscar en la web', explain: 'Busca información actual en Internet.' },
    WebFetch: { label: 'Leer páginas web', explain: 'Carga una dirección y lee su contenido.' },
    Agent: { label: 'Iniciar más agentes', explain: 'Puede encargar tareas a subagentes por sí mismo.' },
    Skill: { label: 'Usar Skills', explain: 'Puede cargar y seguir Skills.' },
    TodoWrite: { label: 'Lista de tareas', explain: 'Lleva su propia lista de comprobación para tareas largas.' }
  },
  presets: {
    read: { label: 'Solo lectura', explain: 'Seguro para revisores e investigación en el código' },
    edit: { label: 'Leer y modificar', explain: 'Para agentes que escriben código, sin comandos' },
    dev: { label: 'Desarrollar', explain: 'Modificar, además de pruebas y Git mediante la shell' },
    web: { label: 'Investigación web', explain: 'Buscar y leer en Internet, escribir notas' },
    all: { label: 'Heredar todas', explain: 'Sin restricción, incluidas las herramientas MCP' }
  },
  options: {
    model: {
      inherit: { label: 'Como la sesión principal', explain: 'Usa el modelo con el que estás usando Claude ahora.' },
      haiku: { label: 'Haiku', explain: 'Rápido y barato. Bueno para buscar, resumir y comprobaciones sencillas.' },
      sonnet: { label: 'Sonnet', explain: 'Equilibrado. Un buen valor por defecto para la mayoría de los agentes.' },
      opus: { label: 'Opus', explain: 'Fuerte en tareas difíciles, más lento y más caro.' },
      fable: { label: 'Fable', explain: 'El modelo más grande, para trabajo muy exigente.' }
    },
    effort: {
      low: { label: 'Bajo', explain: 'Poco razonamiento, respuestas rápidas.' },
      medium: { label: 'Medio', explain: 'Algo de ponderación antes de actuar.' },
      high: { label: 'Alto', explain: 'Razonamiento a fondo, bueno para revisiones y planificación.' },
      xhigh: { label: 'Muy alto', explain: 'Para errores difíciles y cuestiones de arquitectura.' },
      max: { label: 'Máximo', explain: 'Todo el razonamiento posible, lento y caro.' }
    },
    permission: {
      default: { label: 'Preguntar', explain: 'Pregunta antes de cambios y comandos. Sin nadie presente, esos pasos se rechazan.' },
      acceptEdits: { label: 'Cambios permitidos', explain: 'Puede modificar archivos sin preguntar; para comandos pregunta.' },
      auto: { label: 'Automático', explain: 'Claude decide por sí mismo qué se permite, con una comprobación de seguridad.' },
      dontAsk: { label: 'No preguntar', explain: 'Nunca pregunta; lo que no está autorizado se rechaza.' },
      plan: { label: 'Solo planificar', explain: 'Lee y planifica, no cambia nada. Bueno para revisores.' },
      bypassPermissions: { label: 'Todo permitido', explain: 'Sin preguntas ni bloqueos. Úsalo solo en carpetas seguras.' }
    },
    memory: {
      user: { label: 'Para mí', explain: 'Recuerda cosas entre proyectos en tu carpeta de usuario.' },
      project: { label: 'En el proyecto', explain: 'La memoria está en el proyecto y viaja con Git.' },
      local: { label: 'Solo local', explain: 'Memoria en el proyecto, pero no en Git.' }
    }
  },

  lint: {
    nameMissing: 'Falta el nombre. Claude llama al agente por este nombre.',
    nameFormat: 'El nombre solo puede tener minúsculas, cifras y guiones, p. ej. «code-reviewer».',
    descriptionMissing: 'Falta la descripción. Sin ella Claude no sabe cuándo encaja el agente.',
    descriptionShort: 'Descripción muy corta. Indica en concreto para qué sirve y cuándo debe usarlo Claude.',
    descriptionLong: 'Descripción larga. Se carga en cada sesión; los detalles van en las instrucciones.',
    noTrigger: 'No se reconoce ningún desencadenante. Redáctalo como «Use when …».',
    notProactive: 'Si Claude debe usarlo por su cuenta, añade «Use proactively …». Si no, solo cuando lo nombres.',
    promptMissing: 'Faltan las instrucciones. El agente empieza sin conocimientos previos; aquí se explica cómo trabaja.',
    promptShort: 'Instrucciones muy breves. Describe el rol, el procedimiento y la forma de la respuesta.',
    promptLong: 'Instrucciones muy largas. El conocimiento recurrente encaja mejor como una Skill que el agente precarga.',
    noOutput: 'Sin indicación sobre la salida. Di qué debe devolver (p. ej. «lista con archivo:línea, como máximo 200 palabras»); si no, inunda el contexto principal.',
    noLimits: 'No se indican límites. Una sección «Límites» evita cambios no deseados.',
    inheritsAllTools: 'Hereda todas las herramientas. Con menos herramientas el agente es más seguro y más certero.',
    manyTools: 'Muchas herramientas. Da solo lo que el agente necesita para su tarea.',
    unknownTools: (names: string): string => `Herramientas desconocidas: ${names}. Los errores tipográficos se ignoran en silencio.`,
    reviewWrites: 'Suena a revisar o buscar, pero puede modificar. «Solo lectura» o el modo «Solo planificar» sería más seguro.',
    bypass: '«Todo permitido» desactiva todas las comprobaciones de seguridad. Úsalo solo en carpetas donde nada pueda romperse.',
    haikuTip: 'La búsqueda pura va más rápida y barata con Haiku.',
    manySkills: 'Cada Skill precargada entra completa en el contexto. Precarga solo lo imprescindible.'
  },

  service: {
    notMarkdown: (path: string): string => `«${path}» no es un archivo Markdown.`,
    pluginCopyOnly: 'Este agente pertenece a un plugin y solo se puede guardar como copia.',
    deleteOnlyOwn: 'Solo se pueden eliminar agentes propios de una carpeta .claude/agents.',
    fileLabel: (path: string): string => `Archivo de agente ${path}`,
    reloadHint: 'Recarga la lista.',
    ideaTooShort: 'Describe en una o dos frases qué debe hacer el agente.',
    currentMissing: 'Para mejorar falta el agente actual.',
    pickProject: 'Elige un proyecto: los agentes de proyecto están en la carpeta de un proyecto de la lista.',
    noJson: 'La respuesta no contenía ningún objeto JSON',
    unreadableJson: (detail: string): string => `JSON ilegible: ${detail}`,
    notObject: 'La respuesta no era un objeto',
    incompleteAnswer: 'En la respuesta faltan el nombre, la descripción o las instrucciones'
  },

  store: {
    discardTitle: '¿Descartar los cambios?',
    discardMessage: 'El agente aún no está guardado.',
    discard: 'Descartar',
    saved: (name: string): string => `Agente «${name}» guardado`,
    deleteTitle: (name: string): string => `¿Eliminar el agente «${name}»?`,
    deleteMessage: (path: string): string => `Se eliminará el archivo ${path}. Las automatizaciones con este agente dejarán de funcionar.`,
    delete: 'Eliminar',
    deleted: (name: string): string => `Agente «${name}» eliminado`
  },

  promptOutline: [
    'Eres <rol en una frase>.',
    '',
    '## Tarea',
    '<Qué haces y qué debe existir al final.>',
    '',
    '## Procedimiento',
    '1. <Primer paso>',
    '2. <Segundo paso>',
    '3. <Comprobar que el resultado es correcto>',
    '',
    '## Salida',
    '<Forma de la respuesta al agente principal: p. ej. lista breve con archivo:línea, como máximo 200 palabras.>',
    '',
    '## Límites',
    '- <Qué no haces nunca, p. ej. no hacer commits, no modificar archivos fuera de src/>'
  ].join('\n'),

  templates: {
    reviewer: {
      label: 'Revisor de código',
      explain: 'Lee los cambios y señala errores, no modifica nada',
      description: 'Revisa los cambios recientes de código en busca de errores, fallos de seguridad y puntos poco claros. Use proactively after larger changes, before committing (tras cambios grandes, antes de hacer commit).',
      prompt: [
        'Eres un revisor de código con experiencia. No modificas nada, encuentras problemas.',
        '',
        '## Procedimiento',
        '1. Obtén los cambios con `git diff` (y `git diff --staged`).',
        '2. Lee los archivos afectados en su contexto, no solo las líneas modificadas.',
        '3. Busca errores reales: lógica incorrecta, falta de gestión de errores, fallos de seguridad, casos límite.',
        '4. Comprueba cada hallazgo antes de comunicarlo. Nada de suposiciones presentadas como hechos.',
        '',
        '## Salida',
        'Una lista, de lo más grave a lo menos. Por hallazgo: `archivo:línea`, una frase sobre el problema, una frase sobre la solución.',
        'Sin cuestiones de estilo, sin elogios. Si no encuentras nada serio, dilo exactamente así en una frase.',
        '',
        '## Límites',
        '- No modificar archivos, no hacer commits.'
      ].join('\n')
    },
    researcher: {
      label: 'Explorador de código',
      explain: 'Busca rápido en el proyecto y resume',
      description: 'Averigua dónde y cómo está implementada una cosa en el código y entrega un resumen breve con los lugares encontrados. Use proactively when many files need to be searched (cuando hay que buscar en muchos archivos).',
      prompt: [
        'Buscas en el código e informas brevemente de lo que has encontrado.',
        '',
        '## Procedimiento',
        '1. Busca de forma amplia con Glob y Grep y lee solo los pasajes relevantes.',
        '2. Sigue las llamadas hasta la implementación real.',
        '',
        '## Salida',
        'Como máximo 150 palabras más una lista `archivo:línea – qué ocurre allí`. No devuelvas archivos enteros.'
      ].join('\n')
    },
    tester: {
      label: 'Redactor de pruebas',
      explain: 'Escribe y ejecuta pruebas para código nuevo',
      description: 'Escribe las pruebas que faltan para código nuevo o modificado y las ejecuta. Use when new features were added without tests (cuando han surgido funciones nuevas sin pruebas).',
      prompt: [
        'Escribes pruebas al estilo del proyecto.',
        '',
        '## Procedimiento',
        '1. Averigua qué framework de pruebas y qué patrones usa el proyecto (lee las pruebas existentes).',
        '2. Escribe pruebas del comportamiento, no de los detalles de implementación. Primero los casos límite.',
        '3. Ejecuta las pruebas. Si una falla, comprueba si está mal la prueba o el código.',
        '',
        '## Salida',
        'Qué pruebas has creado, el resultado de la ejecución y los errores encontrados en el código.',
        '',
        '## Límites',
        '- No modificar el código de producción, solo informar.'
      ].join('\n')
    },
    web: {
      label: 'Investigador web',
      explain: 'Investiga en Internet con fuentes',
      description: 'Investiga una pregunta en Internet y entrega una respuesta fundamentada con fuentes. Use when current information, prices or documentation are needed (cuando se necesita información actual, precios o documentación).',
      prompt: [
        'Investigas a fondo y no inventas nada.',
        '',
        '## Procedimiento',
        '1. Busca con varias formulaciones, en español y en inglés.',
        '2. Lee tú mismo los mejores resultados. Prefiere fuentes oficiales y datos actuales.',
        '3. Si las fuentes se contradicen, menciona ambas.',
        '',
        '## Salida',
        'Respuesta de como máximo 200 palabras y después las fuentes como lista con enlace y fecha.',
        '',
        '## Límites',
        '- Menciona solo enlaces que hayas abierto de verdad.'
      ].join('\n')
    },
    docs: {
      label: 'Redactor de documentación',
      explain: 'Mantiene al día el README y la documentación',
      description: 'Actualiza el README y la documentación para que coincidan con el código actual. Use when features, commands or settings were changed (cuando se han cambiado funciones, comandos o ajustes).',
      prompt: [
        'Mantienes al día la documentación de un proyecto.',
        '',
        '## Procedimiento',
        '1. Lee el README y la documentación existente, y después el código al que se refieren.',
        '2. Corrige lo que ya no es cierto. Añade solo lo que realmente falta.',
        '3. Conserva el tono, el idioma y la estructura de la documentación existente.',
        '',
        '## Salida',
        'Lista de los archivos modificados con una frase por cambio.',
        '',
        '## Límites',
        '- No modificar código. No crear archivos de documentación nuevos sin motivo.'
      ].join('\n')
    }
  },

  guide: {
    navAria: 'Contenido',
    toc: { what: 'Qué es un agente', compare: 'Agente, Skill, comando', decide: 'Cómo decide Claude', anatomy: 'Estructura de un archivo', rules: 'Reglas para buenos agentes', settings: 'Todos los ajustes', automate: 'Automatizar' },
    what: {
      p1: 'Un agente (en Claude Code «subagent») es un **especialista con su propia ventana de contexto**. Claude le da una tarea parcial, él la resuelve con sus propias instrucciones, herramientas y modelo y devuelve solo el resultado. Los pasos intermedios, es decir, cientos de archivos leídos o registros largos, se quedan con él.',
      p2: 'Así la sesión principal se mantiene corta y clara. Los agentes sirven para tareas que leen mucho y devuelven poco: buscar en el código, revisar cambios, ejecutar pruebas, investigar en la web.'
    },
    compare: {
      colWhat: 'Qué es',
      colWhen: 'Cuándo usarlo',
      rows: [
        ['Agente', 'Un colaborador propio con contexto, herramientas y modelo propios', 'Una tarea parcial cerrada cuyos pasos intermedios no hace falta que vea nadie'],
        ['Skill', 'Conocimiento e instrucciones que Claude carga por sí mismo cuando hace falta', 'Un procedimiento recurrente que Claude debe seguir en la misma conversación'],
        ['Comando', 'Un prompt guardado que inicias con /nombre', 'Algo que inicias tú mismo con regularidad']
      ]
    },
    decide: {
      auto: '**Automáticamente:** Claude conoce el nombre y la descripción de todos los agentes. Si una tarea encaja con una descripción, Claude la delega. Con «Use proactively» en la descripción lo hace mucho más a menudo.',
      targeted: '**De forma directa:** escribes `@agent-nombre` o «Usa el agente code-reviewer para …».',
      session: '**Como sesión completa:** `claude --agent nombre` inicia Claude directamente como ese agente, con sus herramientas e instrucciones.',
      precedence: 'Si hay dos agentes con el mismo nombre, gana el del proyecto sobre el propio, y el propio sobre el de un plugin.'
    },
    anatomy: {
      intro: 'Un agente es un archivo Markdown en `~/.claude/agents/` (para todos los proyectos) o `<proyecto>/.claude/agents/`. Arriba está el frontmatter con los ajustes y debajo las instrucciones.',
      parts: [
        { code: '---\nname: code-reviewer', title: 'Nombre', text: 'Único, minúsculas y guiones. Con él lo llamas: @agent-code-reviewer.' },
        {
          code: 'description: "Revisa cambios de código en busca de errores.\n  Use proactively after larger changes."',
          title: 'Descripción',
          text: 'El desencadenante. Claude lee solo esta línea para decidir si encaja. Qué y cuándo, no cómo.'
        },
        { code: 'tools: Read, Grep, Glob, Bash', title: 'Herramientas', text: 'Herramientas permitidas. Si falta la línea, hereda todas. Un revisor no necesita Write.' },
        { code: 'model: sonnet\neffort: high\npermissionMode: plan\n---', title: 'Modelo y permisos', text: 'Opcional. Sin indicación adopta lo que use la sesión.' },
        {
          code: 'Eres un revisor de código con experiencia.\n\n## Procedimiento\n1. Leer git diff …\n\n## Salida\nLista con archivo:línea …\n\n## Límites\n- No modificar nada.',
          title: 'Instrucciones',
          text: 'Su prompt de sistema. No ve vuestra conversación, solo esto y la tarea que Claude le da.'
        }
      ]
    },
    rules: {
      items: [
        { title: 'Una tarea por agente', text: '«Revisa código» y «escribe documentación» son dos agentes. Los agentes para todo nunca se eligen de forma fiable.' },
        { title: 'La descripción es un desencadenante', text: 'Formula cuándo encaja: «Use when …», «Use proactively after …». Los detalles del procedimiento van en las instrucciones, porque la descripción se carga en cada sesión.' },
        { title: 'Las menos herramientas posibles', text: 'Mínimo privilegio: los lectores reciben Read, Grep, Glob. Menos herramientas significa menos riesgo y un trabajo más certero.' },
        { title: 'Fijar la respuesta', text: 'Di exactamente qué vuelve: «lista con archivo:línea, como máximo 200 palabras». Si no, inunda el contexto del agente principal, y eso es justo lo que un agente debe evitar.' },
        { title: 'Dar todo lo necesario', text: 'Empieza sin conocimientos previos. Las reglas del proyecto, rutas y comandos van en las instrucciones o en una Skill precargada.' },
        { title: 'El modelo adecuado', text: 'Haiku para buscar y resumir, Sonnet como valor por defecto, Opus solo para trabajo de razonamiento difícil. Así ahorras cuota.' },
        { title: 'Indicar los límites', text: 'Lo que nunca hace: hacer commit, push, modificar archivos fuera de una carpeta. Para revisores, además «Solo planificar».' }
      ],
      note: 'El control de calidad del builder comprueba en directo la mayoría de estas reglas.'
    },
    settings: {
      colField: 'Campo',
      colMeaning: 'Significado',
      colAdvice: 'Recomendación',
      rows: [
        ['name', 'Nombre y llamada', 'Obligatorio. Corto, describe el rol.'],
        ['description', 'Cuándo lo usa Claude', 'Obligatorio. 1–3 frases con desencadenante.'],
        ['tools', 'Herramientas permitidas', 'Si se omite hereda todas; si no, una lista.'],
        ['disallowedTools', 'Herramientas bloqueadas', 'Cuando casi todo debe estar permitido, salvo p. ej. Write.'],
        ['model', 'Modelo', 'haiku, sonnet, opus, fable o inherit.'],
        ['effort', 'Esfuerzo', 'de low a max; alto para revisar y planificar.'],
        ['permissionMode', 'Permisos sin preguntar', 'plan para revisores, acceptEdits para quien escribe.'],
        ['maxTurns', 'Número máximo de pasos', 'Freno contra bucles infinitos.'],
        ['skills', 'Skills precargadas', 'Solo lo que necesita casi siempre.'],
        ['memory', 'Memoria entre ejecuciones', 'project, si debe aprender de ejecuciones anteriores.'],
        ['isolation', 'Worktree de Git propio', 'worktree, cuando varios agentes modifican en paralelo.'],
        ['background', 'Se ejecuta en segundo plano', 'Para tareas largas que Claude no debe esperar.'],
        ['color', 'Color en la interfaz', 'Solo visualización.'],
        ['hooks, mcpServers', 'Hooks y servidores MCP propios', 'Para usuarios avanzados; el builder los deja sin cambios.']
      ]
    },
    automate: {
      p1: 'Cada agente puede ejecutarse sin ti. En el área **Automatización** defines qué agente recibe qué tarea, cuándo y en qué proyecto, por ejemplo los días laborables a las 8 «Revisa los cambios de ayer». La app lo inicia entonces con `claude -p --agent nombre` en el equipo elegido, guarda el resultado y te avisa cuando termina. Para ello no necesitas n8n ni otros programas adicionales.',
      p2: 'Las ejecuciones programadas se inician mientras la app está abierta. Si la cuota de la ventana de 5 horas está casi agotada, se omiten en lugar de vaciarla.',
      toAutomations: 'Ir a la automatización'
    }
  }
}
