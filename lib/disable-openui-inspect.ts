/**
 * Suppresses the dev-only OpenUI Inspect widget auto-mounted by @openuidev/react-lang.
 * Must be imported before any @openuidev/react-ui / react-lang entry.
 */
const AUTO_MOUNT_FLAG = Symbol.for("openui.devtools.autoMount");

if (typeof globalThis !== "undefined") {
  (globalThis as Record<symbol, boolean>)[AUTO_MOUNT_FLAG] = true;
}
