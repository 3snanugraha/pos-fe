/**
 * Token desain "Zovora" untuk prop yang tidak bisa memakai className
 * (warna ikon Lucide, `placeholderTextColor`, gradient, ActivityIndicator,
 * shadow StyleSheet, dsb).
 *
 * Sumber: docs/PATTERN DESIGN.txt §2. Komponen TIDAK boleh menulis hex
 * langsung — selalu impor dari sini atau pakai kelas Tailwind.
 */
import { Platform, type ViewStyle } from "react-native";

/** Palet primary = skala Sky Tailwind (guideline §2.1). */
export const primary = {
  50: "#F0F9FF",
  100: "#E0F2FE",
  200: "#BAE6FD",
  300: "#7DD3FC",
  400: "#38BDF8",
  500: "#0EA5E9",
  600: "#0284C7",
  700: "#0369A1",
  800: "#075985",
  900: "#0C4A6E",
} as const;

/** Palet netral = skala Slate. */
export const neutral = {
  50: "#F8FAFC",
  100: "#F1F5F9",
  200: "#E2E8F0",
  300: "#CBD5E1",
  400: "#94A3B8",
  500: "#64748B",
  600: "#475569",
  700: "#334155",
  800: "#1E293B",
  900: "#0F172A",
} as const;

export const success = { 50: "#F0FDF4", 100: "#DCFCE7", 500: "#22C55E", 700: "#15803D" } as const;
export const warning = { 50: "#FFFBEB", 100: "#FEF3C7", 500: "#F59E0B", 700: "#B45309" } as const;
export const danger = { 50: "#FEF2F2", 100: "#FEE2E2", 500: "#EF4444", 700: "#B91C1C" } as const;
export const peach = { 100: "#FFEDD5", 200: "#FED7AA", 300: "#FDBA74" } as const;

/** Nama datar untuk pemakaian cepat di prop (mis. `colors.primary600`). */
export const colors = {
  primary50: primary[50],
  primary100: primary[100],
  primary200: primary[200],
  primary300: primary[300],
  primary400: primary[400],
  primary500: primary[500],
  primary600: primary[600],
  primary700: primary[700],
  primary800: primary[800],
  primary900: primary[900],
  neutral50: neutral[50],
  neutral100: neutral[100],
  neutral200: neutral[200],
  neutral300: neutral[300],
  neutral400: neutral[400],
  neutral500: neutral[500],
  neutral600: neutral[600],
  neutral700: neutral[700],
  neutral800: neutral[800],
  neutral900: neutral[900],
  success100: success[100],
  success500: success[500],
  success700: success[700],
  warning50: warning[50],
  warning100: warning[100],
  warning500: warning[500],
  warning700: warning[700],
  danger500: danger[500],
  danger700: danger[700],
  peach200: peach[200],
  peach300: peach[300],
  white: "#FFFFFF",
  transparent: "transparent",
} as const;

/** Radius (guideline §2.4). */
export const radius = { sm: 6, md: 8, lg: 12, xl: 16, "2xl": 24, full: 9999 } as const;

/**
 * Shadow (guideline §2.4 + catatan §8.1).
 * NativeWind menerjemahkan `shadow-bar|float|modal` ke shadow iOS + elevation
 * Android; kalau token `boxShadow` kustom tidak terbaca di versi NativeWind
 * yang terpasang, komponen memakai fallback StyleSheet di bawah ini.
 */
export const shadow = {
  bar: { x: 0, y: -2, blur: 8, color: "rgba(15,23,42,0.06)" },
  float: { x: 0, y: 2, blur: 8, color: "rgba(15,23,42,0.12)" },
  modal: { x: 0, y: 8, blur: 24, color: "rgba(15,23,42,0.20)" },
} as const;

type ShadowLevel = keyof typeof shadow;

/** Fallback StyleSheet untuk shadow (dipakai bila kelas `shadow-*` tak jalan). */
export function shadowStyle(level: ShadowLevel): ViewStyle {
  const s = shadow[level];
  if (Platform.OS === "android") {
    return { elevation: level === "bar" ? 2 : level === "float" ? 4 : 12 };
  }
  if (Platform.OS === "web") {
    return { boxShadow: `${s.x}px ${s.y}px ${s.blur}px ${s.color}` } as unknown as ViewStyle;
  }
  return {
    shadowColor: neutral[900],
    shadowOffset: { width: s.x, height: s.y },
    shadowOpacity: level === "bar" ? 0.06 : level === "float" ? 0.12 : 0.2,
    shadowRadius: s.blur / 2,
  };
}

/** Tinggi/target sentuh standar (guideline §2.3 & §7). */
export const sizes = {
  appBar: 56,
  input: 48,
  buttonLg: 48,
  buttonMd: 40,
  buttonSm: 32,
  searchBar: 44,
  tabBar: 64,
  iconButton: 36,
  emptyIconCircle: 80,
  stepperButton: 28,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  /** Target sentuh minimum 44 di guideline §7. */
  minTouchTarget: 44,
} as const;

/** Nama font terdaftar lewat `useFonts` di app/_layout.tsx (guideline §8.2). */
export const fontFamily = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

/** Overlay dialog: neutral-900 50% (guideline §3.17). */
export const overlay = "rgba(15,23,42,0.5)";

/** Gradien header Home per kategori (guideline §2.1). */
export const gradients = {
  forYou: [primary[200], primary[50], "#FFFFFF"] as const,
  beauty: [peach[200], "#FFFFFF"] as const,
  bannerForYou: [primary[500], primary[600]] as const,
} as const;

export const tokens = {
  primary,
  neutral,
  success,
  warning,
  danger,
  peach,
  colors,
  radius,
  shadow,
  sizes,
  fontFamily,
  overlay,
  gradients,
} as const;
