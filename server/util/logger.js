// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
}

const SENSITIVE_QUERY_KEYS =
  /(cookie|MUSIC_U|__csrf|csrf_token|password|token|authorization)/i

function sanitize(value, seen = new WeakSet()) {
  if (typeof value === 'string') {
    return value.replace(
      /((?:cookie|MUSIC_U|__csrf|csrf_token|password|token|authorization)=)[^&\s"']+/gi,
      '$1[REDACTED]',
    )
  }
  if (!value || typeof value !== 'object' || seen.has(value)) return value
  seen.add(value)
  if (value instanceof Error) return sanitize(value.stack || value.message, seen)
  if (Array.isArray(value)) return value.map(item => sanitize(item, seen))
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_QUERY_KEYS.test(key) ? '[REDACTED]' : sanitize(item, seen),
    ]),
  )
}

const logger = {
  debug: (msg, ...args) =>
    console.info(`${colors.cyan}[DEBUG]${colors.reset}`, sanitize(msg), ...args.map(item => sanitize(item))),
  info: (msg, ...args) =>
    console.info(`${colors.green}[INFO]${colors.reset}`, sanitize(msg), ...args.map(item => sanitize(item))),
  warn: (msg, ...args) =>
    console.info(`${colors.yellow}[WARN]${colors.reset}`, sanitize(msg), ...args.map(item => sanitize(item))),
  error: (msg, ...args) =>
    console.error(`${colors.red}[ERROR]${colors.reset}`, sanitize(msg), ...args.map(item => sanitize(item))),
  success: (msg, ...args) =>
    console.log(
      `${colors.bright}${colors.green}[SUCCESS]${colors.reset}`,
      sanitize(msg),
      ...args.map(item => sanitize(item)),
    ),
  critical: (msg, ...args) =>
    console.error(
      `${colors.bright}${colors.bgRed}[CRITICAL]${colors.reset}`,
      sanitize(msg),
      ...args.map(item => sanitize(item)),
    ),
}

module.exports = logger
