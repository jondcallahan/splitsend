import "libsql";

declare module "libsql" {
  interface Options {
    /** Authentication token for Turso database connections */
    authToken?: string;
  }
}
