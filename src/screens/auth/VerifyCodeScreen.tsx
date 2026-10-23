import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, OtpInput } from "../../components/ui";
import { samarkanEmail } from "../../lib/format";
import { teks, t } from "../../lib/i18n";
import { mintaKodeReset, verifikasiKodeReset } from "../../../services/passwordReset";
import { AuthShell } from "./AuthShell";
import { kembaliAman } from "../../../src/lib/navigasi";

/** Detik hitung mundur tombol kirim ulang (guideline §3.3). */
const DETIK_RESEND = 30;

/**
 * Enter Code Zovora — guideline §3.3/§4.
 * OTP 4 digit terpusat, subjudul email tersamarkan, "Email tidak diterima?" +
 * link Resend dengan hitung mundur 30 dtk. Sukses verifikasi membawa
 * `reset_token` ke layar reset password.
 */
export function VerifyCodeScreen() {
  const router = useRouter();

  /** Layar ini bisa dibuka langsung (deep link); kembali dengan aman. */
  const kembali = () => kembaliAman(router, "/auth/login");
  const params = useLocalSearchParams<{ email?: string; reset_token?: string }>();
  const email = (params.email ?? "").toString();
  const resetTokenAwal = (params.reset_token ?? "").toString();

  const [kode, setKode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pesan, setPesan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detik, setDetik] = useState(DETIK_RESEND);
  /** Naik setiap kirim ulang agar interval di-reset tanpa setState di effect. */
  const [generasi, setGenerasi] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Interval hanya memasang timer; setState terjadi di callback timer (bukan
  // sinkron di body effect) sehingga tidak memicu cascading render.
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDetik((d) => (d <= 1 ? 0 : d - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [generasi]);

  const kirimUlang = async () => {
    if (detik > 0 || loading) return;
    setPesan(null);
    setError(undefined);
    setLoading(true);
    try {
      const hasil = await mintaKodeReset(email);
      if (hasil.ok) {
        setKode("");
        setDetik(DETIK_RESEND);
        setGenerasi((g) => g + 1);
        setPesan(teks.auth.kodeTerkirim);
        return;
      }
      setPesan(
        hasil.kode === "tidak_tersedia"
          ? teks.error.fiturBelumTersedia
          : hasil.kode === "jaringan"
            ? teks.error.jaringan
            : (hasil.message ?? teks.error.umum),
      );
    } finally {
      setLoading(false);
    }
  };

  const verifikasi = async (nilai = kode) => {
    if (nilai.length !== 4) {
      setError(t("error.wajib", { field: teks.judul.verifyCode }));
      return;
    }
    setError(undefined);
    setPesan(null);
    setLoading(true);
    try {
      const hasil = await verifikasiKodeReset(email, nilai);

      if (hasil.ok) {
        router.push({
          pathname: "/auth/reset-password",
          params: { email, reset_token: hasil.data?.reset_token ?? resetTokenAwal },
        });
        return;
      }

      if (hasil.kode === "validasi") {
        setError(hasil.errors?.code?.[0] ?? teks.error.kodeSalah);
        return;
      }
      if (hasil.kode === "tidak_tersedia") {
        setPesan(teks.error.fiturBelumTersedia);
        return;
      }
      if (hasil.kode === "jaringan") {
        setPesan(teks.error.jaringan);
        return;
      }
      setError(hasil.message ?? teks.error.kodeSalah);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      onBack={kembali}
      judul={teks.judul.verifyCode}
      subjudul={
        email
          ? t("auth.kirimKodeKe", { email: samarkanEmail(email) })
          : teks.subjudul.enterCode
      }
      footer={
        <Button
          title={teks.tombol.verifikasi}
          onPress={() => verifikasi()}
          loading={loading}
          loadingText={teks.umum.memuat}
          fullWidth
        />
      }
    >
      <View className="gap-5">
        <OtpInput
          value={kode}
          onChange={(v) => {
            setKode(v);
            if (error) setError(undefined);
          }}
          onComplete={(v) => verifikasi(v)}
          error={error}
          autoFocus
          editable={!loading}
        />

        {pesan ? (
          <View className="rounded-md border border-danger-500 bg-danger-50 p-3">
            <Text className="font-inter text-xs text-danger-700" accessibilityLiveRegion="polite">
              {pesan}
            </Text>
          </View>
        ) : null}

        <View className="items-center gap-1">
          <Text className="font-inter text-xs text-neutral-500">
            {teks.subjudul.emailTidakDiterima}
          </Text>
          <Pressable
            onPress={kirimUlang}
            disabled={detik > 0 || loading}
            accessibilityRole="link"
            accessibilityState={{ disabled: detik > 0 }}
            hitSlop={8}
            className="py-1"
          >
            <Text
              className={`font-inter-medium text-xs ${
                detik > 0 ? "text-neutral-400" : "text-primary-700"
              }`}
            >
              {detik > 0
                ? t("subjudul.kirimUlangDalam", { detik })
                : teks.tombol.kirimUlangKode}
            </Text>
          </Pressable>
        </View>
      </View>
    </AuthShell>
  );
}

export default VerifyCodeScreen;
