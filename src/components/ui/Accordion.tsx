import { ChevronDown } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, LayoutAnimation, Platform, Pressable, Text, UIManager, View } from "react-native";
import { colors } from "../../theme/tokens";

// LayoutAnimation butuh flag ini di Android lama; aman dipanggil berulang.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type AccordionItem = {
  /** Kunci unik (mis. "cod", "qris"). */
  key: string;
  title: string;
  /** Deskripsi yang tampil saat item terbuka. */
  description?: string;
  /** Konten kaya saat terbuka (menggantikan/menambah deskripsi). */
  content?: ReactNode;
  /** Ikon/logo metode di kiri judul. */
  icon?: ReactNode;
  disabled?: boolean;
};

export type AccordionProps = {
  items: AccordionItem[];
  /** Kunci item yang terbuka (mode terkontrol). */
  openKey?: string | null;
  /** Item terbuka awal (mode tak terkontrol). */
  defaultOpenKey?: string | null;
  onChange?: (key: string | null) => void;
  /** Hanya satu yang terbuka (default true, guideline §3.14). */
  single?: boolean;
  reduceMotion?: boolean;
  className?: string;
};

/**
 * Accordion Zovora — guideline §3.14 + §2.6.
 * Baris tinggi 52, border-bottom neutral-200, judul Body medium + chevron.
 * Hanya satu terbuka pada satu waktu; tinggi dan putaran chevron 200 ms.
 */
export function Accordion({
  items,
  openKey,
  defaultOpenKey = null,
  onChange,
  single = true,
  reduceMotion = false,
  className = "",
}: AccordionProps) {
  const [internal, setInternal] = useState<string | null>(defaultOpenKey);
  const aktif = openKey !== undefined ? openKey : internal;

  const toggle = (key: string) => {
    const next = aktif === key ? null : key;
    if (!reduceMotion) {
      LayoutAnimation.configureNext({
        duration: 200,
        update: {
          duration: 200,
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        create: {
          duration: 200,
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        delete: {
          duration: 200,
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
      });
    }
    if (openKey === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <View className={`overflow-hidden rounded-md border border-neutral-200 bg-white ${className}`}>
      {items.map((item, index) => (
        <AccordionRow
          key={item.key}
          item={item}
          open={aktif === item.key}
          last={index === items.length - 1}
          single={single}
          reduceMotion={reduceMotion}
          onToggle={() => toggle(item.key)}
        />
      ))}
    </View>
  );
}

function AccordionRow({
  item,
  open,
  last,
  reduceMotion,
  onToggle,
}: {
  item: AccordionItem;
  open: boolean;
  last: boolean;
  single: boolean;
  reduceMotion: boolean;
  onToggle: () => void;
}) {
  // Animated.Value disimpan di state (bukan ref) agar tidak dibaca saat render.
  const [putaran] = useState(() => new Animated.Value(open ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) {
      putaran.setValue(open ? 1 : 0);
      return;
    }
    Animated.timing(putaran, {
      toValue: open ? 1 : 0,
      duration: 200,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, [open, reduceMotion, putaran]);

  const rotate = putaran.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <View className={last ? "" : "border-b border-neutral-200"}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled: item.disabled }}
        accessibilityLabel={item.title}
        disabled={item.disabled}
        onPress={onToggle}
        className={`flex-row items-center justify-between px-4 ${item.disabled ? "opacity-50" : ""}`}
        style={{ height: 52 }}
      >
        <View className="flex-1 flex-row items-center gap-3">
          {item.icon}
          <Text className="font-inter-medium text-sm text-neutral-900">{item.title}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={20} color={colors.neutral500} strokeWidth={1.75} />
        </Animated.View>
      </Pressable>

      {open ? (
        <View className="gap-3 px-4 pb-4">
          {item.description ? (
            <Text className="font-inter text-xs text-neutral-500">{item.description}</Text>
          ) : null}
          {item.content}
        </View>
      ) : null}
    </View>
  );
}

export default Accordion;
