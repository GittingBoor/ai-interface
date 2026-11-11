import type { Messages } from '../messages'

export const errors: Messages['errors'] = {
  hostUnreachable: { message: (host, cause) => `无法连接 ${host}：${cause}`, hint: '请检查网络和 SSH 设置。' },
  notFound: (what) => `未找到${what}。`,
  validationHint: '请修正输入后重试。',
  quotaFormat: { message: (detail) => `额度响应的格式未知（${detail}）。`, hint: '请更新 Claude Code；在此之前应用不会显示数值，也不会显示错误的数值。' },
  summaryFailed: {
    message: (name, cause) => `“${name}”的摘要生成失败：${cause}`,
    hint: '请检查 Claude Code（已登录、额度充足）后重新开始；已完成的摘要会保留。'
  },
  claudeCli: { message: (detail) => `无法运行 Claude Code（${detail}）。`, hint: '请确认 Claude Code 已安装并登录（在终端中运行 claude）。' },
  gitFailed: { message: (action, cause) => `${action}失败：${cause}`, hint: '请确认已安装 Git，且文件夹可写。' },
  speechUnsupported: { message: '语音输入仅支持在 Windows 上设置。', hint: '请在 Windows 上使用，或使用 Win+H，或在 Claude Code 中使用 /voice。' },
  whisperNotInstalled: { message: (model) => `语音识别“${model}”尚未设置。`, hint: '请在“控制”标签页下载该模型。' },
  whisperStart: { message: (detail) => `无法启动语音识别（${detail}）。`, hint: '请更新显卡驱动，或在“控制”中选择较小的模型；详情见日志。' },
  transcription: { message: (detail) => `语音识别失败（${detail}）。`, hint: '请再说一次；如果再次出现，请重启应用。' },
  emptyTranscript: { message: '未识别到内容。', hint: '请靠近麦克风并稍微大声一些。' },
  download: { message: (what, detail) => `下载${what}失败（${detail}）。`, hint: '请检查网络连接后重试。' },
  downloadChecksum: { message: (what) => `${what}的校验和不匹配，文件已删除。`, hint: '请重新下载；如果再次出现，说明来源已被更改。' },
  downloadCancelled: { message: '下载已取消。' },
  speechBusy: { message: (model) => `“${model}”正在下载中。`, hint: '请等待下载完成，或取消下载。' },
  privacyLocked: { message: '隐私模式已开启。', hint: '请在设置中用 PIN 解锁。' },
  wrongPin: { message: 'PIN 错误。', tooMany: (waitSec) => `错误次数过多，请等待 ${waitSec} 秒。`, hint: '请重新输入 PIN。' },
  invalidPin: { message: 'PIN 必须由 4 到 12 位数字组成。', hint: '只能使用数字。' },
  pinRequired: { message: '尚未为隐私模式设置 PIN。', hint: '请设置新的 PIN，这会解锁隐私模式。' },
  updateFailed: { message: (step, detail) => `更新在“${step}”步骤失败（${detail}）。`, hint: '请在仓库中手动执行 git pull 和 npm run dist:win；详情见日志。' },
  terminalBusy: { message: (terminal) => `${terminal}仍在工作。`, hint: '请等待状态行“[AI Interface] … 完成”出现后再发送。' },
  orchestratorUnavailable: {
    message: (detail) => `编排器不可用：${detail}`,
    hint: '请在设置的“编排器”中确认它已开启；详情见日志。',
    disabled: '已在设置中关闭。'
  },
  agentAssist: {
    message: (detail: string): string => `Claude 没有返回可用的智能体草稿：${detail}`,
    hint: '请把想法描述得更具体一些，然后重试。'
  },
  agentExists: {
    message: (name: string): string => `此位置已存在智能体“${name}”。`,
    hint: '请换一个名称，或编辑现有智能体。'
  },
  automationRun: {
    message: (detail: string): string => `运行失败：${detail}`,
    hint: '请在历史记录中查看输出；这台电脑上的 Claude 是否已登录且配额可用？'
  },
  ipc: { message: (detail: string): string => `与后台进程的连接失败：${detail}`, hint: '请重启应用；详情见日志。' },
  unknown: '未知错误',
  unexpectedHint: '详情见日志（设置 → 打开日志）。',
  hostKeyMismatch: {
    message: (label) => `“${label}”的 SSH 密钥已更改，连接被拒绝。`,
    hint: (label) => `如果“${label}”已重新安装：设置 → 设备 → 重置指纹。`
  },
  todoNotFound: { message: '该条目已不在 TODO 文件中。', hint: '请重新加载 TODO，文件已在外部被修改。' },
  vaultMissing: { message: '尚未设置 Obsidian 库。', hint: '请在设置的“笔记”中选择库文件夹。' },
  todoConflict: { message: 'TODO 文件正在其他地方被编辑。', hint: '请稍等片刻后重试。' },
  todoEmpty: 'TODO 文本不能为空。',
  todoNewline: 'TODO 文本不能包含换行。',
  todoDateInvalid: (due) => `日期“${due}”无效，应为 YYYY-MM-DD。`,
  what: {
    project: (id) => `项目 ${id}`,
    category: (id) => `类型 ${id}`,
    image: (id) => `图片 ${id}`,
    model: (id) => `模型 ${id}`,
    source: (id) => `来源 ${id}`,
    terminal: '终端',
    terminalId: (id) => `终端 ${id}`,
    entry: (id) => `条目 ${id}`,
    folder: (path) => `文件夹 ${path}`,
    device: (id) => `设备“${id}”`,
    gitState: (path) => `${path} 的 Git 状态`,
    claudeMdOpener: '用于打开 CLAUDE.md 的程序'
  },
  hints: {
    createDevice: '请在设置的“设备”中添加，或移除该项目。',
    gitRepo: '请确认该文件夹是 Git 仓库。',
    checkFavoritePath: '请检查收藏项的路径。',
    reloadCatalog: '请重新加载目录后重试。',
    reopenTab: '请关闭标签页后重新打开。'
  },
  assistant: {
    busy: '助手仍在运行。请等待或点击“停止”。',
    failed: '助手因错误而停止。',
    hint: '请确认 Claude Code 已登录且额度充足（左下角）。',
    invalidInput: (detail) => `输入有误：${detail}`,
    pathOutside: (target, root) => `路径 ${target} 不在 ${root} 之内。`,
    projectNameInvalid: (name) => `项目名称“${name}”无效（不能包含 / \\ : * ? " < > | 等路径字符）。`,
    categoryUnknown: (category, root, available) => `${root} 中没有类别“${category}”（现有：${available}）。`,
    claudeNotFound: '未找到 Claude Code',
    commandNotFound: (command) => `未找到“${command}”`
  },
  timeout: (seconds) => `已超过 ${seconds} 秒的时限`,
  favorites: {
    categoryNameEmpty: '类型名称不能为空。',
    categoryExists: (name) => `类型“${name}”已存在。`,
    nameAndPathEmpty: '名称和路径不能为空。',
    folderIsProject: (path) => `文件夹 ${path} 已经是一个项目。`,
    colorInvalid: (color) => `颜色“${color}”无效，应为 #rrggbb 或 #rgb（例如 #e08a4f）。`,
    iconInvalid: (icon) => `图标“${icon}”无效：请选择一个表情符号或 Lucide 图标名称。`
  },
  ssh: {
    disabled: '已在设置中停用',
    keyPassphrase: (path) => `SSH 密钥 ${path} 设有口令；请启动 SSH 代理（ssh-add）`,
    keyMissing: (path) => `SSH 密钥 ${path} 不存在，且没有运行 SSH 代理`,
    homeUnknown: '无法确定主目录',
    commandFailed: (label, code, stderr) => `在“${label}”上执行命令失败（${code}）：${stderr}`
  },
  images: {
    extensionUnsupported: (extension, allowed) => `不支持 .${extension} 文件类型（支持：${allowed}）。`,
    dropTooLarge: (name, limit) => `“${name}”太大，无法传输（最多 ${limit}）。`,
    dropUnreadable: (name) => `无法读取“${name}”。文件夹只能拖入本地终端。`
  },
  models: { nameRequired: '模型需要一个名称。', ollamaNoAnswer: (code) => `Ollama 没有响应（${code}）` },
  minipc: { authMissing: '设备的响应中没有登录数据。', gitError: '错误' },
  privacy: {
    unknownHost: (host, known) => `未知的计算机“${host}”，应为：${known}。`,
    pickProjectFolder: '请选择一个项目文件夹，而不是磁盘或文件系统的根目录。',
    alreadyPrivate: '该文件夹已经是私密的。'
  },
  quota: {
    notObject: '不是对象',
    missing: (kind) => `缺少 ${kind}`,
    utilizationMissing: (kind) => `缺少 ${kind}.utilization`,
    expiredHint: '启动一次 Claude Code，登录就会续期。',
    unavailableHint: '没有数据来源时，应用不显示数值。',
    noConnection: '无法连接 Anthropic。',
    tooManyRequests: '请求过多（HTTP 429），稍后再试。',
    loginExpired: 'Claude 登录已过期。',
    requestFailed: (status) => `请求失败（HTTP ${status}）。`,
    notJson: '响应不是 JSON。',
    noLogin: '未找到 Claude 登录信息。',
    loginUnreadable: 'Claude Code 的登录文件无法读取。',
    noSubscription: '未找到订阅登录（claude.ai）。'
  },
  setup: {
    invalidJson: (detail) => `不是有效的 JSON：${detail}`,
    invalidContent: (path, detail) => `“${path}”处的内容无效：${detail}`,
    rootPath: '根',
    unknown: '未知',
    folderMissing: (path) => `文件夹 ${path} 不存在。`,
    connected: (user, host) => `已连接到 ${user}@${host}。`,
    pickProjectsRoot: '请选择一个项目文件夹。',
    deviceIdInvalid: (id) => `设备 ID“${id}”无效或重复。`
  },
  skills: { emptySummary: '响应为空', unreadable: (path) => `${path}：无法读取` },
  sources: { urlInvalid: '地址必须以 http:// 或 https:// 开头，例如 https://zh.wikipedia.org/wiki/傅里叶变换。', targetDuplicate: '该地址已在目标文件夹中。', duplicate: '该地址已在此文件夹中。' },
  speech: {
    noFreePort: '未找到可用端口',
    noTextField: '响应中没有“text”字段',
    noServerAnswer: 'whisper-server 在 GPU 和 CPU 上都没有响应',
    startCancelled: '启动已取消，因为语音识别已被关闭',
  },
  update: {
    releaseInstall: (url) => `通过发行版安装：新版本见 ${url}`,
    noCommit: '此构建不含提交标识',
    repoMissing: (dir) => `仓库 ${dir} 不存在`,
    step: '检查',
    nothingNewer: 'GitHub 上没有更新的版本',
    notInRemote: (commit, ref) => `已安装的版本 ${commit} 不在 ${ref} 中`,
    wrongBranch: (branch, expected) => `仓库位于分支 ${branch}，而不是 ${expected}`,
    dirty: '仓库有未提交的更改',
    exitCode: (code) => `退出码 ${code}`
  },
  vault: { invalidName: (name) => `文件名“${name}”无效。`, notProtocol: (path) => `“${path}”不是日志文件夹中的会话日志。` },
  links: {
    nameRequired: '请输入名称。',
    nameTaken: (name) => `名为“${name}”的链接已存在。`,
    urlRequired: '请输入页面地址。',
    urlInvalid: '地址必须以 http:// 或 https:// 开头，例如 http://192.168.1.20:8123。'
  }
}
