var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
(function(l, r) {
  if (!l || l.getElementById("livereloadscript"))
    return;
  r = l.createElement("script");
  r.async = 1;
  r.src = "//" + (self.location.host || "localhost").split(":")[0] + ":35730/livereload.js?snipver=1";
  r.id = "livereloadscript";
  l.getElementsByTagName("head")[0].appendChild(r);
})(self.document);
"use strict";
const siyuan = require("siyuan");
const d = (r, c, l) => {
  const n = c ?? "zhi", $ = (t) => {
    const o = t.getFullYear(), e = String(t.getMonth() + 1).padStart(2, "0"), s = String(t.getDate()).padStart(2, "0"), a = String(t.getHours()).padStart(2, "0"), S = String(t.getMinutes()).padStart(2, "0"), u = String(t.getSeconds()).padStart(2, "0");
    return `${o}-${e}-${s} ${a}:${S}:${u}`;
  }, g = (t, o, e) => {
    const s = $(/* @__PURE__ */ new Date());
    e ? console.log(`[${n}] [${s}] [${t}] [${r}] ${o}`, e) : console.log(`[${n}] [${s}] [${t}] [${r}] ${o}`);
  }, p = (t, o) => {
    const e = $(/* @__PURE__ */ new Date());
    o ? console.info(`[${n}] [${e}] [INFO] [${r}] ${t}`, o) : console.info(`[${n}] [${e}] [INFO] [${r}] ${t}`);
  }, f = (t, o) => {
    const e = $(/* @__PURE__ */ new Date());
    o ? console.warn(`[${n}] [${e}] [WARN] [${r}] ${t}`, o) : console.warn(`[${n}] [${e}] [WARN] [${r}] ${t}`);
  }, R = (t, o) => {
    const e = $(/* @__PURE__ */ new Date());
    o ? console.error(typeof t == "string" ? `[${n}] [${e}] [ERROR] [${r}] ${t}` : `[${n}] [${e}] [ERROR] [${r}] ${t.toString()}`, o) : typeof t == "string" ? console.error(`[${n}] [${e}] [ERROR] [${r}] ${t.toString()}`) : console.error(`[${n}] [${e}] [ERROR] [${r}] an error occurred =>`, t);
  };
  return {
    debug: (t, o) => {
      l && g("DEBUG", t, o);
    },
    info: (t, o) => {
      p(t, o);
    },
    warn: (t, o) => {
      f(t, o);
    },
    error: (t, o) => {
      R(t, o);
    }
  };
};
const index = "";
`${window.siyuan.config.system.workspaceDir}`;
`${window.siyuan.config.system.dataDir}`;
const isDev = true;
class ImporterPlugin extends siyuan.Plugin {
  constructor(options) {
    super(options);
    __publicField(this, "logger");
    this.logger = d("index", "demo", isDev);
  }
  onload() {
    this.logger.info("Demo loaded");
  }
  onunload() {
    this.logger.info("Demo unloaded");
  }
}
module.exports = ImporterPlugin;
