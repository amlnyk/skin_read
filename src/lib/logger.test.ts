import { describe, expect, it, vi } from 'vitest';
import { createConsoleLogger } from './logger';

function makeSink() {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('createConsoleLogger', () => {
  it('in production mode (warn) passes only warn and error', () => {
    const sink = makeSink();
    const logger = createConsoleLogger('warn', sink);
    logger.debug('d');
    logger.info('i');
    logger.warn('w', { code: 'X' });
    logger.error('e');
    expect(sink.debug).not.toHaveBeenCalled();
    expect(sink.info).not.toHaveBeenCalled();
    expect(sink.warn).toHaveBeenCalledWith('w', { code: 'X' });
    expect(sink.error).toHaveBeenCalledWith('e');
  });

  it('in dev mode (debug) passes everything', () => {
    const sink = makeSink();
    const logger = createConsoleLogger('debug', sink);
    logger.debug('d');
    logger.info('i');
    expect(sink.debug).toHaveBeenCalledWith('d');
    expect(sink.info).toHaveBeenCalledWith('i');
  });
});
