import type { Messages } from '../messages'

export const errors: Messages['errors'] = {
  hostUnreachable: { message: (host, cause) => `${host} is unreachable: ${cause}`, hint: 'Check the network and SSH settings.' },
  notFound: (what) => `${what} was not found.`,
  validationHint: 'Correct the input and try again.',
  quotaFormat: {
    message: (detail) => `Unknown format of the quota response (${detail}).`,
    hint: 'Update Claude Code; until then the app shows no values rather than wrong ones.'
  },
  summaryFailed: {
    message: (name, cause) => `Summary for “${name}” failed: ${cause}`,
    hint: 'Check Claude Code (signed in, quota available) and start again; finished summaries are kept.'
  },
  claudeCli: {
    message: (detail) => `Claude Code could not be run (${detail}).`,
    hint: 'Check that Claude Code is installed and signed in (run claude in a terminal).'
  },
  gitFailed: { message: (action, cause) => `${action} failed: ${cause}`, hint: 'Check that Git is installed and the folder is writable.' },
  speechUnsupported: { message: 'Voice input is only set up on Windows.', hint: 'Use it on Windows, or use Win+H or /voice in Claude Code.' },
  whisperNotInstalled: { message: (model) => `Speech recognition “${model}” is not set up.`, hint: 'Download the model in the Control tab.' },
  whisperStart: {
    message: (detail) => `Speech recognition could not be started (${detail}).`,
    hint: 'Update the graphics driver or pick a smaller model in Control; details are in the log.'
  },
  transcription: { message: (detail) => `Speech recognition failed (${detail}).`, hint: 'Speak again; if it keeps happening, restart the app.' },
  emptyTranscript: { message: 'Nothing recognized.', hint: 'Move closer to the microphone and speak a little louder.' },
  download: { message: (what, detail) => `Download of ${what} failed (${detail}).`, hint: 'Check the internet connection and try again.' },
  downloadChecksum: {
    message: (what) => `Checksum of ${what} does not match, the file was deleted.`,
    hint: 'Download again; if it repeats, the source has been changed.'
  },
  downloadCancelled: { message: 'Download cancelled.' },
  speechBusy: { message: (model) => `“${model}” is already being downloaded.`, hint: 'Wait until the download is finished, or cancel it.' },
  privacyLocked: { message: 'Private mode is active.', hint: 'Unlock it with the PIN in the settings.' },
  wrongPin: { message: 'Wrong PIN.', tooMany: (waitSec) => `Too many failed attempts, please wait ${waitSec} s.`, hint: 'Enter the PIN again.' },
  invalidPin: { message: 'The PIN must consist of 4 to 12 digits.', hint: 'Use digits only.' },
  pinRequired: { message: 'No PIN has been set for private mode yet.', hint: 'Set a new PIN; this unlocks private mode.' },
  updateFailed: {
    message: (step, detail) => `Update failed at “${step}” (${detail}).`,
    hint: 'Run git pull and npm run dist:win manually in the repo; details are in the log.'
  },
  terminalBusy: { message: (terminal) => `${terminal} is still working.`, hint: 'Wait for the status line “[AI Interface] … done” and then send again.' },
  orchestratorUnavailable: {
    message: (detail) => `Orchestrator unavailable: ${detail}`,
    hint: 'In the settings under “Orchestrator”, check that it is switched on; details are in the log.',
    disabled: 'switched off in the settings.'
  },
  agentAssist: {
    message: (detail: string): string => `Claude did not return a usable agent draft: ${detail}`,
    hint: 'Describe the idea in a bit more detail and try again.'
  },
  agentExists: {
    message: (name: string): string => `An agent “${name}” already exists at this location.`,
    hint: 'Choose a different name or edit the existing agent.'
  },
  automationRun: {
    message: (detail: string): string => `Run failed: ${detail}`,
    hint: 'Check the output in the history; is Claude running on this machine (signed in, quota available)?'
  },
  ipc: { message: (detail: string): string => `The connection to the background process failed: ${detail}`, hint: 'Restart the app; details are in the log.' },
  unknown: 'Unknown error',
  unexpectedHint: 'Details are in the log (Settings → Open log).',
  hostKeyMismatch: {
    message: (label) => `The SSH key of “${label}” has changed, connection refused.`,
    hint: (label) => `If “${label}” was reinstalled: Settings → Devices → reset fingerprint.`
  },
  todoNotFound: { message: 'The entry no longer exists in the TODO file.', hint: 'Reload the TODOs, the file was changed externally.' },
  vaultMissing: { message: 'No Obsidian vault is set up.', hint: 'Pick a vault folder in the settings under “Notes”.' },
  todoConflict: { message: 'The TODO file is being edited elsewhere right now.', hint: 'Wait a moment and try again.' },
  todoEmpty: 'The TODO text must not be empty.',
  todoNewline: 'The TODO text must not contain a line break.',
  todoDateInvalid: (due) => `Invalid date “${due}”, expected YYYY-MM-DD.`,
  what: {
    project: (id) => `Project ${id}`,
    category: (id) => `Type ${id}`,
    image: (id) => `Image ${id}`,
    model: (id) => `Model ${id}`,
    source: (id) => `Source ${id}`,
    terminal: 'Terminal',
    terminalId: (id) => `Terminal ${id}`,
    entry: (id) => `Entry ${id}`,
    folder: (path) => `The folder ${path}`,
    device: (id) => `Device “${id}”`,
    gitState: (path) => `Git status for ${path}`,
    claudeMdOpener: 'A program to open CLAUDE.md'
  },
  hints: {
    createDevice: 'Add it in the settings under Devices or remove the project.',
    gitRepo: 'Check that the folder is a Git repository.',
    checkFavoritePath: 'Check the path of the favorite.',
    reloadCatalog: 'Reload the catalog and try again.',
    reopenTab: 'Close the tab and open it again.'
  },
  assistant: {
    busy: 'The assistant is still running. Wait or press “Stop”.',
    failed: 'The assistant stopped with an error.',
    hint: 'Check that Claude Code is signed in and the quota is available (bottom left).',
    invalidInput: (detail) => `Invalid input: ${detail}`,
    pathOutside: (target, root) => `The path ${target} is not inside ${root}.`,
    projectNameInvalid: (name) => `Project name “${name}” is invalid (no path characters such as / \\ : * ? " < > |).`,
    categoryUnknown: (category, root, available) => `Category “${category}” does not exist in ${root} (available: ${available}).`,
    claudeNotFound: 'Claude Code was not found',
    commandNotFound: (command) => `“${command}” not found`
  },
  timeout: (seconds) => `Time limit of ${seconds} s exceeded`,
  favorites: {
    categoryNameEmpty: 'The type name must not be empty.',
    categoryExists: (name) => `The type “${name}” already exists.`,
    nameAndPathEmpty: 'Name and path must not be empty.',
    folderIsProject: (path) => `The folder ${path} is already a project.`,
    colorInvalid: (color) => `Color “${color}” is invalid, expected #rrggbb or #rgb (e.g. #e08a4f).`,
    iconInvalid: (icon) => `Icon “${icon}” is invalid: choose an emoji or a Lucide icon name.`
  },
  ssh: {
    disabled: 'disabled in the settings',
    keyPassphrase: (path) => `SSH key ${path} has a passphrase; please start the SSH agent (ssh-add)`,
    keyMissing: (path) => `SSH key ${path} is missing and no SSH agent is running`,
    homeUnknown: 'Home directory could not be determined',
    commandFailed: (label, code, stderr) => `Command on “${label}” failed (${code}): ${stderr}`
  },
  images: {
    extensionUnsupported: (extension, allowed) => `File type .${extension} is not supported (allowed: ${allowed}).`,
    dropTooLarge: (name, limit) => `“${name}” is too large to transfer (at most ${limit}).`,
    dropUnreadable: (name) => `Could not read “${name}”. Folders can only be dropped into local terminals.`
  },
  models: {
    nameRequired: 'The model needs a name.',
    ollamaNoAnswer: (code) => `Ollama is not responding (${code})`
  },
  minipc: { authMissing: 'The device’s response contained no sign-in data.', gitError: 'Error' },
  privacy: {
    unknownHost: (host, known) => `Unknown computer “${host}”, expected: ${known}.`,
    pickProjectFolder: 'Please pick a project folder, not a drive or file system root.',
    alreadyPrivate: 'This folder is already private.'
  },
  quota: {
    notObject: 'not an object',
    missing: (kind) => `${kind} is missing`,
    utilizationMissing: (kind) => `${kind}.utilization is missing`,
    expiredHint: 'Start Claude Code once, then the sign-in is renewed.',
    unavailableHint: 'Without a source the app shows no values.',
    noConnection: 'No connection to Anthropic.',
    tooManyRequests: 'Too many requests (HTTP 429), next attempt later.',
    loginExpired: 'The Claude sign-in has expired.',
    requestFailed: (status) => `Request failed (HTTP ${status}).`,
    notJson: 'The response was not JSON.',
    noLogin: 'No Claude sign-in found.',
    loginUnreadable: 'The Claude Code sign-in file is unreadable.',
    noSubscription: 'No subscription sign-in (claude.ai) found.'
  },
  setup: {
    invalidJson: (detail) => `Not valid JSON: ${detail}`,
    invalidContent: (path, detail) => `Invalid content at “${path}”: ${detail}`,
    rootPath: 'root',
    unknown: 'unknown',
    folderMissing: (path) => `The folder ${path} does not exist.`,
    connected: (user, host) => `Connected to ${user}@${host}.`,
    pickProjectsRoot: 'Please pick a project folder.',
    deviceIdInvalid: (id) => `Device ID “${id}” is invalid or duplicated.`
  },
  skills: { emptySummary: 'empty response', unreadable: (path) => `${path}: unreadable` },
  sources: { urlInvalid: 'The address must start with http:// or https://, e.g. https://en.wikipedia.org/wiki/Fourier_transform.', targetDuplicate: 'This address is already in the target folder.', duplicate: 'This address is already in this folder.' },
  speech: {
    noFreePort: 'No free port found',
    noTextField: 'Response without a “text” field',
    noServerAnswer: 'whisper-server responds neither with GPU nor with CPU',
    startCancelled: 'Start cancelled because speech recognition was shut down',
  },
  update: {
    releaseInstall: (url) => `Installed from a release: new versions at ${url}`,
    noCommit: 'The build contains no commit identifier',
    repoMissing: (dir) => `Repo ${dir} is missing`,
    step: 'Check',
    nothingNewer: 'no newer version on GitHub',
    notInRemote: (commit, ref) => `installed version ${commit} is not in ${ref}`,
    wrongBranch: (branch, expected) => `Repo is on branch ${branch} instead of ${expected}`,
    dirty: 'Repo has uncommitted changes',
    exitCode: (code) => `Exit code ${code}`
  },
  vault: {
    invalidName: (name) => `Invalid file name “${name}”.`,
    notProtocol: (path) => `“${path}” is not a session log from a log folder.`
  },
  links: {
    nameRequired: 'Please enter a name.',
    nameTaken: (name) => `A link named “${name}” already exists.`,
    urlRequired: 'Please enter the address of the page.',
    urlInvalid: 'The address must start with http:// or https://, e.g. http://192.168.1.20:8123.'
  }
}
