import type { Messages } from '../messages'

export const howto: Messages['howto'] = {
  searchLabel: 'Buscar atajos',
  searchPlaceholder: 'Buscar atajos …',
  sectionAria: 'Atajos y trucos',
  clearSearch: 'Borrar la búsqueda',
  nothingFound: (query: string): string => `No se encontró nada para «${query}».`,
  groups: { speech: 'Entrada de voz', app: 'AI Interface', windows: 'Windows', claude: 'Claude Code' },
  keys: { mic: 'Micrófono', arrow: 'Flecha', star: 'Estrella' },
  entries: {
    dictate: { title: 'Dictar', description: 'Un clic inicia la grabación y un segundo clic reconoce el habla e inserta el texto. Nunca se envía nada automáticamente.' },
    discard: { title: 'Descartar la grabación', description: 'Cancela un dictado en curso sin insertar nada.' },
    dictateKeys: { title: 'Dictar con el teclado', description: 'Inicia/detiene el dictado para el asistente (con el foco) o el terminal activo. Actívalo arriba.' },
    switchModel: { title: 'Cambiar de modelo', description: 'Flecha junto al micrófono: Rápido, Estándar o Preciso.' },
    windowsDictation: { title: 'Dictado de Windows', description: 'Entrada de voz en todo el sistema para cualquier campo de texto, sin configuración; reconoce peor que Whisper.' },
    voiceMode: { title: 'Modo de voz de Claude Code', description: 'Si tu versión de Claude Code lo incluye: dictar directamente en el terminal mediante el servicio de Anthropic.' },
    palette: { title: 'Búsqueda / paleta de comandos', description: 'Encontrar áreas, proyectos y acciones.' },
    assistant: { title: 'Asistente', description: 'Mostrar u ocultar el asistente de IA, también desde el terminal.' },
    areas: { title: 'Áreas', description: (a: string, b: string, c: string): string => `Saltar directamente a ${a}, ${b}, ${c} … (los números aparecen en la barra lateral).` },
    newTerminal: { title: 'Terminal nuevo', description: 'Abrir el diálogo de inicio en el área Terminal.' },
    newLine: { title: 'Nueva línea en el terminal', description: (ctrlEnter: string): string => `Salto de línea en Claude Code en lugar de enviar (${ctrlEnter} también funciona).` },
    pasteImage: { title: 'Imagen en el terminal', description: 'Una imagen del portapapeles se guarda y se inserta como ruta.' },
    starSource: {
      title: 'Fuente en la barra lateral',
      description: (sources: string, websites: string, ai: string): string =>
        `En «${sources}», marca una página web con la estrella: aparecerá en «${websites}». Las páginas que lee Claude las archiva la app en «${ai}».`
    },
    clipboardHistory: { title: 'Historial del portapapeles', description: 'Elegir textos e imágenes copiados anteriormente.' },
    screenshot: { title: 'Recorte de pantalla', description: (paste: string): string => `Copia el recorte al portapapeles y pégalo después en el terminal con ${paste}.` },
    emoji: { title: 'Emojis y caracteres especiales', description: 'Selector de emojis en cualquier campo de texto.' },
    switchMode: { title: 'Cambiar de modo', description: 'Alternar entre el modo normal, el de aceptación automática y el de plan.' },
    rewind: { title: 'Rebobinar', description: 'Volver a un mensaje anterior y continuar desde ahí.' },
    commands: { title: 'Comandos', description: 'Comandos slash y skills, p. ej. /help, /clear, /compact.' },
    mention: { title: 'Mencionar un archivo', description: 'Insertar la ruta de un archivo en el mensaje con autocompletado.' },
    interrupt: { title: 'Interrumpir la respuesta', description: 'Detener la respuesta en curso; el historial se conserva.' }
  }
}
