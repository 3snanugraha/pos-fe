/**
 * Regresi tombol "Salin Nomor Transaksi".
 *
 * Yang dikunci:
 *  - jalur utama Clipboard API; bila ditolak (bukan secure context) turun ke
 *    execCommand lalu ke Clipboard native — tombol tidak boleh gagal diam-diam;
 *  - teks kosong/spasi tidak dianggap berhasil disalin;
 *  - kegagalan semua jalur dilaporkan `ok: false` supaya UI bisa memberi tahu
 *    pengguna (bukan pesan "Disalin" palsu).
 *
 * Jalankan: `node --test utils/__tests__/salinTeks.test.ts`
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { pesanHasilSalin, salinTeks } from "../salinTeks.ts";

test("memakai Clipboard API bila tersedia", async () => {
  let tersimpan = "";
  const hasil = await salinTeks("ORD-20261027-A7P3D8", {
    tulisClipboardApi: async (teks) => {
      tersimpan = teks;
    },
  });

  assert.deepEqual(hasil, { ok: true, cara: "clipboard-api" });
  assert.equal(tersimpan, "ORD-20261027-A7P3D8");
});

test("jatuh ke execCommand saat Clipboard API ditolak", async () => {
  let argumen = "";
  const hasil = await salinTeks("ORD-1", {
    tulisClipboardApi: async () => {
      throw new Error("NotAllowedError: bukan secure context");
    },
    execCommandCopy: (teks) => {
      argumen = teks;
      return true;
    },
  });

  assert.deepEqual(hasil, { ok: true, cara: "exec-command" });
  assert.equal(argumen, "ORD-1");
});

test("jatuh ke Clipboard native saat web tidak punya DOM", async () => {
  let argumen = "";
  const hasil = await salinTeks("ORD-2", {
    setStringNative: (teks) => {
      argumen = teks;
    },
  });

  assert.deepEqual(hasil, { ok: true, cara: "native" });
  assert.equal(argumen, "ORD-2");
});

test("semua jalur gagal → ok:false (bukan sukses palsu)", async () => {
  const hasil = await salinTeks("ORD-3", {
    tulisClipboardApi: async () => {
      throw new Error("ditolak");
    },
    execCommandCopy: () => false,
    setStringNative: () => {
      throw new Error("modul tidak ada");
    },
  });

  assert.equal(hasil.ok, false);
  assert.equal(hasil.cara, "gagal");
});

test("teks kosong tidak disalin dan tidak memanggil jalur mana pun", async () => {
  let dipanggil = false;

  const hasil = await salinTeks("   ", {
    tulisClipboardApi: async () => {
      dipanggil = true;
    },
    execCommandCopy: () => {
      dipanggil = true;
      return true;
    },
  });

  assert.equal(hasil.ok, false);
  assert.equal(dipanggil, false);
});

test("pesanHasilSalin membedakan sukses dan gagal", () => {
  assert.equal(
    pesanHasilSalin({ ok: true, cara: "clipboard-api" }, "Nomor transaksi"),
    "Nomor transaksi disalin"
  );
  assert.equal(
    pesanHasilSalin({ ok: false, cara: "gagal" }, "Nomor transaksi"),
    "Gagal menyalin nomor transaksi"
  );
});
