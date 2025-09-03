// 로깅 시스템
export class Logger {
  static log(level: 'info' | 'warn' | 'error', message: string, meta?: any) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      meta: meta || {}
    }
    
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, meta ? JSON.stringify(meta) : '')
  }
  
  static info(message: string, meta?: any) {
    Logger.log('info', message, meta)
  }
  
  static warn(message: string, meta?: any) {
    Logger.log('warn', message, meta)
  }
  
  static error(message: string, meta?: any) {
    Logger.log('error', message, meta)
  }
  
  static security(message: string, request?: any) {
    const securityMeta = {
      ip: request?.header('CF-Connecting-IP') || request?.header('X-Forwarded-For') || 'unknown',
      userAgent: request?.header('User-Agent') || 'unknown',
      url: request?.url || 'unknown'
    }
    Logger.log('warn', `[SECURITY] ${message}`, securityMeta)
  }
}

// 성능 모니터링
export class PerformanceMonitor {
  static startTimer(label: string): () => number {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      Logger.info(`Performance: ${label} took ${duration}ms`)
      return duration
    }
  }
}