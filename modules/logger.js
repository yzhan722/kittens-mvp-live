export const logger = {
  enabled: localStorage.getItem('devMode') === 'true',
  log: (...args) => logger.enabled && console.log(...args),
  warn: (...args) => logger.enabled && console.warn(...args),
  error: (...args) => console.error(...args)
};