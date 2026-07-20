//
// Event bus constants for the Tome module.
//
// The current UI uses direct SQLite access, but these are ready for future
// IPC-backed integrations and cross-module reactions.

export const TOME_EMITTED_EVENTS = [
  'tome:created',
  'tome:updated',
  'tome:deleted',
  'tome:folder-created',
  'tome:folder-updated',
  'tome:folder-deleted',
] as const;

export const TOME_HANDLED_EVENTS = [
  'app:campaign-opened',
] as const;
