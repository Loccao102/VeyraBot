const PHASE_BACKGROUNDS = {
  dawn: ["#f6d6c6", "#f9eee6"],
  day: ["#fff2df", "#f8f5ef"],
  dusk: ["#d98f7b", "#f0d7c7"],
  night: ["#756979", "#c5b5c0"],
};

function makeFilename(phase, weather) {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  return `sen-${phase}-${weather}-${stamp}.png`;
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export async function captureSenMoment({
  phase,
  weather,
  mood,
  thoughtCount = 0,
}) {
  const source = document.querySelector(".canvas-wrap canvas");
  if (!source) throw new Error("Sen canvas was not found.");

  const size = 1080;
  const output = document.createElement("canvas");
  output.width = size;
  output.height = size;
  const ctx = output.getContext("2d");
  if (!ctx) throw new Error("Canvas export is unavailable.");

  const palette = PHASE_BACKGROUNDS[phase] ?? PHASE_BACKGROUNDS.day;
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, palette[0]);
  gradient.addColorStop(1, palette[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const sourceRatio = source.width / source.height;
  const targetWidth = size;
  const targetHeight = Math.min(size * 0.82, targetWidth / sourceRatio);
  const targetY = 120 + (760 - targetHeight) / 2;

  ctx.save();
  ctx.globalAlpha = 0.98;
  ctx.drawImage(source, 0, 0, source.width, source.height, 0, targetY, targetWidth, targetHeight);
  ctx.restore();

  const vignette = ctx.createRadialGradient(540, 500, 120, 540, 500, 700);
  vignette.addColorStop(0, "rgba(255,255,255,0)");
  vignette.addColorStop(1, phase === "night" ? "rgba(45,34,48,.22)" : "rgba(115,76,65,.08)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = phase === "night" ? "#f7eef4" : "#604c48";
  ctx.font = "48px Georgia, serif";
  ctx.fillText("sen", 64, 82);

  ctx.font = "16px Segoe UI, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillStyle = phase === "night" ? "#e7d9e2" : "#8d756b";
  ctx.fillText(
    `${String(phase).toUpperCase()} · ${String(weather).toUpperCase()} · ${String(mood).toUpperCase()}`,
    64,
    114,
  );

  ctx.font = "15px Segoe UI, sans-serif";
  ctx.fillStyle = phase === "night" ? "#ddcfd8" : "#907c70";
  ctx.fillText(
    thoughtCount > 0
      ? `${thoughtCount} thought${thoughtCount === 1 ? "" : "s"} resting in the pond`
      : "A quiet moment in the lotus garden",
    64,
    1008,
  );

  ctx.textAlign = "right";
  ctx.fillText(new Date().toLocaleString(), 1016, 1008);
  ctx.textAlign = "left";

  const blob = await new Promise((resolve) =>
    output.toBlob(resolve, "image/png", 0.95),
  );
  if (!blob) throw new Error("Could not create the captured image.");

  const filename = makeFilename(phase, weather);
  const file = new File([blob], filename, { type: "image/png" });

  if (
    navigator.share &&
    navigator.canShare?.({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: "A moment with Sen",
        text: "A quiet moment from my lotus garden.",
      });
      return { mode: "shared", filename };
    } catch (error) {
      if (error?.name === "AbortError") return { mode: "cancelled", filename };
    }
  }

  saveBlob(blob, filename);
  return { mode: "saved", filename };
}
