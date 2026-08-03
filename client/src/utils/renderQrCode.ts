import QRCode from 'qrcode';

/** Dessine un QR code sur `canvas` pour `url`, style plat cohérent avec le thème neutre du dashboard/écran géant. */
export async function renderQrCode(canvas: HTMLCanvasElement, url: string): Promise<void> {
  await QRCode.toCanvas(canvas, url, {
    width: 200,
    margin: 1,
    color: { dark: '#10131a', light: '#ffffff' },
  });
}
