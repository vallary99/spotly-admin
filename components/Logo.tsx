import Image from "next/image";

// Same asset and aspect ratio as spotly-web's Logo — no mobile variant
// needed here, this app is desktop-only.
const ASPECT_RATIO = 449 / 187;

export function Logo({ height = 40 }: { height?: number }) {
  return (
    <Image
      src="/spotly-logo.png"
      alt="Spotly"
      width={Math.round(height * ASPECT_RATIO)}
      height={height}
      priority
      style={{ width: "auto", height: "auto" }}
    />
  );
}
