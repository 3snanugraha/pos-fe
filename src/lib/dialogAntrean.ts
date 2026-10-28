/**
 * Antrean jendela modal — SATU jendela native pada satu waktu.
 *
 * MASALAH YANG DICEGAH
 *
 * Di Android setiap `<Modal>` React Native adalah **jendela `Dialog` Android
 * sendiri** (`ReactModalHostView` membuat `ComponentDialog` lalu memanggil
 * `show()`). Dua jendela yang hidup bersamaan, atau satu jendela baru yang
 * dibuat pada commit yang sama ketika jendela lain sedang dibuang, membuat
 * `WindowManager` menolak/menempatkan jendela baru di belakang. Gejala di
 * perangkat: dialog "tidak muncul" padahal state-nya terbuka; tombol BACK
 * menutup jendela hantu itu, lalu pemicu berikutnya berhasil.
 *
 * Aplikasi ini memicu pola tersebut secara rutin:
 *   - setiap layar punya ≥2 `<Dialog>` bersaudara (hapus + pesan);
 *   - beberapa alur menutup dialog A dan membuka dialog B pada commit yang
 *     SAMA (mis. gagal hapus → dialog pesan galat);
 *   - `Stepper` menaruh `<Dialog>` di dalam setiap baris keranjang, sehingga
 *     dialog baris dan dialog layar bisa hidup bersamaan.
 *
 * ATURAN
 *   1. Hanya satu id yang boleh merender `<Modal>` (`aktif`).
 *   2. Id yang meminta saat slot terisi masuk antrean (FIFO) dan merender
 *      `null` sampai gilirannya.
 *   3. Slot yang baru dilepas TIDAK boleh langsung dipakai pada task yang sama;
 *      promosi dijadwalkan satu tick kemudian. Ini yang memisahkan
 *      "buang jendela lama" dan "buat jendela baru" ke dua commit berbeda.
 *
 * Modul ini bebas React Native supaya bisa diuji `node --test`
 * (lihat `src/lib/__tests__/dialogAntrean.test.ts`).
 */

/**
 * Penjadwal promosi. Di produksi memakai `setTimeout(fn, 0)`; di test memakai
 * penjadwal palsu supaya urutan tick bisa dikendalikan.
 */
export type Penjadwal = (fn: () => void) => void;

/** Jeda promosi (ms). Satu tick cukup: commit React + drop view sudah selesai. */
export const JEDA_PROMOSI_MS = 0;

export class AntreanModal {
  /** Id yang saat ini memegang slot (boleh merender Modal). */
  private aktifId: string | null = null;
  /** Id yang menunggu giliran, urut FIFO. */
  private daftarTunggu: string[] = [];
  /**
   * true bila slot baru saja dilepas dan promosi belum dijalankan. Selama ini
   * true, peminta baru HARUS mengantre walau slot terlihat kosong — kalau tidak,
   * dua jendela tetap bertukar pada commit yang sama.
   */
  private baruLepas = false;
  private pendengar = new Set<() => void>();
  private promosiTerjadwal = false;
  private readonly jadwalkan: Penjadwal;

  constructor(jadwalkan: Penjadwal = (fn) => void setTimeout(fn, JEDA_PROMOSI_MS)) {
    this.jadwalkan = jadwalkan;
  }

  /** Id pemegang slot, atau null. */
  aktif(): string | null {
    return this.aktifId;
  }

  /** Salinan antrean (untuk test/diagnostik). */
  antrean(): string[] {
    return [...this.daftarTunggu];
  }

  /** Apakah `id` boleh merender `<Modal>` saat ini. */
  boleh(id: string): boolean {
    return this.aktifId === id;
  }

  /**
   * Minta slot. Bila bebas (dan tidak ada slot yang baru dilepas pada task ini)
   * langsung dipegang; bila tidak, masuk antrean.
   */
  minta(id: string): void {
    if (this.aktifId === id || this.daftarTunggu.includes(id)) {
      return;
    }

    if (this.aktifId === null && !this.baruLepas) {
      this.aktifId = id;
      this.beritahu();
      return;
    }

    this.daftarTunggu.push(id);
    this.beritahu();
  }

  /**
   * Lepas slot (dialog ditutup atau komponennya dilepas). Idempoten: aman
   * dipanggil untuk id yang tidak memegang slot.
   */
  lepas(id: string): void {
    const posisi = this.daftarTunggu.indexOf(id);
    if (posisi >= 0) {
      this.daftarTunggu.splice(posisi, 1);
      this.beritahu();
    }

    if (this.aktifId !== id) {
      return;
    }

    this.aktifId = null;
    this.baruLepas = true;
    this.mintaPromosi();
    this.beritahu();
  }

  /** Berlangganan perubahan; mengembalikan fungsi berhenti berlangganan. */
  langgan(pendengar: () => void): () => void {
    this.pendengar.add(pendengar);
    return () => {
      this.pendengar.delete(pendengar);
    };
  }

  /** Kembalikan ke keadaan awal (dipakai test). */
  reset(): void {
    this.aktifId = null;
    this.daftarTunggu = [];
    this.baruLepas = false;
    this.promosiTerjadwal = false;
    this.pendengar.clear();
  }

  private mintaPromosi(): void {
    if (this.promosiTerjadwal) {
      return;
    }

    this.promosiTerjadwal = true;
    this.jadwalkan(() => {
      this.promosiTerjadwal = false;
      this.baruLepas = false;

      if (this.aktifId === null && this.daftarTunggu.length > 0) {
        this.aktifId = this.daftarTunggu.shift() ?? null;
      }

      this.beritahu();
    });
  }

  private beritahu(): void {
    for (const pendengar of [...this.pendengar]) {
      pendengar();
    }
  }
}

/**
 * Antrean global aplikasi. Semua `<Dialog>` memakai instance ini sehingga
 * jendela modal di seluruh aplikasi berbagi satu slot.
 */
export const antreanModal = new AntreanModal();

export default antreanModal;
