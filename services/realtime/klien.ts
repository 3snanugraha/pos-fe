import { API_CONFIG, API_ENDPOINTS } from "../../services/config";
import {
  EVENT_YANG_DIBIND,
  channelUntuk,
  konfigurasiLengkap,
  normalisasiKonfigurasi,
  type KonfigurasiRealtime,
} from "./config";
import { hasilDariEvent, type HasilPemetaan } from "./eventMapping";

/**
 * Klien Pusher untuk notifikasi realtime.
 *
 * Keputusan desain:
 * 1. `pusher-js` diimpor dinamis (`import()`), sehingga modul ini tetap bisa
 *    dimuat di lingkungan tanpa WebSocket (mis. test Node) tanpa crash dan
 *    bundel utama tidak menanggung beratnya saat realtime dimatikan.
 * 2. Token TIDAK dibaca dari storage di dalam kelas ini: pemanggil memberinya
 *    lewat `ambilToken`, supaya aplikasi bisa memakai token pelanggan
 *    (`auth_token`) maupun token staf (`@staff_token`) tanpa duplikasi logika.
 * 3. Otorisasi channel memakai endpoint backend (`POST /notification-auth`)
 *    dengan header `Authorization` — tidak ada secret di klien.
 * 4. Semua kegagalan ditelan: aplikasi tetap berfungsi tanpa realtime.
 */

export type StatusKoneksi =
  | "idle"
  | "menghubungkan"
  | "terhubung"
  | "terputus"
  | "tidak-aktif"
  | "gagal";

export interface OpsiKlienRealtime {
  /** Ambil token akun aktif; null berarti belum login. */
  ambilToken: () => Promise<string | null>;
  /** Callback setiap event notifikasi valid (sudah terpetakan). */
  onNotifikasi: (notifikasi: NonNullable<HasilPemetaan["notifikasi"]>) => void;
  /** Callback perubahan status koneksi. */
  onStatus?: (status: StatusKoneksi) => void;
}

/** Bagian pusher-js yang benar-benar dipakai (tanpa impor statis). */
interface PusherLike {
  connection: { bind: (event: string, cb: (state: unknown) => void) => void };
  subscribe: (channel: string) => {
    bind: (event: string, cb: (data: unknown) => void) => void;
    unbind_all?: () => void;
  };
  disconnect: () => void;
  unsubscribe: (channel: string) => void;
}

export class KlienRealtime {
  private pusher: PusherLike | null = null;
  private channel: string | null = null;
  private status: StatusKoneksi = "idle";
  private jumlahBelumDibaca = 0;

  constructor(private readonly opsi: OpsiKlienRealtime) {}

  get jumlahBelumDibacaSaatIni(): number {
    return this.jumlahBelumDibaca;
  }

  get statusSaatIni(): StatusKoneksi {
    return this.status;
  }

  /** Nolkan badge (dipanggil setelah pengguna membuka layar notifikasi). */
  resetBelumDibaca(): void {
    this.jumlahBelumDibaca = 0;
  }

  /**
   * Ambil konfigurasi dari backend lalu sambungkan. Aman dipanggil berulang.
   *
   * @returns true bila koneksi berhasil dimulai.
   */
  async mulai(): Promise<boolean> {
    if (this.pusher) {
      return true;
    }

    const token = await this.opsi.ambilToken();

    if (!token) {
      this.setStatus("tidak-aktif");
      return false;
    }

    const konfig = await this.ambilKonfigurasi(token);

    if (!konfigurasiLengkap(konfig)) {
      this.setStatus("tidak-aktif");
      return false;
    }

    let modul: any;

    try {
      modul = await import("pusher-js");
    } catch {
      this.setStatus("gagal");
      return false;
    }

    const PusherCtor = modul?.default ?? modul?.Pusher ?? modul;

    try {
      this.pusher = new PusherCtor(konfig.key, {
        cluster: konfig.cluster,
        forceTLS: true,
        channelAuthorization: {
          endpoint: `${API_CONFIG.baseUrl}${API_ENDPOINTS.realtime.auth}`,
          transport: "ajax",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        },
      }) as PusherLike;
    } catch {
      this.pusher = null;
      this.setStatus("gagal");
      return false;
    }

    this.setStatus("menghubungkan");

    this.pusher.connection.bind("connected", () => this.setStatus("terhubung"));
    this.pusher.connection.bind("unavailable", () => this.setStatus("terputus"));
    this.pusher.connection.bind("disconnected", () => this.setStatus("terputus"));
    this.pusher.connection.bind("failed", () => this.setStatus("gagal"));

    const nama = channelUntuk(konfig);
    this.channel = nama;

    try {
      const channel = this.pusher.subscribe(nama);

      for (const event of EVENT_YANG_DIBIND) {
        channel.bind(event, (data: unknown) => this.terima(event, data, nama));
      }
    } catch {
      this.setStatus("gagal");
      return false;
    }

    return true;
  }

  /** Putuskan koneksi & bersihkan binding. */
  berhenti(): void {
    try {
      if (this.pusher && this.channel) {
        this.pusher.unsubscribe(this.channel);
      }
      this.pusher?.disconnect();
    } catch {
      /* abaikan */
    }

    this.pusher = null;
    this.channel = null;
    this.setStatus("idle");
  }

  /** Handler tunggal untuk semua event (dipisah agar mudah diuji). */
  private terima(namaEvent: string, data: unknown, channel: string): void {
    const hasil = hasilDariEvent(namaEvent, data, channel);

    if (!hasil.notifikasi) {
      return;
    }

    if (hasil.tambahBelumDibaca) {
      this.jumlahBelumDibaca += 1;
    }

    try {
      this.opsi.onNotifikasi(hasil.notifikasi);
    } catch {
      /* callback UI tidak boleh menjatuhkan koneksi */
    }
  }

  private setStatus(status: StatusKoneksi): void {
    this.status = status;
    try {
      this.opsi.onStatus?.(status);
    } catch {
      /* abaikan */
    }
  }

  /** GET /api/notification-config dengan token akun aktif. */
  private async ambilKonfigurasi(token: string): Promise<KonfigurasiRealtime | null> {
    try {
      const respons = await fetch(`${API_CONFIG.baseUrl}${API_ENDPOINTS.realtime.config}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (!respons.ok) {
        return null;
      }

      return normalisasiKonfigurasi(await respons.json());
    } catch {
      return null;
    }
  }
}
