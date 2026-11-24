import type { LogContext, LogLevel, Logger } from './ports';

type Sink = Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

// In production only warn and error pass. Callers must never pass personal data.
export function createConsoleLogger(minLevel: LogLevel, sink: Sink = console): Logger {
  const emit = (level: LogLevel, message: string, context?: LogContext) => {
    if (ORDER[level] < ORDER[minLevel]) return;
    if (context) {
      sink[level](message, context);
    } else {
      sink[level](message);
    }
  };
  return {
    debug: (message, context) => emit('debug', message, context),
    info: (message, context) => emit('info', message, context),
    warn: (message, context) => emit('warn', message, context),
    error: (message, context) => emit('error', message, context),
  };
}
