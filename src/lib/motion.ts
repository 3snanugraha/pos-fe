/**
 * Hook Reduce Motion (guideline §2.6 + §7).
 *
 * Semua animasi dekoratif (auto-play banner, shimmer skeleton, transisi
 * carousel) wajib berhenti bila pengguna mengaktifkan "Kurangi gerakan" di
 * perangkat. Nilai awal `false` supaya render pertama tidak berkedip, lalu
 * disinkronkan lewat `AccessibilityInfo`.
 */
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let aktif = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((nilai) => {
        if (aktif) setReduce(nilai);
      })
      .catch(() => {
        /* perangkat/web tanpa dukungan → anggap animasi boleh jalan */
      });

    const langganan = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (nilai: boolean) => {
        if (aktif) setReduce(nilai);
      },
    );

    return () => {
      aktif = false;
      langganan?.remove?.();
    };
  }, []);

  return reduce;
}

export default useReduceMotion;
