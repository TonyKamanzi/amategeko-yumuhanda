import { ImageResponse } from "next/og";

export const alt = "Ikizami cy'Umutekano mu Muhanda — quiz yo kwitegura uruhushya rwo gutwara ibinyabiziga";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#00a3e0",
          backgroundImage: "linear-gradient(135deg, #00a3e0 0%, #20603d 100%)",
          padding: "64px 72px",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 14,
            backgroundColor: "#fad105",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 68,
              height: 68,
              borderRadius: 18,
              backgroundColor: "#ffffff",
              color: "#20603d",
              fontSize: 38,
              fontWeight: 700,
            }}
          >
            I
          </div>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 6 }}>IKIZAMI</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 78, lineHeight: 1.08 }}>
            {"Ikizami cy'Umutekano"}
          </div>
          <div style={{ display: "flex", fontSize: 52, color: "#fff6e5", marginTop: 8 }}>
            mu Muhanda · Driving Theory Quiz
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#ffffff", marginTop: 28 }}>
            Ibibazo 20 · Iminota 20 · Gutsinda 12/20
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            backgroundColor: "#fad105",
            color: "#10243a",
            borderRadius: 999,
            padding: "16px 30px",
            fontSize: 26,
          }}
        >
          Kwitegura ikizami mu Kinyarwanda
        </div>
      </div>
    ),
    { ...size },
  );
}
