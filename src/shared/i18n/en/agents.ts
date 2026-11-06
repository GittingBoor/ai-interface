import type { Messages } from '../messages'

export const agents: Messages['agents'] = {
  title: 'Agents',
  viewLabel: 'View',
  modeBrowse: 'Overview',
  modeGuide: 'Guide',
  reload: 'Reload',
  build: 'Build agent',
  buildFirst: 'Build your first agent',
  subtitle: (count: number, hosts: number): string => `${count} ${count === 1 ? 'agent' : 'agents'} on ${hosts === 1 ? 'one machine' : `${hosts} machines`} · specialists Claude hands tasks to`,
  subtitleIdle: 'Specialists Claude hands tasks to',
  emptyTitle: 'No agents yet',
  emptyBody: 'An agent is a specialist with its own task, its own tools and its own context. Agents are looked up in ~/.claude/agents, in your projects and in plugins.',
  noMatchTitle: 'No agent matches',
  noMatchBody: 'The search covers name, description, summary, tools and skills.',
  clearSearch: 'Clear search',
  detailsAria: 'Agent details',
  pickTitle: 'Select an agent',
  pickBody: 'Pick an agent on the left: what it does, when Claude uses it, tools, skills and instructions.',
  searchLabel: 'Search agents',
  searchPlaceholder: 'Name, task, tool or skill',

  groups: {
    user: 'Your own',
    userHint: 'available in all projects',
    project: 'Project',
    projectHint: 'only in this project',
    plugin: 'Plugin',
    pluginHint: 'from a plugin, read-only',
    other: 'Other'
  },
  list: {
    noDescription: 'No description',
    tools: (n: number): string => `${n} ${n === 1 ? 'tool' : 'tools'}`,
    allTools: 'all tools',
    skills: (n: number): string => (n === 1 ? '1 skill' : `${n} skills`),
    proactive: 'proactive',
    proactiveTitle: 'Claude uses this agent on its own'
  },
  inheritModel: 'Same as main session',

  settingRows: {
    model: 'Model',
    effort: 'Effort',
    permission: 'Permissions',
    maxTurns: 'Max. turns',
    memory: 'Memory',
    isolation: 'Isolation',
    background: 'Background',
    modelInherited: 'Same as main session',
    modelInheritedExplain: 'No model set: Claude uses the model of the current session.',
    modelCustomExplain: 'Custom model ID.',
    sessionValue: 'Same as session',
    effortInheritedExplain: 'Uses the effort level of the session.',
    permissionInheritedExplain: 'Uses the permission mode of the session it is started from.',
    unlimited: 'Unlimited',
    turnsUnlimitedExplain: 'Keeps working until the task is done.',
    turnsLimitedExplain: 'Stops after this many steps and reports a partial result.',
    memoryOff: 'Off',
    memoryOffExplain: 'Starts every time without any memory of earlier runs.',
    isolationWorktree: 'Own worktree',
    isolationProject: 'In the project folder',
    isolationWorktreeExplain: 'Works in a Git copy and does not interfere with parallel work.',
    isolationProjectExplain: 'Changes files directly in the project.',
    yes: 'Yes',
    no: 'No',
    backgroundYesExplain: 'Keeps running in the background while Claude does something else.',
    backgroundNoExplain: 'Claude waits for its result.'
  },

  detail: {
    origin: { user: 'Your agent', project: 'Project agent', plugin: 'Plugin agent', synced: 'Synced', disabled: 'Disabled' },
    pluginOrigin: (name: string): string => `Plugin ${name}`,
    projectOrigin: (name: string): string => `Project ${name}`,
    editCopy: 'Edit as copy',
    edit: 'Edit',
    automate: 'Automate',
    delete: 'Delete agent',
    whatItDoes: 'What it does',
    noSummary: 'No summary yet. Claude Haiku reads the file and explains it in two sentences.',
    explain: 'Explain',
    whenUsed: 'When Claude uses it',
    noDescription: 'No description: Claude cannot tell when it fits.',
    proactiveYes: 'Claude hands suitable tasks to it on its own.',
    proactiveNo: 'Claude uses it when the task matches the description or when you name it.',
    callText: (name: string): string => `Call it directly: \`@agent-${name}\` in the chat, or as a whole session with \`claude --agent ${name}\`.`,
    settings: 'Settings',
    tools: 'Tools',
    toolsInheritAll: 'No restriction: it may do everything the session may, including MCP tools.',
    toolMcp: 'Tool from an MCP server.',
    toolCustom: 'Custom or restricted tool.',
    blocked: 'Blocked:',
    skills: 'Skills',
    noSkills: 'Preloads no skills and mentions none.',
    skillPreloadedTitle: 'Loaded in full at start',
    skillMentionedTitle: 'Mentioned in the instructions',
    preloaded: 'preloaded',
    mentioned: 'mentioned',
    skillMissingTitle: 'Skill is not installed on this machine',
    skillMissing: (name: string): string => `${name} · missing`,
    automations: 'Automations',
    onlyWhenCalled: 'Runs only when Claude calls it.',
    runBySchedule: 'Run on a schedule',
    scheduleOff: 'off',
    quality: 'Quality check',
    qualityClean: 'No remarks. Clearly described, sensibly restricted, with output requirements.',
    instructions: 'Instructions',
    showLess: 'Show less',
    showAll: 'Show all',
    instructionsEmpty: 'Empty: the agent works only with the task Claude gives it.',
    fileAria: 'File',
    showInFolder: 'Show in folder',
    preservedKeys: (keys: string): string => `Other fields in the file that are kept when editing: ${keys}`
  },

  finding: { tip: 'Tip', warn: 'Warning', error: 'Error' },
  score: {
    great: 'Very well built',
    fair: 'Usable, with room to improve',
    gaps: 'Has gaps',
    incomplete: 'Incomplete',
    meter: 'Quality'
  },

  builder: {
    back: 'Back to overview',
    editTitle: (name: string): string => `Edit ${name || 'agent'}`,
    copyTitle: (name: string): string => `Copy of ${name}`,
    newTitle: 'New agent',
    unsaved: 'Unsaved changes',
    saved: 'All saved',
    notSaved: 'Not saved yet',
    cancel: 'Cancel',
    save: 'Save',
    saveTitle: 'Save (Ctrl+S)',
    toolsTitle: 'Tools',
    toolsExplain: 'What the agent may do. Less is better: a reviewer does not need write access, a researcher does not need a shell.',
    sideAria: 'Check and preview',
    chooseProject: 'Choose project',
    nameFallback: 'name',
    sections: { start: 'Start with AI', identity: 'Name and use', place: 'Location', model: 'Model and thinking', tools: 'Tools', skills: 'Skills', rights: 'Permissions and behavior', prompt: 'Instructions' },

    startNew: 'Start with AI',
    startImprove: 'Improve with AI',
    startNewExplain: 'Describe in your own words what the agent should be able to do. Claude Sonnet picks the name, tools, model and permissions and writes the instructions. Afterwards you can adjust everything.',
    startImproveExplain: 'Claude sharpens the description, tools and instructions following the rules for good agents. Optionally tell it what should get better.',
    ideaLabel: 'Idea for the agent',
    improveLabel: 'Improvement request',
    ideaExample: 'e.g. “Checks every morning whether tests fail in my projects and writes a short list with cause and file.”',
    improveExample: 'e.g. “It should answer more briefly and never change files.”',
    createDraft: 'Create draft',
    improve: 'Improve',
    drafting: 'Claude is drafting the agent, this usually takes 15–40 seconds.',
    revising: 'Claude is revising the agent, this usually takes 15–40 seconds.',
    shortcut: 'Ctrl+Enter',
    whyChosen: 'Why Claude chose this',
    orTemplate: 'Or start from a template:',

    identityTitle: 'Name and use',
    identityExplain: 'The description is the most important part of the whole agent: Claude uses it to decide whether a task fits.',
    nameLabel: 'Name',
    nameHint: 'Lowercase letters and hyphens. Becomes the file name and the call (@agent-name).',
    colorLabel: 'Color',
    whenLabel: 'When should Claude use it?',
    whenHint: (chars: number): string => `What it does and when it fits, in 1–3 sentences. Good: “Checks code changes for errors. Use when …” · ${chars} characters`,
    whenPlaceholder: 'Checks fresh code changes for bugs and security holes. Use when code was changed, before committing.',
    proactiveLabel: 'Use on its own',
    proactiveDescription: 'Appends “Use proactively.”: Claude hands over suitable tasks unasked. Off: only when the task clearly fits or you name it.',

    placeTitle: 'Location',
    placeExplain: 'Your own agents apply to all projects on the machine. Project agents live in the project, travel with Git and win when names clash.',
    host: 'Machine',
    appliesTo: 'Applies to',
    allProjects: 'All projects',
    oneProject: 'One project',
    project: 'Project',
    noProjects: (host: string): string => `No projects on ${host}`,

    modelTitle: 'Model and thinking',
    modelExplain: 'Cheap models for simple, high-volume work; strong models only where real thinking is needed.',
    modelLabel: 'Model',
    modelInheritExplain: 'No model of its own: uses whatever you are running Claude with.',
    customModel: 'Custom model ID in the file:',
    customModelReplace: 'Choosing an option above replaces it.',
    effortLabel: 'Effort',
    sessionLabel: 'Same as session',
    effortInheritExplain: 'Uses the effort level of the running session.',

    skillsTitle: 'Preload skills',
    skillsExplain: 'Agents do not see your skills automatically. Preloaded skills go into its context in full at start, so pick only what it needs almost every time.',
    skillsChosen: (n: number): string => `${n} selected`,

    rightsTitle: 'Permissions and behavior',
    rightsExplain: 'How much it may do without asking and how it works. For reviewers, “Plan only” is the safe default.',
    rightsLabel: 'Permissions',
    rightsInheritExplain: 'Uses the permissions of the session it is started from.',
    memoryLabel: 'Memory',
    memoryOff: 'Off',
    memoryOffExplain: 'Starts every time without any memory.',
    maxTurnsLabel: 'Max. turns',
    unlimitedPlaceholder: 'unlimited',
    maxTurnsHint: 'A brake against endless loops. After that it returns a partial result.',
    worktreeLabel: 'Own worktree',
    worktreeDescription: 'Works in a Git copy; useful when several agents make changes in parallel.',
    backgroundLabel: 'In the background',
    backgroundDescription: 'Claude does not wait for it and keeps working.',

    promptTitle: 'Instructions',
    promptExplain: 'Its system prompt. It does not know your conversation, only this text and the task Claude gives it. Role, steps, answer format and limits.',
    insertOutline: 'Insert outline',
    promptChars: (n: number): string => `${n} characters · Markdown`,
    initialLabel: 'First message as main agent',
    initialPlaceholder: 'optional, e.g. “Start with git status”',
    initialHint: 'Only with claude --agent: sent automatically as the first message.',

    sideQuality: 'Quality check',
    noFindings: 'No remarks.',
    sectionsNav: 'Sections',
    filePreviewAria: 'File preview',
    filePreview: 'What the file will look like',
    alsoPreserved: (keys: string): string => `Also kept: ${keys}`
  },

  fields: {
    colorGroup: 'Color',
    noColor: 'No color',
    presets: 'Quick select',
    inheritAllNote: 'No selection means: the agent inherits **all** tools of the session. Tick tools to restrict it.',
    moreTools: 'More tools',
    moreToolsPlaceholder: 'e.g. mcp__github__get_issue, Bash(git diff *)',
    moreToolsHint: 'Separate MCP tools and patterns with commas. Claude silently ignores typos; the quality check reports them.',
    filterSkills: 'Filter skills',
    searchSkill: 'Search skill',
    noSkillMatch: 'No skill matches the search.',
    noSkillsFound: 'No skills found. The catalog loads skills from ~/.claude/skills and plugins.'
  },

  toolGroups: { read: 'Read', write: 'Write', exec: 'Execute', web: 'Web', meta: 'Control' },
  tools: {
    Read: { label: 'Read files', explain: 'Opens files, including images and PDFs.' },
    Grep: { label: 'Search contents', explain: 'Searches text across many files at once.' },
    Glob: { label: 'Find files', explain: 'Finds files by patterns such as **/*.ts.' },
    Edit: { label: 'Edit files', explain: 'Replaces specific passages in existing files.' },
    Write: { label: 'Create files', explain: 'Writes files from scratch or overwrites them completely.' },
    NotebookEdit: { label: 'Edit notebooks', explain: 'Edits cells in Jupyter notebooks.' },
    Bash: { label: 'Run commands', explain: 'Runs shell commands: tests, Git, builds. The most powerful tool.' },
    PowerShell: { label: 'PowerShell', explain: 'Runs PowerShell commands (Windows).' },
    WebSearch: { label: 'Search the web', explain: 'Searches the internet for current information.' },
    WebFetch: { label: 'Read web pages', explain: 'Loads an address and reads the content.' },
    Agent: { label: 'Start more agents', explain: 'May delegate to sub-agents itself.' },
    Skill: { label: 'Use skills', explain: 'May load and follow skills.' },
    TodoWrite: { label: 'Task list', explain: 'Keeps its own checklist for long tasks.' }
  },
  presets: {
    read: { label: 'Read only', explain: 'Safe for reviewers and code research' },
    edit: { label: 'Read and edit', explain: 'For agents that write code, without commands' },
    dev: { label: 'Develop', explain: 'Editing plus tests and Git via the shell' },
    web: { label: 'Web research', explain: 'Search and read the internet, write notes' },
    all: { label: 'Inherit all', explain: 'No restriction, including MCP tools' }
  },
  options: {
    model: {
      inherit: { label: 'Same as main session', explain: 'Uses the model you are currently running Claude with.' },
      haiku: { label: 'Haiku', explain: 'Fast and cheap. Good for searching, summarizing, simple checks.' },
      sonnet: { label: 'Sonnet', explain: 'Balanced. A good default for most agents.' },
      opus: { label: 'Opus', explain: 'Strong on hard tasks, slower and more expensive.' },
      fable: { label: 'Fable', explain: 'The largest model, for very demanding work.' }
    },
    effort: {
      low: { label: 'Low', explain: 'Little thinking, quick answers.' },
      medium: { label: 'Medium', explain: 'Some weighing up before acting.' },
      high: { label: 'High', explain: 'Thorough thinking, good for reviews and planning.' },
      xhigh: { label: 'Very high', explain: 'For tricky bugs and architecture questions.' },
      max: { label: 'Maximum', explain: 'As much thinking as possible, slow and expensive.' }
    },
    permission: {
      default: { label: 'Ask', explain: 'Asks before changes and commands. Without an observer such steps are denied.' },
      acceptEdits: { label: 'Edits allowed', explain: 'May change files without asking, asks for commands.' },
      auto: { label: 'Automatic', explain: 'Claude decides what is allowed itself, with a safety check.' },
      dontAsk: { label: 'Never ask', explain: 'Never asks; anything not pre-approved is denied.' },
      plan: { label: 'Plan only', explain: 'Reads and plans, changes nothing. Good for reviewers.' },
      bypassPermissions: { label: 'Everything allowed', explain: 'No prompts and no restrictions. Only use in safe folders.' }
    },
    memory: {
      user: { label: 'For me', explain: 'Remembers things across projects in your user folder.' },
      project: { label: 'In the project', explain: 'Memory lives in the project and travels with Git.' },
      local: { label: 'Local only', explain: 'Memory in the project, but not in Git.' }
    }
  },

  lint: {
    nameMissing: 'Name is missing. Claude calls the agent by this name.',
    nameFormat: 'Name may only contain lowercase letters, digits and hyphens, e.g. “code-reviewer”.',
    descriptionMissing: 'Description is missing. Without it Claude does not know when the agent fits.',
    descriptionShort: 'Description is very short. Say specifically what it is for and when Claude should use it.',
    descriptionLong: 'Description is long. It is loaded in every session; details belong in the instructions.',
    noTrigger: 'No trigger found. Phrase it as “Use when …”.',
    notProactive: 'If Claude should use it on its own, add “Use proactively …”. Otherwise only when you name it.',
    promptMissing: 'Instructions are missing. The agent starts without prior knowledge; this is where it learns how to work.',
    promptShort: 'Instructions are very brief. Describe the role, the steps and the shape of the answer.',
    promptLong: 'Instructions are very long. Recurring knowledge works better as a skill the agent preloads.',
    noOutput: 'No output requirement. Say what should come back (e.g. “list with file:line, at most 200 words”), otherwise it floods the main context.',
    noLimits: 'No limits stated. A “Limits” section prevents unwanted changes.',
    inheritsAllTools: 'Inherits all tools. Fewer tools make the agent safer and more focused.',
    manyTools: 'Many tools. Give only what the agent needs for its task.',
    unknownTools: (names: string): string => `Unknown tools: ${names}. Typos are silently ignored.`,
    reviewWrites: 'Sounds like reviewing or searching, but it may make changes. “Read only” or the mode “Plan only” would be safer.',
    bypass: '“Everything allowed” switches off all safety prompts. Only use it in folders where nothing can break.',
    haikuTip: 'Pure search runs faster and cheaper with Haiku.',
    manySkills: 'Every preloaded skill goes into the context in full. Preload only what is necessary.'
  },

  service: {
    notMarkdown: (path: string): string => `“${path}” is not a Markdown file.`,
    pluginCopyOnly: 'This agent belongs to a plugin and can only be saved as a copy.',
    deleteOnlyOwn: 'Only your own agents from a .claude/agents folder can be deleted.',
    fileLabel: (path: string): string => `Agent file ${path}`,
    reloadHint: 'Reload the list.',
    ideaTooShort: 'Describe in a sentence or two what the agent should do.',
    currentMissing: 'The current agent is missing for improving.',
    pickProject: 'Choose a project: project agents live in the folder of a project from the project list.',
    noJson: 'The answer contained no JSON object',
    unreadableJson: (detail: string): string => `JSON not readable: ${detail}`,
    notObject: 'The answer was not an object',
    incompleteAnswer: 'Name, description or instructions are missing in the answer'
  },

  store: {
    discardTitle: 'Discard changes?',
    discardMessage: 'The agent is not saved yet.',
    discard: 'Discard',
    saved: (name: string): string => `Agent “${name}” saved`,
    deleteTitle: (name: string): string => `Delete agent “${name}”?`,
    deleteMessage: (path: string): string => `The file ${path} will be removed. Automations with this agent will stop working afterwards.`,
    delete: 'Delete',
    deleted: (name: string): string => `Agent “${name}” deleted`
  },

  promptOutline: [
    'You are <role in one sentence>.',
    '',
    '## Task',
    '<What you do and what should exist at the end.>',
    '',
    '## Steps',
    '1. <First step>',
    '2. <Second step>',
    '3. <Check that the result is right>',
    '',
    '## Output',
    '<Shape of the answer to the main agent: e.g. short list with file:line, at most 200 words.>',
    '',
    '## Limits',
    '- <What you never do, e.g. commit nothing, change no files outside src/>'
  ].join('\n'),

  templates: {
    reviewer: {
      label: 'Code reviewer',
      explain: 'Reads changes and reports errors, changes nothing',
      description: 'Reviews fresh code changes for bugs, security holes and unclear spots. Use proactively after larger changes, before committing.',
      prompt: [
        'You are an experienced code reviewer. You change nothing, you find problems.',
        '',
        '## Steps',
        '1. Get the changes with `git diff` (and `git diff --staged`).',
        '2. Read the affected files in context, not just the changed lines.',
        '3. Look for real bugs: wrong logic, missing error handling, security holes, edge cases.',
        '4. Verify every finding before you report it. No guesses presented as facts.',
        '',
        '## Output',
        'A list, most severe first. Per finding: `file:line`, one sentence on the problem, one sentence on the fix.',
        'No style nitpicks, no praise. If you find nothing serious, say exactly that in one sentence.',
        '',
        '## Limits',
        '- Do not change files, do not commit.'
      ].join('\n')
    },
    researcher: {
      label: 'Code explorer',
      explain: 'Searches the project quickly and summarizes',
      description: 'Finds out where and how something is implemented in the code and returns a short summary with locations. Use proactively when many files need to be searched.',
      prompt: [
        'You search code and report briefly what you found.',
        '',
        '## Steps',
        '1. Search broadly with Glob and Grep, then read only the relevant spots.',
        '2. Follow calls down to the actual implementation.',
        '',
        '## Output',
        'At most 150 words plus a list `file:line – what happens there`. Do not return whole files.'
      ].join('\n')
    },
    tester: {
      label: 'Test writer',
      explain: 'Writes and runs tests for new code',
      description: 'Writes missing tests for new or changed code and runs them. Use when new features were added without tests.',
      prompt: [
        'You write tests in the style of the project.',
        '',
        '## Steps',
        '1. Find out which test framework and patterns the project uses (read existing tests).',
        '2. Write tests for behavior, not for implementation details. Edge cases first.',
        '3. Run the tests. If a test fails, check whether the test or the code is wrong.',
        '',
        '## Output',
        'Which tests you created, the result of the test run and any bugs found in the code.',
        '',
        '## Limits',
        '- Do not change production code, only report.'
      ].join('\n')
    },
    web: {
      label: 'Web researcher',
      explain: 'Researches the internet with sources',
      description: 'Researches a question on the internet and returns a substantiated answer with sources. Use when current information, prices or documentation are needed.',
      prompt: [
        'You research thoroughly and invent nothing.',
        '',
        '## Steps',
        '1. Search with several phrasings, in English and in the language of the question.',
        '2. Read the best hits yourself. Prefer official sources and current data.',
        '3. If sources contradict each other, name both.',
        '',
        '## Output',
        'An answer in at most 200 words, followed by the sources as a list with link and date.',
        '',
        '## Limits',
        '- Only name links you actually opened.'
      ].join('\n')
    },
    docs: {
      label: 'Docs writer',
      explain: 'Keeps README and docs up to date',
      description: 'Updates the README and documentation to match the current code. Use when features, commands or settings were changed.',
      prompt: [
        'You keep a project documentation up to date.',
        '',
        '## Steps',
        '1. Read the README and existing docs, then the code they describe.',
        '2. Correct what is no longer true. Add only what is really missing.',
        '3. Keep the tone, language and structure of the existing docs.',
        '',
        '## Output',
        'A list of the changed files with one sentence per change.',
        '',
        '## Limits',
        '- Do not change code. No new doc files without a reason.'
      ].join('\n')
    }
  },

  guide: {
    navAria: 'Contents',
    toc: { what: 'What an agent is', compare: 'Agent, skill, command', decide: 'How Claude decides', anatomy: 'Anatomy of a file', rules: 'Rules for good agents', settings: 'All settings', automate: 'Automating' },
    what: {
      p1: 'An agent (called “subagent” in Claude Code) is a **specialist with its own context window**. Claude hands it a subtask; it works through it with its own instructions, tools and model and returns only the result. The intermediate steps, such as hundreds of files read or long logs, stay with it.',
      p2: 'That keeps the main session short and clear. Agents suit tasks that read a lot and return little: searching code, reviewing changes, running tests, researching on the web.'
    },
    compare: {
      colWhat: 'What it is',
      colWhen: 'When to use',
      rows: [
        ['Agent', 'A separate worker with its own context, tools and model', 'A self-contained subtask whose intermediate steps nobody needs to see'],
        ['Skill', 'Knowledge and instructions that Claude loads itself when needed', 'A recurring procedure Claude should follow in the same conversation'],
        ['Command', 'A saved prompt you start with /name', 'Something you trigger yourself regularly']
      ]
    },
    decide: {
      auto: '**Automatically:** Claude knows the name and description of all agents. If a task fits a description, Claude hands it over. With “Use proactively” in the description it does so far more readily.',
      targeted: '**Directly:** You write `@agent-name` or “Use the code-reviewer agent for …”.',
      session: '**As a whole session:** `claude --agent name` starts Claude directly as this agent, with its tools and instructions.',
      precedence: 'If two agents share a name, the one from the project wins over your own, and your own wins over one from a plugin.'
    },
    anatomy: {
      intro: 'An agent is a Markdown file in `~/.claude/agents/` (for all projects) or `<project>/.claude/agents/`. At the top is the frontmatter with the settings, below it the instructions.',
      parts: [
        { code: '---\nname: code-reviewer', title: 'Name', text: 'Unique, lowercase letters and hyphens. This is how you call it: @agent-code-reviewer.' },
        {
          code: 'description: "Checks code changes for bugs.\n  Use proactively after larger changes."',
          title: 'Description',
          text: 'The trigger. Claude reads only this line to decide whether it fits. What and when, not how.'
        },
        { code: 'tools: Read, Grep, Glob, Bash', title: 'Tools', text: 'Allowed tools. If the line is missing, it inherits all. A reviewer does not need Write.' },
        { code: 'model: sonnet\neffort: high\npermissionMode: plan\n---', title: 'Model and permissions', text: 'Optional. Without them it uses whatever the session uses.' },
        {
          code: 'You are an experienced code reviewer.\n\n## Steps\n1. Read git diff …\n\n## Output\nList with file:line …\n\n## Limits\n- Change nothing.',
          title: 'Instructions',
          text: 'Its system prompt. It does not see your conversation, only this text and the task Claude gives it.'
        }
      ]
    },
    rules: {
      items: [
        { title: 'One task per agent', text: '“Reviews code” and “writes docs” are two agents. All-purpose agents are never picked reliably.' },
        { title: 'The description is a trigger', text: 'Say when it fits: “Use when …”, “Use proactively after …”. Details on the procedure belong in the instructions, because the description is loaded in every session.' },
        { title: 'As few tools as possible', text: 'Least privilege: readers get Read, Grep, Glob. Fewer tools mean less risk and more focused work.' },
        { title: 'Define the answer', text: 'Say exactly what comes back: “list with file:line, at most 200 words”. Otherwise it floods the main agent’s context, which is exactly what an agent should prevent.' },
        { title: 'Provide everything needed', text: 'It starts without prior knowledge. Project rules, paths and commands go into the instructions or a preloaded skill.' },
        { title: 'The right model', text: 'Haiku for searching and summarizing, Sonnet as the default, Opus only for hard thinking. That saves quota.' },
        { title: 'State the limits', text: 'What it never does: commit, push, change files outside a folder. For reviewers add “Plan only”.' }
      ],
      note: 'The quality check in the builder checks most of these rules live.'
    },
    settings: {
      colField: 'Field',
      colMeaning: 'Meaning',
      colAdvice: 'Recommendation',
      rows: [
        ['name', 'Name and call', 'Required. Short, describes the role.'],
        ['description', 'When Claude uses it', 'Required. 1–3 sentences with a trigger.'],
        ['tools', 'Allowed tools', 'Omit to inherit all; otherwise a list.'],
        ['disallowedTools', 'Blocked tools', 'When almost everything should be allowed, except e.g. Write.'],
        ['model', 'Model', 'haiku, sonnet, opus, fable or inherit.'],
        ['effort', 'Effort', 'low to max; high for reviewing and planning.'],
        ['permissionMode', 'Permissions without asking', 'plan for reviewers, acceptEdits for writers.'],
        ['maxTurns', 'Maximum number of steps', 'A brake against endless loops.'],
        ['skills', 'Preloaded skills', 'Only what it needs almost every time.'],
        ['memory', 'Memory across runs', 'project, if it should learn from earlier runs.'],
        ['isolation', 'Own Git worktree', 'worktree, when several agents make changes in parallel.'],
        ['background', 'Runs in the background', 'For long tasks Claude should not wait for.'],
        ['color', 'Color in the interface', 'Display only.'],
        ['hooks, mcpServers', 'Hooks and own MCP servers', 'For advanced users; the builder leaves them unchanged.']
      ]
    },
    automate: {
      p1: 'Every agent can run without you. In the **Automation** area you define which agent gets which task in which project and when, for example on weekdays at 8 am “Review yesterday’s changes”. The app then starts it with `claude -p --agent name` on the chosen machine, stores the result and notifies you when it is done. You do not need n8n or any other add-on for this.',
      p2: 'Scheduled runs start while the app is open. If the quota in the 5-hour window is almost used up, they are skipped instead of draining it.',
      toAutomations: 'Go to automation'
    }
  }
}
