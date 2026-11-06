import type { Messages } from '../messages'

export const agents: Messages['agents'] = {
  title: 'エージェント',
  viewLabel: '表示',
  modeBrowse: '一覧',
  modeGuide: 'ガイド',
  reload: '再読み込み',
  build: 'エージェントを作成',
  buildFirst: '最初のエージェントを作成',
  subtitle: (count: number, hosts: number): string => `${hosts === 1 ? '1 台' : `${hosts} 台`}のマシンに ${count} 件 · Claude がタスクを任せる専門家`,
  subtitleIdle: 'Claude がタスクを任せる専門家',
  emptyTitle: 'エージェントはまだありません',
  emptyBody: 'エージェントは、専用のタスク・ツール・コンテキストを持つ専門家です。~/.claude/agents、各プロジェクト、プラグインから探します。',
  noMatchTitle: '一致するエージェントがありません',
  noMatchBody: '名前、説明、要約、ツール、スキルを検索します。',
  clearSearch: '検索をクリア',
  detailsAria: 'エージェントの詳細',
  pickTitle: 'エージェントを選択',
  pickBody: '左でエージェントを選ぶと、役割、Claude が使うタイミング、ツール、スキル、指示が表示されます。',
  searchLabel: 'エージェントを検索',
  searchPlaceholder: '名前、タスク、ツール、スキル',

  groups: {
    user: '自分用',
    userHint: 'すべてのプロジェクトで利用可能',
    project: 'プロジェクト',
    projectHint: 'このプロジェクトのみ',
    plugin: 'プラグイン',
    pluginHint: 'プラグイン提供、読み取り専用',
    other: 'その他'
  },
  list: {
    noDescription: '説明なし',
    tools: (n: number): string => `ツール ${n} 個`,
    allTools: 'すべてのツール',
    skills: (n: number): string => `スキル ${n} 個`,
    proactive: '自動で使用',
    proactiveTitle: 'Claude がこのエージェントを自分から使います'
  },
  inheritModel: 'メインセッションと同じ',

  settingRows: {
    model: 'モデル',
    effort: '思考量',
    permission: '権限',
    maxTurns: '最大ターン数',
    memory: 'メモリ',
    isolation: '分離',
    background: 'バックグラウンド',
    modelInherited: 'メインセッションと同じ',
    modelInheritedExplain: 'モデル未指定：Claude は現在のセッションのモデルを使います。',
    modelCustomExplain: 'カスタムのモデル ID。',
    sessionValue: 'セッションと同じ',
    effortInheritedExplain: 'セッションの思考量を引き継ぎます。',
    permissionInheritedExplain: '起動元セッションの権限モードを引き継ぎます。',
    unlimited: '無制限',
    turnsUnlimitedExplain: 'タスクが終わるまで作業を続けます。',
    turnsLimitedExplain: 'この回数のステップで止まり、途中経過を報告します。',
    memoryOff: 'オフ',
    memoryOffExplain: '毎回、以前の実行の記憶なしで開始します。',
    isolationWorktree: '専用 worktree',
    isolationProject: 'プロジェクトフォルダ内',
    isolationWorktreeExplain: 'Git のコピーで作業し、並行する作業を妨げません。',
    isolationProjectExplain: 'プロジェクト内のファイルを直接変更します。',
    yes: 'はい',
    no: 'いいえ',
    backgroundYesExplain: 'Claude が別の作業をしている間もバックグラウンドで動き続けます。',
    backgroundNoExplain: 'Claude は結果を待ちます。'
  },

  detail: {
    origin: { user: '自分のエージェント', project: 'プロジェクトのエージェント', plugin: 'プラグインのエージェント', synced: '同期済み', disabled: '無効' },
    pluginOrigin: (name: string): string => `プラグイン ${name}`,
    projectOrigin: (name: string): string => `プロジェクト ${name}`,
    editCopy: 'コピーとして編集',
    edit: '編集',
    automate: '自動化',
    delete: 'エージェントを削除',
    whatItDoes: '役割',
    noSummary: 'まだ要約がありません。Claude Haiku がファイルを読み、2 文で説明します。',
    explain: '説明を生成',
    whenUsed: 'Claude が使うタイミング',
    noDescription: '説明がありません：Claude はいつ使うべきか判断できません。',
    proactiveYes: 'Claude は適したタスクを自分から任せます。',
    proactiveNo: 'タスクが説明に合うとき、またはあなたが指名したときに使われます。',
    callText: (name: string): string => `直接呼び出す：チャットで \`@agent-${name}\`、セッション全体なら \`claude --agent ${name}\`。`,
    settings: '設定',
    tools: 'ツール',
    toolsInheritAll: '制限なし：セッションができることはすべて可能です（MCP ツールを含む）。',
    toolMcp: 'MCP サーバーのツール。',
    toolCustom: 'カスタムまたは制限付きのツール。',
    blocked: '禁止：',
    skills: 'スキル',
    noSkills: 'スキルを事前読み込みせず、言及もしていません。',
    skillPreloadedTitle: '起動時にすべて読み込まれます',
    skillMentionedTitle: '指示の中で言及されています',
    preloaded: '事前読み込み',
    mentioned: '言及',
    skillMissingTitle: 'このマシンにスキルがインストールされていません',
    skillMissing: (name: string): string => `${name} · 見つかりません`,
    automations: '自動化',
    onlyWhenCalled: 'Claude が呼び出したときだけ実行されます。',
    runBySchedule: 'スケジュールで実行',
    scheduleOff: 'オフ',
    quality: '品質チェック',
    qualityClean: '指摘なし。内容が明確で、適切に制限され、出力の指定もあります。',
    instructions: '指示',
    showLess: '折りたたむ',
    showAll: 'すべて表示',
    instructionsEmpty: '空：エージェントは Claude から渡されたタスクだけで動きます。',
    fileAria: 'ファイル',
    showInFolder: 'フォルダで表示',
    preservedKeys: (keys: string): string => `編集時に保持されるファイル内のその他のフィールド：${keys}`
  },

  finding: { tip: 'ヒント', warn: '警告', error: 'エラー' },
  score: {
    great: 'とてもよくできています',
    fair: '使えますが、改善の余地あり',
    gaps: '不足あり',
    incomplete: '未完成',
    meter: '品質'
  },

  builder: {
    back: '一覧に戻る',
    editTitle: (name: string): string => `${name || 'エージェント'}を編集`,
    copyTitle: (name: string): string => `${name} のコピー`,
    newTitle: '新しいエージェント',
    unsaved: '未保存の変更があります',
    saved: 'すべて保存済み',
    notSaved: 'まだ保存されていません',
    cancel: 'キャンセル',
    save: '保存',
    saveTitle: '保存 (Ctrl+S)',
    toolsTitle: 'ツール',
    toolsExplain: 'エージェントにできること。少ないほど良い：レビュー担当に書き込み権限は不要、調査担当にシェルは不要です。',
    sideAria: 'チェックとプレビュー',
    chooseProject: 'プロジェクトを選択',
    nameFallback: 'name',
    sections: { start: 'AI で始める', identity: '名前と用途', place: '保存先', model: 'モデルと思考', tools: 'ツール', skills: 'スキル', rights: '権限と動作', prompt: '指示' },

    startNew: 'AI で始める',
    startImprove: 'AI で改善する',
    startNewExplain: 'エージェントにできてほしいことを自分の言葉で書いてください。Claude Sonnet が名前、ツール、モデル、権限を選び、指示を書きます。その後はすべて調整できます。',
    startImproveExplain: 'Claude が良いエージェントのルールに沿って、説明・ツール・指示を磨きます。改善したい点があれば任意で伝えてください。',
    ideaLabel: 'エージェントのアイデア',
    improveLabel: '改善の要望',
    ideaExample: '例：「毎朝、自分のプロジェクトでテストが失敗していないか確認し、原因とファイルを短い一覧にまとめる。」',
    improveExample: '例：「もっと短く答え、ファイルは絶対に変更しないようにしてほしい。」',
    createDraft: '下書きを作成',
    improve: '改善する',
    drafting: 'Claude がエージェントを下書きしています。通常 15〜40 秒かかります。',
    revising: 'Claude がエージェントを見直しています。通常 15〜40 秒かかります。',
    shortcut: 'Ctrl+Enter',
    whyChosen: 'Claude がこう選んだ理由',
    orTemplate: 'またはテンプレートから始める：',

    identityTitle: '名前と用途',
    identityExplain: '説明はエージェント全体で最も重要な部分です。Claude はこれでタスクが合うかどうかを判断します。',
    nameLabel: '名前',
    nameHint: '小文字とハイフン。ファイル名と呼び出し名 (@agent-name) になります。',
    colorLabel: '色',
    whenLabel: 'Claude にいつ使わせますか？',
    whenHint: (chars: number): string => `何をするか、いつ合うかを 1〜3 文で。例：「コードの変更のエラーを確認する。Use when …」 · ${chars} 文字`,
    whenPlaceholder: '最新のコード変更のバグやセキュリティ上の問題を確認する。Use when コードを変更した後、コミットする前。',
    proactiveLabel: '自動で使用',
    proactiveDescription: '「Use proactively.」を追加します：Claude は適したタスクを尋ねずに任せます。オフ：タスクが明らかに合うとき、またはあなたが指名したときだけ。',

    placeTitle: '保存先',
    placeExplain: '自分用のエージェントはそのマシンのすべてのプロジェクトで有効です。プロジェクト用はプロジェクト内に置かれ、Git と一緒に移動し、同名なら優先されます。',
    host: 'マシン',
    appliesTo: '適用範囲',
    allProjects: 'すべてのプロジェクト',
    oneProject: '1 つのプロジェクト',
    project: 'プロジェクト',
    noProjects: (host: string): string => `${host} にプロジェクトがありません`,

    modelTitle: 'モデルと思考',
    modelExplain: '単純で大量の作業には安価なモデル、本当に考える必要がある場面にだけ強力なモデルを。',
    modelLabel: 'モデル',
    modelInheritExplain: '専用モデルなし：今 Claude を使っているモデルを使います。',
    customModel: 'ファイル内のカスタムモデル ID：',
    customModelReplace: '上で選択すると置き換えられます。',
    effortLabel: '思考量',
    sessionLabel: 'セッションと同じ',
    effortInheritExplain: '実行中のセッションの思考量を引き継ぎます。',

    skillsTitle: 'スキルを事前読み込み',
    skillsExplain: 'エージェントはあなたのスキルを自動では見ません。事前読み込みしたスキルは起動時にすべてコンテキストに入るため、ほぼ毎回必要なものだけにしてください。',
    skillsChosen: (n: number): string => `${n} 個選択`,

    rightsTitle: '権限と動作',
    rightsExplain: '確認なしでどこまでできるか、どう作業するか。レビュー担当には「計画のみ」が安全な標準です。',
    rightsLabel: '権限',
    rightsInheritExplain: '起動元セッションの権限を引き継ぎます。',
    memoryLabel: 'メモリ',
    memoryOff: 'オフ',
    memoryOffExplain: '毎回、記憶なしで開始します。',
    maxTurnsLabel: '最大ターン数',
    unlimitedPlaceholder: '無制限',
    maxTurnsHint: '無限ループへのブレーキです。到達すると途中経過を返します。',
    worktreeLabel: '専用 worktree',
    worktreeDescription: 'Git のコピーで作業します。複数のエージェントが並行して変更するときに便利です。',
    backgroundLabel: 'バックグラウンドで実行',
    backgroundDescription: 'Claude は待たずに作業を続けます。',

    promptTitle: '指示',
    promptExplain: 'システムプロンプトです。会話の内容は知らず、ここに書かれたことと Claude が渡すタスクだけを知っています。役割、手順、回答の形式、制約を書きます。',
    insertOutline: 'アウトラインを挿入',
    promptChars: (n: number): string => `${n} 文字 · Markdown`,
    initialLabel: 'メインエージェントとしての最初のメッセージ',
    initialPlaceholder: '任意。例：「git status から始める」',
    initialHint: 'claude --agent のときだけ：最初のメッセージとして自動送信されます。',

    sideQuality: '品質チェック',
    noFindings: '指摘なし。',
    sectionsNav: 'セクション',
    filePreviewAria: 'ファイルのプレビュー',
    filePreview: 'ファイルの内容',
    alsoPreserved: (keys: string): string => `ほかに保持されるもの：${keys}`
  },

  fields: {
    colorGroup: '色',
    noColor: '色なし',
    presets: 'クイック選択',
    inheritAllNote: '何も選ばないと、エージェントはセッションの**すべての**ツールを引き継ぎます。制限するにはツールにチェックを入れてください。',
    moreTools: 'その他のツール',
    moreToolsPlaceholder: '例：mcp__github__get_issue, Bash(git diff *)',
    moreToolsHint: 'MCP ツールやパターンはカンマで区切ります。Claude は誤字を黙って無視するので、品質チェックで指摘されます。',
    filterSkills: 'スキルを絞り込み',
    searchSkill: 'スキルを検索',
    noSkillMatch: '検索に一致するスキルがありません。',
    noSkillsFound: 'スキルが見つかりません。カタログは ~/.claude/skills とプラグインからスキルを読み込みます。'
  },

  toolGroups: { read: '読み取り', write: '書き込み', exec: '実行', web: 'Web', meta: '制御' },
  tools: {
    Read: { label: 'ファイルを読む', explain: '画像や PDF も含め、ファイルを開きます。' },
    Grep: { label: '内容を検索', explain: '多数のファイルを同時にテキスト検索します。' },
    Glob: { label: 'ファイルを探す', explain: '**/*.ts のようなパターンでファイルを見つけます。' },
    Edit: { label: 'ファイルを変更', explain: '既存ファイルの特定箇所を置き換えます。' },
    Write: { label: 'ファイルを作成', explain: 'ファイルを新規作成、または丸ごと上書きします。' },
    NotebookEdit: { label: 'ノートブックを変更', explain: 'Jupyter ノートブックのセルを編集します。' },
    Bash: { label: 'コマンドを実行', explain: 'シェルコマンドを実行します：テスト、Git、ビルド。最も強力なツールです。' },
    PowerShell: { label: 'PowerShell', explain: 'PowerShell コマンドを実行します (Windows)。' },
    WebSearch: { label: 'Web を検索', explain: '最新の情報をインターネットで検索します。' },
    WebFetch: { label: 'Web ページを読む', explain: 'アドレスを読み込み、内容を読みます。' },
    Agent: { label: '別のエージェントを起動', explain: '自分でサブエージェントに仕事を任せられます。' },
    Skill: { label: 'スキルを使う', explain: 'スキルを読み込んで従うことができます。' },
    TodoWrite: { label: 'タスクリスト', explain: '長いタスク用に自分のチェックリストを持ちます。' }
  },
  presets: {
    read: { label: '読み取りのみ', explain: 'レビューやコード調査に安全' },
    edit: { label: '読み取りと変更', explain: 'コマンドなしでコードを書くエージェント向け' },
    dev: { label: '開発', explain: '変更に加え、シェルでテストと Git' },
    web: { label: 'Web 調査', explain: 'インターネットで検索・閲覧し、メモを書く' },
    all: { label: 'すべて継承', explain: '制限なし（MCP ツールを含む）' }
  },
  options: {
    model: {
      inherit: { label: 'メインセッションと同じ', explain: '今 Claude を使っているモデルを使います。' },
      haiku: { label: 'Haiku', explain: '高速で安価。検索、要約、簡単なチェックに向いています。' },
      sonnet: { label: 'Sonnet', explain: 'バランス型。ほとんどのエージェントの標準に最適です。' },
      opus: { label: 'Opus', explain: '難しいタスクに強い反面、遅くて高価です。' },
      fable: { label: 'Fable', explain: '最大のモデル。非常に高度な作業向け。' }
    },
    effort: {
      low: { label: '低', explain: '考える量が少なく、回答が速い。' },
      medium: { label: '中', explain: '行動の前に少し検討します。' },
      high: { label: '高', explain: 'じっくり考えます。レビューや計画に向いています。' },
      xhigh: { label: '非常に高', explain: '厄介なバグやアーキテクチャの問題向け。' },
      max: { label: '最大', explain: 'できる限り考えます。遅くて高価です。' }
    },
    permission: {
      default: { label: '確認する', explain: '変更やコマンドの前に確認します。見ている人がいない場合、こうした手順は拒否されます。' },
      acceptEdits: { label: '変更を許可', explain: '確認なしでファイルを変更できます。コマンドは確認します。' },
      auto: { label: '自動', explain: '安全性チェックのうえで、Claude が許可する内容を自分で判断します。' },
      dontAsk: { label: '確認しない', explain: '一切確認しません。許可されていないものは拒否されます。' },
      plan: { label: '計画のみ', explain: '読み取りと計画だけで、何も変更しません。レビュー担当に最適。' },
      bypassPermissions: { label: 'すべて許可', explain: '確認も制限もありません。安全なフォルダでのみ使用してください。' }
    },
    memory: {
      user: { label: '自分用', explain: 'ユーザーフォルダにプロジェクト横断で記憶します。' },
      project: { label: 'プロジェクト内', explain: 'メモリはプロジェクト内にあり、Git と一緒に移動します。' },
      local: { label: 'ローカルのみ', explain: 'メモリはプロジェクト内にありますが、Git には含まれません。' }
    }
  },

  lint: {
    nameMissing: '名前がありません。Claude はこの名前でエージェントを呼び出します。',
    nameFormat: '名前は小文字・数字・ハイフンのみにしてください。例：「code-reviewer」。',
    descriptionMissing: '説明がありません。説明がないと Claude はいつ使うべきか分かりません。',
    descriptionShort: '説明が短すぎます。何のために、いつ Claude に使わせるかを具体的に書いてください。',
    descriptionLong: '説明が長すぎます。毎回のセッションで読み込まれるため、詳細は指示に書いてください。',
    noTrigger: '使うタイミングが読み取れません。「Use when …」の形で書いてください。',
    notProactive: 'Claude に自分から使わせたいときは「Use proactively …」を追加してください。そうでなければ、指名したときだけです。',
    promptMissing: '指示がありません。エージェントは予備知識なしで始まります。ここに作業の進め方を書きます。',
    promptShort: '指示が短すぎます。役割、手順、回答の形式を書いてください。',
    promptLong: '指示が長すぎます。繰り返し使う知識は、事前読み込みするスキルにするのが向いています。',
    noOutput: '出力の指定がありません。返してほしい内容（例：「ファイル:行の一覧、200 語まで」）を書かないと、メインのコンテキストがあふれます。',
    noLimits: '制約が書かれていません。「制約」セクションがあると意図しない変更を防げます。',
    inheritsAllTools: 'すべてのツールを継承します。ツールが少ないほど、エージェントは安全で的確になります。',
    manyTools: 'ツールが多すぎます。タスクに必要なものだけを与えてください。',
    unknownTools: (names: string): string => `不明なツール：${names}。誤字は黙って無視されます。`,
    reviewWrites: '確認や検索のように見えますが、変更も可能です。「読み取りのみ」または「計画のみ」モードの方が安全です。',
    bypass: '「すべて許可」はあらゆる安全確認をオフにします。壊れても問題ないフォルダでのみ使ってください。',
    haikuTip: '検索だけなら Haiku の方が速く安価です。',
    manySkills: '事前読み込みしたスキルはすべてコンテキストに入ります。必要最小限にしてください。'
  },

  service: {
    notMarkdown: (path: string): string => `「${path}」は Markdown ファイルではありません。`,
    pluginCopyOnly: 'このエージェントはプラグインのもので、コピーとしてのみ保存できます。',
    deleteOnlyOwn: '.claude/agents フォルダにある自分のエージェントだけ削除できます。',
    fileLabel: (path: string): string => `エージェントファイル ${path}`,
    reloadHint: '一覧を再読み込みしてください。',
    ideaTooShort: 'エージェントに何をさせたいか、1〜2 文で説明してください。',
    currentMissing: '改善するには現在のエージェントが必要です。',
    pickProject: 'プロジェクトを選択してください：プロジェクト用のエージェントは、プロジェクト一覧にあるプロジェクトのフォルダに置かれます。',
    noJson: '回答に JSON オブジェクトが含まれていませんでした',
    unreadableJson: (detail: string): string => `JSON を読み取れません：${detail}`,
    notObject: '回答がオブジェクトではありませんでした',
    incompleteAnswer: '回答に名前、説明、または指示が含まれていません'
  },

  store: {
    discardTitle: '変更を破棄しますか？',
    discardMessage: 'エージェントはまだ保存されていません。',
    discard: '破棄',
    saved: (name: string): string => `エージェント「${name}」を保存しました`,
    deleteTitle: (name: string): string => `エージェント「${name}」を削除しますか？`,
    deleteMessage: (path: string): string => `ファイル ${path} が削除されます。このエージェントを使う自動化は、その後実行されなくなります。`,
    delete: '削除',
    deleted: (name: string): string => `エージェント「${name}」を削除しました`
  },

  promptOutline: [
    'あなたは<役割を一文で>です。',
    '',
    '## タスク',
    '<何を行い、最後に何ができあがっているべきか。>',
    '',
    '## 手順',
    '1. <最初のステップ>',
    '2. <2 番目のステップ>',
    '3. <結果が正しいか確認する>',
    '',
    '## 出力',
    '<メインエージェントへの回答の形式：例）ファイル:行を含む短い一覧、200 語まで。>',
    '',
    '## 制約',
    '- <決してやらないこと。例）コミットしない、src/ 以外のファイルを変更しない>'
  ].join('\n'),

  templates: {
    reviewer: {
      label: 'コードレビュー担当',
      explain: '変更を読んでエラーを報告し、何も変更しない',
      description: '最新のコード変更に含まれるバグ、セキュリティ上の問題、分かりにくい箇所を確認します。Use proactively after larger changes, before committing（大きな変更の後、コミット前に自動で使用）。',
      prompt: [
        'あなたは経験豊富なコードレビュー担当です。何も変更せず、問題を見つけます。',
        '',
        '## 手順',
        '1. `git diff`（および `git diff --staged`）で変更を取得する。',
        '2. 変更された行だけでなく、関係するファイルを文脈の中で読む。',
        '3. 本物のバグを探す：誤ったロジック、エラー処理の欠落、セキュリティ上の問題、境界ケース。',
        '4. 報告する前にすべての発見を確認する。推測を事実として書かない。',
        '',
        '## 出力',
        '重大なものから順に並べた一覧。発見ごとに `ファイル:行`、問題を一文、解決策を一文。',
        'スタイルの指摘や称賛は不要。重大な問題がなければ、そのことを一文で伝える。',
        '',
        '## 制約',
        '- ファイルを変更しない。コミットしない。'
      ].join('\n')
    },
    researcher: {
      label: 'コード探索担当',
      explain: 'プロジェクトを素早く検索して要約する',
      description: '何がコードのどこでどう実装されているかを調べ、該当箇所つきの短い要約を返します。Use proactively when many files need to be searched（多数のファイルを調べる必要があるとき自動で使用）。',
      prompt: [
        'あなたはコードを検索し、見つけたことを簡潔に報告します。',
        '',
        '## 手順',
        '1. Glob と Grep で広く検索し、関連する箇所だけを読む。',
        '2. 呼び出しをたどって実際の実装まで追う。',
        '',
        '## 出力',
        '150 語以内と、`ファイル:行 – そこで何が行われるか` の一覧。ファイル全体は返さない。'
      ].join('\n')
    },
    tester: {
      label: 'テスト作成担当',
      explain: '新しいコードのテストを書いて実行する',
      description: '新規または変更されたコードに足りないテストを書いて実行します。Use when new features were added without tests（テストなしで新機能が追加されたときに使用）。',
      prompt: [
        'あなたはプロジェクトのスタイルでテストを書きます。',
        '',
        '## 手順',
        '1. プロジェクトが使うテストフレームワークとパターンを調べる（既存のテストを読む）。',
        '2. 実装の詳細ではなく振る舞いをテストする。境界ケースから先に。',
        '3. テストを実行する。失敗したら、テストとコードのどちらが間違っているか確認する。',
        '',
        '## 出力',
        '作成したテスト、テスト実行の結果、コードで見つかったバグ。',
        '',
        '## 制約',
        '- 本番コードは変更せず、報告のみ。'
      ].join('\n')
    },
    web: {
      label: 'Web 調査担当',
      explain: 'インターネットで出典つきの調査を行う',
      description: '質問についてインターネットで調査し、出典つきの裏付けのある回答を返します。Use when current information, prices or documentation are needed（最新情報、価格、ドキュメントが必要なときに使用）。',
      prompt: [
        'あなたは徹底的に調査し、何も捏造しません。',
        '',
        '## 手順',
        '1. 複数の言い回しで、日本語と英語の両方で検索する。',
        '2. 最も良い結果は自分で読む。公式の情報源と新しいデータを優先する。',
        '3. 情報源どうしが矛盾する場合は、両方を示す。',
        '',
        '## 出力',
        '200 語以内の回答。続けて、リンクと日付つきの出典の一覧。',
        '',
        '## 制約',
        '- 実際に開いたリンクだけを挙げる。'
      ].join('\n')
    },
    docs: {
      label: 'ドキュメント作成担当',
      explain: 'README とドキュメントを最新に保つ',
      description: 'README とドキュメントを現在のコードに合わせて更新します。Use when features, commands or settings were changed（機能、コマンド、設定が変わったときに使用）。',
      prompt: [
        'あなたはプロジェクトのドキュメントを最新に保ちます。',
        '',
        '## 手順',
        '1. README と既存のドキュメントを読み、次に対象のコードを読む。',
        '2. 正しくなくなった部分を直す。本当に足りないものだけを追加する。',
        '3. 既存のドキュメントの文体、言語、構成を保つ。',
        '',
        '## 出力',
        '変更したファイルの一覧。変更ごとに一文。',
        '',
        '## 制約',
        '- コードは変更しない。理由なく新しいドキュメントファイルを作らない。'
      ].join('\n')
    }
  },

  guide: {
    navAria: '目次',
    toc: { what: 'エージェントとは', compare: 'エージェント、スキル、コマンド', decide: 'Claude の判断のしかた', anatomy: 'ファイルの構造', rules: '良いエージェントのルール', settings: 'すべての設定', automate: '自動化' },
    what: {
      p1: 'エージェント（Claude Code では「サブエージェント」）は、**専用のコンテキストウィンドウを持つ専門家**です。Claude がサブタスクを渡すと、自分の指示・ツール・モデルで処理し、結果だけを返します。途中の手順、たとえば読み込んだ数百のファイルや長いログは、エージェント側に残ります。',
      p2: 'そのため、メインセッションは短く分かりやすいままです。エージェントは、たくさん読んで返す量が少ないタスクに向いています：コード検索、変更のレビュー、テストの実行、Web 調査など。'
    },
    compare: {
      colWhat: '概要',
      colWhen: '使うタイミング',
      rows: [
        ['エージェント', '専用のコンテキスト・ツール・モデルを持つ別の担当者', '完結したサブタスクで、途中経過を誰も見る必要がないもの'],
        ['スキル', '必要に応じて Claude が自分で読み込む知識と手引き', '同じ会話の中で Claude に守らせたい、繰り返しの手順'],
        ['コマンド', '/name で起動する保存済みのプロンプト', '自分で定期的に実行すること']
      ]
    },
    decide: {
      auto: '**自動：** Claude はすべてのエージェントの名前と説明を知っています。タスクが説明に合えば、Claude が任せます。説明に「Use proactively」があると、はるかに任せやすくなります。',
      targeted: '**指名：** `@agent-name` と書くか、「code-reviewer エージェントを使って……」と頼みます。',
      session: '**セッション全体として：** `claude --agent name` で、Claude がそのエージェントとして、そのツールと指示で直接起動します。',
      precedence: '同じ名前のエージェントが 2 つあるときは、プロジェクトのものが自分のものより、自分のものがプラグインのものより優先されます。'
    },
    anatomy: {
      intro: 'エージェントは `~/.claude/agents/`（全プロジェクト用）または `<プロジェクト>/.claude/agents/` にある Markdown ファイルです。上に設定を書いたフロントマター、その下に指示があります。',
      parts: [
        { code: '---\nname: code-reviewer', title: '名前', text: '一意で、小文字とハイフン。これで呼び出します：@agent-code-reviewer。' },
        {
          code: 'description: "コードの変更のエラーを確認する。\n  Use proactively after larger changes."',
          title: '説明',
          text: '使うタイミングの合図。Claude は適しているかどうかをこの行だけで判断します。何をいつ使うか、どうやるかは書きません。'
        },
        { code: 'tools: Read, Grep, Glob, Bash', title: 'ツール', text: '許可するツール。この行がなければすべて継承します。レビュー担当に Write は不要です。' },
        { code: 'model: sonnet\neffort: high\npermissionMode: plan\n---', title: 'モデルと権限', text: '任意。指定しなければセッションの設定を引き継ぎます。' },
        {
          code: 'あなたは経験豊富なコードレビュー担当です。\n\n## 手順\n1. git diff を読む …\n\n## 出力\nファイル:行の一覧 …\n\n## 制約\n- 何も変更しない。',
          title: '指示',
          text: 'システムプロンプトです。会話は見えず、ここにある内容と Claude が渡すタスクだけが見えます。'
        }
      ]
    },
    rules: {
      items: [
        { title: '1 エージェント 1 タスク', text: '「コードをレビューする」と「ドキュメントを書く」は別々のエージェントです。何でも屋のエージェントが確実に選ばれることはありません。' },
        { title: '説明は使うタイミングの合図', text: '合うタイミングを書きます：「Use when …」「Use proactively after …」。進め方の詳細は指示に書きます。説明は毎回のセッションで読み込まれるからです。' },
        { title: 'ツールはできるだけ少なく', text: '最小権限：読み取り担当には Read、Grep、Glob。ツールが少ないほどリスクが減り、作業が的確になります。' },
        { title: '回答の形を決める', text: '返す内容を正確に：「ファイル:行の一覧、200 語まで」。そうしないとメインエージェントのコンテキストがあふれ、エージェントが防ぐべき状況になります。' },
        { title: '必要なことはすべて渡す', text: '予備知識なしで始まります。プロジェクトのルール、パス、コマンドは、指示または事前読み込みするスキルに書きます。' },
        { title: '適切なモデル', text: '検索や要約は Haiku、標準は Sonnet、難しい思考作業だけ Opus。クォータの節約になります。' },
        { title: '制約を書く', text: '決してやらないこと：コミット、プッシュ、あるフォルダ以外のファイルの変更。レビュー担当にはさらに「計画のみ」を。' }
      ],
      note: 'ビルダーの品質チェックが、これらのルールのほとんどをリアルタイムで確認します。'
    },
    settings: {
      colField: 'フィールド',
      colMeaning: '意味',
      colAdvice: '推奨',
      rows: [
        ['name', '名前と呼び出し', '必須。短く、役割を表す。'],
        ['description', 'Claude が使うタイミング', '必須。合図を含む 1〜3 文。'],
        ['tools', '許可するツール', '省略するとすべて継承。指定するなら一覧。'],
        ['disallowedTools', '禁止するツール', 'ほぼ何でも許可しつつ、たとえば Write だけ除きたいとき。'],
        ['model', 'モデル', 'haiku、sonnet、opus、fable、または inherit。'],
        ['effort', '思考量', 'low から max まで。レビューと計画には高め。'],
        ['permissionMode', '確認なしの権限', 'レビュー担当は plan、書き込み担当は acceptEdits。'],
        ['maxTurns', '最大ステップ数', '無限ループへのブレーキ。'],
        ['skills', '事前読み込みするスキル', 'ほぼ毎回必要なものだけ。'],
        ['memory', '実行をまたぐメモリ', '以前の実行から学ばせたいなら project。'],
        ['isolation', '専用の Git worktree', '複数のエージェントが並行して変更するなら worktree。'],
        ['background', 'バックグラウンドで実行', 'Claude が待たなくてよい長いタスク向け。'],
        ['color', '画面上の色', '表示のみ。'],
        ['hooks, mcpServers', 'フックと独自の MCP サーバー', '上級者向け。ビルダーはそのまま保持します。']
      ]
    },
    automate: {
      p1: 'どのエージェントも、あなたなしで実行できます。**自動化**エリアで、どのエージェントがいつ、どのプロジェクトでどんなタスクを受け取るかを決めます。たとえば平日の朝 8 時に「昨日の変更をレビューして」。アプリは選んだマシンで `claude -p --agent name` を使って起動し、結果を保存し、終わったら通知します。n8n などの追加ツールは不要です。',
      p2: 'スケジュール実行は、アプリを開いている間に開始されます。5 時間ウィンドウのクォータがほぼ尽きているときは、使い切らないようスキップされます。',
      toAutomations: '自動化へ'
    }
  }
}
