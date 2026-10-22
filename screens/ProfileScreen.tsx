import {
  ChevronRight,
  CreditCard,
  Gift,
  Heart,
  LifeBuoy,
  LogOut,
  MapPin,
  Pencil,
  Receipt,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, Skeleton } from "../src/components/commerce";
import { AppBar } from "../src/components/layout";
import { Button, Dialog } from "../src/components/ui";
import { angka, tanggal } from "../src/lib/format";
import { teks } from "../src/lib/i18n";
import { colors, sizes } from "../src/theme/tokens";
import { apiService } from "../services/apiService";
import { logout } from "../services/auth";
import type { CustomerProfile } from "../services/types";
import { getErrorMessage, handleAuthError } from "../utils/auth";

const VERSI_APP = "1.0.0";

type MenuItem = {
  kunci: string;
  judul: string;
  deskripsi: string;
  ikon: typeof Receipt;
  onPress: () => void;
  /** Baris keluar memakai nada danger. */
  danger?: boolean;
};

/**
 * Akun Zovora — guideline §3.5 (AppBar) + §3.8 (section) + §5 (state).
 *
 * Kepala kartu: avatar bulat 56 berisi inisial (ikon User bila nama kosong),
 * nama (Section), email (Small neutral-500), dan chip poin primary-100 —
 * ditambah tautan "Ubah Profil" primary-700.
 *
 * Daftar menu memakai baris 56+ dengan ikon 20 di dalam lingkaran 36
 * primary-100 dan chevron kanan; baris "Keluar" terpisah dengan nada danger.
 * Loading memakai skeleton bentuk yang sama, galat memakai `ErrorState`
 * kompak agar menu tetap bisa dipakai saat profil gagal dimuat.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogKeluar, setDialogKeluar] = useState(false);
  const [dialogBantuan, setDialogBantuan] = useState(false);
  const [keluar, setKeluar] = useState(false);

  const ambilProfil = useCallback(async () => {
    try {
      const profil = (await apiService.getCustomerProfile()) as CustomerProfile;
      return { profil, galat: null };
    } catch (err: any) {
      console.error("Error loading customer data:", err);
      const isAuthError = await handleAuthError(err);
      return {
        profil: null as CustomerProfile | null,
        galat: isAuthError ? null : getErrorMessage(err),
      };
    }
  }, []);

  useEffect(() => {
    let aktif = true;
    (async () => {
      const hasil = await ambilProfil();
      if (!aktif) return;
      setCustomer(hasil.profil);
      setError(hasil.galat);
      setLoading(false);
    })();
    return () => {
      aktif = false;
    };
  }, [ambilProfil]);

  const onRefresh = async () => {
    setRefreshing(true);
    const hasil = await ambilProfil();
    setCustomer(hasil.profil);
    setError(hasil.galat);
    setRefreshing(false);
  };

  const konfirmasiKeluar = async () => {
    setKeluar(true);
    try {
      await logout();
      setDialogKeluar(false);
      router.replace("/auth/login");
    } catch (err) {
      console.error("Logout error:", err);
      setDialogKeluar(false);
      setError(teks.profil.keluarGagal);
    } finally {
      setKeluar(false);
    }
  };

  const menu: MenuItem[] = [
    {
      kunci: "pesanan",
      judul: teks.profil.menu.pesanan.judul,
      deskripsi: teks.profil.menu.pesanan.deskripsi,
      ikon: Receipt,
      onPress: () => router.push("/orders"),
    },
    {
      kunci: "poin",
      judul: teks.profil.menu.poin.judul,
      deskripsi: teks.profil.menu.poin.deskripsi,
      ikon: Gift,
      onPress: () => router.push("/points"),
    },
    {
      kunci: "wishlist",
      judul: teks.profil.menu.wishlist.judul,
      deskripsi: teks.profil.menu.wishlist.deskripsi,
      ikon: Heart,
      onPress: () => router.push("/wishlist"),
    },
    {
      kunci: "alamat",
      judul: teks.profil.menu.alamat.judul,
      deskripsi: teks.profil.menu.alamat.deskripsi,
      ikon: MapPin,
      onPress: () => router.push("/addresses"),
    },
    {
      kunci: "metode",
      judul: teks.profil.menu.metode.judul,
      deskripsi: teks.profil.menu.metode.deskripsi,
      ikon: CreditCard,
      onPress: () => router.push("/payment-methods"),
    },
    {
      kunci: "kasir",
      judul: teks.profil.menu.kasir.judul,
      deskripsi: teks.profil.menu.kasir.deskripsi,
      ikon: ShieldCheck,
      onPress: () => router.push("/kasir/orders"),
    },
    {
      kunci: "pengaturan",
      judul: teks.profil.menu.pengaturan.judul,
      deskripsi: teks.profil.menu.pengaturan.deskripsi,
      ikon: Settings,
      onPress: () => router.push("/profile/edit"),
    },
    {
      kunci: "bantuan",
      judul: teks.profil.menu.bantuan.judul,
      deskripsi: teks.profil.menu.bantuan.deskripsi,
      ikon: LifeBuoy,
      onPress: () => setDialogBantuan(true),
    },
  ];

  const inisial = (customer?.nama_pelanggan ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase())
    .join("");

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
      <AppBar title={teks.profil.judul} showBack={false} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary600]}
            tintColor={colors.primary600}
          />
        }
      >
        {/* Kartu identitas */}
        <View className="border-b border-neutral-100 bg-white px-4 py-5">
          {loading ? (
            <View className="flex-row items-center gap-3">
              <Skeleton width={56} height={56} radiusClassName="rounded-full" />
              <View className="flex-1">
                <Skeleton height={18} width="55%" />
                <Skeleton height={12} width="70%" className="mt-2" />
                <Skeleton height={12} width="35%" className="mt-2" />
              </View>
            </View>
          ) : (
            <View className="flex-row items-center gap-3">
              <View
                className="items-center justify-center overflow-hidden rounded-full bg-primary-100"
                style={{ width: 56, height: 56 }}
                accessibilityElementsHidden
              >
                {inisial ? (
                  <Text
                    className="font-inter-bold text-lg text-primary-800"
                    maxFontSizeMultiplier={1.3}
                  >
                    {inisial}
                  </Text>
                ) : (
                  <User size={26} color={colors.primary600} strokeWidth={1.75} />
                )}
              </View>

              <View className="flex-1">
                <Text
                  className="font-inter-bold text-xl text-neutral-900"
                  numberOfLines={1}
                  accessibilityRole="header"
                  maxFontSizeMultiplier={1.3}
                >
                  {customer?.nama_pelanggan || teks.nav.akun}
                </Text>
                <Text
                  className="mt-0.5 font-inter text-sm text-neutral-500"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {customer?.email || "-"}
                </Text>

                <View className="mt-1.5 flex-row flex-wrap items-center gap-2">
                  <View className="flex-row items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5">
                    <Gift size={10} color={colors.primary800} strokeWidth={2} />
                    <Text
                      className="font-inter-medium text-caption text-primary-800 tabular-nums"
                      maxFontSizeMultiplier={1.3}
                    >
                      {teks.profil.poin.replace(
                        "{jumlah}",
                        angka(Number(customer?.total_poin ?? 0))
                      )}
                    </Text>
                  </View>
                  {customer?.tanggal_bergabung ? (
                    <Text
                      className="font-inter text-caption text-neutral-500"
                      maxFontSizeMultiplier={1.3}
                    >
                      {teks.profil.anggotaSejak.replace(
                        "{tanggal}",
                        tanggal(customer.tanggal_bergabung)
                      )}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          )}

          <Pressable
            onPress={() => router.push("/profile/edit")}
            accessibilityRole="button"
            accessibilityLabel={teks.profil.ubahProfil}
            className="mt-3 min-h-[44px] flex-row items-center gap-1 self-start rounded-md active:opacity-70"
          >
            <Pencil size={14} color={colors.primary700} strokeWidth={1.75} />
            <Text
              className="font-inter-medium text-sm text-primary-700"
              maxFontSizeMultiplier={1.3}
            >
              {teks.profil.ubahProfil}
            </Text>
          </Pressable>
        </View>

        {error ? (
          <View className="px-4 pt-4">
            <ErrorState pesan={error} onRetry={onRefresh} kompak />
          </View>
        ) : null}

        {/* Menu akun */}
        <View className="mx-4 mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {menu.map((item, i) => {
            const Ikon = item.ikon;
            return (
              <Pressable
                key={item.kunci}
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={`${item.judul}. ${item.deskripsi}`}
                className={`flex-row items-center gap-3 px-4 py-3 active:bg-neutral-50 ${
                  i < menu.length - 1 ? "border-b border-neutral-100" : ""
                }`}
                style={{ minHeight: 56 }}
              >
                <View
                  className="items-center justify-center rounded-full bg-primary-100"
                  style={{ width: 36, height: 36 }}
                >
                  <Ikon size={20} color={colors.primary600} strokeWidth={1.75} />
                </View>
                <View className="flex-1">
                  <Text
                    className="font-inter-medium text-sm text-neutral-900"
                    maxFontSizeMultiplier={1.3}
                  >
                    {item.judul}
                  </Text>
                  <Text
                    className="font-inter text-xs text-neutral-500"
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.3}
                  >
                    {item.deskripsi}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.neutral400} strokeWidth={1.75} />
              </Pressable>
            );
          })}
        </View>

        {/* Keluar — baris terpisah bernada danger */}
        <Pressable
          onPress={() => setDialogKeluar(true)}
          accessibilityRole="button"
          accessibilityLabel={teks.tombol.keluar}
          className="mx-4 mt-4 flex-row items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 active:bg-danger-50"
          style={{ minHeight: 56 }}
        >
          <View
            className="items-center justify-center rounded-full bg-danger-50"
            style={{ width: 36, height: 36 }}
          >
            <LogOut size={20} color={colors.danger700} strokeWidth={1.75} />
          </View>
          <Text
            className="flex-1 font-inter-medium text-sm text-danger-700"
            maxFontSizeMultiplier={1.3}
          >
            {teks.tombol.keluar}
          </Text>
          <ChevronRight size={20} color={colors.neutral400} strokeWidth={1.75} />
        </Pressable>

        <Text
          className="mt-6 text-center font-inter text-caption text-neutral-500"
          maxFontSizeMultiplier={1.3}
        >
          {teks.profil.versi.replace("{versi}", VERSI_APP)}
        </Text>
      </ScrollView>

      {/* Konfirmasi keluar */}
      <Dialog
        visible={dialogKeluar}
        onClose={() => setDialogKeluar(false)}
        title={teks.profil.dialogKeluarJudul}
        description={teks.profil.dialogKeluarDeskripsi}
        icon={<LogOut size={40} color={colors.danger700} strokeWidth={1.5} />}
        actions={
          <>
            <Button
              title={teks.umum.batal}
              variant="outline"
              size="md"
              className="flex-1"
              onPress={() => setDialogKeluar(false)}
            />
            <Button
              title={teks.profil.keluar}
              size="md"
              className="flex-1"
              loading={keluar}
              onPress={konfirmasiKeluar}
            />
          </>
        }
      />

      {/* Bantuan — pengganti Alert (callback Alert tidak jalan di web) */}
      <Dialog
        visible={dialogBantuan}
        onClose={() => setDialogBantuan(false)}
        title={teks.profil.bantuanJudul}
        description={teks.profil.bantuanDeskripsi}
        icon={<LifeBuoy size={40} color={colors.primary600} strokeWidth={1.5} />}
        actions={
          <Button
            title={teks.umum.tutup}
            variant="outline"
            size="md"
            className="flex-1"
            onPress={() => setDialogBantuan(false)}
          />
        }
      />
    </SafeAreaView>
  );
}

/** Lebar target sentuh baris menu (dipakai bila layar butuh padding seragam). */
export const MENU_ROW_TOUCH = sizes.minTouchTarget;
