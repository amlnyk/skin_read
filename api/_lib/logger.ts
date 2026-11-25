// The log of a request holds a random id, the result code, the time and whether a limit
// stopped it. Never the photo, the text of the composition or an address in clear.

export type RequestLogEvent = {
  readonly requestId: string;
  /** "OK" or an error code. */
  readonly code: string;
  readonly durationMs: number;
  /** true when a limit stopped the request. */
  readonly limited: boolean;
};

export interface RequestLogger {
  log(event: RequestLogEvent): void;
}

type Sink = { info: (line: string) => void; warn: (line: string) => void };

export function createConsoleRequestLogger(sink: Sink = console): RequestLogger {
  return {
    log(event) {
      const line = JSON.stringify({
        requestId: event.requestId,
        code: event.code,
        durationMs: event.durationMs,
        limited: event.limited,
      });
      if (event.code === 'OK') sink.info(line);
      else sink.warn(line);
    },
  };
}
