// vite.config.ts
import { defineConfig } from "file:///I:/Projects/chatnio/app/node_modules/.pnpm/vite@4.5.0_@types+node@20.8.9_less@4.2.0/node_modules/vite/dist/node/index.js";
import react from "file:///I:/Projects/chatnio/app/node_modules/.pnpm/@vitejs+plugin-react-swc@3.4.0_vite@4.5.0/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path3 from "path";
import { createHtmlPlugin } from "file:///I:/Projects/chatnio/app/node_modules/.pnpm/vite-plugin-html@3.2.0_vite@4.5.0/node_modules/vite-plugin-html/dist/index.mjs";

// src/translator/translator.ts
import path2 from "path";
import fs2 from "fs";

// src/translator/io.ts
import fs from "fs";
import path from "path";
function readJSON(...paths) {
  return JSON.parse(fs.readFileSync(path.resolve(...paths)).toString());
}
function writeJSON(data, ...paths) {
  fs.writeFileSync(path.resolve(...paths), JSON.stringify(data, null, 2));
}
function getMigration(mother, data, prefix) {
  return Object.keys(mother).map((key) => {
    const template = mother[key], translation = data !== void 0 && key in data ? data[key] : void 0;
    const val = [prefix.length === 0 ? key : `${prefix}.${key}`];
    switch (typeof template) {
      case "string":
        if (typeof translation !== "string")
          return val;
        else if (template.startsWith("!!"))
          return val;
        break;
      case "object":
        return getMigration(template, translation, val[0]);
      default:
        return typeof translation === typeof template ? [] : val;
    }
    return [];
  }).flat().filter((key) => key !== void 0 && key.length > 0);
}
function getFields(data) {
  switch (typeof data) {
    case "string":
      return 1;
    case "object":
      if (Array.isArray(data))
        return data.length;
      return Object.keys(data).reduce(
        (acc, key) => acc + getFields(data[key]),
        0
      );
    default:
      return 1;
  }
}
function getTranslation(data, path4) {
  const keys = path4.split(".");
  let current = data;
  for (const key of keys) {
    if (current[key] === void 0)
      return void 0;
    current = current[key];
  }
  return current;
}
function setTranslation(data, path4, value) {
  const keys = path4.split(".");
  let current = data;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] === void 0)
      current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// src/translator/adapter.ts
var languageTranslatorMap = {
  cn: "zh-CN",
  en: "en",
  ru: "ru",
  ja: "ja",
  ko: "ko",
  fr: "fr",
  de: "de",
  es: "es",
  pt: "pt",
  it: "it"
};
function getFormattedLanguage(lang) {
  return languageTranslatorMap[lang.toLowerCase()] || lang;
}
async function translate(text, from, to) {
  if (from === to || text.length === 0)
    return text;
  const resp = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=${from}|${to}`
  );
  const data = await resp.json();
  return data.responseData.translatedText;
}
function doTranslate(content, from, to) {
  from = getFormattedLanguage(from);
  to = getFormattedLanguage(to);
  if (content.startsWith("!!"))
    content = content.substring(2);
  return translate(content, from, to);
}

// src/translator/translator.ts
var defaultDevLang = "cn";
async function processTranslation(config) {
  const source = path2.resolve(config.root, "src/resources/i18n");
  const files = fs2.readdirSync(source);
  const motherboard = `${defaultDevLang}.json`;
  if (files.length === 0) {
    console.warn("no translation files found");
    return;
  } else if (!files.includes(motherboard)) {
    console.warn(`no default translation file found (${defaultDevLang}.json)`);
    return;
  }
  const data = readJSON(source, motherboard);
  const target = files.filter((file) => file !== motherboard);
  for (const file of target) {
    const lang = file.split(".")[0];
    const translation = { ...readJSON(source, file) };
    const fields = getFields(data);
    const migration = getMigration(data, translation, "");
    const total = migration.length;
    let current = 0;
    for (const key of migration) {
      const from = getTranslation(data, key);
      const to = typeof from === "string" ? await doTranslate(from, defaultDevLang, lang) : from;
      current++;
      console.log(
        `[i18n] successfully translated: ${from} -> ${to} (lang: ${defaultDevLang} -> ${lang}, progress: ${current}/${total})`
      );
      setTranslation(translation, key, to);
    }
    if (migration.length > 0) {
      writeJSON(translation, source, file);
    }
    console.info(
      `translation file ${file} loaded, ${fields} fields detected, ${migration.length} migration(s) applied`
    );
  }
}

// src/translator/index.ts
function createTranslationPlugin() {
  return {
    name: "translate-plugin",
    apply: "build",
    async configResolved(config) {
      try {
        console.info("[i18n] start translation process");
        await processTranslation(config);
      } catch (e) {
        console.warn(`error during translation: ${e}`);
      } finally {
        console.info("[i18n] translation process finished");
      }
    }
  };
}

// vite.config.ts
var __vite_injected_original_dirname = "I:\\Projects\\chatnio\\app";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    createHtmlPlugin({
      minify: true
    }),
    createTranslationPlugin()
  ],
  resolve: {
    alias: {
      "@": path3.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  },
  build: {
    manifest: true,
    chunkSizeWarningLimit: 2048,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`
      }
    }
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8094",
        changeOrigin: true,
        rewrite: (path4) => path4.replace(/^\/api/, ""),
        ws: true
      },
      "/v1": {
        target: "http://localhost:8094",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic3JjL3RyYW5zbGF0b3IvdHJhbnNsYXRvci50cyIsICJzcmMvdHJhbnNsYXRvci9pby50cyIsICJzcmMvdHJhbnNsYXRvci9hZGFwdGVyLnRzIiwgInNyYy90cmFuc2xhdG9yL2luZGV4LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiSTpcXFxcUHJvamVjdHNcXFxcY2hhdG5pb1xcXFxhcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkk6XFxcXFByb2plY3RzXFxcXGNoYXRuaW9cXFxcYXBwXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9JOi9Qcm9qZWN0cy9jaGF0bmlvL2FwcC92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnXHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCJcclxuaW1wb3J0IHsgY3JlYXRlSHRtbFBsdWdpbiB9IGZyb20gJ3ZpdGUtcGx1Z2luLWh0bWwnXHJcbmltcG9ydCB7IGNyZWF0ZVRyYW5zbGF0aW9uUGx1Z2luIH0gZnJvbSBcIi4vc3JjL3RyYW5zbGF0b3JcIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW1xyXG4gICAgcmVhY3QoKSxcclxuICAgIGNyZWF0ZUh0bWxQbHVnaW4oe1xyXG4gICAgICBtaW5pZnk6IHRydWUsXHJcbiAgICB9KSxcclxuICAgIGNyZWF0ZVRyYW5zbGF0aW9uUGx1Z2luKCksXHJcbiAgXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBjc3M6IHtcclxuICAgIHByZXByb2Nlc3Nvck9wdGlvbnM6IHtcclxuICAgICAgbGVzczoge1xyXG4gICAgICAgIGphdmFzY3JpcHRFbmFibGVkOiB0cnVlLFxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgbWFuaWZlc3Q6IHRydWUsXHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDIwNDgsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiBgYXNzZXRzL1tuYW1lXS5baGFzaF0uanNgLFxyXG4gICAgICAgIGNodW5rRmlsZU5hbWVzOiBgYXNzZXRzL1tuYW1lXS5baGFzaF0uanNgLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcHJveHk6IHtcclxuICAgICAgXCIvYXBpXCI6IHtcclxuICAgICAgICB0YXJnZXQ6IFwiaHR0cDovL2xvY2FsaG9zdDo4MDk0XCIsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGkvLCBcIlwiKSxcclxuICAgICAgICB3czogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgXCIvdjFcIjoge1xyXG4gICAgICAgIHRhcmdldDogXCJodHRwOi8vbG9jYWxob3N0OjgwOTRcIixcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkk6XFxcXFByb2plY3RzXFxcXGNoYXRuaW9cXFxcYXBwXFxcXHNyY1xcXFx0cmFuc2xhdG9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJJOlxcXFxQcm9qZWN0c1xcXFxjaGF0bmlvXFxcXGFwcFxcXFxzcmNcXFxcdHJhbnNsYXRvclxcXFx0cmFuc2xhdG9yLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9JOi9Qcm9qZWN0cy9jaGF0bmlvL2FwcC9zcmMvdHJhbnNsYXRvci90cmFuc2xhdG9yLnRzXCI7aW1wb3J0IHsgUmVzb2x2ZWRDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgZnMgZnJvbSBcImZzXCI7XHJcbmltcG9ydCB7XHJcbiAgZ2V0RmllbGRzLFxyXG4gIGdldE1pZ3JhdGlvbixcclxuICBnZXRUcmFuc2xhdGlvbixcclxuICByZWFkSlNPTixcclxuICBzZXRUcmFuc2xhdGlvbixcclxuICB3cml0ZUpTT04sXHJcbn0gZnJvbSBcIi4vaW9cIjtcclxuaW1wb3J0IHsgZG9UcmFuc2xhdGUgfSBmcm9tIFwiLi9hZGFwdGVyXCI7XHJcblxyXG5leHBvcnQgY29uc3QgZGVmYXVsdERldkxhbmcgPSBcImNuXCI7XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc1RyYW5zbGF0aW9uKFxyXG4gIGNvbmZpZzogUmVzb2x2ZWRDb25maWcsXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IHNvdXJjZSA9IHBhdGgucmVzb2x2ZShjb25maWcucm9vdCwgXCJzcmMvcmVzb3VyY2VzL2kxOG5cIik7XHJcbiAgY29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhzb3VyY2UpO1xyXG5cclxuICBjb25zdCBtb3RoZXJib2FyZCA9IGAke2RlZmF1bHREZXZMYW5nfS5qc29uYDtcclxuXHJcbiAgaWYgKGZpbGVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgY29uc29sZS53YXJuKFwibm8gdHJhbnNsYXRpb24gZmlsZXMgZm91bmRcIik7XHJcbiAgICByZXR1cm47XHJcbiAgfSBlbHNlIGlmICghZmlsZXMuaW5jbHVkZXMobW90aGVyYm9hcmQpKSB7XHJcbiAgICBjb25zb2xlLndhcm4oYG5vIGRlZmF1bHQgdHJhbnNsYXRpb24gZmlsZSBmb3VuZCAoJHtkZWZhdWx0RGV2TGFuZ30uanNvbilgKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGNvbnN0IGRhdGEgPSByZWFkSlNPTihzb3VyY2UsIG1vdGhlcmJvYXJkKTtcclxuXHJcbiAgY29uc3QgdGFyZ2V0ID0gZmlsZXMuZmlsdGVyKChmaWxlKSA9PiBmaWxlICE9PSBtb3RoZXJib2FyZCk7XHJcbiAgZm9yIChjb25zdCBmaWxlIG9mIHRhcmdldCkge1xyXG4gICAgY29uc3QgbGFuZyA9IGZpbGUuc3BsaXQoXCIuXCIpWzBdO1xyXG4gICAgY29uc3QgdHJhbnNsYXRpb24gPSB7IC4uLnJlYWRKU09OKHNvdXJjZSwgZmlsZSkgfTtcclxuXHJcbiAgICBjb25zdCBmaWVsZHMgPSBnZXRGaWVsZHMoZGF0YSk7XHJcbiAgICBjb25zdCBtaWdyYXRpb24gPSBnZXRNaWdyYXRpb24oZGF0YSwgdHJhbnNsYXRpb24sIFwiXCIpO1xyXG4gICAgY29uc3QgdG90YWwgPSBtaWdyYXRpb24ubGVuZ3RoO1xyXG4gICAgbGV0IGN1cnJlbnQgPSAwO1xyXG4gICAgZm9yIChjb25zdCBrZXkgb2YgbWlncmF0aW9uKSB7XHJcbiAgICAgIGNvbnN0IGZyb20gPSBnZXRUcmFuc2xhdGlvbihkYXRhLCBrZXkpO1xyXG4gICAgICBjb25zdCB0byA9XHJcbiAgICAgICAgdHlwZW9mIGZyb20gPT09IFwic3RyaW5nXCJcclxuICAgICAgICAgID8gYXdhaXQgZG9UcmFuc2xhdGUoZnJvbSwgZGVmYXVsdERldkxhbmcsIGxhbmcpXHJcbiAgICAgICAgICA6IGZyb207XHJcbiAgICAgIGN1cnJlbnQrKztcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgIGBbaTE4bl0gc3VjY2Vzc2Z1bGx5IHRyYW5zbGF0ZWQ6ICR7ZnJvbX0gLT4gJHt0b30gKGxhbmc6ICR7ZGVmYXVsdERldkxhbmd9IC0+ICR7bGFuZ30sIHByb2dyZXNzOiAke2N1cnJlbnR9LyR7dG90YWx9KWAsXHJcbiAgICAgICk7XHJcbiAgICAgIHNldFRyYW5zbGF0aW9uKHRyYW5zbGF0aW9uLCBrZXksIHRvKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobWlncmF0aW9uLmxlbmd0aCA+IDApIHtcclxuICAgICAgd3JpdGVKU09OKHRyYW5zbGF0aW9uLCBzb3VyY2UsIGZpbGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUuaW5mbyhcclxuICAgICAgYHRyYW5zbGF0aW9uIGZpbGUgJHtmaWxlfSBsb2FkZWQsICR7ZmllbGRzfSBmaWVsZHMgZGV0ZWN0ZWQsICR7bWlncmF0aW9uLmxlbmd0aH0gbWlncmF0aW9uKHMpIGFwcGxpZWRgLFxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJJOlxcXFxQcm9qZWN0c1xcXFxjaGF0bmlvXFxcXGFwcFxcXFxzcmNcXFxcdHJhbnNsYXRvclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiSTpcXFxcUHJvamVjdHNcXFxcY2hhdG5pb1xcXFxhcHBcXFxcc3JjXFxcXHRyYW5zbGF0b3JcXFxcaW8udHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0k6L1Byb2plY3RzL2NoYXRuaW8vYXBwL3NyYy90cmFuc2xhdG9yL2lvLnRzXCI7aW1wb3J0IGZzIGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRKU09OKC4uLnBhdGhzOiBzdHJpbmdbXSk6IGFueSB7XHJcbiAgcmV0dXJuIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhdGgucmVzb2x2ZSguLi5wYXRocykpLnRvU3RyaW5nKCkpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVKU09OKGRhdGE6IGFueSwgLi4ucGF0aHM6IHN0cmluZ1tdKTogdm9pZCB7XHJcbiAgZnMud3JpdGVGaWxlU3luYyhwYXRoLnJlc29sdmUoLi4ucGF0aHMpLCBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRNaWdyYXRpb24oXHJcbiAgbW90aGVyOiBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxyXG4gIGRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4sXHJcbiAgcHJlZml4OiBzdHJpbmcsXHJcbik6IHN0cmluZ1tdIHtcclxuICByZXR1cm4gT2JqZWN0LmtleXMobW90aGVyKVxyXG4gICAgLm1hcCgoa2V5KTogc3RyaW5nW10gPT4ge1xyXG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IG1vdGhlcltrZXldLFxyXG4gICAgICAgIHRyYW5zbGF0aW9uID0gZGF0YSAhPT0gdW5kZWZpbmVkICYmIGtleSBpbiBkYXRhID8gZGF0YVtrZXldIDogdW5kZWZpbmVkO1xyXG4gICAgICBjb25zdCB2YWwgPSBbcHJlZml4Lmxlbmd0aCA9PT0gMCA/IGtleSA6IGAke3ByZWZpeH0uJHtrZXl9YF07XHJcblxyXG4gICAgICBzd2l0Y2ggKHR5cGVvZiB0ZW1wbGF0ZSkge1xyXG4gICAgICAgIGNhc2UgXCJzdHJpbmdcIjpcclxuICAgICAgICAgIGlmICh0eXBlb2YgdHJhbnNsYXRpb24gIT09IFwic3RyaW5nXCIpIHJldHVybiB2YWw7XHJcbiAgICAgICAgICBlbHNlIGlmICh0ZW1wbGF0ZS5zdGFydHNXaXRoKFwiISFcIikpIHJldHVybiB2YWw7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwib2JqZWN0XCI6XHJcbiAgICAgICAgICByZXR1cm4gZ2V0TWlncmF0aW9uKHRlbXBsYXRlLCB0cmFuc2xhdGlvbiwgdmFsWzBdKTtcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgcmV0dXJuIHR5cGVvZiB0cmFuc2xhdGlvbiA9PT0gdHlwZW9mIHRlbXBsYXRlID8gW10gOiB2YWw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBbXTtcclxuICAgIH0pXHJcbiAgICAuZmxhdCgpXHJcbiAgICAuZmlsdGVyKChrZXkpID0+IGtleSAhPT0gdW5kZWZpbmVkICYmIGtleS5sZW5ndGggPiAwKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEZpZWxkcyhkYXRhOiBhbnkpOiBudW1iZXIge1xyXG4gIHN3aXRjaCAodHlwZW9mIGRhdGEpIHtcclxuICAgIGNhc2UgXCJzdHJpbmdcIjpcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICBjYXNlIFwib2JqZWN0XCI6XHJcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSByZXR1cm4gZGF0YS5sZW5ndGg7XHJcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhkYXRhKS5yZWR1Y2UoXHJcbiAgICAgICAgKGFjYywga2V5KSA9PiBhY2MgKyBnZXRGaWVsZHMoZGF0YVtrZXldKSxcclxuICAgICAgICAwLFxyXG4gICAgICApO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHJhbnNsYXRpb24oZGF0YTogUmVjb3JkPHN0cmluZywgYW55PiwgcGF0aDogc3RyaW5nKTogYW55IHtcclxuICBjb25zdCBrZXlzID0gcGF0aC5zcGxpdChcIi5cIik7XHJcbiAgbGV0IGN1cnJlbnQgPSBkYXRhO1xyXG4gIGZvciAoY29uc3Qga2V5IG9mIGtleXMpIHtcclxuICAgIGlmIChjdXJyZW50W2tleV0gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIGN1cnJlbnQgPSBjdXJyZW50W2tleV07XHJcbiAgfVxyXG4gIHJldHVybiBjdXJyZW50O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0VHJhbnNsYXRpb24oXHJcbiAgZGF0YTogUmVjb3JkPHN0cmluZywgYW55PixcclxuICBwYXRoOiBzdHJpbmcsXHJcbiAgdmFsdWU6IGFueSxcclxuKTogdm9pZCB7XHJcbiAgY29uc3Qga2V5cyA9IHBhdGguc3BsaXQoXCIuXCIpO1xyXG4gIGxldCBjdXJyZW50ID0gZGF0YTtcclxuICBmb3IgKGxldCBpID0gMDsgaSA8IGtleXMubGVuZ3RoIC0gMTsgaSsrKSB7XHJcbiAgICBpZiAoY3VycmVudFtrZXlzW2ldXSA9PT0gdW5kZWZpbmVkKSBjdXJyZW50W2tleXNbaV1dID0ge307XHJcbiAgICBjdXJyZW50ID0gY3VycmVudFtrZXlzW2ldXTtcclxuICB9XHJcbiAgY3VycmVudFtrZXlzW2tleXMubGVuZ3RoIC0gMV1dID0gdmFsdWU7XHJcbn1cclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJJOlxcXFxQcm9qZWN0c1xcXFxjaGF0bmlvXFxcXGFwcFxcXFxzcmNcXFxcdHJhbnNsYXRvclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiSTpcXFxcUHJvamVjdHNcXFxcY2hhdG5pb1xcXFxhcHBcXFxcc3JjXFxcXHRyYW5zbGF0b3JcXFxcYWRhcHRlci50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vSTovUHJvamVjdHMvY2hhdG5pby9hcHAvc3JjL3RyYW5zbGF0b3IvYWRhcHRlci50c1wiOy8vIGZvcm1hdCBsYW5ndWFnZSBjb2RlIHRvIG5hbWUvSVNPIDYzOS0xIGNvZGUgbWFwXHJcbmNvbnN0IGxhbmd1YWdlVHJhbnNsYXRvck1hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICBjbjogXCJ6aC1DTlwiLFxyXG4gIGVuOiBcImVuXCIsXHJcbiAgcnU6IFwicnVcIixcclxuICBqYTogXCJqYVwiLFxyXG4gIGtvOiBcImtvXCIsXHJcbiAgZnI6IFwiZnJcIixcclxuICBkZTogXCJkZVwiLFxyXG4gIGVzOiBcImVzXCIsXHJcbiAgcHQ6IFwicHRcIixcclxuICBpdDogXCJpdFwiLFxyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEZvcm1hdHRlZExhbmd1YWdlKGxhbmc6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIGxhbmd1YWdlVHJhbnNsYXRvck1hcFtsYW5nLnRvTG93ZXJDYXNlKCldIHx8IGxhbmc7XHJcbn1cclxuXHJcbnR5cGUgdHJhbnNsYXRpb25SZXNwb25zZSA9IHtcclxuICByZXNwb25zZURhdGE6IHtcclxuICAgIHRyYW5zbGF0ZWRUZXh0OiBzdHJpbmc7XHJcbiAgfTtcclxufTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHRyYW5zbGF0ZShcclxuICB0ZXh0OiBzdHJpbmcsXHJcbiAgZnJvbTogc3RyaW5nLFxyXG4gIHRvOiBzdHJpbmcsXHJcbik6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgaWYgKGZyb20gPT09IHRvIHx8IHRleHQubGVuZ3RoID09PSAwKSByZXR1cm4gdGV4dDtcclxuICBjb25zdCByZXNwID0gYXdhaXQgZmV0Y2goXHJcbiAgICBgaHR0cHM6Ly9hcGkubXltZW1vcnkudHJhbnNsYXRlZC5uZXQvZ2V0P3E9JHtlbmNvZGVVUklDb21wb25lbnQoXHJcbiAgICAgIHRleHQsXHJcbiAgICApfSZsYW5ncGFpcj0ke2Zyb219fCR7dG99YCxcclxuICApO1xyXG4gIGNvbnN0IGRhdGE6IHRyYW5zbGF0aW9uUmVzcG9uc2UgPSBhd2FpdCByZXNwLmpzb24oKTtcclxuXHJcbiAgcmV0dXJuIGRhdGEucmVzcG9uc2VEYXRhLnRyYW5zbGF0ZWRUZXh0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZG9UcmFuc2xhdGUoXHJcbiAgY29udGVudDogc3RyaW5nLFxyXG4gIGZyb206IHN0cmluZyxcclxuICB0bzogc3RyaW5nLFxyXG4pOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIGZyb20gPSBnZXRGb3JtYXR0ZWRMYW5ndWFnZShmcm9tKTtcclxuICB0byA9IGdldEZvcm1hdHRlZExhbmd1YWdlKHRvKTtcclxuXHJcbiAgaWYgKGNvbnRlbnQuc3RhcnRzV2l0aChcIiEhXCIpKSBjb250ZW50ID0gY29udGVudC5zdWJzdHJpbmcoMik7XHJcblxyXG4gIHJldHVybiB0cmFuc2xhdGUoY29udGVudCwgZnJvbSwgdG8pO1xyXG59XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiSTpcXFxcUHJvamVjdHNcXFxcY2hhdG5pb1xcXFxhcHBcXFxcc3JjXFxcXHRyYW5zbGF0b3JcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkk6XFxcXFByb2plY3RzXFxcXGNoYXRuaW9cXFxcYXBwXFxcXHNyY1xcXFx0cmFuc2xhdG9yXFxcXGluZGV4LnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9JOi9Qcm9qZWN0cy9jaGF0bmlvL2FwcC9zcmMvdHJhbnNsYXRvci9pbmRleC50c1wiO2ltcG9ydCB7IFBsdWdpbiwgUmVzb2x2ZWRDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgeyBwcm9jZXNzVHJhbnNsYXRpb24gfSBmcm9tIFwiLi90cmFuc2xhdG9yXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVHJhbnNsYXRpb25QbHVnaW4oKTogUGx1Z2luIHtcclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogXCJ0cmFuc2xhdGUtcGx1Z2luXCIsXHJcbiAgICBhcHBseTogXCJidWlsZFwiLFxyXG4gICAgYXN5bmMgY29uZmlnUmVzb2x2ZWQoY29uZmlnOiBSZXNvbHZlZENvbmZpZykge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnNvbGUuaW5mbyhcIltpMThuXSBzdGFydCB0cmFuc2xhdGlvbiBwcm9jZXNzXCIpO1xyXG4gICAgICAgIGF3YWl0IHByb2Nlc3NUcmFuc2xhdGlvbihjb25maWcpO1xyXG4gICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKGBlcnJvciBkdXJpbmcgdHJhbnNsYXRpb246ICR7ZX1gKTtcclxuICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBjb25zb2xlLmluZm8oXCJbaTE4bl0gdHJhbnNsYXRpb24gcHJvY2VzcyBmaW5pc2hlZFwiKTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuICB9O1xyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1AsU0FBUyxvQkFBb0I7QUFDNVIsT0FBTyxXQUFXO0FBQ2xCLE9BQU9BLFdBQVU7QUFDakIsU0FBUyx3QkFBd0I7OztBQ0ZqQyxPQUFPQyxXQUFVO0FBQ2pCLE9BQU9DLFNBQVE7OztBQ0YrUSxPQUFPLFFBQVE7QUFDN1MsT0FBTyxVQUFVO0FBRVYsU0FBUyxZQUFZLE9BQXNCO0FBQ2hELFNBQU8sS0FBSyxNQUFNLEdBQUcsYUFBYSxLQUFLLFFBQVEsR0FBRyxLQUFLLENBQUMsRUFBRSxTQUFTLENBQUM7QUFDdEU7QUFFTyxTQUFTLFVBQVUsU0FBYyxPQUF1QjtBQUM3RCxLQUFHLGNBQWMsS0FBSyxRQUFRLEdBQUcsS0FBSyxHQUFHLEtBQUssVUFBVSxNQUFNLE1BQU0sQ0FBQyxDQUFDO0FBQ3hFO0FBRU8sU0FBUyxhQUNkLFFBQ0EsTUFDQSxRQUNVO0FBQ1YsU0FBTyxPQUFPLEtBQUssTUFBTSxFQUN0QixJQUFJLENBQUMsUUFBa0I7QUFDdEIsVUFBTSxXQUFXLE9BQU8sR0FBRyxHQUN6QixjQUFjLFNBQVMsVUFBYSxPQUFPLE9BQU8sS0FBSyxHQUFHLElBQUk7QUFDaEUsVUFBTSxNQUFNLENBQUMsT0FBTyxXQUFXLElBQUksTUFBTSxHQUFHLE1BQU0sSUFBSSxHQUFHLEVBQUU7QUFFM0QsWUFBUSxPQUFPLFVBQVU7QUFBQSxNQUN2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
