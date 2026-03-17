"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/preload.ts
var preload_exports = {};
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
function invoke(channel, payload) {
  return import_electron.ipcRenderer.invoke(channel, payload);
}
function onEvent(channel, handler) {
  const listener = (_event, payload) => {
    handler(payload);
  };
  import_electron.ipcRenderer.on(channel, listener);
  return () => import_electron.ipcRenderer.removeListener(channel, listener);
}
var bridge = {
  campaign: {
    open: (dbPath) => invoke("campaign:open", { dbPath }),
    create: (options) => invoke("campaign:create", options),
    close: () => invoke("campaign:close"),
    listRecent: () => invoke("campaign:listRecent"),
    pickFile: () => invoke("campaign:pickFile"),
    saveFile: (name) => invoke("campaign:saveFile", { name })
  },
  db: {
    query: async (sql, params = []) => {
      const r = await invoke("db:query", { sql, params });
      if (!r.ok) throw new Error(r.error ?? "db:query failed");
      return r.rows;
    },
    run: async (sql, params = []) => {
      const r = await invoke("db:run", { sql, params });
      if (!r.ok) throw new Error(r.error ?? "db:run failed");
      return { lastInsertRowid: r.lastInsertRowid, changes: r.changes };
    }
  },
  assets: {
    resolve: (virtualPath) => invoke("assets:resolve", { virtualPath }),
    import: (options) => invoke("assets:import", options),
    pickFile: (category) => invoke("assets:pickFile", { category })
  },
  app: {
    getVersion: () => invoke("app:getVersion"),
    getPaths: () => invoke("app:getPaths"),
    showInFolder: (filePath) => invoke("app:showInFolder", { filePath })
  },
  on: {
    campaignOpened: (handler) => onEvent("push:campaignOpened", handler),
    campaignClosed: (handler) => onEvent("push:campaignClosed", handler),
    moduleEvent: (handler) => onEvent("push:moduleEvent", handler)
  }
};
import_electron.contextBridge.exposeInMainWorld("atlas", bridge);
//# sourceMappingURL=preload.js.map
