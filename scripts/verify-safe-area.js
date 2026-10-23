/**
 * Harness verifikasi safe area tanpa perangkat ber-notch.
 *
 * Me-render HomeHeader / StickyBar / BottomTabBar ke HTML (react-native-web)
 * dengan `useSafeAreaInsets` di-mock ke nilai fiktif (47/34 dan 59/34), lalu
 * mencetak atribut style hasilnya. Dipakai sebagai bukti bahwa paddingTop
 * header, paddingBottom sticky bar, dan tinggi tab bar mengikuti inset.
 */
const path = require("path");
const fs = require("fs");
const Module = require("module");
const babel = require("@babel/core");

const ROOT = process.argv[2];
const INSET = JSON.parse(process.argv[3] || '{"top":47,"bottom":34,"left":0,"right":0}');

// --- transform TS/TSX on the fly -----------------------------------------
const origJs = Module._extensions[".js"];
function compile(mod, filename) {
  const src = fs.readFileSync(filename, "utf8");
  const out = babel.transformSync(src, {
    filename,
    babelrc: false,
    configFile: false,
    presets: [
      [require.resolve("@babel/preset-typescript"), { isTSX: true, allExtensions: true }],
    ],
    plugins: [
      [require.resolve("@babel/plugin-transform-react-jsx"), { runtime: "automatic" }],
      require.resolve("@babel/plugin-transform-modules-commonjs"),
    ],
    sourceType: "module",
  });
  mod._compile(out.code, filename);
}
Module._extensions[".ts"] = compile;
Module._extensions[".tsx"] = compile;

// --- mock modul yang tidak bisa jalan di Node ----------------------------
const stubs = {
  "react-native-safe-area-context": {
    useSafeAreaInsets: () => INSET,
    SafeAreaView: ({ children, ...rest }) =>
      require("react").createElement(require("react-native-web").View, rest, children),
  },
  "expo-linear-gradient": {
    LinearGradient: ({ children, ...rest }) =>
      require("react").createElement(require("react-native-web").View, rest, children),
  },
  "lucide-react-native": new Proxy(
    {},
    { get: () => () => null },
  ),
};

// BottomTabBar memakai useCart — cukup nilai tetap, bukan logika bisnis.
// Stub ditulis sebagai file nyata agar resolver Node bisa memuatnya.
const stubDir = path.join(require("os").tmpdir(), "posfe-safearea-stub");
fs.mkdirSync(stubDir, { recursive: true });
const cartStubFile = path.join(stubDir, "CartContext.js");
fs.writeFileSync(
  cartStubFile,
  "exports.useCart = () => ({ itemCount: 2 });\n" +
    "exports.CartProvider = ({ children }) => children;\n",
);

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (stubs[request]) return "stub:" + request;
  if (request === "react-native") return require.resolve("react-native-web");
  const resolved = origResolve.call(this, request, ...args);
  // Impor relatif (../../../contexts/CartContext) datang sebagai path absolut:
  // arahkan ke stub agar BottomTabBar bisa dirender tanpa provider.
  if (typeof resolved === "string" && /CartContext\.(tsx|ts)$/.test(resolved)) {
    return cartStubFile;
  }
  return resolved;
};
const origLoad = Module._load;
Module._load = function (request, ...args) {
  if (stubs[request]) return stubs[request];
  if (request === "react-native") {
    // Modal react-native-web tidak merender apa pun saat SSR; untuk bukti
    // padding dialog, Modal diganti pembungkus transparan yang menampilkan isi.
    const rnw = require("react-native-web");
    return {
      ...rnw,
      Modal: ({ children }) => children,
    };
  }
  return origLoad.call(this, request, ...args);
};

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function render(label, relPath, props, selectorNote) {
  const file = path.join(ROOT, relPath);
  delete require.cache[require.resolve(file)];
  const mod = require(file);
  const Comp = mod.default || mod[Object.keys(mod)[0]];
  const html = renderToStaticMarkup(React.createElement(Comp, props));
  // Ambil node pembungkus pertama yang punya padding-top / padding-bottom.
  const pads = [...html.matchAll(/padding-top:([0-9.]+)px/g)].map((m) => m[1]);
  const bottoms = [...html.matchAll(/padding-bottom:([0-9.]+)px/g)].map((m) => m[1]);
  const heights = [...html.matchAll(/height:([0-9.]+)px/g)].map((m) => m[1]);
  console.log(
    JSON.stringify({ label, selectorNote, paddingTop: pads, paddingBottom: bottoms, heights, htmlLength: html.length }),
  );
}

render(
  "HomeHeader",
  "src/components/layout/HomeHeader.tsx",
  { judul: "Beranda", alamat: "Jl. Contoh 1", onPressSearch: () => {} },
  "konten header (baris judul + search bar)",
);

render(
  "StickyBar",
  "src/components/commerce/StickyBar.tsx",
  { children: React.createElement("span", null, "isi") },
  "padding bawah default (denganInset=true)",
);

render(
  "StickyBar(denganInset=false)",
  "src/components/commerce/StickyBar.tsx",
  { children: React.createElement("span", null, "isi"), denganInset: false },
  "di atas tab bar",
);

render(
  "BottomTabBar",
  "src/components/layout/BottomTabBar.tsx",
  {
    state: { index: 0, routes: [{ key: "index", name: "index" }, { key: "cart", name: "cart" }] },
    descriptors: { index: { options: {} }, cart: { options: {} } },
    navigation: { emit: () => ({ defaultPrevented: false }), navigate: () => {} },
  },
  "tinggi 64 + inset bawah",
);

render(
  "Dialog",
  "src/components/ui/Dialog.tsx",
  { visible: true, onClose: () => {}, title: "Konfirmasi" },
  "overlay penuh, kartu dibatasi inset atas/bawah",
);

// Perhitungan murni (src/lib/inset.ts) — termasuk layar tanpa sticky bar.
const inset = require(path.join(ROOT, "src/lib/inset.ts"));
console.log(
  JSON.stringify({
    label: "src/lib/inset",
    paddingAtasHeader: inset.paddingAtasHeader(INSET),
    paddingBawahStickyBar: inset.paddingBawahStickyBar(INSET),
    paddingBawahStickyBar_tanpaInset: inset.paddingBawahStickyBar(INSET, false),
    paddingBawahKonten_24: inset.paddingBawahKonten(INSET, 24),
    tinggiTabBar_64: inset.tinggiTabBar(64, INSET.bottom),
    offsetMengambang: inset.offsetMengambang(INSET),
  }),
);
