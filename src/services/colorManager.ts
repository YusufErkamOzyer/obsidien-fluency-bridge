import { DEFAULT_SETTINGS, FluencyBridgeSettings } from "../types";

export const STYLE_ELEMENT_ID = "fluency-bridge-custom-colors";

/**
 * Converts a 3 or 6-digit hex color string into rgba(r, g, b, alpha).
 * Returns the original string unchanged if invalid hex is supplied.
 */
export function hexToRgba(hex: string, alpha: number): string {
  let clean = (hex || "").trim().replace(/^#/, "");
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (clean.length !== 6) {
    return hex;
  }
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return hex;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Injects or updates dynamic CSS custom properties for highlight colors in the DOM.
 * Works seamlessly across open notes without requiring note reloading.
 */
export function applyColorStyles(settings: FluencyBridgeSettings): void {
  const replacedColor =
    settings.replacedHighlightColor || DEFAULT_SETTINGS.replacedHighlightColor;
  const nuanceColor =
    settings.nuanceHighlightColor || DEFAULT_SETTINGS.nuanceHighlightColor;

  const replacedLightBg = hexToRgba(replacedColor, 0.18);
  const replacedDarkBg = hexToRgba(replacedColor, 0.25);

  const nuanceLightBg = hexToRgba(nuanceColor, 0.18);
  const nuanceDarkBg = hexToRgba(nuanceColor, 0.25);

  let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ELEMENT_ID;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    body {
      --fb-replaced-color: ${replacedColor};
      --fb-replaced-bg: ${replacedLightBg};
      --fb-nuance-color: ${nuanceColor};
      --fb-nuance-bg: ${nuanceLightBg};
    }
    body.theme-dark {
      --fb-replaced-bg: ${replacedDarkBg};
      --fb-nuance-bg: ${nuanceDarkBg};
    }
  `;
}

/**
 * Removes the dynamic style element from the DOM when the plugin is unloaded.
 */
export function clearColorStyles(): void {
  const styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (styleEl) {
    styleEl.remove();
  }
}
