import { Alert, Platform } from "react-native";

/**
 * Shim `Alert.alert` untuk web.
 *
 * `react-native-web` menyediakan `Alert` sebagai no-op: tidak ada dialog yang
 * muncul dan — yang lebih berbahaya — callback tombol (`onPress`) TIDAK PERNAH
 * dipanggil. Akibatnya alur yang bergantung pada callback (login → navigasi,
 * konfirmasi hapus item, verifikasi order) diam-diam tidak berjalan di web.
 *
 * Shim ini memasang modal DOM ringan (non-blocking — bukan `window.confirm`
 * yang memblokir render) sehingga callback tombol tetap dieksekusi.
 */

type AlertButton = {
  text?: string;
  onPress?: (...args: any[]) => void;
  style?: "default" | "cancel" | "destructive";
};

const BUTTON_WARNA: Record<string, { bg: string; fg: string }> = {
  default: { bg: "#1E40AF", fg: "#FFFFFF" },
  destructive: { bg: "#EF4444", fg: "#FFFFFF" },
  cancel: { bg: "#E5E7EB", fg: "#374151" },
};

const tutupModal = (root: HTMLElement) => {
  root.style.opacity = "0";
  window.setTimeout(() => root.remove(), 120);
};

const tampilkanModal = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => {
  if (typeof document === "undefined") return;

  const daftarTombol: AlertButton[] =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: "OK", style: "default" }];

  const root = document.createElement("div");
  root.setAttribute("data-web-alert", "1");
  Object.assign(root.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    zIndex: "99999",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(17,24,39,0.45)",
    transition: "opacity 120ms ease-out",
    opacity: "1",
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    background: "#FFFFFF",
    borderRadius: "16px",
    padding: "20px",
    width: "min(90vw, 380px)",
    boxShadow: "0 20px 45px rgba(0,0,0,0.25)",
  });

  const judul = document.createElement("div");
  judul.textContent = title;
  Object.assign(judul.style, {
    fontSize: "16px",
    fontWeight: "700",
    color: "#111827",
    marginBottom: message ? "8px" : "16px",
  });
  card.appendChild(judul);

  if (message) {
    const isi = document.createElement("div");
    isi.textContent = message;
    Object.assign(isi.style, {
      fontSize: "14px",
      lineHeight: "20px",
      color: "#4B5563",
      marginBottom: "16px",
      whiteSpace: "pre-wrap",
    });
    card.appendChild(isi);
  }

  const baris = document.createElement("div");
  Object.assign(baris.style, {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  });

  daftarTombol.forEach((tombol, index) => {
    const warna = BUTTON_WARNA[tombol.style ?? "default"] ?? BUTTON_WARNA.default;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = tombol.text ?? (index === 0 ? "OK" : "Lanjut");
    btn.setAttribute("data-web-alert-button", tombol.style ?? "default");
    Object.assign(btn.style, {
      padding: "10px 16px",
      borderRadius: "10px",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "600",
      background: warna.bg,
      color: warna.fg,
    });

    btn.addEventListener("click", () => {
      tutupModal(root);
      // Biarkan DOM dibersihkan dulu sebelum callback (sering navigasi).
      window.setTimeout(() => {
        try {
          tombol.onPress?.();
        } catch (error) {
          console.error("Error pada callback Alert web:", error);
        }
      }, 0);
    });

    baris.appendChild(btn);
  });

  card.appendChild(baris);
  root.appendChild(card);
  document.body.appendChild(root);
};

const installWebAlert = () => {
  if (Platform.OS !== "web") return;
  if (typeof window === "undefined") return;

  try {
    (Alert as any).alert = tampilkanModal;

    if (!(Alert as any).prompt) {
      (Alert as any).prompt = (
        title: string,
        message?: string,
        buttons?: AlertButton[],
        defaultValue?: string
      ) => {
        const isian = window.prompt(
          [title, message].filter(Boolean).join("\n\n"),
          defaultValue ?? ""
        );
        if (isian === null) {
          buttons?.find((b) => b.style === "cancel")?.onPress?.();
        } else {
          const konfirmasi =
            buttons?.find((b) => b.style !== "cancel") ?? buttons?.[0];
          konfirmasi?.onPress?.(isian);
        }
      };
    }
  } catch (error) {
    console.warn("Gagal memasang shim Alert web:", error);
  }
};

export default installWebAlert;
