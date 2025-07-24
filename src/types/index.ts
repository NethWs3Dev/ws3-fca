/**
 * Options on how the fca should behave.
 */
export interface LoginOptions {
  /** Appear online. */
  online?: boolean;
  /** Listen to self. */
  selfListen?: boolean;
  /** Listen to events. */
  listenEvents?: boolean;
  /** Update presence. */
  updatePresence?: boolean;
  /** Force login. */
  forceLogin?: boolean;
  /** Auto mark delivery. */
  autoMarkDelivery?: boolean;
  /** Auto mark read. */
  autoMarkRead?: boolean;
  /** Listen to typing. */
  listenTyping?: boolean;
  /** Use a proxy. */
  proxy?: string;
  /** Auto reconnect to mqtt when disconnected. */
  autoReconnect?: boolean;
  /** User agent to use. */
  userAgent?: string;
  /** Emit ready. */
  emitReady?: boolean;
  /** To use a random user agent. */
  randomUserAgent?: boolean;
  /** Change regions. */
  bypassRegion?: string;
  /** Control fca logs. */
  logging?: boolean;
};

/**
 * Credentials of user.
 */
export interface LoginCredentials {
  /** The cookies of the user. */
  appState?: Cookie[] | string;
  /** Email of user. */
  email?: string;
  /** Password of user. */
  password?: string;
};

/**
 * Cookie type.
 */
export interface Cookie {
  /** Key of cookie. */
  key?: string;
  /** Name of cookie. */
  name?: string;
  /** Value of cookie. */
  value: unknown;
};
