// Thin wrapper around console — not because console.log is being hidden
// anywhere (there was nothing stray to hide; client and CLI scripts were
// already clean), but so there's exactly one place to redirect to a real
// logging service later without touching every call site.
function info(...args) {
  console.log(...args);
}
function warn(...args) {
  console.warn(...args);
}
function error(...args) {
  console.error(...args);
}

module.exports = { info, warn, error };
