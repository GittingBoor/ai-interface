import type { Messages } from '../messages'

export const errors: Messages['errors'] = {
  hostUnreachable: { message: (host, cause) => `${host} no es accesible: ${cause}`, hint: 'Revisa la red y los ajustes de SSH.' },
  notFound: (what) => `${what} no se encontró.`,
  validationHint: 'Corrige los datos e inténtalo de nuevo.',
  quotaFormat: {
    message: (detail) => `Formato desconocido de la respuesta de cuota (${detail}).`,
    hint: 'Actualiza Claude Code; hasta entonces la app no muestra valores en lugar de mostrar valores erróneos.'
  },
  summaryFailed: {
    message: (name, cause) => `Falló el resumen de «${name}»: ${cause}`,
    hint: 'Revisa Claude Code (sesión iniciada, cuota disponible) y vuelve a empezar; los resúmenes terminados se conservan.'
  },
  claudeCli: {
    message: (detail) => `No se pudo ejecutar Claude Code (${detail}).`,
    hint: 'Comprueba que Claude Code esté instalado y con la sesión iniciada (ejecuta claude en el terminal).'
  },
  gitFailed: { message: (action, cause) => `Falló ${action}: ${cause}`, hint: 'Comprueba que Git esté instalado y que la carpeta sea de escritura.' },
  speechUnsupported: { message: 'La entrada de voz solo está configurada en Windows.', hint: 'Úsala en Windows o usa Win+H o /voice en Claude Code.' },
  whisperNotInstalled: { message: (model) => `El reconocimiento de voz «${model}» no está configurado.`, hint: 'Descarga el modelo en la pestaña Control.' },
  whisperStart: {
    message: (detail) => `No se pudo iniciar el reconocimiento de voz (${detail}).`,
    hint: 'Actualiza el controlador gráfico o elige un modelo más pequeño en Control; los detalles están en el registro.'
  },
  transcription: { message: (detail) => `Falló el reconocimiento de voz (${detail}).`, hint: 'Habla de nuevo; si vuelve a ocurrir, reinicia la app.' },
  emptyTranscript: { message: 'No se reconoció nada.', hint: 'Acércate al micrófono y habla un poco más alto.' },
  download: { message: (what, detail) => `Falló la descarga de ${what} (${detail}).`, hint: 'Comprueba la conexión a Internet e inténtalo de nuevo.' },
  downloadChecksum: {
    message: (what) => `La suma de comprobación de ${what} no coincide; se eliminó el archivo.`,
    hint: 'Descárgalo de nuevo; si se repite, la fuente ha cambiado.'
  },
  downloadCancelled: { message: 'Descarga cancelada.' },
  speechBusy: { message: (model) => `«${model}» ya se está descargando.`, hint: 'Espera a que termine la descarga o cancélala.' },
  privacyLocked: { message: 'El modo privado está activo.', hint: 'Desbloquéalo con el PIN en los ajustes.' },
  wrongPin: { message: 'PIN incorrecto.', tooMany: (waitSec) => `Demasiados intentos fallidos, espera ${waitSec} s.`, hint: 'Introduce el PIN de nuevo.' },
  invalidPin: { message: 'El PIN debe tener entre 4 y 12 dígitos.', hint: 'Usa solo dígitos.' },
  pinRequired: { message: 'Aún no hay un PIN definido para el modo privado.', hint: 'Define un PIN nuevo; así se desbloquea el modo privado.' },
  updateFailed: {
    message: (step, detail) => `Falló la actualización en «${step}» (${detail}).`,
    hint: 'Ejecuta manualmente git pull y npm run dist:win en el repositorio; los detalles están en el registro.'
  },
  terminalBusy: { message: (terminal) => `${terminal} sigue trabajando.`, hint: 'Espera a la línea de estado «[AI Interface] … terminado» y vuelve a enviar.' },
  orchestratorUnavailable: {
    message: (detail) => `Orquestador no disponible: ${detail}`,
    hint: 'En los ajustes, en «Orquestador», comprueba que esté activado; los detalles están en el registro.',
    disabled: 'desactivado en los ajustes.'
  },
  agentAssist: {
    message: (detail: string): string => `Claude no ha entregado un borrador de agent utilizable: ${detail}`,
    hint: 'Describe la idea con algo más de detalle e inténtalo de nuevo.'
  },
  agentExists: {
    message: (name: string): string => `Ya existe un agent «${name}» en esta ubicación.`,
    hint: 'Elige otro nombre o edita el agent existente.'
  },
  automationRun: {
    message: (detail: string): string => `La ejecución falló: ${detail}`,
    hint: 'Revisa la salida en el historial; ¿Claude se ejecuta en este equipo (sesión iniciada, cuota disponible)?'
  },
  ipc: { message: (detail: string): string => `Falló la conexión con el proceso en segundo plano: ${detail}`, hint: 'Reinicia la app; los detalles están en el registro.' },
  unknown: 'Error desconocido',
  unexpectedHint: 'Los detalles están en el registro (Ajustes → Abrir registro).',
  hostKeyMismatch: {
    message: (label) => `La clave SSH de «${label}» ha cambiado; conexión rechazada.`,
    hint: (label) => `Si «${label}» se reinstaló: Ajustes → Dispositivos → restablecer la huella.`
  },
  todoNotFound: { message: 'La entrada ya no existe en el archivo de TODO.', hint: 'Recarga los TODO; el archivo se modificó desde fuera.' },
  vaultMissing: { message: 'No hay ninguna bóveda de Obsidian configurada.', hint: 'Elige una carpeta de bóveda en los ajustes, en «Notas».' },
  todoConflict: { message: 'El archivo de TODO se está editando en otro sitio.', hint: 'Espera un momento e inténtalo de nuevo.' },
  todoEmpty: 'El texto del TODO no puede estar vacío.',
  todoNewline: 'El texto del TODO no puede contener saltos de línea.',
  todoDateInvalid: (due) => `Fecha «${due}» no válida; se esperaba AAAA-MM-DD.`,
  what: {
    project: (id) => `El proyecto ${id}`,
    category: (id) => `El tipo ${id}`,
    image: (id) => `La imagen ${id}`,
    model: (id) => `El modelo ${id}`,
    source: (id) => `La fuente ${id}`,
    terminal: 'El terminal',
    terminalId: (id) => `El terminal ${id}`,
    entry: (id) => `La entrada ${id}`,
    folder: (path) => `La carpeta ${path}`,
    device: (id) => `El dispositivo «${id}»`,
    gitState: (path) => `El estado de Git de ${path}`,
    claudeMdOpener: 'Un programa para abrir CLAUDE.md'
  },
  hints: {
    createDevice: 'Añádelo en los ajustes, en Dispositivos, o quita el proyecto.',
    gitRepo: 'Comprueba que la carpeta sea un repositorio de Git.',
    checkFavoritePath: 'Revisa la ruta del favorito.',
    reloadCatalog: 'Recarga el catálogo e inténtalo de nuevo.',
    reopenTab: 'Cierra la pestaña y ábrela de nuevo.'
  },
  assistant: {
    busy: 'El asistente sigue en marcha. Espera o pulsa «Detener».',
    failed: 'El asistente se detuvo con un error.',
    hint: 'Comprueba que Claude Code tenga la sesión iniciada y cuota disponible (abajo a la izquierda).',
    invalidInput: (detail) => `Entrada incorrecta: ${detail}`,
    pathOutside: (target, root) => `La ruta ${target} no está dentro de ${root}.`,
    projectNameInvalid: (name) => `El nombre de proyecto «${name}» no es válido (sin caracteres de ruta como / \\ : * ? " < > |).`,
    categoryUnknown: (category, root, available) => `La categoría «${category}» no existe en ${root} (disponibles: ${available}).`,
    claudeNotFound: 'No se encontró Claude Code',
    commandNotFound: (command) => `No se encontró «${command}»`
  },
  timeout: (seconds) => `Se superó el límite de tiempo de ${seconds} s`,
  favorites: {
    categoryNameEmpty: 'El nombre del tipo no puede estar vacío.',
    categoryExists: (name) => `El tipo «${name}» ya existe.`,
    nameAndPathEmpty: 'El nombre y la ruta no pueden estar vacíos.',
    folderIsProject: (path) => `La carpeta ${path} ya es un proyecto.`,
    colorInvalid: (color) => `El color «${color}» no es válido; se espera #rrggbb o #rgb (p. ej. #e08a4f).`,
    iconInvalid: (icon) => `El icono «${icon}» no es válido: elige un emoji o el nombre de un icono de Lucide.`
  },
  ssh: {
    disabled: 'desactivado en los ajustes',
    keyPassphrase: (path) => `La clave SSH ${path} tiene frase de contraseña; inicia el agente SSH (ssh-add)`,
    keyMissing: (path) => `Falta la clave SSH ${path} y no hay ningún agente SSH en marcha`,
    homeUnknown: 'No se pudo determinar el directorio personal',
    commandFailed: (label, code, stderr) => `Falló el comando en «${label}» (${code}): ${stderr}`
  },
  images: {
    extensionUnsupported: (extension, allowed) => `No se admite el tipo de archivo .${extension} (permitidos: ${allowed}).`,
    dropTooLarge: (name, limit) => `«${name}» es demasiado grande para transferirlo (máximo ${limit}).`,
    dropUnreadable: (name) => `No se pudo leer «${name}». Las carpetas solo se pueden soltar en terminales locales.`
  },
  models: { nameRequired: 'El modelo necesita un nombre.', ollamaNoAnswer: (code) => `Ollama no responde (${code})` },
  minipc: { authMissing: 'La respuesta del dispositivo no incluye datos de inicio de sesión.', gitError: 'Error' },
  privacy: {
    unknownHost: (host, known) => `Equipo «${host}» desconocido; se esperaba: ${known}.`,
    pickProjectFolder: 'Elige una carpeta de proyecto, no la raíz de una unidad ni del sistema de archivos.',
    alreadyPrivate: 'Esta carpeta ya es privada.'
  },
  quota: {
    notObject: 'no es un objeto',
    missing: (kind) => `falta ${kind}`,
    utilizationMissing: (kind) => `falta ${kind}.utilization`,
    expiredHint: 'Inicia Claude Code una vez y la sesión se renovará.',
    unavailableHint: 'Sin una fuente, la app no muestra valores.',
    noConnection: 'Sin conexión con Anthropic.',
    tooManyRequests: 'Demasiadas consultas (HTTP 429); se reintentará más tarde.',
    loginExpired: 'La sesión de Claude ha caducado.',
    requestFailed: (status) => `Falló la consulta (HTTP ${status}).`,
    notJson: 'La respuesta no era JSON.',
    noLogin: 'No se encontró ninguna sesión de Claude.',
    loginUnreadable: 'El archivo de inicio de sesión de Claude Code no se puede leer.',
    noSubscription: 'No se encontró ninguna sesión de suscripción (claude.ai).'
  },
  setup: {
    invalidJson: (detail) => `JSON no válido: ${detail}`,
    invalidContent: (path, detail) => `Contenido no válido en «${path}»: ${detail}`,
    rootPath: 'raíz',
    unknown: 'desconocido',
    folderMissing: (path) => `La carpeta ${path} no existe.`,
    connected: (user, host) => `Conectado a ${user}@${host}.`,
    pickProjectsRoot: 'Elige una carpeta de proyectos.',
    deviceIdInvalid: (id) => `El ID de dispositivo «${id}» no es válido o está duplicado.`
  },
  skills: { emptySummary: 'respuesta vacía', unreadable: (path) => `${path}: no se puede leer` },
  sources: { urlInvalid: 'La dirección debe empezar por http:// o https://, p. ej. https://es.wikipedia.org/wiki/Transformada_de_Fourier.', targetDuplicate: 'Esta dirección ya está en la carpeta de destino.', duplicate: 'Esta dirección ya está en esta carpeta.' },
  speech: {
    noFreePort: 'No se encontró ningún puerto libre',
    noTextField: 'Respuesta sin el campo «text»',
    noServerAnswer: 'whisper-server no responde ni con GPU ni con CPU',
    startCancelled: 'Inicio cancelado porque se cerró el reconocimiento de voz',
  },
  update: {
    releaseInstall: (url) => `Instalado desde una versión publicada: nuevas versiones en ${url}`,
    noCommit: 'La compilación no incluye un identificador de commit',
    repoMissing: (dir) => `Falta el repositorio ${dir}`,
    step: 'Comprobación',
    nothingNewer: 'no hay una versión más reciente en GitHub',
    notInRemote: (commit, ref) => `la versión instalada ${commit} no está en ${ref}`,
    wrongBranch: (branch, expected) => `El repositorio está en la rama ${branch} en lugar de ${expected}`,
    dirty: 'El repositorio tiene cambios sin confirmar',
    exitCode: (code) => `Código de salida ${code}`
  },
  vault: {
    invalidName: (name) => `Nombre de archivo «${name}» no válido.`,
    notProtocol: (path) => `«${path}» no es un registro de sesión de una carpeta de registros.`
  },
  links: {
    nameRequired: 'Introduce un nombre.',
    nameTaken: (name) => `Ya existe un acceso directo llamado «${name}».`,
    urlRequired: 'Introduce la dirección de la página.',
    urlInvalid: 'La dirección debe empezar por http:// o https://, p. ej. http://192.168.1.20:8123.'
  }
}
