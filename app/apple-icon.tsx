import { ImageResponse } from "next/og";

/**
 * `app/apple-icon.tsx` — Next's apple-touch-icon convention.
 *
 * 180×180 PNG (the iOS home-screen size): the same black square + bold white
 * "M" lockup as the favicon (`icon.tsx`), scaled up. Next auto-injects the
 * `<link rel="apple-touch-icon">` tag.
 */

export const runtime = "edge";
export const size = { width: 180, height: 180 } as const;
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 120,
          fontWeight: 700,
          letterSpacing: -2,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        M
      </div>
    ),
    { ...size },
  );
}
