import { shellQuote } from '../hosts/shellQuote'
import { GIT_BLOCK, GIT_ERROR } from './parseGitStatus'

/** Markiert einen fehlgeschlagenen `git fetch` in der Ausgabe von `fetchScript`. */
export const FETCH_ERROR = '@@FETCH-ERR@@'

const SAMPLE_GAP_S = 0.5
const TOP_PROCESSES = 5
const DOCKER_STATS_TIMEOUT_S = 15
const HWMON = '/sys/class/hwmon/hwmon*'
const CPU0 = '/sys/devices/system/cpu/cpu0'

/** Je Fühler eine Zeile `chip|label|wert|kritisch`. */
function hwmonLoop(kind: 'temp' | 'fan'): string {
  return [
    `for f in ${HWMON}/${kind}*_input; do`,
    '[ -r "$f" ] || continue; d=${f%/*}; b=${f##*/}; b=${b%_input};',
    'echo "$(cat "$d/name" 2>/dev/null)|$(cat "$d/${b}_label" 2>/dev/null)|$(cat "$f" 2>/dev/null)|$(cat "$d/${b}_crit" 2>/dev/null)";',
    'done'
  ].join(' ')
}

/**
 * Systemwerte und laufende Claude-Sitzungen in einem Aufruf (Abschnitte für `parseSystem`/`parseClaudeSessions`).
 * Liest fast nur `/proc` und `/sys`, damit der Abruf den Mini-PC kaum belastet.
 */
export function systemScript(): string {
  return [
    "echo @@STAT1@@; grep '^cpu' /proc/stat",
    `sleep ${SAMPLE_GAP_S}`,
    "echo @@STAT2@@; grep '^cpu' /proc/stat",
    "echo @@MEM@@; grep -E '^(MemTotal|MemAvailable|Cached|SwapTotal|SwapFree):' /proc/meminfo",
    'echo @@DF@@; df -B1 --output=target,size,used / "$HOME" | tail -n +2',
    'echo @@UP@@; cat /proc/uptime',
    'echo @@LOAD@@; cat /proc/loadavg',
    'echo @@NPROC@@; nproc',
    `echo @@TEMP@@; ${hwmonLoop('temp')}`,
    `echo @@FAN@@; ${hwmonLoop('fan')}`,
    'echo @@COOL@@; for c in /sys/class/thermal/cooling_device*; do [ -r "$c/type" ] || continue; echo "$(cat "$c/type")|$(cat "$c/cur_state" 2>/dev/null)|$(cat "$c/max_state" 2>/dev/null)"; done',
    'echo @@FREQ@@; cat /sys/devices/system/cpu/cpu[0-9]*/cpufreq/scaling_cur_freq 2>/dev/null',
    `echo @@GOV@@; cat ${CPU0}/cpufreq/scaling_governor 2>/dev/null`,
    `echo @@THROTTLE@@; cat ${CPU0}/thermal_throttle/package_throttle_count 2>/dev/null`,
    'echo @@NET@@; tail -n +3 /proc/net/dev',
    'echo @@WIFI@@; tail -n +3 /proc/net/wireless 2>/dev/null',
    'echo @@DISKIO@@; cat /proc/diskstats',
    'echo @@ENERGY@@; cat /sys/class/powercap/intel-rapl:0/energy_uj 2>/dev/null',
    `echo @@PS@@; ps -eo pid=,pcpu=,rss=,comm= --sort=-pcpu | awk 'NR<=${TOP_PROCESSES}{print} END{print "total " NR}'`,
    'echo @@SESS@@; for f in "$HOME"/.claude/sessions/*.json; do [ -f "$f" ] && { tr -d \'\\n\' < "$f"; echo; }; done',
    'echo @@ALIVE@@; for f in "$HOME"/.claude/sessions/*.json; do [ -f "$f" ] || continue; p=$(basename "$f" .json); kill -0 "$p" 2>/dev/null && echo "$p"; done',
    'true'
  ].join('; ')
}

/** Gerät, Betriebssystem, Adressen und Docker-Container (Abschnitte für `parseInfo`); teurer, daher selten aufrufen. */
export function infoScript(): string {
  const dmi = (key: string, file: string): string => `echo "${key}=$(cat /sys/class/dmi/id/${file} 2>/dev/null)"`
  return [
    'echo @@KV@@',
    dmi('vendor', 'sys_vendor'),
    dmi('model', 'product_name'),
    dmi('bios', 'bios_version'),
    dmi('biosdate', 'bios_date'),
    'echo "os=$(. /etc/os-release 2>/dev/null; echo "$PRETTY_NAME")"',
    'echo "kernel=$(uname -r)"',
    'echo "hostname=$(hostname)"',
    'echo "cpu=$(grep -m1 \'model name\' /proc/cpuinfo | cut -d: -f2-)"',
    `echo "cpumax=$(cat ${CPU0}/cpufreq/cpuinfo_max_freq 2>/dev/null)"`,
    'echo "updates=$(apt list --upgradable 2>/dev/null | grep -c /)"',
    'echo "reboot=$([ -e /var/run/reboot-required ] && echo 1 || echo 0)"',
    'echo "users=$(who | wc -l)"',
    'echo @@DRIVES@@; lsblk -dbno NAME,SIZE,MODEL 2>/dev/null',
    'echo @@ADDR@@; ip -br addr 2>/dev/null',
    "echo @@FAILED@@; systemctl --failed --no-legend --plain 2>/dev/null | awk '{print $1}'",
    "echo @@DOCKER@@; docker ps -a --format '{{.Names}}|{{.State}}|{{.Status}}|{{.Image}}' 2>/dev/null && echo @@DOCKEROK@@",
    `echo @@DSTATS@@; timeout ${DOCKER_STATS_TIMEOUT_S} docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}' 2>/dev/null`,
    'true'
  ].join('; ')
}

/** Status je Git-Projekt direkt unter `dir`. */
export function gitBatchScript(dir: string): string {
  return [
    `for d in ${shellQuote(dir)}/*/; do`,
    '[ -d "$d.git" ] || continue;',
    'if out=$(git -C "$d" status --porcelain=v2 --branch 2>&1); then',
    `echo "${GIT_BLOCK} $d"; printf '%s\\n' "$out";`,
    `else echo "${GIT_ERROR} $d $(printf '%s' "$out" | head -1)"; fi;`,
    'done; true'
  ].join(' ')
}

/** `git fetch` (ändert nur Remote-Referenzen), danach der Status. */
export function fetchScript(path: string): string {
  const p = shellQuote(path)
  return [
    `if ! err=$(git -C ${p} fetch --quiet 2>&1); then echo "${FETCH_ERROR} $(printf '%s' "$err" | head -1)"; fi`,
    `echo "${GIT_BLOCK} "${p}`,
    `git -C ${p} status --porcelain=v2 --branch 2>&1`,
    'true'
  ].join('; ')
}
