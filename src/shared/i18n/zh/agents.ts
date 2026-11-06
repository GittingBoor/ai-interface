import type { Messages } from '../messages'

export const agents: Messages['agents'] = {
  title: '智能体',
  viewLabel: '视图',
  modeBrowse: '概览',
  modeGuide: '指南',
  reload: '重新加载',
  build: '创建 Agent',
  buildFirst: '创建第一个 Agent',
  subtitle: (count: number, hosts: number): string => `${hosts === 1 ? '1 台设备' : `${hosts} 台设备`}上共 ${count} 个 Agent · Claude 可以把任务交给的专家`,
  subtitleIdle: 'Claude 可以把任务交给的专家',
  emptyTitle: '还没有 Agent',
  emptyBody: 'Agent 是拥有独立任务、独立工具和独立上下文的专家。会在 ~/.claude/agents、各个项目和插件中查找。',
  noMatchTitle: '没有匹配的 Agent',
  noMatchBody: '搜索范围包括名称、描述、摘要、工具和 Skill。',
  clearSearch: '清除搜索',
  detailsAria: 'Agent 详情',
  pickTitle: '选择一个 Agent',
  pickBody: '在左侧选择一个 Agent：它做什么、Claude 何时使用它、工具、Skill 和指令。',
  searchLabel: '搜索 Agent',
  searchPlaceholder: '名称、任务、工具或 Skill',

  groups: {
    user: '我的',
    userHint: '所有项目均可使用',
    project: '项目',
    projectHint: '仅限此项目',
    plugin: '插件',
    pluginHint: '来自插件，只读',
    other: '其他'
  },
  list: {
    noDescription: '无描述',
    tools: (n: number): string => `${n} 个工具`,
    allTools: '全部工具',
    skills: (n: number): string => `${n} 个 Skill`,
    proactive: '主动使用',
    proactiveTitle: 'Claude 会主动使用此 Agent'
  },
  inheritModel: '与主会话相同',

  settingRows: {
    model: '模型',
    effort: '思考强度',
    permission: '权限',
    maxTurns: '最大轮数',
    memory: '记忆',
    isolation: '隔离',
    background: '后台',
    modelInherited: '与主会话相同',
    modelInheritedExplain: '未指定模型：Claude 使用当前会话的模型。',
    modelCustomExplain: '自定义模型 ID。',
    sessionValue: '与会话相同',
    effortInheritedExplain: '沿用会话的思考强度。',
    permissionInheritedExplain: '沿用启动它的会话的权限模式。',
    unlimited: '不限',
    turnsUnlimitedExplain: '持续工作直到任务完成。',
    turnsLimitedExplain: '达到这么多步后停止并报告部分结果。',
    memoryOff: '关闭',
    memoryOffExplain: '每次启动都不记得之前的运行。',
    isolationWorktree: '独立 Worktree',
    isolationProject: '在项目文件夹中',
    isolationWorktreeExplain: '在 Git 副本中工作，不干扰并行的工作。',
    isolationProjectExplain: '直接修改项目中的文件。',
    yes: '是',
    no: '否',
    backgroundYesExplain: '在 Claude 处理其他事情时继续在后台运行。',
    backgroundNoExplain: 'Claude 会等待它的结果。'
  },

  detail: {
    origin: { user: '我的 Agent', project: '项目 Agent', plugin: '插件 Agent', synced: '已同步', disabled: '已停用' },
    pluginOrigin: (name: string): string => `插件 ${name}`,
    projectOrigin: (name: string): string => `项目 ${name}`,
    editCopy: '作为副本编辑',
    edit: '编辑',
    automate: '自动化',
    delete: '删除 Agent',
    whatItDoes: '它做什么',
    noSummary: '还没有摘要。Claude Haiku 会读取该文件，并用两句话说明。',
    explain: '解释',
    whenUsed: 'Claude 何时使用它',
    noDescription: '没有描述：Claude 无法判断它何时适用。',
    proactiveYes: 'Claude 会主动把合适的任务交给它。',
    proactiveNo: '当任务符合描述或你点名时，Claude 才会使用它。',
    callText: (name: string): string => `直接调用：在聊天中输入 \`@agent-${name}\`，或以整个会话方式运行 \`claude --agent ${name}\`。`,
    settings: '设置',
    tools: '工具',
    toolsInheritAll: '没有限制：会话能做的它都能做，包括 MCP 工具。',
    toolMcp: '来自 MCP 服务器的工具。',
    toolCustom: '自定义或受限的工具。',
    blocked: '已禁用：',
    skills: 'Skill',
    noSkills: '没有预加载 Skill，也没有提及任何 Skill。',
    skillPreloadedTitle: '启动时完整加载',
    skillMentionedTitle: '在指令中被提及',
    preloaded: '预加载',
    mentioned: '提及',
    skillMissingTitle: '此设备上未安装该 Skill',
    skillMissing: (name: string): string => `${name} · 缺失`,
    automations: '自动化',
    onlyWhenCalled: '仅在 Claude 调用时运行。',
    runBySchedule: '按计划运行',
    scheduleOff: '已关闭',
    quality: '质量检查',
    qualityClean: '没有问题。描述清晰、限制得当、对输出有要求。',
    instructions: '指令',
    showLess: '收起',
    showAll: '显示全部',
    instructionsEmpty: '为空：该 Agent 只根据 Claude 交给它的任务工作。',
    fileAria: '文件',
    showInFolder: '在文件夹中显示',
    preservedKeys: (keys: string): string => `文件中的其他字段，编辑时会保留：${keys}`
  },

  finding: { tip: '提示', warn: '警告', error: '错误' },
  score: {
    great: '构建得很好',
    fair: '可用，仍有提升空间',
    gaps: '有缺漏',
    incomplete: '不完整',
    meter: '质量'
  },

  builder: {
    back: '返回概览',
    editTitle: (name: string): string => `编辑 ${name || 'Agent'}`,
    copyTitle: (name: string): string => `${name} 的副本`,
    newTitle: '新建 Agent',
    unsaved: '有未保存的更改',
    saved: '已全部保存',
    notSaved: '尚未保存',
    cancel: '取消',
    save: '保存',
    saveTitle: '保存 (Ctrl+S)',
    toolsTitle: '工具',
    toolsExplain: 'Agent 可以做什么。越少越好：审查者不需要写权限，研究者不需要 Shell。',
    sideAria: '检查与预览',
    chooseProject: '选择项目',
    nameFallback: 'name',
    sections: { start: '用 AI 开始', identity: '名称与用途', place: '保存位置', model: '模型与思考', tools: '工具', skills: 'Skill', rights: '权限与行为', prompt: '指令' },

    startNew: '用 AI 开始',
    startImprove: '用 AI 改进',
    startNewExplain: '用你自己的话描述 Agent 应该能做什么。Claude Sonnet 会选择名称、工具、模型和权限，并写出指令。之后你可以调整一切。',
    startImproveExplain: 'Claude 会按照优秀 Agent 的规则优化描述、工具和指令。你也可以说明希望改进什么。',
    ideaLabel: 'Agent 的想法',
    improveLabel: '改进需求',
    ideaExample: '例如：“每天早上检查我的项目中是否有测试失败，并列出原因和文件。”',
    improveExample: '例如：“回答要更简短，并且绝不修改文件。”',
    createDraft: '生成草稿',
    improve: '改进',
    drafting: 'Claude 正在起草 Agent，通常需要 15–40 秒。',
    revising: 'Claude 正在修改 Agent，通常需要 15–40 秒。',
    shortcut: 'Ctrl+Enter',
    whyChosen: 'Claude 为什么这样选择',
    orTemplate: '或从模板开始：',

    identityTitle: '名称与用途',
    identityExplain: '描述是整个 Agent 中最重要的部分：Claude 据此判断任务是否适合它。',
    nameLabel: '名称',
    nameHint: '小写字母和连字符。将成为文件名和调用名 (@agent-name)。',
    colorLabel: '颜色',
    whenLabel: 'Claude 应在何时使用它？',
    whenHint: (chars: number): string => `用 1–3 句话说明它做什么、何时适用。示例：“检查代码改动中的错误。Use when …” · ${chars} 个字符`,
    whenPlaceholder: '检查最新的代码改动中的错误和安全漏洞。Use when 代码被修改后、提交之前。',
    proactiveLabel: '主动使用',
    proactiveDescription: '追加 “Use proactively.”：Claude 会不等询问就交出合适的任务。关闭时：仅在任务明显匹配或你点名时使用。',

    placeTitle: '保存位置',
    placeExplain: '个人 Agent 对设备上的所有项目生效。项目 Agent 存放在项目中，随 Git 同步，重名时优先生效。',
    host: '设备',
    appliesTo: '适用范围',
    allProjects: '所有项目',
    oneProject: '单个项目',
    project: '项目',
    noProjects: (host: string): string => `${host} 上没有项目`,

    modelTitle: '模型与思考',
    modelExplain: '简单的大批量任务用便宜的模型；只有真正需要思考时才用强大的模型。',
    modelLabel: '模型',
    modelInheritExplain: '不指定模型：使用你当前运行 Claude 的模型。',
    customModel: '文件中的自定义模型 ID：',
    customModelReplace: '在上方选择一项会替换它。',
    effortLabel: '思考强度',
    sessionLabel: '与会话相同',
    effortInheritExplain: '沿用当前会话的思考强度。',

    skillsTitle: '预加载 Skill',
    skillsExplain: 'Agent 不会自动看到你的 Skill。预加载的 Skill 在启动时完整进入它的上下文，所以只选它几乎每次都需要的。',
    skillsChosen: (n: number): string => `已选 ${n} 个`,

    rightsTitle: '权限与行为',
    rightsExplain: '它无需询问可以做多少，以及如何工作。对审查者来说，“仅规划”是安全的默认值。',
    rightsLabel: '权限',
    rightsInheritExplain: '沿用启动它的会话的权限。',
    memoryLabel: '记忆',
    memoryOff: '关闭',
    memoryOffExplain: '每次启动都没有任何记忆。',
    maxTurnsLabel: '最多轮数',
    unlimitedPlaceholder: '不限',
    maxTurnsHint: '防止无限循环的刹车。之后它会给出部分结果。',
    worktreeLabel: '独立 Worktree',
    worktreeDescription: '在 Git 副本中工作；多个 Agent 并行修改时很有用。',
    backgroundLabel: '后台运行',
    backgroundDescription: 'Claude 不等待它，继续工作。',

    promptTitle: '指令',
    promptExplain: '它的系统提示词。它不知道你们的对话，只知道这里的内容和 Claude 交给它的任务。包括角色、步骤、回答格式和限制。',
    insertOutline: '插入大纲',
    promptChars: (n: number): string => `${n} 个字符 · Markdown`,
    initialLabel: '作为主 Agent 的首条消息',
    initialPlaceholder: '可选，例如：“先运行 git status”',
    initialHint: '仅对 claude --agent 有效：自动作为第一条消息发送。',

    sideQuality: '质量检查',
    noFindings: '没有问题。',
    sectionsNav: '章节',
    filePreviewAria: '文件预览',
    filePreview: '文件将是这样',
    alsoPreserved: (keys: string): string => `另外保留：${keys}`
  },

  fields: {
    colorGroup: '颜色',
    noColor: '无颜色',
    presets: '快速选择',
    inheritAllNote: '不选择意味着：Agent 继承会话的**全部**工具。勾选工具即可限制它。',
    moreTools: '更多工具',
    moreToolsPlaceholder: '例如 mcp__github__get_issue, Bash(git diff *)',
    moreToolsHint: 'MCP 工具和匹配模式用逗号分隔。Claude 会悄悄忽略拼写错误，质量检查会报告它们。',
    filterSkills: '筛选 Skill',
    searchSkill: '搜索 Skill',
    noSkillMatch: '没有与搜索匹配的 Skill。',
    noSkillsFound: '没有找到 Skill。目录会从 ~/.claude/skills 和插件中加载 Skill。'
  },

  toolGroups: { read: '读取', write: '写入', exec: '执行', web: '网络', meta: '控制' },
  tools: {
    Read: { label: '读取文件', explain: '打开文件，包括图片和 PDF。' },
    Grep: { label: '搜索内容', explain: '同时在多个文件中搜索文本。' },
    Glob: { label: '查找文件', explain: '通过 **/*.ts 这样的模式查找文件。' },
    Edit: { label: '修改文件', explain: '精确替换现有文件中的片段。' },
    Write: { label: '创建文件', explain: '新建文件或整体覆盖文件。' },
    NotebookEdit: { label: '修改 Notebook', explain: '编辑 Jupyter Notebook 中的单元格。' },
    Bash: { label: '执行命令', explain: '运行 Shell 命令：测试、Git、构建。最强大的工具。' },
    PowerShell: { label: 'PowerShell', explain: '运行 PowerShell 命令 (Windows)。' },
    WebSearch: { label: '网络搜索', explain: '在互联网上搜索最新信息。' },
    WebFetch: { label: '读取网页', explain: '加载一个地址并读取内容。' },
    Agent: { label: '启动其他 Agent', explain: '可以自己委派子 Agent。' },
    Skill: { label: '使用 Skill', explain: '可以加载并遵循 Skill。' },
    TodoWrite: { label: '任务列表', explain: '为长任务维护自己的清单。' }
  },
  presets: {
    read: { label: '只读', explain: '适合审查者和代码调研，安全' },
    edit: { label: '读取并修改', explain: '适合编写代码但不执行命令的 Agent' },
    dev: { label: '开发', explain: '修改，并通过 Shell 运行测试和 Git' },
    web: { label: '网络调研', explain: '在互联网上搜索和阅读，撰写笔记' },
    all: { label: '全部继承', explain: '无限制，包括 MCP 工具' }
  },
  options: {
    model: {
      inherit: { label: '与主会话相同', explain: '使用你当前运行 Claude 的模型。' },
      haiku: { label: 'Haiku', explain: '快速且便宜。适合搜索、总结、简单检查。' },
      sonnet: { label: 'Sonnet', explain: '均衡。大多数 Agent 的良好默认选择。' },
      opus: { label: 'Opus', explain: '擅长困难任务，更慢也更贵。' },
      fable: { label: 'Fable', explain: '最大的模型，适合要求很高的工作。' }
    },
    effort: {
      low: { label: '低', explain: '思考少，回答快。' },
      medium: { label: '中', explain: '行动前稍作权衡。' },
      high: { label: '高', explain: '深入思考，适合审查和规划。' },
      xhigh: { label: '很高', explain: '适合棘手的错误和架构问题。' },
      max: { label: '最大', explain: '尽可能多地思考，缓慢且昂贵。' }
    },
    permission: {
      default: { label: '询问', explain: '修改和执行命令前会询问。无人在场时，这类步骤会被拒绝。' },
      acceptEdits: { label: '允许修改', explain: '可以不经询问修改文件，执行命令时会询问。' },
      auto: { label: '自动', explain: 'Claude 通过安全检查自行决定什么被允许。' },
      dontAsk: { label: '不询问', explain: '从不询问；未获批准的都会被拒绝。' },
      plan: { label: '仅规划', explain: '只读取和规划，不做任何修改。适合审查者。' },
      bypassPermissions: { label: '全部允许', explain: '没有询问也没有限制。仅在安全的文件夹中使用。' }
    },
    memory: {
      user: { label: '为我', explain: '在你的用户文件夹中跨项目记住内容。' },
      project: { label: '在项目中', explain: '记忆存放在项目中，随 Git 同步。' },
      local: { label: '仅本地', explain: '记忆存放在项目中，但不纳入 Git。' }
    }
  },

  lint: {
    nameMissing: '缺少名称。Claude 通过这个名称调用 Agent。',
    nameFormat: '名称只能由小写字母、数字和连字符组成，例如 “code-reviewer”。',
    descriptionMissing: '缺少描述。没有描述，Claude 不知道 Agent 何时适用。',
    descriptionShort: '描述太短。请具体说明它用于什么、Claude 应在何时使用它。',
    descriptionLong: '描述过长。它会在每次会话中加载；细节应写进指令。',
    noTrigger: '看不出触发条件。请写成 “Use when …”。',
    notProactive: '若希望 Claude 主动使用，请加上 “Use proactively …”。否则只有你点名时才会用。',
    promptMissing: '缺少指令。Agent 在没有任何背景知识的情况下启动；这里说明它如何工作。',
    promptShort: '指令太简略。请描述角色、步骤和回答的形式。',
    promptLong: '指令太长。反复用到的知识更适合做成 Agent 预加载的 Skill。',
    noOutput: '没有对输出的要求。请说明应返回什么（例如“文件:行号的列表，最多 200 字”），否则它会淹没主上下文。',
    noLimits: '没有写明限制。增加“限制”部分可以避免意外修改。',
    inheritsAllTools: '继承全部工具。工具越少，Agent 越安全、越专注。',
    manyTools: '工具很多。只给 Agent 完成任务所需的。',
    unknownTools: (names: string): string => `未知工具：${names}。拼写错误会被悄悄忽略。`,
    reviewWrites: '听起来是检查或搜索，却允许修改。“只读”或“仅规划”模式会更安全。',
    bypass: '“全部允许”会关闭所有安全询问。只在不会出问题的文件夹中使用。',
    haikuTip: '单纯的搜索用 Haiku 更快更便宜。',
    manySkills: '每个预加载的 Skill 都会完整进入上下文。只预加载必要的。'
  },

  service: {
    notMarkdown: (path: string): string => `“${path}”不是 Markdown 文件。`,
    pluginCopyOnly: '此 Agent 属于某个插件，只能另存为副本。',
    deleteOnlyOwn: '只能删除 .claude/agents 文件夹中自己的 Agent。',
    fileLabel: (path: string): string => `Agent 文件 ${path}`,
    reloadHint: '请重新加载列表。',
    ideaTooShort: '请用一两句话描述 Agent 应该做什么。',
    currentMissing: '改进时缺少当前的 Agent。',
    pickProject: '请选择项目：项目 Agent 存放在项目列表中某个项目的文件夹里。',
    noJson: '回答中没有 JSON 对象',
    unreadableJson: (detail: string): string => `无法读取 JSON：${detail}`,
    notObject: '回答不是对象',
    incompleteAnswer: '回答中缺少名称、描述或指令'
  },

  store: {
    discardTitle: '放弃更改？',
    discardMessage: 'Agent 尚未保存。',
    discard: '放弃',
    saved: (name: string): string => `Agent“${name}”已保存`,
    deleteTitle: (name: string): string => `删除 Agent“${name}”？`,
    deleteMessage: (path: string): string => `文件 ${path} 将被移除。使用此 Agent 的自动化之后将无法运行。`,
    delete: '删除',
    deleted: (name: string): string => `Agent“${name}”已删除`
  },

  promptOutline: [
    '你是 <一句话说明角色>。',
    '',
    '## 任务',
    '<你要完成什么，以及最终应有什么成果。>',
    '',
    '## 步骤',
    '1. <第一步>',
    '2. <第二步>',
    '3. <检查结果是否正确>',
    '',
    '## 输出',
    '<给主 Agent 的回答形式：例如带 文件:行号 的简短列表，最多 200 字。>',
    '',
    '## 限制',
    '- <你绝不做的事，例如不提交、不修改 src/ 之外的文件>'
  ].join('\n'),

  templates: {
    reviewer: {
      label: '代码审查者',
      explain: '阅读改动并报告错误，不做修改',
      description: '检查最新代码改动中的错误、安全漏洞和不清晰之处。Use proactively after larger changes, before committing（较大改动后、提交前主动使用）。',
      prompt: [
        '你是一位经验丰富的代码审查者。你不做修改，只发现问题。',
        '',
        '## 步骤',
        '1. 用 `git diff`（以及 `git diff --staged`）获取改动。',
        '2. 结合上下文阅读受影响的文件，而不只是改动的行。',
        '3. 寻找真正的错误：逻辑错误、缺少错误处理、安全漏洞、边界情况。',
        '4. 报告每个发现之前先核实。不要把猜测当作事实。',
        '',
        '## 输出',
        '一份列表，最严重的在前。每个发现：`文件:行号`，一句话说明问题，一句话说明解决办法。',
        '不谈风格问题，不夸奖。如果没有发现严重问题，就用一句话如实说明。',
        '',
        '## 限制',
        '- 不修改文件，不提交。'
      ].join('\n')
    },
    researcher: {
      label: '代码探索者',
      explain: '在项目中快速搜索并总结',
      description: '找出某个功能在代码中的实现位置和方式，并给出带出处的简短总结。Use proactively when many files need to be searched（需要搜索大量文件时主动使用）。',
      prompt: [
        '你负责搜索代码，并简明扼要地汇报发现。',
        '',
        '## 步骤',
        '1. 先用 Glob 和 Grep 广泛搜索，再只阅读相关部分。',
        '2. 顺着调用一路追到实际实现。',
        '',
        '## 输出',
        '最多 150 字，加一份列表 `文件:行号 – 那里发生了什么`。不要返回整个文件。'
      ].join('\n')
    },
    tester: {
      label: '测试编写者',
      explain: '为新代码编写并运行测试',
      description: '为新增或修改的代码补写缺失的测试并运行。Use when new features were added without tests（新增功能缺少测试时使用）。',
      prompt: [
        '你按项目的风格编写测试。',
        '',
        '## 步骤',
        '1. 弄清项目使用的测试框架和模式（阅读现有测试）。',
        '2. 针对行为而不是实现细节编写测试。先写边界情况。',
        '3. 运行测试。若测试失败，判断是测试错了还是代码错了。',
        '',
        '## 输出',
        '你新建了哪些测试、测试运行的结果，以及在代码中发现的错误。',
        '',
        '## 限制',
        '- 不修改生产代码，只报告。'
      ].join('\n')
    },
    web: {
      label: '网络调研员',
      explain: '在互联网上调研并给出来源',
      description: '在互联网上调研一个问题，给出有依据并附来源的回答。Use when current information, prices or documentation are needed（需要最新信息、价格或文档时使用）。',
      prompt: [
        '你认真调研，绝不编造。',
        '',
        '## 步骤',
        '1. 用多种表述搜索，中文和英文都要。',
        '2. 亲自阅读最好的结果。优先官方来源和最新数据。',
        '3. 如果来源相互矛盾，两者都要说明。',
        '',
        '## 输出',
        '回答最多 200 字，然后以列表给出来源，附链接和日期。',
        '',
        '## 限制',
        '- 只列出你真正打开过的链接。'
      ].join('\n')
    },
    docs: {
      label: '文档编写者',
      explain: '保持 README 和文档最新',
      description: '让 README 和文档与当前代码保持一致。Use when features, commands or settings were changed（功能、命令或设置变更后使用）。',
      prompt: [
        '你负责让项目文档保持最新。',
        '',
        '## 步骤',
        '1. 阅读 README 和现有文档，再阅读它们所讲的代码。',
        '2. 改正不再正确的内容。只补充真正缺少的内容。',
        '3. 保持现有文档的语气、语言和结构。',
        '',
        '## 输出',
        '已修改文件的列表，每处修改一句话。',
        '',
        '## 限制',
        '- 不修改代码。无故不创建新的文档文件。'
      ].join('\n')
    }
  },

  guide: {
    navAria: '目录',
    toc: { what: '什么是 Agent', compare: 'Agent、Skill、命令', decide: 'Claude 如何决定', anatomy: '文件结构', rules: '优秀 Agent 的规则', settings: '全部设置', automate: '自动化' },
    what: {
      p1: 'Agent（在 Claude Code 中称为“subagent”）是**拥有独立上下文窗口的专家**。Claude 把一个子任务交给它，它用自己的指令、工具和模型完成，只把结果交回。中间步骤，比如读取的上百个文件或冗长的日志，都留在它那里。',
      p2: '这样主会话保持简短清晰。Agent 适合读得多、返回少的任务：搜索代码、检查改动、运行测试、在网上调研。'
    },
    compare: {
      colWhat: '是什么',
      colWhen: '何时使用',
      rows: [
        ['Agent', '拥有独立上下文、工具和模型的独立“员工”', '一个独立完整的子任务，中间步骤无需任何人查看'],
        ['Skill', 'Claude 需要时自行加载的知识与指引', 'Claude 应在同一对话中遵循的重复性流程'],
        ['命令', '用 /name 启动的已保存提示词', '你自己定期触发的事情']
      ]
    },
    decide: {
      auto: '**自动：** Claude 知道所有 Agent 的名称和描述。任务符合某个描述时，Claude 会把它交出去。描述中带有 “Use proactively” 时，这种情况会明显更多。',
      targeted: '**直接指定：** 你输入 `@agent-name`，或者“用 code-reviewer 这个 Agent 来……”。',
      session: '**作为整个会话：** `claude --agent name` 会让 Claude 直接以该 Agent 的身份启动，带着它的工具和指令。',
      precedence: '如果有两个同名 Agent，项目中的优先于个人的，个人的优先于插件中的。'
    },
    anatomy: {
      intro: 'Agent 是一个 Markdown 文件，位于 `~/.claude/agents/`（适用于所有项目）或 `<项目>/.claude/agents/`。顶部是带设置的 frontmatter，下面是指令。',
      parts: [
        { code: '---\nname: code-reviewer', title: '名称', text: '唯一，由小写字母和连字符组成。你通过它来调用：@agent-code-reviewer。' },
        {
          code: 'description: "检查代码改动中的错误。\n  Use proactively after larger changes."',
          title: '描述',
          text: '触发条件。Claude 只读这一行来判断是否适用。写“做什么”和“何时”，不写“怎么做”。'
        },
        { code: 'tools: Read, Grep, Glob, Bash', title: '工具', text: '允许使用的工具。没有这一行则继承全部。审查者不需要 Write。' },
        { code: 'model: sonnet\neffort: high\npermissionMode: plan\n---', title: '模型与权限', text: '可选。不写则沿用会话使用的设置。' },
        {
          code: '你是一位经验丰富的代码审查者。\n\n## 步骤\n1. 阅读 git diff …\n\n## 输出\n带 文件:行号 的列表 …\n\n## 限制\n- 不做任何修改。',
          title: '指令',
          text: '它的系统提示词。它看不到你们的对话，只看到这里的内容和 Claude 交给它的任务。'
        }
      ]
    },
    rules: {
      items: [
        { title: '一个 Agent 一件事', text: '“检查代码”和“写文档”是两个 Agent。万能 Agent 永远无法被可靠地选中。' },
        { title: '描述就是触发条件', text: '写明它何时适用：“Use when …”、“Use proactively after …”。做法的细节属于指令，因为描述会在每次会话中加载。' },
        { title: '工具尽量少', text: '最小权限：读取型 Agent 只给 Read、Grep、Glob。工具越少，风险越小，工作越专注。' },
        { title: '规定好回答', text: '准确说明返回什么：“文件:行号的列表，最多 200 字”。否则它会淹没主 Agent 的上下文，而这正是 Agent 要避免的。' },
        { title: '把需要的都交代清楚', text: '它启动时没有背景知识。项目规则、路径和命令写在指令里，或放进预加载的 Skill。' },
        { title: '合适的模型', text: '搜索和总结用 Haiku，Sonnet 作默认，Opus 只用于困难的思考工作。这样能节省额度。' },
        { title: '写明限制', text: '它绝不做的事：提交、推送、修改某个文件夹之外的文件。对审查者再加上“仅规划”。' }
      ],
      note: '构建器中的质量检查会实时检查其中大部分规则。'
    },
    settings: {
      colField: '字段',
      colMeaning: '含义',
      colAdvice: '建议',
      rows: [
        ['name', '名称与调用', '必填。简短，说明角色。'],
        ['description', 'Claude 何时使用它', '必填。1–3 句话，含触发条件。'],
        ['tools', '允许的工具', '省略则继承全部；否则写列表。'],
        ['disallowedTools', '禁用的工具', '几乎全部允许、只排除例如 Write 时使用。'],
        ['model', '模型', 'haiku、sonnet、opus、fable 或 inherit。'],
        ['effort', '思考强度', 'low 到 max；检查和规划用高。'],
        ['permissionMode', '无需询问的权限', '审查者用 plan，编写者用 acceptEdits。'],
        ['maxTurns', '最大步数', '防止无限循环的刹车。'],
        ['skills', '预加载的 Skill', '只放它几乎每次都需要的。'],
        ['memory', '跨运行的记忆', '希望它从之前的运行中学习时用 project。'],
        ['isolation', '独立 Git worktree', '多个 Agent 并行修改时用 worktree。'],
        ['background', '在后台运行', '用于 Claude 不必等待的长任务。'],
        ['color', '界面中的颜色', '仅用于显示。'],
        ['hooks, mcpServers', 'Hooks 与自有 MCP 服务器', '面向进阶用户；构建器会原样保留。']
      ]
    },
    automate: {
      p1: '每个 Agent 都可以不需要你而运行。在**自动化**区域，你可以设定哪个 Agent 在何时、于哪个项目接到什么任务，例如工作日早上 8 点“检查昨天的改动”。随后应用会在所选设备上用 `claude -p --agent name` 启动它，保存结果，并在完成时通知你。为此你不需要 n8n 或其他附加程序。',
      p2: '只要应用保持打开，计划任务就会启动。如果 5 小时窗口内的额度几乎用完，它们会被跳过，而不是把额度耗尽。',
      toAutomations: '前往自动化'
    }
  }
}
