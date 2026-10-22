import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { colors } from "../../theme/tokens";

export type KategoriTab = {
  id: string | number;
  label: string;
  /** Ikon 24 (Lucide) untuk tab; boleh kosong — dipakai placeholder titik. */
  ikon?: ReactNode;
};

export type CategoryTabsProps = {
  items: KategoriTab[];
  /** id tab aktif. */
  value?: string | number;
  onChange?: (id: string | number) => void;
  className?: string;
};

/**
 * CategoryTabs Zovora — guideline §3.6.
 * Scroll horizontal; tiap tab ikon 24 di atas label Caption. Aktif: ikon
 * primary-600, label primary-700 semibold, garis bawah 2 pt primary-600.
 * Inaktif: ikon neutral-600, label neutral-500.
 */
export function CategoryTabs({ items, value, onChange, className = "" }: CategoryTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 20, alignItems: "flex-start" }}
      className={`w-full ${className}`}
      accessibilityRole="tablist"
    >
      {items.map((item) => {
        const aktif = value !== undefined && item.id === value;
        return (
          <Pressable
            key={String(item.id)}
            onPress={() => onChange?.(item.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktif }}
            aria-selected={aktif}
            accessibilityLabel={item.label}
            className="items-center pb-1"
          >
            <View className="items-center justify-center" style={{ height: 28 }}>
              {item.ikon ?? <View style={{ width: 24, height: 24 }} />}
            </View>
            <Text
              className={`mt-1 font-inter-medium text-caption ${
                aktif ? "font-inter-semibold text-primary-700" : "text-neutral-500"
              }`}
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            {/* Garis bawah 2pt hanya pada tab aktif. */}
            <View
              className={`mt-1 h-0.5 rounded-full ${
                aktif ? "bg-primary-600" : "bg-transparent"
              }`}
              style={{ width: 24 }}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Warna ikon tab berdasarkan status aktif (untuk pemakaian di luar komponen). */
export function warnaTab(aktif: boolean): string {
  return aktif ? colors.primary600 : colors.neutral600;
}

export default CategoryTabs;
