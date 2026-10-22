import type { ReactNode } from "react";
import { House, LayoutGrid, ShoppingBag, User } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "../../../contexts/CartContext";
import { badgeJumlah } from "../../lib/format";
import { teks } from "../../lib/i18n";
import { colors, shadowStyle, sizes } from "../../theme/tokens";

/**
 * Bentuk props tab bar — sengaja struktural (bukan impor tipe internal
 * expo-router) karena expo-router 57 membundel salinan `@react-navigation`
 * sendiri sehingga tipe `descriptors` dari paket terpisah tidak kompatibel.
 */
export type BottomTabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string; params?: object }[];
  };
  descriptors: Record<
    string,
    { options: { title?: string; tabBarLabel?: unknown } }
  >;
  navigation: {
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

type KonfigTab = {
  label: string;
  ikon: (aktif: boolean) => ReactNode;
  badge?: boolean;
};

/**
 * Konfigurasi tab Zovora — guideline §3.18.
 * Urutan: Home, Kategori, Keranjang, Akun. Route yang tidak terdaftar di sini
 * tidak dirender sehingga tab bar tetap 4 kolom walau ada route tersembunyi.
 */
export const TAB_ZOVORA: Record<string, KonfigTab> = {
  index: {
    label: teks.nav.home,
    ikon: (aktif) => (
      <House
        size={24}
        strokeWidth={1.75}
        color={aktif ? colors.primary600 : colors.neutral400}
        fill={aktif ? colors.primary600 : "transparent"}
      />
    ),
  },
  products: {
    label: teks.nav.kategori,
    ikon: (aktif) => (
      <LayoutGrid
        size={24}
        strokeWidth={1.75}
        color={aktif ? colors.primary600 : colors.neutral400}
        fill={aktif ? colors.primary600 : "transparent"}
      />
    ),
  },
  cart: {
    label: teks.nav.keranjang,
    ikon: (aktif) => (
      <ShoppingBag
        size={24}
        strokeWidth={1.75}
        color={aktif ? colors.primary600 : colors.neutral400}
        fill={aktif ? colors.primary600 : "transparent"}
      />
    ),
    badge: true,
  },
  profile: {
    label: teks.nav.akun,
    ikon: (aktif) => (
      <User
        size={24}
        strokeWidth={1.75}
        color={aktif ? colors.primary600 : colors.neutral400}
        fill={aktif ? colors.primary600 : "transparent"}
      />
    ),
  },
};

/**
 * BottomTabBar Zovora — guideline §3.18.
 * Tinggi 64 + inset bawah, bg putih, border-top neutral-100 + shadow-bar.
 * Ikon 24 dan label Caption medium; aktif ikon terisi primary-600 dan label
 * primary-700, inaktif neutral-400/500. Badge jumlah di Keranjang: bulat 16
 * danger-500, teks Caption bold putih, "99+" bila lebih.
 *
 * Dipakai sebagai `tabBar` pada `<Tabs>` expo-router sehingga semua route yang
 * ada tetap terjangkau.
 */
export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();

  const rute = state.routes.filter((r) => TAB_ZOVORA[r.name]);

  return (
    <View
      className="w-full flex-row items-start border-t border-neutral-100 bg-white"
      style={[
        { height: sizes.tabBar + insets.bottom, paddingBottom: insets.bottom },
        shadowStyle("bar"),
      ]}
      accessibilityRole="tablist"
    >
      {rute.map((route) => {
        const konf = TAB_ZOVORA[route.name];
        const index = state.routes.indexOf(route);
        const aktif = state.index === index;
        const { options } = descriptors[route.key];
        const labelOpsi = options.tabBarLabel;
        const label =
          typeof labelOpsi === "string" ? labelOpsi : (options.title ?? konf.label);
        const badge = konf.badge && itemCount > 0 ? badgeJumlah(itemCount) : null;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!aktif && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktif }}
            aria-selected={aktif}
            accessibilityLabel={
              konf.badge && itemCount > 0
                ? `${label}, ${badge} ${teks.satuan.item}`
                : label
            }
            className="flex-1 items-center justify-center pt-2"
            style={{ height: sizes.tabBar }}
          >
            <View>
              {konf.ikon(aktif)}
              {badge ? (
                <View
                  className="absolute -right-2 -top-1 items-center justify-center rounded-full bg-danger-500 px-1"
                  style={{ minWidth: 16, height: 16 }}
                >
                  <Text
                    className="font-inter-bold text-caption text-white"
                    maxFontSizeMultiplier={1.3}
                  >
                    {badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              className={`mt-1 font-inter-medium text-caption ${
                aktif ? "text-primary-700" : "text-neutral-500"
              }`}
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default BottomTabBar;
