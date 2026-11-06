import type { Messages } from '../messages'

export const assistant: Messages['assistant'] = {
  title: 'Asistente',
  plan: 'Opus 5.5 · Suscripción',
  newChat: 'Chat nuevo',
  resizeAria: 'Ancho del asistente',
  resizeTitle: 'Arrastra para cambiar el ancho',
  heading: '¿Qué hay pendiente?',
  intro: 'El asistente conoce tus proyectos, TODO y la cuota. Antes de crear o escribir algo, te pregunta.',
  suggestions: ['Crear un proyecto nuevo', '¿Cómo va mi cuota?', '¿Qué se está ejecutando ahora en mis dispositivos?'],
  composer: {
    aria: 'Mensaje para el asistente',
    placeholder: 'Mensaje para el asistente',
    running: 'Respondiendo …',
    stop: 'Detener la respuesta',
    send: 'Enviar (Intro)',
    hint: 'Intro envía · Mayús+Intro nueva línea · El micrófono dicta'
  },
  typing: 'El asistente está respondiendo …',
  confirm: { waiting: 'Esperándote', preview: 'Vista previa', run: 'Ejecutar', deny: 'Rechazar', allowed: 'Aprobado', denied: 'Rechazado' },
  toolLabels: {
    list_projects: 'Lee los proyectos',
    list_categories: 'Lee los tipos de proyecto',
    list_project_folders: 'Lee las carpetas de proyectos',
    usage_summary: 'Analiza el consumo',
    quota: 'Comprueba la cuota',
    list_todos: 'Lee los TODO',
    devices_status: 'Consulta los dispositivos',
    list_skills: 'Lee las skills',
    app_settings: 'Lee los ajustes',
    create_project_folder: 'Crea la carpeta del proyecto',
    write_obsidian_note: 'Escribe una nota de Obsidian',
    add_project: 'Añade el proyecto',
    create_category: 'Crea el tipo',
    add_todo: 'Añade un TODO'
  },
  previews: {
    folder: (dir: string): string => `Carpeta: ${dir}`,
    files: 'Archivos:',
    gitInit: 'Después: git init -b main',
    note: (path: string): string => `Nota: ${path}`,
    project: (name: string, host: string, path: string, category: string, color: string, icon: string): string =>
      `Proyecto «${name}» (${host}) → ${path}
Tipo: ${category || 'ninguno'} · Color ${color}${icon ? ` · Icono ${icon}` : ''}`,
    category: (name: string, color: string, icon: string): string => `Nuevo tipo «${name}» · Color ${color}${icon ? ` · Icono ${icon}` : ''}`,
    todo: (section: string, text: string): string => `TODO en «${section}»: ${text}`
  },
  confirmTitles: {
    create_project_folder: 'Crear la carpeta del proyecto',
    write_obsidian_note: 'Escribir una nota de Obsidian',
    add_project: 'Añadir el proyecto',
    create_category: 'Crear el tipo',
    add_todo: 'Añadir un TODO'
  }
}
