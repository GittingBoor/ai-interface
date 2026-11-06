import type { Messages } from '../messages'

export const main: Messages['main'] = {
  defaults: { protocolDir: 'Registros', categories: { coding: 'Programación', work: 'Trabajo', learning: 'Aprendizaje' } },
  speechHotkeyKeys: ['Ctrl', 'Mayús', 'Espacio'],
  thisPc: 'Este PC',
  deviceFallback: 'Dispositivo',
  untitled: 'Sin título',
  quotaReached: 'Cuota alcanzada',
  orchestratorTitle: 'Orquestador',
  taskReviewTitle: 'Revisión de tareas',
  dialogs: { startScripts: 'Scripts de inicio', allFiles: 'Todos los archivos' },
  imageTitles: {
    fromUser: (date) => `De ti · ${date}`,
    aiImage: (date) => `Imagen de IA · ${date}`,
    screenshot: (name, date) => `Captura · ${name} · ${date}`
  },
  prerequisites: {
    claudeMissing: 'Sin Claude Code no hay terminales, consumo ni asistente.',
    loginLabel: 'Sesión iniciada en Claude',
    loginViaKey: (variable) => `Clave de API (${variable})`,
    loginHint: 'Inicia claude una vez e inicia sesión en el navegador (cuenta Pro, Max, Team o de API).',
    gitBashMissing: 'Sin Git Bash no hay avisos de escritorio ni estado (trabajando, terminado, pregunta) en los terminales.'
  },
  speechModels: {
    'small-q5_1': { label: 'Rápido', description: 'Pequeño y ágil, se equivoca más con términos técnicos.' },
    'large-v3-turbo-q5_0': { label: 'Estándar', description: 'Buena precisión, menos de un segundo en la GPU.' },
    'large-v3-q5_0': { label: 'Preciso', description: 'El mejor reconocimiento, bastante más lento.' }
  }
}
