import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type ModalProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  /** Nonaktifkan animasi untuk Reduce Motion. */
  reduceMotion?: boolean;
  animationType?: ModalProps["animationType"];
  testID?: string;
};

/**
 * Dialog Zovora — guideline §3.17 + §2.6.
 * Overlay neutral-900 50%, kartu putih radius xl (16), lebar layar - 48,
 * padding 20, shadow-modal; animasi fade + scale 0,95 → 1 selama 200 ms.
 * Fokus dijebak lewat `accessibilityViewIsModal` (guideline §7).
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
  reduceMotion = false,
  animationType = "fade",
  testID,
}: DialogProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Animated.Value di state (bukan ref) agar aman dibaca saat render.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      progress.setValue(reduceMotion ? 1 : 0);
      if (reduceMotion) return;
      Animated.timing(progress, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      progress.setValue(0);
    }
  }, [visible, reduceMotion, progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

  /*
   * Dialog yang sudah ditutup TIDAK boleh tetap ada di pohon DOM.
   *
   * `Modal` react-native-web hanya menyembunyikan isinya (opacity 0) saat
   * `visible=false`, sehingga tombol "Batal"/"Hapus" tetap bisa difokus
   * keyboard dan tetap diumumkan pembaca layar — pengguna bisa menekan "Hapus"
   * pada dialog yang tidak terlihat. Karena itu isi dialog di-unmount total;
   * animasi masuk tetap berjalan lewat `animationType` milik Modal.
   */
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
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
        <Animated.View
          style={[
            {
              width: Math.min(width - 48, 360),
              opacity: progress,
              transform: [{ scale }],
            },
            shadowStyle("modal"),
          ]}
        >
          {/* Kelas NativeWind dipasang di View biasa: Animated.View tidak
              meneruskan className ke gaya di react-native-web. */}
          <View
            accessibilityViewIsModal
            accessibilityRole="alert"
            className="rounded-xl bg-white p-5"
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
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Ikon bell 40 dengan titik notifikasi danger-500 (guideline §3.17). */
export const dialogBellDotColor = colors.danger500;

export default Dialog;
