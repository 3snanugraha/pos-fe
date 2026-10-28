/**
 * Rencana render dialog — SATU keputusan, bukan dua.
 *
 * MASALAH YANG DICEGAH (regresi APK 2026-10-28b)
 *
 * Sebelum perbaikan ini `Dialog` mengambil dua keputusan terpisah:
 *   1. apakah `<Modal>` dirender (state `visible` + `memegangSlot`);
 *   2. apakah KARTU dialog terlihat — lewat `Animated.Value` `progress`
 *      yang dimulai dari 0 lalu dianimasikan ke 1.
 *
 * Di Android keputusan kedua tidak dijamin sampai: nilainya dikirim ke view
 * lewat native animated driver (`PropsAnimatedNode.updateView` →
 * `synchronouslyUpdateViewOnUIThread`) pada frame-frame pertama setelah
 * jendela `Dialog` dibuat. Bila pembaruan itu tidak sampai, `progress` tetap
 * 0 → `opacity: 0` permanen. Tidak ada render ulang React yang bisa
 * menyelamatkannya karena `Animated.Value` tidak memicu render.
 *
 * Gejalanya persis seperti laporan pengujian: overlay/backdrop TAMPIL (View
 * biasa, tanpa animasi) tetapi kartu dialog TIDAK muncul sama sekali.
 *
 * Karena itu konten dan `<Modal>` harus diputuskan bersama-sama: kalau modal
 * dirender, kontennya ikut dirender. Tidak boleh ada keadaan "backdrop ada,
 * konten tidak ada". Modul ini murni supaya invariannya bisa diuji
 * `node --test` dan dipakai langsung oleh komponen `Dialog`.
 */

export type RencanaDialog = {
  /** Apakah `<Modal>` (jendela native) dirender. */
  modal: boolean;
  /** Apakah isi dialog dirender. Selalu sama dengan `modal`. */
  konten: boolean;
};

/**
 * Hitung rencana render.
 *
 * `visible`        = niat tampil (state pemanggil).
 * `memegangSlot`   = antrean modal sudah memberi izin satu jendela native.
 *
 * Invarian: `konten === modal`. Tidak ada parameter animasi, opacity, atau
 * state lain yang boleh menunda konten.
 */
export function rencanaRenderDialog(visible: boolean, memegangSlot: boolean): RencanaDialog {
  const tampil = visible === true && memegangSlot === true;
  return { modal: tampil, konten: tampil };
}

export default rencanaRenderDialog;
