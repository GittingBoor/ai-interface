# Setup step by step

This guide takes you from zero to a fully configured app. On Windows the ready-made installer is enough
(a few minutes); building from source takes about 15 minutes.

**Shortcut:** Give Claude Code the file [`CLAUDE-TEMPLATE.md`](CLAUDE-TEMPLATE.md). Claude checks the
requirements, looks at your folders and writes a proposal that the app picks up on first launch.
The steps below are then just for reference.

## Contents

1. [Requirements](#1-requirements)
2. [Install](#2-install)
3. [The setup assistant](#3-the-setup-assistant)
4. [Connect a device via SSH](#4-connect-a-device-via-ssh) (optional)
5. [Connect Obsidian](#5-connect-obsidian) (optional)
6. [Customize: sidebar and pages](#6-customize-sidebar-and-pages)
7. [Updates](#7-updates)
8. [Troubleshooting](#8-troubleshooting)

## 1. Requirements

| What | Used for | How to check |
|---|---|---|
| **Claude Code**, signed in | Terminals, usage, quota, assistant | `claude --version`, run `claude` once and sign in |
| Windows: **Git Bash** (comes with Git for Windows) | Desktop notifications and status of the Claude terminals | The setup assistant checks it |
| **Node.js 22** or newer | only for building from source | `node --version` |
| **Git** | building from source, updates from the cloned folder | `git --version` |

Windows (PowerShell):

```powershell
irm https://claude.ai/install.ps1 | iex   # Claude Code
winget install Git.Git                    # Git and Git Bash
winget install OpenJS.NodeJS.LTS          # only for building from source
```

Linux (Debian/Ubuntu): Node 22 via [nodesource](https://github.com/nodesource/distributions) or `nvm`,
then `sudo apt install git` and `curl -fsSL https://claude.ai/install.sh | bash`.
Other options (Homebrew, WinGet, npm): [Claude Code installation](https://code.claude.com/docs/en/setup).

Claude Code needs a Pro, Max, Team or Enterprise plan or an API account. Then run `claude` once
and sign in via the browser.

## 2. Install

### Ready-made installer (Windows)

Download [`AI-Interface-Setup.exe`](https://github.com/GittingBoor/ai-interface/releases/latest/download/AI-Interface-Setup.exe) (latest version, older ones under
[Releases](https://github.com/GittingBoor/ai-interface/releases)) and run it. The installer is not signed: if Windows shows "Windows protected your PC",
click "More info" and then "Run anyway". It creates a desktop shortcut
and starts the app.

### From source (Windows and Linux)

```bash
git clone https://github.com/GittingBoor/ai-interface.git
cd ai-interface
npm install
```

Then, depending on your system:

| System | Command | Result |
|---|---|---|
| Windows | `npm run dist:win` | run `release\AI Interface Setup <version>.exe`; creates a desktop shortcut |
| Linux | `npm run dist:linux` | `release/AI Interface-<version>.AppImage`, make it executable and start it |
| without installing | `npm run build && npm start` | starts the built app directly from the folder |

Native modules (terminal, SQLite) come as prebuilt binaries; Visual Studio or compilers are not needed.
Keep the cloned folder: the installed Windows version fetches new versions from there at sign-in
(see [Updates](#7-updates)).

## 3. The setup assistant

On first launch (no data on this computer yet), the setup assistant opens instead of the normal interface.
Every step can be changed later under **Settings**.

1. **Welcome.** The app checks the requirements (Claude Code, sign-in, Git Bash on Windows). If something
   is missing, the command to copy is shown there; after installing, click "Check again". You can continue anyway,
   but the affected features stay unavailable until everything is in place. The app has also already searched for project folders,
   Obsidian vaults and SSH keys. If an
   `ai-interface-setup.json` exists in your home folder (e.g. written by Claude), this step shows
   "Proposal found and applied", and all following steps are pre-filled.
2. **Projects.** Choose the folder that contains your code projects (suggestions are listed below).
   "Read folders" lists the subfolders; Git repositories and folders with a `CLAUDE.md` are preselected.
   Container folders without their own repository (e.g. `Uni/`) are read one level deeper.
   Selected folders become projects; you can add more at any time under **Projects**.
3. **Notes** (optional). Turn on "Connect Obsidian vault" and choose the vault. The app suggests
   TODO files and log folders from the vault. Without Obsidian, just skip it; only TODOs and
   logs stay empty then.
4. **Devices** (optional). More computers via SSH, see [section 4](#4-connect-a-device-via-ssh).
   "Test connection" checks address, user and key immediately.
5. **Done.** Summary, "Start at sign-in" on or off, then "Finish setup".

You can restart the assistant at any time: **Settings → System → Start setup**.
Existing projects, categories and devices are kept; duplicates are skipped.

> **Update from an older version:** The former fixed Mini-PC connection automatically becomes the device
> "Mini-PC"; projects, usage and images stay assigned to it. Vault path, TODO file and projects folder
> no longer have built-in defaults. If they were not saved explicitly, the assistant appears once as
> "Review setup", pre-filled with what the app finds. Existing data is kept.

## 4. Connect a device via SSH

A device is any computer you can reach via SSH: server, mini PC, NAS, Raspberry Pi, a second laptop.
The app reads Claude usage, system values (CPU, RAM, temperatures, Docker) and the Git status of your
projects there, and opens terminals. Nothing needs to be installed on the device except an SSH server
(Linux; for Claude terminals also Claude Code).

**Create a key** (once, on the computer running the app):

```powershell
ssh-keygen -t ed25519            # Enter for the default path; passphrase optional
```

**Copy the key to the device:**

```powershell
# Windows (PowerShell)
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh <user>@<address> "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

```bash
# Linux/macOS
ssh-copy-id <user>@<address>
```

**Check:** `ssh <user>@<address> echo ok` must print `ok` without asking for a password.

**In the app:** Settings → Devices → "Add device" (or step 4 of the assistant):

| Field | Example | Note |
|---|---|---|
| Name | Server | the name of the entry in the sidebar |
| Color, icon | green, server icon | identify the device in charts and lists |
| Address, port | `192.168.1.20`, `22` | IP or hostname |
| User | `alex` | user on the device |
| Private key | `~/.ssh/id_ed25519` | file on this PC; without a file the app uses the SSH agent |
| Projects folder on the device | `~/projects` | for the folder list and Git status |

Keys with a passphrase: start the SSH agent and run `ssh-add` (Windows: enable the "OpenSSH Authentication
Agent" service). On the first connection the app stores the fingerprint of the device. If it changes (for example after
a reinstall), the app refuses the connection; then click "Reset SSH fingerprint" in the device list.

Every enabled device gets an entry in the **Devices** group of the sidebar. With the eye icon in the
device list you pin it or hide it. Ctrl+9 opens the first device.

## 5. Connect Obsidian

Settings → **Folders and notes**:

| Field | Meaning |
|---|---|
| Obsidian vault | folder containing `.obsidian`; empty = no Obsidian |
| Vault is on | this PC or a device (only shown when devices exist) |
| TODO file | relative to the vault, e.g. `TODO.md`; "Create TODO file" in the app creates it |
| Log folder | relative to the vault; Markdown files in it appear under **Logs** |
| Project notes | folder with one subfolder per project (e.g. `Projects`). If `Projects/<project name>/Protokoll` exists, the app assigns those logs to the project |

The app only writes the TODO file, and does so losslessly: all lines except the changed tasks stay
untouched. Format (Obsidian Tasks):

```markdown
## Server
- [ ] Check backup ⏫ 📅 2026-10-01
- [x] Updates installed ✅ 2026-09-20
```

**Open tasks on the start page:** In a project's newest log, the app reads the last
`## ` section and in it the `**Open:**` field followed by a list (field names of the other app languages such as `**Offen:**`, `**Pendiente:**`, `**À faire:**`, `**Aperti:**`, `**未完了:**` or `**待办:**` are recognized too, case-insensitive). Ticking items off in the app is remembered by the app; the
file stays unchanged. To make Claude write such logs, add an instruction to the project's `CLAUDE.md`
(or to `~/.claude/CLAUDE.md`), e.g.:

```markdown
## Log after every session
In Obsidian `Projects/<project name>/Protokoll/YYYY-MM-DD.md`, one file per day, one section per session:

    ## <short title>
    **Anliegen:** …
    **Ergebnis:** …
    **Open:**
    - [ ] what is still pending
```

> Only the folder name `Protokoll` is fixed, keep it as written even when the rest of the log is in English.

## 6. Customize: sidebar and pages

- **Sidebar:** Click a group heading to collapse it. Under "Customize sidebar"
  (at the bottom of the sidebar, or Settings → Sidebar) you rename groups, create new ones, drag entries
  between groups or hide them. "Restore default" resets everything.
- **Analytics:** Period, computer, breakdown, display and projects in the panel on the left; the selection is
  saved. Clicking a metric or a bar in the ranking changes all charts.
- **Device page:** "Customize" at the top right. Move sections by dragging or with the arrows,
  switch the width (full, two thirds, half, one third), hide them. Hidden sections are listed at the bottom
  so you can show them again. "Default" resets the page.
- **Projects:** Categories, colors, icons and a star for pinning directly under **Projects**.

## 7. Updates

- **Ready-made installer:** Download new versions from [Releases](https://github.com/GittingBoor/ai-interface/releases)
  and install over the existing one; data and settings are kept.
- **Built from source (Windows):** On launch the app checks whether GitHub has a newer version. Under
  Settings → Updates you choose what happens then:
  - **Manual (default):** An "Update available" notice appears in the sidebar; clicking "Update now" builds the
    new version in the cloned folder and installs it. The app then restarts.
  - **Automatic at sign-in:** With "Start at sign-in" the app builds and installs new versions by itself after
    you sign in.
- Skipped if the cloned folder has uncommitted changes or is not on `main`; the reason is shown under
  Settings → Updates.
- **By hand:** in the cloned folder run `git pull`, `npm install`, then `npm run dist:win` or `dist:linux` again.

## 8. Troubleshooting

| Problem | Solution |
|---|---|
| Device "unreachable" | Check `ssh <user>@<address> echo ok` in a terminal; compare address, port, user and key path in the settings; is the device on the same network? |
| "SSH key … has a passphrase" | Start the SSH agent and run `ssh-add` |
| "The SSH key of … has changed" | Only if the device was reinstalled: Settings → Devices → Reset fingerprint |
| Quota shows nothing | run `claude` once in a terminal and sign in; the app only reads its sign-in |
| TODOs empty | Settings → Folders and notes: check vault and TODO file |
| No notifications (Windows) | Is Git Bash installed (`winget install Git.Git`, then restart the app)? Are notifications enabled in the settings? |
| Proposal file is not applied | The assistant shows the error with the field name; check the JSON (backslashes doubled?), then "Start setup" |
| Something else | Settings → App → "Open log" |
