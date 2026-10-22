import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Check, Package, Sparkles, Truck } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../components/ui";
import { teks } from "../../lib/i18n";
import { colors, gradients, sizes } from "../../theme/tokens";

/**
 * Onboarding Zovora — guideline §2.5/§4.
 * Hero image di kanan, headline Display di kiri atas, CTA full width bawah.
 * Satu CTA primary ("Mulai Sekarang") + link text "Lewati" — keduanya menuju
 * sign-in sehingga alur lama (`/auth/login`) tetap jadi pintu masuk.
 */
export function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const mulai = () => router.replace("/auth/login");

  return (
    <View className="flex-1 bg-white">
      <LinearGradient
        colors={gradients.forYou}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row justify-end px-6 pt-2">
          <Pressable
            onPress={mulai}
            accessibilityRole="link"
            accessibilityLabel={teks.auth.onboarding.lewati}
            hitSlop={sizes.hitSlop}
            className="py-2"
          >
            <Text className="font-inter-medium text-sm text-primary-700">
              {teks.auth.onboarding.lewati}
            </Text>
          </Pressable>
        </View>

        {/* Hero: headline kiri, foto model kanan. */}
        <View className="flex-row items-end px-6 pb-6 pt-4">
          <View className="flex-1 pr-2">
            <Text
              className="font-inter-bold text-4xl text-neutral-900"
              accessibilityRole="header"
              maxFontSizeMultiplier={1.3}
            >
              {teks.auth.onboarding.judul}
            </Text>
            <Text className="mt-3 font-inter text-sm text-neutral-700">
              {teks.auth.onboarding.deskripsi}
            </Text>
          </View>
          <Image
            source={require("../../../assets/images/logo.png")}
            style={{ width: 110, height: 110 }}
            contentFit="contain"
            accessibilityLabel="Zovora"
          />
        </View>
      </LinearGradient>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24 }}>
        <View className="gap-4">
          <Poin
            ikon={<Package size={18} color={colors.primary600} strokeWidth={1.75} />}
            teksPoin={teks.auth.onboarding.poin.produk}
          />
          <Poin
            ikon={<Sparkles size={18} color={colors.primary600} strokeWidth={1.75} />}
            teksPoin={teks.auth.onboarding.poin.poin}
          />
          <Poin
            ikon={<Truck size={18} color={colors.primary600} strokeWidth={1.75} />}
            teksPoin={teks.auth.onboarding.poin.pesanan}
          />
        </View>
      </ScrollView>

      <View className="px-6" style={{ paddingBottom: insets.bottom + 16 }}>
        <Button
          title={teks.tombol.getStarted}
          onPress={mulai}
          fullWidth
          accessibilityLabel={teks.tombol.getStarted}
        />
      </View>
    </View>
  );
}

function Poin({ ikon, teksPoin }: { ikon: React.ReactNode; teksPoin: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-100">
        {ikon}
      </View>
      <Text className="flex-1 font-inter text-sm text-neutral-700">{teksPoin}</Text>
      <Check size={16} color={colors.success500} strokeWidth={2} />
    </View>
  );
}

export default OnboardingScreen;
