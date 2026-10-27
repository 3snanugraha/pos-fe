import { Info, Plus, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { kembaliAman } from "../../src/lib/navigasi";
import {
  BannerTotal,
  ErrorState,
  PriceSummary,
  Skeleton,
  StickyBar,
  StickyTotal,
  UangTunaiPanel,
} from "../../src/components/commerce";
import { AppBar } from "../../src/components/layout";
import { Accordion, Button, Toggle, type AccordionItem } from "../../src/components/ui";
import { angka, rupiah } from "../../src/lib/format";
import { teks } from "../../src/lib/i18n";
import { useCheckout } from "../../src/screens/checkout/CheckoutContext";
import { colors, sizes } from "../../src/theme/tokens";
import type { PaymentMethod } from "../../services/types";
import { buildPaymentInstruction, isTransfer, isTunai, jenisLabel } from "../../utils/payment";

/**
 * Pembayaran Zovora — guideline §3.14 + §4 (Payment).
 *
 * Susunan: banner total (h 44, success-100) → accordion metode pembayaran
 * (baris 52, hanya satu terbuka, tunai/COD terbuka default; isi = deskripsi
 * Small + instruksi transfer termasuk nomor rekening) → opsi pembayaran
 * campuran (split: tambah/hapus baris metode + nominal) → pemakaian poin
 * (toggle + nilai rupiah) → sticky bar "Buat Pesanan".
 *
 * Semua perhitungan, validasi split, dan payload order berasal dari
 * `useCheckout()` yang mempertahankan logika checkout sebelumnya apa adanya.
 */
export default function PaymentScreen() {
  const router = useRouter();

  /** Layar ini bisa dibuka langsung (deep link); kembali dengan aman. */
  const kembali = () => kembaliAman(router, "/checkout");
  const {
    loading,
    error,
    items,
    paymentMethods,
    primaryPayment,
    setPrimaryPayment,
    metodeTerpilih,
    instruksi,
    useSplit,
    toggleSplit,
    splits,
    addSplitRow,
    updateSplitNominal,
    updateSplitMetode,
    removeSplitRow,
    isiSisaOtomatis,
    splitTotal,
    sisaSplit,
    paymentError,
    splitBelumLengkap,
    poinValue,
    poinDigunakan,
    handlePoinChange,
    pakaiPoinMaksimal,
    finalTotal,
    totalAmount,
    promoDiscount,
    uangTunai,
    setUangTunai,
    tunaiError,
    isProcessingOrder,
    handlePlaceOrder,
    muatUlang,
  } = useCheckout();

  const [terbukaManual, setTerbukaManual] = useState<string | null>(null);
  const [poinAktifManual, setPoinAktifManual] = useState<boolean | null>(null);

  /**
   * Kunci accordion default = metode tunai (COD), sesuai guideline §3.14
   * ("Cash on delivery terbuka secara default"). Diturunkan lewat `useMemo`
   * (bukan effect) agar tidak ada setState berantai saat data termuat.
   */
  const kunciDefault = useMemo(() => {
    const tunai = paymentMethods.find(
      (m) => (m.jenis_pembayaran ?? "").toLowerCase() === "tunai"
    );
    const awal = tunai ?? primaryPayment ?? paymentMethods[0];
    return awal ? String(awal.id) : null;
  }, [paymentMethods, primaryPayment]);

  const terbuka = terbukaManual ?? kunciDefault;

  /** Toggle poin: default "aktif" bila sudah ada poin terpakai. */
  const poinAktif = poinAktifManual ?? poinValue.dipakai > 0;

  const itemAccordion: AccordionItem[] = useMemo(
    () =>
      paymentMethods.map((metode) => {
        const metodeAktif = useSplit ? false : primaryPayment?.id === metode.id;
        const rekening = isTransfer(metode.jenis_pembayaran) && metode.nomor_rekening;

        return {
          key: String(metode.id),
          title: metode.nama_metode,
          icon: metodeAktif ? (
            <View
              className="rounded-full bg-primary-600"
              style={{ width: 8, height: 8 }}
              accessibilityElementsHidden
            />
          ) : undefined,
          description: [jenisLabel(metode.jenis_pembayaran)]
            .concat(
              Number(metode.biaya_admin) > 0
                ? [teks.checkout.biayaAdmin.replace("{nilai}", rupiah(metode.biaya_admin))]
                : []
            )
            .join(" · "),
          content: (
            <View className="gap-3">
              <View className="rounded-md bg-neutral-50 p-3">
                {instruksiUntuk(metode).map((baris, i) => (
                  <Text
                    key={i}
                    className="mb-1 font-inter text-xs text-neutral-700"
                    maxFontSizeMultiplier={1.3}
                  >
                    • {baris}
                  </Text>
                ))}

                {rekening ? (
                  <View className="mt-2 rounded-md border border-primary-100 bg-white p-3">
                    <Text className="font-inter text-caption text-neutral-500">
                      {teks.checkout.nomorRekening}
                    </Text>
                    <Text
                      className="font-inter-bold text-base text-neutral-900 tabular-nums"
                      maxFontSizeMultiplier={1.3}
                    >
                      {metode.nomor_rekening}
                    </Text>
                    <Text className="mt-0.5 font-inter text-caption text-neutral-500">
                      {teks.checkout.atasNama}: {metode.atas_nama ?? "-"}
                    </Text>
                  </View>
                ) : null}
              </View>

              {!useSplit ? (
                <Button
                  title={teks.checkout.pilihPembayaran}
                  variant={primaryPayment?.id === metode.id ? "primary" : "outline"}
                  size="md"
                  fullWidth
                  onPress={() => setPrimaryPayment(metode)}
                  accessibilityLabel={`${teks.checkout.pilihPembayaran} ${metode.nama_metode}`}
                />
              ) : null}
            </View>
          ),
        };
      }),
    // `instruksi` bergantung pada metode terpilih; ikut jadi dependensi.
    [paymentMethods, primaryPayment, useSplit, instruksi, setPrimaryPayment]
  );

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
        <AppBar title={teks.judul.payment} onBack={kembali} />
        <ErrorState pesan={error} onRetry={muatUlang} />
      </SafeAreaView>
    );
  }

  if (loading && paymentMethods.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
        <AppBar title={teks.judul.payment} onBack={kembali} />
        <View className="px-4 pt-4">
          <Skeleton height={44} radiusClassName="rounded-md" width="100%" />
          <Skeleton height={52} width="100%" className="mt-4" />
          <Skeleton height={52} width="100%" />
          <Skeleton height={52} width="100%" />
          <Skeleton height={90} radiusClassName="rounded-lg" width="100%" className="mt-6" />
        </View>
      </SafeAreaView>
    );
  }

  const maksPoin = Math.min(poinValue.maxSaldo, poinValue.maxTagihan);

  /**
   * Panel uang tunai tampil saat metode TUNAI terpilih pada pembayaran
   * tunggal. Pada mode campuran, nominal tunai diisi di baris split masing-
   * masing — panel disembunyikan agar tidak ada dua sumber angka.
   */
  const tunaiTerpilih = !useSplit && isTunai(primaryPayment?.jenis_pembayaran);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
      <AppBar title={teks.judul.payment} onBack={kembali} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-4 pt-2">
          <BannerTotal total={finalTotal} />

          <Text
            className="mb-2 mt-6 font-inter-semibold text-base text-neutral-900"
            maxFontSizeMultiplier={1.3}
          >
            {teks.checkout.metodePembayaran}
          </Text>

          {paymentMethods.length === 0 ? (
            <View className="rounded-lg border border-neutral-200 bg-white p-4">
              <Text className="font-inter text-sm text-neutral-500">
                {teks.checkout.metodeTidakAda}
              </Text>
            </View>
          ) : (
            <Accordion
              items={itemAccordion}
              openKey={terbuka}
              onChange={(key) => setTerbukaManual(key)}
            />
          )}

          {/*
            Uang tunai — hanya untuk metode TUNAI pada pembayaran tunggal.
            Mode campuran punya nominal sendiri per baris, jadi panel ini
            disembunyikan agar tidak ada dua sumber angka untuk kembalian.
          */}
          {tunaiTerpilih ? (
            <View className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
              <UangTunaiPanel
                total={finalTotal}
                nilai={uangTunai}
                onChange={setUangTunai}
                disabled={isProcessingOrder}
              />
            </View>
          ) : null}

          {/* ---- Pembayaran campuran (split) ---- */}
          <View className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text
                  className="font-inter-semibold text-sm text-neutral-900"
                  maxFontSizeMultiplier={1.3}
                >
                  {teks.checkout.pembayaranCampuran}
                </Text>
                <Text
                  className="mt-1 font-inter text-xs text-neutral-500"
                  maxFontSizeMultiplier={1.3}
                >
                  {teks.checkout.pembayaranCampuranDeskripsi}
                </Text>
              </View>
              <Toggle
                value={useSplit}
                onChange={toggleSplit}
                accessibilityLabel={teks.checkout.pembayaranCampuran}
                disabled={paymentMethods.length < 2}
              />
            </View>

            {useSplit ? (
              <View className="mt-4">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="font-inter-semibold text-sm text-neutral-900">
                    {teks.checkout.rincianPembayaran}
                  </Text>
                  <Text className="font-inter text-caption text-neutral-500">
                    {teks.checkout.tagihan.replace("{nilai}", rupiah(finalTotal))}
                  </Text>
                </View>

                {splits.map((row, index) => (
                  <View
                    key={`split-${index}`}
                    className="mb-3 rounded-md border border-neutral-200 p-3"
                  >
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="font-inter-medium text-xs text-neutral-500">
                        {teks.checkout.metodeKe.replace("{nomor}", String(index + 1))}
                      </Text>
                      {splits.length > 2 ? (
                        <Pressable
                          onPress={() => removeSplitRow(index)}
                          accessibilityRole="button"
                          accessibilityLabel={teks.checkout.hapusMetode.replace(
                            "{nomor}",
                            String(index + 1)
                          )}
                          hitSlop={sizes.hitSlop}
                          className="items-center justify-center"
                          style={{ width: sizes.minTouchTarget, height: sizes.minTouchTarget }}
                        >
                          <Trash2 size={16} color={colors.danger500} strokeWidth={1.75} />
                        </Pressable>
                      ) : null}
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {paymentMethods.map((metode) => {
                        const dipilih = row.metode.id === metode.id;
                        return (
                          <Pressable
                            key={metode.id}
                            onPress={() => updateSplitMetode(index, metode)}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: dipilih }}
                            accessibilityLabel={metode.nama_metode}
                            className={`rounded-sm px-3 py-1.5 ${
                              dipilih ? "bg-primary-100" : "bg-neutral-100"
                            }`}
                          >
                            <Text
                              className={`font-inter-medium text-xs ${
                                dipilih ? "text-primary-800" : "text-neutral-700"
                              }`}
                              maxFontSizeMultiplier={1.3}
                            >
                              {metode.nama_metode}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    <View className="mt-3 flex-row items-center gap-2">
                      <View className="flex-1 flex-row items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3" style={{ height: 44 }}>
                        <Text className="font-inter text-sm text-neutral-500">Rp</Text>
                        <TextInput
                          value={row.nominal}
                          onChangeText={(v) => updateSplitNominal(index, v)}
                          keyboardType="number-pad"
                          placeholder={teks.checkout.nominalPlaceholder}
                          placeholderTextColor={colors.neutral400}
                          accessibilityLabel={`${teks.checkout.metodeKe.replace(
                            "{nomor}",
                            String(index + 1)
                          )} nominal`}
                          className="flex-1 font-inter text-sm text-neutral-900 tabular-nums"
                          style={{ height: 44 }}
                        />
                      </View>
                      <Button
                        title={teks.checkout.sisaOtomatis}
                        variant="outline"
                        size="md"
                        onPress={() => isiSisaOtomatis(index)}
                        accessibilityLabel={`${teks.checkout.sisaOtomatis} ${teks.checkout.metodeKe.replace(
                          "{nomor}",
                          String(index + 1)
                        )}`}
                      />
                    </View>

                    {isTransfer(row.metode.jenis_pembayaran) ? (
                      <Text
                        className="mt-2 font-inter text-xs text-primary-700"
                        maxFontSizeMultiplier={1.3}
                      >
                        {row.metode.nomor_rekening
                          ? teks.checkout.transferKe
                              .replace("{rekening}", row.metode.nomor_rekening)
                              .replace("{nama}", row.metode.atas_nama ?? "-")
                          : teks.checkout.rekeningBelumDiatur}
                      </Text>
                    ) : null}
                  </View>
                ))}

                <Button
                  title={teks.checkout.tambahMetode}
                  variant="outline"
                  size="md"
                  fullWidth
                  icon={<Plus size={16} color={colors.primary600} strokeWidth={1.75} />}
                  onPress={addSplitRow}
                  disabled={splits.length >= 4}
                />

                <View className="mt-3 border-t border-neutral-200 pt-3">
                  <View className="mb-1 flex-row justify-between">
                    <Text className="font-inter text-xs text-neutral-500">
                      {teks.checkout.sudahDialokasikan}
                    </Text>
                    <Text className="font-inter text-xs text-neutral-700 tabular-nums">
                      {rupiah(splitTotal)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text
                      className={`font-inter text-xs ${
                        sisaSplit > 0 ? "text-warning-700" : "text-success-700"
                      }`}
                    >
                      {sisaSplit > 0 ? teks.checkout.kurang : teks.checkout.kembalian}
                    </Text>
                    <Text
                      className={`font-inter-semibold text-xs tabular-nums ${
                        sisaSplit > 0 ? "text-warning-700" : "text-success-700"
                      }`}
                    >
                      {rupiah(Math.abs(sisaSplit))}
                    </Text>
                  </View>

                  {paymentError ? (
                    <Text className="mt-2 font-inter text-xs text-danger-700">
                      {paymentError}
                    </Text>
                  ) : null}
                  {splitBelumLengkap ? (
                    <Text className="mt-2 font-inter text-xs text-warning-700">
                      {teks.checkout.splitBelumLengkap}
                    </Text>
                  ) : null}
                  <Text className="mt-2 font-inter text-caption text-neutral-400">
                    {teks.checkout.splitCatatanKaki}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* ---- Poin ---- */}
          <View className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text
                  className="font-inter-semibold text-sm text-neutral-900"
                  maxFontSizeMultiplier={1.3}
                >
                  {teks.checkout.gunakanPoin}
                </Text>
                <Text
                  className="mt-1 font-inter text-xs text-neutral-500"
                  maxFontSizeMultiplier={1.3}
                >
                  {teks.checkout.poinKeterangan
                    .replace("{nilai}", rupiah(1))
                    .replace("{maks}", angka(maksPoin))}
                </Text>
                <Text className="mt-1 font-inter text-caption text-neutral-400">
                  {teks.checkout.saldoPoin.replace(
                    "{jumlah}",
                    angka(poinValue.maxSaldo)
                  )}
                </Text>
              </View>
              <Toggle
                value={poinAktif}
                onChange={(next) => {
                  setPoinAktifManual(next);
                  if (!next) handlePoinChange("0");
                  else if (maksPoin > 0) pakaiPoinMaksimal();
                }}
                accessibilityLabel={teks.checkout.gunakanPoin}
                disabled={poinValue.maxSaldo <= 0 || poinValue.maxTagihan <= 0}
              />
            </View>

            {poinAktif ? (
              <View className="mt-3">
                <View className="flex-row items-center gap-2">
                  <View
                    className="flex-1 flex-row items-center rounded-md border border-neutral-200 bg-neutral-50 px-3"
                    style={{ height: 44 }}
                  >
                    <TextInput
                      value={poinDigunakan > 0 ? String(poinDigunakan) : ""}
                      onChangeText={handlePoinChange}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.neutral400}
                      editable={poinValue.maxSaldo > 0}
                      accessibilityLabel={teks.checkout.gunakanPoin}
                      className="flex-1 font-inter text-sm text-neutral-900 tabular-nums"
                      style={{ height: 44 }}
                    />
                  </View>
                  <Button
                    title={teks.checkout.poinMaks}
                    variant="primary"
                    size="md"
                    onPress={pakaiPoinMaksimal}
                    disabled={maksPoin <= 0}
                  />
                </View>

                {poinValue.dipakai > 0 ? (
                  <Text className="mt-2 font-inter text-xs text-success-700 tabular-nums">
                    {teks.checkout.poinDipakai
                      .replace("{jumlah}", angka(poinValue.dipakai))
                      .replace("{nilai}", rupiah(poinValue.rupiah))}
                  </Text>
                ) : null}
                {poinValue.maxSaldo <= 0 ? (
                  <Text className="mt-2 font-inter text-xs text-neutral-500">
                    {teks.checkout.poinTidakTersedia}
                  </Text>
                ) : null}
                {poinValue.maxSaldo > 0 && poinValue.maxTagihan === 0 ? (
                  <Text className="mt-2 font-inter text-xs text-warning-700">
                    {teks.checkout.poinTidakBisaDipakai}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* ---- Ringkasan akhir ---- */}
          <PriceSummary
            className="mt-6"
            baris={[
              { label: teks.checkout.subTotal, nilai: totalAmount },
              promoDiscount > 0
                ? { label: teks.checkout.diskon, nilai: promoDiscount, potongan: true }
                : { label: teks.checkout.diskon, nilai: null },
              poinValue.dipakai > 0
                ? {
                    label: teks.checkout.diskonPoin.replace(
                      "{jumlah}",
                      String(poinValue.dipakai)
                    ),
                    nilai: poinValue.rupiah,
                    potongan: true,
                  }
                : { label: teks.checkout.poin, nilai: null },
            ]}
            total={finalTotal}
          />

          {metodeTerpilih ? (
            <View className="mt-3 flex-row items-start gap-2">
              <Info size={16} color={colors.neutral500} strokeWidth={1.75} />
              <Text
                className="flex-1 font-inter text-xs text-neutral-500"
                maxFontSizeMultiplier={1.3}
              >
                {jenisLabel(metodeTerpilih.jenis_pembayaran)} ·{" "}
                {instruksi.join(" ")}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <StickyBar>
        <StickyTotal nilai={rupiah(finalTotal)} label={teks.checkout.total} />
        <Button
          title={teks.tombol.placeOrder}
          size="lg"
          className="w-[150px]"
          loading={isProcessingOrder}
          disabled={
            items.length === 0 ||
            paymentMethods.length === 0 ||
            (useSplit
              ? splitBelumLengkap || !!paymentError
              : !primaryPayment || (tunaiTerpilih && !!tunaiError))
          }
          onPress={handlePlaceOrder}
        />
      </StickyBar>
    </SafeAreaView>
  );
}

/**
 * Instruksi untuk satu metode pada mode split.
 *
 * Memakai `buildPaymentInstruction` (utils/payment) yang sama dengan mode
 * tunggal agar teks rekening/instruksi konsisten — tidak ada copy pembayaran
 * baru yang dikarang di layar.
 */
function instruksiUntuk(metode: PaymentMethod): string[] {
  return buildPaymentInstruction(metode);
}
