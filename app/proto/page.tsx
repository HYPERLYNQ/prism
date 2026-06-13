import type { Metadata } from "next";
import ProtoHero from "@/components/proto/ProtoHero";

/**
 * Hidden prototype route — NOT linked from anywhere. The original boot/scene
 * prototype, recovered from the Next dev build cache after it was deleted (see
 * scripts/recover-proto.mjs). Kept so the production hero can be compared
 * against it frame-for-frame.
 */
export const metadata: Metadata = {
  title: "proto — hero reference",
  robots: { index: false, follow: false },
};

export default function ProtoPage() {
  return <ProtoHero />;
}
