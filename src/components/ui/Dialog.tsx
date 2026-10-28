import { useEffect, useId, useState } from "react";
import { Modal, Pressable, Text, View, useWindowDimensions, type ModalProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { antreanModal } from "../../lib/dialogAntrean";
import { rencanaRenderDialog } from "../../lib/dialogTampil";
import { useReduceMotion } from "../../lib/motion";
import { colors, overlay, shadowStyle } from "../../theme/tokens";

export type DialogProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** Ikon (Lucide) di atas judul — mis. bell 40. */
  icon?: React.ReactNode;
  /** Area aksi, biasanya dua tombol md sejajar. */
  children?: React.ReactNode;
  /** Tombol aksi di bawah konten. */
  actions?: React.ReactNode;
  /** Tutup dialog saat overlay ditekan (default true). */
  dismissOnBackdrop?: boolean;
  /** Paksa matikan animasi jendela. Bila kosong, ikut setelan "Kurangi gerakan" perangkat. */
  reduceMotion?: boolean;
  /**
   * Animasi jendela bawaan `<Modal>`. Default "fade" — atau "none" bila
   * Reduce Motion aktif. Animasi TIDAK boleh dipasang manual pada kartu
   * dialog (lihat catatan di bawah).
   */
  animationType?: ModalProps["animationType"];
  testID?: string;
};

/**
 * Dialog Zovora — guideline §3.17 + §2.6.
 * Overlay neutral-900 50%, kartu putih radius xl (16), lebar layar - 48,
 * padding 20, shadow-modal.
 * Fokus dijebak lewat `accessibilityViewIsModal` (guideline §7).
 *
 * ── Kenapa konten TIDAK dianimasikan manual (perbaikan APK 2026-10-28c) ──
 *
 * Versi 2026-10-28b membungkus kartu dialog dengan `Animated.View` ber-
 * `opacity` yang dimulai dari 0 lalu dianimasikan ke 1 memakai native driver.
 * Di Android nilai itu dikirim ke view lewat jalur native animated
 * (`PropsAnimatedNode.updateView` → `synchronouslyUpdateViewOnUIThread`) pada
 * frame-frame pertama setelah jendela `Dialog` dibuat. Bila pembaruan itu
 * tidak sampai, opacity tetap 0 — PERMANEN, karena `Animated.Value` tidak
 * memicu render ulang React sehingga tidak ada yang memperbaikinya. Gejalanya
 * persis laporan uji perangkat: overlay/backdrop tampil (View biasa, tanpa
 * animasi) tetapi kartu dialog tidak muncul sama sekali.
 *
 * Aturan yang sekarang dipegang: **konten dialog atomis dengan `visible`.**
 * Bila `<Modal>` dirender, kartu dan isinya ikut dirender — tanpa gate
 * opacity, timer, atau animasi manual apa pun. Animasi masuk/keluar
 * diserahkan ke `animationType` milik `<Modal>` (di Android memakai animasi
 * jendela native `catalyst_fade_in/out`), yang bekerja pada level jendela,
 * bukan pada opacity view di dalamnya, sehingga tidak bisa membuat konten
 * tak terlihat secara permanen.
 *
 * ── Kenapa lewat `antreanModal` (perbaikan APK 2026-10-28b) ─────────────
 *
 * Di Android satu `<Modal>` = satu **jendela `Dialog` Android**
 * (`ReactModalHostView` membuat `ComponentDialog` lalu memanggil `show()`).
 * Bila satu layar memuat dua `<Modal>` sekaligus, atau satu ditutup sementara
 * yang lain dibuka pada commit yang SAMA, `WindowManager` bisa menempatkan
 * jendela baru di belakang / menolak menampilkannya. Karena itu setiap
 * instance mendaftar ke `antreanModal`: satu slot global, promosi ditunda
 * satu tick, sehingga hanya ada satu jendela native pada satu waktu.
 *
 * Catatan: serialisasi ini TIDAK memakai `onDismiss`, karena React Native
 * hanya mengimplementasikan `onDismiss` di iOS — lihat
 * `ReactModalHostManager.kt` (`topDismiss` ditandai "iOS only") dan
 * `Libraries/Modal/Modal.js` (`if (Platform.OS === 'ios')`). Di Android tidak
 * ada event "jendela sudah benar-benar ditutup", jadi jeda satu tick setelah
 * commit pelepasan adalah sinyal termurah yang tersedia.
 */
export function Dialog({
  visible,
  onClose,
  title,
  description,
  icon,
  children,
  actions,
  dismissOnBackdrop = true,
  reduceMotion,
  animationType,
  testID,
}: DialogProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const id = useId();
  /**
   * Boleh merender `<Modal>` sekarang? Ditentukan antrean, bukan `visible`
   * saja: `visible` = niat tampil, `memegangSlot` = jendela native tersedia.
   * Keduanya digabung `rencanaRenderDialog` menjadi SATU keputusan sehingga
   * modal dan konten tidak pernah diputuskan terpisah.
   */
  const [memegangSlot, setMemegangSlot] = useState(false);
  const kurangiGerak = useReduceMotion();
  const tanpaAnimasi = reduceMotion ?? kurangiGerak;

  // Minta/lepas slot mengikuti `visible`. `lepas` inilah yang mempromosikan
  // dialog berikutnya (satu tick kemudian) saat dialog ini ditutup.
  useEffect(() => {
    if (!visible) {
      antreanModal.lepas(id);
      return undefined;
    }

    antreanModal.minta(id);

    return () => {
      antreanModal.lepas(id);
    };
  }, [id, visible]);

  // Ikuti keputusan antrean. State lokal dipakai agar React tahu kapan harus
  // melepas/membuat `<Modal>` — membaca `antreanModal` saat render tidak
  // memicu render ulang, jadi dialog bisa "tidak pernah muncul".
  useEffect(() => {
    const perbarui = () => setMemegangSlot(visible && antreanModal.boleh(id));
    perbarui();
    return antreanModal.langgan(perbarui);
  }, [id, visible]);

  /**
   * Animasi jendela dipilih langsung (tanpa state/effect) supaya tidak ada
   * setState di dalam effect dan tidak ada render tambahan.
   *
   * Catatan Android: mengganti `animationType` pada jendela yang SEDANG tampil
   * memaksa `ReactModalHostView` membuat ulang `Dialog`
   * (`createNewDialog = true`). Itu tidak berbahaya di sini karena
   * `useReduceMotion` membaca setelan perangkat sekali saat layar dipasang
   * (jauh sebelum dialog dibuka), dan pergantian "fade" ↔ "none" tidak
   * menyentuh opacity konten — konten tetap dirender.
   */
  const animasi: ModalProps["animationType"] =
    animationType ?? (tanpaAnimasi ? "none" : "fade");

  const rencana = rencanaRenderDialog(visible, memegangSlot);

  /*
   * Dialog yang sudah ditutup TIDAK boleh tetap ada di pohon DOM.
   *
   * `Modal` react-native-web hanya menyembunyikan isinya (opacity 0) saat
   * `visible=false`, sehingga tombol "Batal"/"Hapus" tetap bisa difokus
   * keyboard dan tetap diumumkan pembaca layar — pengguna bisa menekan "Hapus"
   * pada dialog yang tidak terlihat. Karena itu isi dialog di-unmount total.
   */
  if (!rencana.modal) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType={animasi}
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}
    >
      <View
        className="flex-1 items-center justify-center"
        style={{
          backgroundColor: overlay,
          // statusBarTranslucent: overlay penuh, tetapi kartu dialog dibatasi
          // ke area aman agar tidak tertutup notif bar / gesture bar.
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <Pressable
          className="absolute inset-0"
          onPress={dismissOnBackdrop ? onClose : undefined}
          accessibilityRole="button"
          accessibilityLabel="Tutup dialog"
        />
        {/* Kartu dialog: View biasa, TANPA opacity/animasi manual. `className`
            dipasang di sini (bukan di lapisan bergaya animasi) supaya gaya
            NativeWind benar-benar diterapkan juga di react-native-web. */}
        <View style={[{ width: Math.min(width - 48, 360) }, shadowStyle("modal")]}>
          <View
            accessibilityViewIsModal
            accessibilityRole="alert"
            className="rounded-xl bg-white p-5"
            testID={testID ? `${testID}-kartu` : undefined}
          >
            <View className="items-center gap-2">
              {icon ? <View className="items-center">{icon}</View> : null}
              {title ? (
                <Text className="text-center font-inter-semibold text-lg text-neutral-900">
                  {title}
                </Text>
              ) : null}
              {description ? (
                <Text className="text-center font-inter text-sm text-neutral-500">
                  {description}
                </Text>
              ) : null}
            </View>

            {children ? <View className="mt-4">{children}</View> : null}
            {actions ? (
              <View className="mt-5 flex-row" style={{ gap: 12 }}>
                {actions}
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Ikon bell 40 dengan titik notifikasi danger-500 (guideline §3.17). */
export const dialogBellDotColor = colors.danger500;

export default Dialog;
