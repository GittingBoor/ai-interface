/** POSIX-Shell: alles in einfache Anführungszeichen, eingebettete `'` als `'\''`. */
export const shellQuote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`

/** PowerShell: einfache Anführungszeichen; PowerShell wertet auch typografische Apostrophe als solche, alle verdoppeln. */
export const powershellQuote = (value: string): string => `'${value.replace(/['\u2018\u2019\u201A\u201B]/g, (m) => m + m)}'`
