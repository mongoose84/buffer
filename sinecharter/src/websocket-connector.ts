import { EventEmitter } from 'events';

/* ---------------------------------------------------------------
 * Choose the correct WebSocket implementation at runtime.
 * --------------------------------------------------------------- */
let WSImpl: typeof WebSocket | null = null;

if (typeof window !== 'undefined' && typeof window.WebSocket !== 'undefined') {
  // Browser – native WebSocket constructor
  WSImpl = window.WebSocket;
} else {
  // Node – fall back to the popular 'ws' package
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const wsPkg = require('ws');
  WSImpl = wsPkg; // wsPkg is a constructor function compatible with the WebSocket API
}

/* ---------------------------------------------------------------
 * Options for the connector
 * --------------------------------------------------------------- */
export interface WsConnectorOptions {
  /** Parse incoming text as JSON (default true). */
  jsonParse?: boolean;
  /** Validate the parsed payload – return true if it should be emitted. */
  validator?: (payload: unknown) => boolean;
}

/* ---------------------------------------------------------------
 * WsConnector – thin EventEmitter wrapper around the chosen WS impl
 * --------------------------------------------------------------- */
export class WsConnector extends EventEmitter {
  /** The underlying socket – we type it as `any` because the concrete
   *  constructor can come from either the browser or the `ws` package. */
  private ws: any;

  /** Normalised options (always defined). */
  private readonly opts: Required<WsConnectorOptions>;

  constructor(url: string, opts?: WsConnectorOptions) {
    super();

    if (!WSImpl) {
      // This should never happen, but it protects us from a silent null‑pointer.
      throw new Error('No WebSocket implementation available in this environment.');
    }

    // Default options + user overrides
    this.opts = {
      jsonParse: true,
      validator: (p) => Array.isArray(p) && p.every((v) => typeof v === 'number'),
      ...(opts ?? {}),
    };

    // Instantiate the socket.  `as any` silences the mismatched constructor signatures.
    this.ws = new (WSImpl as any)(url);

    // Forward native events to our own EventEmitter interface

    this.ws.addEventListener('open', () => this.emit('open'));    
    this.ws.addEventListener('close', (ev: CloseEvent) =>
      this.emit('close', ev.code, ev.reason),
    );
    this.ws.addEventListener('error', (ev: Event) => this.emit('error', ev));
    this.ws.addEventListener('message', (msg: MessageEvent) =>
      this.handleMessage(msg),
    );
  }

  /** -------------------------------------------------------------
   *  Internal: turn a raw WebSocket message into a typed `data` event
   * ------------------------------------------------------------- */
private handleMessage(msg: MessageEvent): void {
  try {
    let payload: unknown;

    if (this.opts.jsonParse) {
      // Parse the incoming JSON
      const parsed = JSON.parse(msg.data as string);
      // Extract the array from the 'data' property if present
      payload = parsed && Array.isArray(parsed.data) ? parsed.data : parsed;
    } else {
      payload = msg.data;
    }

    // Run the validator on the extracted array
    if (!this.opts.validator(payload)) {
      return;
    }
    console.log('Message received', payload);
    this.emit('data', payload as number[]);
  } catch (err) {
    this.emit('error', err);
  }
}

  /** -------------------------------------------------------------
   *  Public helpers
   * ------------------------------------------------------------- */
  /** Send data through the socket (text, ArrayBuffer, Blob). */
  send(data: string | ArrayBuffer | Blob): void {
    if (this.ws.readyState !== this.ws.OPEN) {
      throw new Error('WebSocket is not open – cannot send data.');
    }
    this.ws.send(data);
  }

  /** Gracefully close the connection. */
  close(code?: number, reason?: string): void {
    this.ws.close(code, reason);
  }

  /** Convenience getter – true when the socket is open. */
  get isOpen(): boolean {
    return this.ws.readyState === this.ws.OPEN;
  }
}

/* ---------------------------------------------------------------
 * Small factory – useful if you prefer a functional style.
 * --------------------------------------------------------------- */
export function createWsConnector(
  url: string,
  opts?: WsConnectorOptions,
): WsConnector {
  return new WsConnector(url, opts);
}