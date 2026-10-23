/**
 * Shim `@react-native-community/netinfo` — HANYA fallback build.
 *
 * Kenapa ada file ini?
 * `pusher-js` versi React Native (`dist/react-native/pusher.js`) mengimpor
 * `@react-native-community/netinfo` untuk memantau online/offline. Bila paket
 * itu tidak ada di `node_modules`, bundle Metro gagal di-resolve dan build APK
 * berhenti — persis yang terjadi pada build 23d, yang "diakali" dengan alias
 * Metro di salinan build (tidak masuk repo).
 *
 * Solusi utamanya: paket asli terpasang sebagai dependency
 * (`@react-native-community/netinfo@12.0.1` — versi yang dibundel Expo SDK 57,
 * lihat `expo/bundledNativeModules.json`). Shim ini hanya dipakai
 * `metro.config.js` bila paket asli TIDAK bisa di-resolve (mis. `npm install`
 * dilewati karena offline), supaya build tetap jalan.
 *
 * Perilaku: anggap perangkat SELALU online. Realtime lalu mengandalkan
 * mekanisme reconnect Pusher sendiri (activity timeout + retry), yang sudah
 * berjalan; yang hilang hanyalah notifikasi "offline" instan.
 */

const keadaanOnline = {
  type: "wifi",
  isConnected: true,
  isInternetReachable: true,
  isWifiEnabled: true,
  details: null,
};

/** Versi async dari `fetch()` pada paket asli. */
function fetch() {
  return Promise.resolve(keadaanOnline);
}

/** Versi sinkron; dipakai `NetInfo.fetch` pada sebagian versi. */
function fetchSync() {
  return keadaanOnline;
}

/**
 * Pendaftaran listener. Tidak pernah mengirim event "offline", dan
 * mengembalikan fungsi pelepas seperti API asli.
 */
function addEventListener(listener) {
  if (typeof listener === "function") {
    try {
      listener(keadaanOnline);
    } catch {
      /* listener aplikasi tidak boleh menjatuhkan modul */
    }
  }

  return () => {};
}

function useNetInfo() {
  return keadaanOnline;
}

function configure() {}

const NetInfo = {
  fetch,
  fetchSync,
  addEventListener,
  useNetInfo,
  useNetInfoInstance: () => ({ netInfo: keadaanOnline, refresh: fetch }),
  configure,
  refresh: fetch,
};

module.exports = NetInfo;
module.exports.default = NetInfo;
module.exports.fetch = fetch;
module.exports.fetchSync = fetchSync;
module.exports.addEventListener = addEventListener;
module.exports.useNetInfo = useNetInfo;
module.exports.useNetInfoInstance = NetInfo.useNetInfoInstance;
module.exports.configure = configure;
module.exports.refresh = fetch;
module.exports.NetInfoStateType = {
  unknown: "unknown",
  none: "none",
  cellular: "cellular",
  wifi: "wifi",
  bluetooth: "bluetooth",
  ethernet: "ethernet",
  wimax: "wimax",
  vpn: "vpn",
  other: "other",
};
module.exports.NetInfoStateType = module.exports.NetInfoStateType;
