import { ImageResponse } from "next/og";

export const alt = "CookPilot — Your kitchen. Your appliances. Your AI chef.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const fr = (await params).locale === "fr";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#faf6ee", padding: 80, color: "#26251f" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#55622f", display: "flex" }} />
          <div style={{ fontSize: 44, fontWeight: 600 }}>CookPilot</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 84, lineHeight: 1.08, letterSpacing: -2 }}>
          <div>{fr ? "Votre cuisine." : "Your kitchen."}</div>
          <div>{fr ? "Vos appareils." : "Your appliances."}</div>
          <div style={{ color: "#55622f" }}>{fr ? "Votre chef IA." : "Your AI chef."}</div>
        </div>
        <div style={{ fontSize: 28, color: "#6b685c" }}>{fr ? "Des recettes adaptées aux programmes réels de vos appareils." : "Recipes adapted to the programs your appliances really have."}</div>
      </div>
    ),
    size,
  );
}
