# Set up AI Interface – task for Claude

> **How to use this file:** Open Claude Code in any folder and write:
> "Read `docs/en/CLAUDE-TEMPLATE.md` from the AI Interface repository and set up AI Interface for me accordingly."
> Or copy everything below the line straight into the chat.
>
> Claude then checks your computer, asks when something is unclear and writes a setup proposal.
> On first launch the app picks up this proposal automatically; you only confirm it.

---

## Your task

You are setting up **AI Interface** for me, a desktop app (Electron) for working with Claude Code:
usage and quota, projects with a built-in terminal, optionally TODOs and logs from Obsidian,
and optionally more computers via SSH.

At the end there is a file **`ai-interface-setup.json` in my home folder**
(Windows: `%USERPROFILE%\ai-interface-setup.json`, Linux/macOS: `~/ai-interface-setup.json`).
The app's setup assistant reads it on first launch and pre-fills all steps with it.

### Rules

- Ask me before you install, clone or build anything. You may read and search without asking.
- No passwords, tokens or private keys in the file. Only **paths** to key files.
- Do not change anything in my projects, notes or SSH settings.
- If you are not sure about something: ask instead of guessing.
- Answer in English, briefly.

### Step 1: Check requirements

Check and report the result to me as a short list:

| What | Check with | Minimum |
|---|---|---|
| Claude Code | `claude --version` (signed in?) | current |
| Windows: Git Bash | `C:\Program Files\Git\bin\bash.exe` exists (not the WSL `bash.exe`) | for notifications from terminals |
| Node.js | `node --version` | 22, only for building from source |
| Git | `git --version` | only for building from source |

If something is missing, give me the install command (Windows: `winget install Git.Git`, for building additionally
`winget install OpenJS.NodeJS.LTS`) and wait until I have run it.

### Step 2: Install the app (only after asking)

**Windows, ready-made installer (default):** Download the latest version from
https://github.com/GittingBoor/ai-interface/releases/latest/download/AI-Interface-Setup.exe (e.g. with
`gh release download -R GittingBoor/ai-interface -p "AI-Interface-Setup.exe"` or in the browser) and let me run it.
The installer is not signed; Windows may ask for confirmation ("More info" → "Run anyway").

**Linux, or from source on request:** Ask me where the repository should go (suggestion: my projects folder
from step 3). Then:

```bash
git clone https://github.com/GittingBoor/ai-interface.git
cd ai-interface
npm install
npm run dist:win     # Windows: installer under release/
npm run dist:linux   # Linux: AppImage under release/
```

On Windows, have me run the installer `release\AI Interface Setup <version>.exe` (I click through it myself).
If the app is already installed, skip this step.

### Step 3: Look at the computer

Collect the following without changing anything:

1. **Projects folder:** Where are my code projects? Typical: `~/projects`, `~/Projects`, `~/GitHub`,
   `~/source/repos`, on Windows also `D:\GitHub`, `D:\Projects`. Take the folder with the most
   Git repositories. If there are several candidates, ask me.
2. **Projects:** Subfolders of the projects folder that are a Git repository or have a `CLAUDE.md`
   (one level deep; pure container folders like `Uni/` one level further). Leave out `node_modules`, `.venv` etc.
   Additionally the folders from `~/.claude/projects/` (for every folder where Claude Code ran, there is an
   encoded path) – these are projects I actually work on.
3. **Obsidian vault:** A folder with a `.obsidian` subfolder (home, documents, OneDrive, iCloud, Dropbox).
   If found: TODO files (`TODO*.md`) and folders starting with "Protokoll". If there are several
   TODO files, ask which one the app should manage.
4. **Other computers:** Entries in `~/.ssh/config` (Host, HostName, User, Port, IdentityFile) and existing
   keys `~/.ssh/id_ed25519`, `id_ecdsa`, `id_rsa`. Ask me which computers the app should show.
   Test the connection with `ssh -o BatchMode=yes <user>@<host> echo ok` (read only). If it fails,
   briefly explain the setup from `docs/en/SETUP.md`, section "Connect a device via SSH".

### Step 4: Agree on the proposal with me

Show me a short overview:

- Projects folder
- Projects (name, path, computer) with a suggestion for **categories** (e.g. Programming, University, Work, Personal)
  and a fitting icon for each
- Vault, TODO file, log folder (or "no Obsidian")
- Devices (name, address, user, projects folder on the device)

I correct it, then you write the file.

### Step 5: Write `ai-interface-setup.json`

Format (all fields except the marked ones are optional; unknown fields are ignored):

```jsonc
{
  "projectsRoot": "C:\\Users\\Alex\\Projects",        // folder containing the projects
  "vault": {                                           // null = no Obsidian
    "path": "C:\\Users\\Alex\\Documents\\Notes",      // required if vault is set
    "todoFile": "TODO.md",                             // relative to the vault
    "protocolDir": "Protokolle",                       // relative to the vault
    "notesDir": "Projekte"                             // folder with one subfolder per project, "" = vault root
  },
  "devices": [
    {
      "id": "server",                                  // optional, otherwise derived from the name: a-z, 0-9, "-"
      "name": "Server",                                // required
      "host": "192.168.1.20",                          // required: IP or hostname
      "user": "alex",                                  // required
      "port": 22,
      "privateKeyPath": "C:\\Users\\Alex\\.ssh\\id_ed25519",
      "projectsDir": "~/projects",                     // projects folder on the device
      "color": "#5fb37a",
      "icon": "lucide:server"                          // "lucide:<name>" or "emoji:<emoji>"
    }
  ],
  "categories": [
    { "name": "Programming", "color": "#e08a4f", "icon": "lucide:code" }
  ],
  "projects": [
    {
      "path": "C:\\Users\\Alex\\Projects\\webshop",   // required
      "name": "Webshop",
      "device": "local",                               // "local" or id/name of a device
      "category": "Programming",                       // name of a category
      "color": "#e08a4f",
      "icon": "emoji:🛒",
      "starred": true                                  // pinned at the top
    }
  ]
}
```

Important:

- Write real JSON without comments; the comments above are only for explanation.
- On Windows, double the backslashes (`"C:\\Users\\..."`).
- Colors as `#rrggbb`. Icons: Lucide names in lowercase with hyphens (`lucide:graduation-cap`)
  or a single emoji (`emoji:🎵`).
- A complete example is in `docs/ai-interface-setup.example.json`.

Then validate the file, e.g. with `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" <file>`.

### Step 6: Wrap-up

Tell me:

1. Where the file is.
2. That I should now start AI Interface. On first launch the setup assistant appears with
   "Proposal found and applied"; I click through and confirm.
3. If the app is already set up: **Settings → System → Start setup**, which also applies the
   proposal. Existing projects and devices are kept, duplicates are skipped.
4. What is still open (e.g. SSH keys I still have to copy to a device).
5. With Obsidian: the start page shows open tasks from project logs. Show me the log block from
   `docs/en/SETUP.md` (section "Connect Obsidian") and ask whether you should add it to my `CLAUDE.md`.

The file can stay or be deleted afterwards; the app only needs it during setup.
