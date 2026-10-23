const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require("path");

const config = getDefaultConfig(__dirname)

/**
 * Fallback resolusi `@react-native-community/netinfo`.
 *
 * Latar belakang: `pusher-js` (build React Native) mengimpor
 * `@react-native-community/netinfo`. Build APK 23d hanya berhasil karena ada
 * alias Metro di SALINAN build (`shims/netinfo.js`) yang tidak pernah masuk
 * repo — akibatnya build dari checkout bersih gagal me-resolve modul itu.
 *
 * Paket aslinya sekarang dependency resmi (12.0.1 = versi bundel Expo SDK 57),
 * jadi jalur normal memakai paket asli. Alias di bawah hanya dipakai bila
 * paket itu tidak ada (mis. `npm install` dilewati / offline), supaya build
 * dari repo bersih tidak pernah berhenti karena satu modul opsional.
 */
function punyaNetinfoAsli() {
  try {
    require.resolve("@react-native-community/netinfo/package.json", { paths: [__dirname] });
    return true;
  } catch {
    return false;
  }
}

if (!punyaNetinfoAsli()) {
  const shimNetinfo = path.resolve(__dirname, "shims/netinfo.js");

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "@react-native-community/netinfo" || moduleName.startsWith("@react-native-community/netinfo/")) {
      return {
        type: "sourceFile",
        filePath: shimNetinfo,
      };
    }

    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = withNativeWind(config, { input: './global.css' })
