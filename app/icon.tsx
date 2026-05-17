import { ImageResponse } from "next/og";

/**
 * `app/icon.tsx` — Next 16's dynamic favicon convention.
 *
 * Generates a 32×32 PNG at request time: a black square with a bold white "K"
 * in a system sans-serif. Same lockup style as the masthead.
 *
 * Next handles caching automatically (the response is built once per deploy).
 * Multiple sizes can be added by exporting additional files (e.g. `apple-icon.tsx`).
 */

export const runtime = "edge";
export const size = { width: 32, height: 32 } as const;
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0e10",
          color: "#ffffff",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: -0.5,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        K
      </div>
    ),
    { ...size },
  );
}
