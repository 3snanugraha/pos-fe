/**
 * Penanda onboarding (dibaca `app/index.tsx`, ditulis layar onboarding).
 * Disimpan terpisah agar layar tidak mengimpor modul route.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_KEY = "onboarding_seen";

export async function sudahLihatOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === "1";
  } catch {
    // Storage gagal dibaca → anggap sudah lihat agar pengguna tidak tertahan.
    return true;
  }
}

export async function tandaiOnboardingSelesai(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    // Gagal menyimpan penanda tidak boleh menghalangi pengguna masuk.
  }
}
