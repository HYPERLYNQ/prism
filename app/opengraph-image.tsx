import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import { OWNER_NAME, OWNER_ROLE, SITE_NAME } from "@/lib/siteConfig";

/**
 * `app/opengraph-image.tsx` — Next 16's root Open Graph image convention.
 *
 * Brutalist "tactical telemetry" share card (1200×630): cream phosphor on a
 * deactivated-CRT near-black, JetBrains Mono throughout, razor hairline grid,
 * a telemetry data column + barcode, scanline texture, and a single chartreuse
 * accent. Matches the site's mono/terminal aesthetic (the hero wordmark is also
 * JetBrains Mono ExtraBold).
 *
 * `next/og` uses Satori. The mono is vendored as TTFs under ./_fonts and loaded
 * via `new URL(..., import.meta.url)` so Next traces the files into the bundle
 * (no network fetch at build → can't fail). Every multi-child box has an
 * explicit `display: flex`; there are no rounded corners (brutalist = 90°).
 */

export const alt = `${OWNER_NAME} — ${OWNER_ROLE} · ${SITE_NAME}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0A0A0A"; // deactivated CRT
const INK = "#ECE9E0"; // cream phosphor
const DIM = "#73736C"; // dim telemetry
const LINE = "#2B2B27"; // hairline borders
const ACCENT = "#C8F050"; // chartreuse — the single accent

/** Telemetry key/value row with a hairline rule under it. */
function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        paddingBottom: 9,
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      <div style={{ display: "flex", color: DIM }}>{k}</div>
      <div style={{ display: "flex", color: accent ? ACCENT : INK }}>{v}</div>
    </div>
  );
}

export default async function OpenGraphImage() {
  // readFile (not fetch) of a file:// URL — fetch of a local file isn't
  // implemented in the dev runtime, and the URL form keeps Next's file tracer
  // bundling the TTFs for production.
  const [extraBold, regular] = await Promise.all([
    readFile(new URL("./_fonts/JetBrainsMono-ExtraBold.ttf", import.meta.url)),
    readFile(new URL("./_fonts/JetBrainsMono-Regular.ttf", import.meta.url)),
  ]);

  // Barcode bar widths — irregular, brutalist machine-read strip.
  const bars = [3, 1, 2, 1, 1, 4, 1, 2, 1, 3, 1, 1, 2, 1, 4, 2, 1, 1, 3, 1, 2, 1, 1, 3, 1, 2];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          color: INK,
          fontFamily: "JBM",
          position: "relative",
        }}
      >
        {/* CRT scanlines. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 4px)",
          }}
        />

        {/* TOP BAR — identity. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "26px 44px",
            borderBottom: `1px solid ${LINE}`,
            fontSize: 21,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", color: ACCENT }}>//</div>
            <div style={{ display: "flex" }}>{OWNER_NAME}</div>
            <div style={{ display: "flex", color: DIM }}>{OWNER_ROLE}</div>
          </div>
          <div style={{ display: "flex", color: DIM }}>MIKEVIDAL.DEV ®</div>
        </div>

        {/* BODY — headline | telemetry column. */}
        <div style={{ display: "flex", flex: 1 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flexGrow: 1,
              padding: "0 44px",
              borderRight: `1px solid ${LINE}`,
            }}
          >
            <div style={{ display: "flex", fontSize: 17, letterSpacing: 5, color: DIM, marginBottom: 24 }}>
              [ APPLIED-AI ENGINEER ]
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontWeight: 800,
                fontSize: 84,
                lineHeight: 1.0,
                letterSpacing: -2,
              }}
            >
              <div style={{ display: "flex" }}>APPLIED AI,</div>
              <div style={{ display: "flex" }}>SHIPPED TO</div>
              <div style={{ display: "flex" }}>
                <div style={{ display: "flex" }}>PRODUCTION</div>
                <div style={{ display: "flex", color: ACCENT }}>.</div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontSize: 18,
                letterSpacing: 2,
                color: DIM,
              }}
            >
              LLM PIPELINES / AGENTS / PERSISTENT MEMORY
            </div>
          </div>

          {/* Telemetry column. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: 312,
              padding: "34px 38px",
              fontSize: 18,
              letterSpacing: 1,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 17 }}>
              <Row k="REV" v="2.6" />
              <Row k="STATUS" v="LIVE" accent />
              <Row k="LAT" v="25.76 N" />
              <Row k="LNG" v="-80.19 W" />
              <Row k="UNIT" v="D-01" />
            </div>
            {/* Barcode. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 52 }}>
                {bars.map((w, i) => (
                  <div key={i} style={{ display: "flex", width: w, height: "100%", background: INK }} />
                ))}
              </div>
              <div style={{ display: "flex", color: DIM, fontSize: 14, letterSpacing: 3 }}>MV—AI—2026</div>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR — availability + build. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "22px 44px",
            borderTop: `1px solid ${LINE}`,
            fontSize: 18,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ display: "flex", width: 11, height: 11, background: ACCENT }} />
            <div style={{ display: "flex" }}>OPERATIONAL — OPEN TO REMOTE + FREELANCE</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: DIM }}>
            <div style={{ display: "flex" }}>BUILD / COMPILED</div>
            <div style={{ display: "flex", color: ACCENT }}>100%</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "JBM", data: regular, weight: 400, style: "normal" },
        { name: "JBM", data: extraBold, weight: 800, style: "normal" },
      ],
    },
  );
}
