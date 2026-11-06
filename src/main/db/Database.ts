import Database from 'better-sqlite3'
import { mainT } from '../i18n'

/** Nur anhängen, nie ändern: installierte Apps haben echte Daten. */
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE usage_messages (
    message_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    host TEXT NOT NULL,
    project TEXT NOT NULL,
    model TEXT NOT NULL,
    ts INTEGER NOT NULL,
    input INTEGER NOT NULL,
    output INTEGER NOT NULL,
    cache_creation INTEGER NOT NULL,
    cache_read INTEGER NOT NULL
  );
  CREATE INDEX idx_usage_ts ON usage_messages(ts);
  CREATE INDEX idx_usage_session ON usage_messages(session_id);
  CREATE TABLE file_offsets (
    host TEXT NOT NULL,
    path TEXT NOT NULL,
    offset INTEGER NOT NULL,
    PRIMARY KEY (host, path)
  );
  CREATE TABLE favorites (
    id INTEGER PRIMARY KEY,
    host TEXT NOT NULL,
    path TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (host, path)
  );
  CREATE TABLE custom_models (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    path TEXT NOT NULL,
    kind TEXT NOT NULL,
    note TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE images (
    id INTEGER PRIMARY KEY,
    file_name TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    project TEXT,
    tags TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  // 2: Projektarten (Startauswahl, frei änderbar), Stern, Symbol. Spalten mit Standardwerten, damit Inserts ohne sie (Python-Snippet) gültig bleiben.
  `
  CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    color TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  INSERT INTO categories (name, color, icon, sort_order, created_at) VALUES
    ('@@CATEGORY_CODING@@', '#e08a4f', 'lucide:code', 0, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    ('@@CATEGORY_WORK@@', '#5fb3a8', 'lucide:briefcase', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    ('@@CATEGORY_LEARNING@@', '#6f9bd8', 'lucide:graduation-cap', 2, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
  ALTER TABLE favorites ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
  ALTER TABLE favorites ADD COLUMN starred INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE favorites ADD COLUMN icon TEXT;
  UPDATE favorites SET category_id = (SELECT id FROM categories WHERE name = '@@CATEGORY_CODING@@');
  `,
  // 3: KI-Bilder aus Claude-Sessions (Herkunft, Host, Dubletten über den Inhalt, eigener Leseoffset).
  `
  ALTER TABLE images ADD COLUMN host TEXT;
  ALTER TABLE images ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
  ALTER TABLE images ADD COLUMN session_id TEXT;
  ALTER TABLE images ADD COLUMN content_hash TEXT;
  CREATE UNIQUE INDEX idx_images_hash ON images(content_hash) WHERE content_hash IS NOT NULL;
  CREATE TABLE image_offsets (
    host TEXT NOT NULL,
    path TEXT NOT NULL,
    offset INTEGER NOT NULL,
    PRIMARY KEY (host, path)
  );
  `,
  // 4: Durchläufe, die am Kontingent abgebrochen sind (Punkt 14), letzte Eingabe je Session, eigener Leseoffset.
  `
  CREATE TABLE interrupted_runs (
    host TEXT NOT NULL,
    session_id TEXT NOT NULL,
    project TEXT NOT NULL,
    hit_at INTEGER NOT NULL,
    message TEXT NOT NULL,
    resolved_at INTEGER,
    dismissed_at INTEGER,
    PRIMARY KEY (host, session_id)
  );
  CREATE TABLE session_prompts (
    host TEXT NOT NULL,
    session_id TEXT NOT NULL,
    text TEXT NOT NULL,
    ts INTEGER NOT NULL,
    PRIMARY KEY (host, session_id)
  );
  CREATE TABLE run_offsets (
    host TEXT NOT NULL,
    path TEXT NOT NULL,
    offset INTEGER NOT NULL,
    PRIMARY KEY (host, path)
  );
  `,
  // 5: KI-Zusammenfassungen von Skills/Agents je Inhalts-Hash.
  `
  CREATE TABLE skill_summaries (
    hash TEXT PRIMARY KEY,
    summary TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  `,
  // 6: Privatmodus – Ordner, die gesperrt ausgeblendet werden.
  `
  CREATE TABLE private_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host TEXT NOT NULL,
    path TEXT NOT NULL,
    label TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (host, path)
  );
  `,
  // 7: Galerie liest jetzt auch Playwright-Screenshot-Dateien und Subagenten: Sessions einmal neu lesen (Dubletten fängt der Hash ab).
  `
  DELETE FROM image_offsets;
  `,
  // 8: Prompts (eigene Nachrichten) zählen: Sessions einmal neu lesen (Nachrichten-Dubletten fängt message_id ab).
  `
  CREATE TABLE usage_prompts (
    uuid TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    host TEXT NOT NULL,
    project TEXT NOT NULL,
    ts INTEGER NOT NULL,
    chars INTEGER NOT NULL
  );
  CREATE INDEX usage_prompts_ts ON usage_prompts(ts);
  DELETE FROM file_offsets;
  `,
  // 9: In der App abgehakte Aufgaben aus dem Feld „Offen:“ der Protokolle.
  `
  CREATE TABLE task_checks (
    group_id TEXT NOT NULL,
    task_key TEXT NOT NULL,
    checked_at INTEGER NOT NULL,
    PRIMARY KEY (group_id, task_key)
  );
  `,
  // 10: Reserviert für optionale Erweiterungen (hält die Versionsnummern gleich).
  `SELECT 1;`,
  // 11: Quellen (gemerkte Webseiten je Projekt, von dir oder aus Claude-Sessions), eigener Leseoffset.
  `
  CREATE TABLE sources (
    id INTEGER PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    host TEXT,
    project TEXT,
    origin TEXT NOT NULL,
    starred INTEGER NOT NULL DEFAULT 0,
    session_id TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX idx_sources_folder_url ON sources(coalesce(host, ''), coalesce(project, ''), url);
  CREATE TABLE source_offsets (
    host TEXT NOT NULL,
    path TEXT NOT NULL,
    offset INTEGER NOT NULL,
    PRIMARY KEY (host, path)
  );
  `,
  // 12: Automatisierungen (Agent-Läufe nach Zeitplan) und ihr Verlauf.
  `
  CREATE TABLE automations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    agent TEXT,
    host TEXT NOT NULL,
    cwd TEXT NOT NULL,
    prompt TEXT NOT NULL,
    schedule TEXT NOT NULL,
    permission TEXT NOT NULL,
    model TEXT,
    timeout_minutes INTEGER NOT NULL,
    notify INTEGER NOT NULL,
    enabled INTEGER NOT NULL,
    next_run_at INTEGER,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE automation_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    automation_id INTEGER NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    trigger TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    result TEXT NOT NULL DEFAULT '',
    error TEXT,
    session_id TEXT,
    cost_usd REAL,
    turns INTEGER
  );
  CREATE INDEX automation_runs_by_automation ON automation_runs(automation_id, started_at DESC);
  `
]

const sqlText = (value: string): string => value.replaceAll("'", "''")

/** Setzt die Namen der Startarten (Platzhalter `@@CATEGORY_…@@`) in der aktuellen Sprache ein; läuft nur beim ersten Einspielen. */
export function renderMigration(sql: string): string {
  const { coding, work, learning } = mainT().main.defaults.categories
  return sql
    .replaceAll('@@CATEGORY_CODING@@', sqlText(coding))
    .replaceAll('@@CATEGORY_WORK@@', sqlText(work))
    .replaceAll('@@CATEGORY_LEARNING@@', sqlText(learning))
}

/** Öffnet die App-Datenbank und spielt fehlende Migrationen ein (Version in `user_version`). */
export function openDatabase(file: string): Database.Database {
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  const current = db.pragma('user_version', { simple: true }) as number
  MIGRATIONS.slice(current).forEach((sql, index) => {
    db.transaction(() => {
      db.exec(renderMigration(sql))
      db.pragma(`user_version = ${current + index + 1}`)
    })()
  })
  return db
}
