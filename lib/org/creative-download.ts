/** Capture a PNG from a container that holds WebGL canvas(es) and/or <img>. */

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  a.href = dataUrl;
  a.click();
}

function canvasToPng(canvas: HTMLCanvasElement): string | null {
  try {
    const url = canvas.toDataURL("image/png");
    if (!url || url === "data:," || url.length < 64) return null;
    return url;
  } catch {
    return null;
  }
}

async function imgToPng(img: HTMLImageElement): Promise<string | null> {
  try {
    if (!img.complete || img.naturalWidth < 2) return null;
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvasToPng(c);
  } catch {
    return null;
  }
}

function compositeCanvases(canvases: HTMLCanvasElement[]): string | null {
  if (canvases.length === 0) return null;
  if (canvases.length === 1) return canvasToPng(canvases[0]!);
  const heights = canvases.map((c) => c.height || 1);
  const h = Math.max(...heights);
  const widths = canvases.map((c) => {
    const scale = h / (c.height || 1);
    return Math.max(1, Math.round((c.width || 1) * scale));
  });
  const totalW = widths.reduce((a, b) => a + b, 0);
  const out = document.createElement("canvas");
  out.width = totalW;
  out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#0a0812";
  ctx.fillRect(0, 0, totalW, h);
  let x = 0;
  for (let i = 0; i < canvases.length; i++) {
    const c = canvases[i]!;
    const w = widths[i]!;
    ctx.drawImage(c, x, 0, w, h);
    x += w;
  }
  return canvasToPng(out);
}

/** Wait a couple frames so WebGL presents, then export. */
export async function downloadPngFromContainer(root: HTMLElement, filename: string): Promise<boolean> {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const canvases = [...root.querySelectorAll("canvas")].filter(
    (c): c is HTMLCanvasElement => c instanceof HTMLCanvasElement && c.width > 2 && c.height > 2,
  );
  if (canvases.length > 0) {
    const url = compositeCanvases(canvases);
    if (url) {
      downloadDataUrl(url, filename);
      return true;
    }
  }

  const img = root.querySelector("img");
  if (img instanceof HTMLImageElement) {
    const url = await imgToPng(img);
    if (url) {
      downloadDataUrl(url, filename);
      return true;
    }
    // Cross-origin or still loading: fall back to opening the src.
    if (img.src) {
      const a = document.createElement("a");
      a.href = img.src;
      a.download = filename.replace(/\.png$/i, "") + (img.src.endsWith(".jpg") ? ".jpg" : ".png");
      a.target = "_blank";
      a.rel = "noopener";
      a.click();
      return true;
    }
  }

  return false;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
