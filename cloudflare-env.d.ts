interface CloudflareEnv {
  ASSETS: Fetcher;
  WORKER_SELF_REFERENCE?: Fetcher;
  /** D1 subscription store for API v1 keys. See schema/subscriptions.sql */
  DB?: D1Database;
}

declare global {
  // eslint-disable-next-line no-var
  var CloudflareEnv: CloudflareEnv | undefined;
}

export {};
