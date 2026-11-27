import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

// Fixed values keep the server and client markup identical (no hydration
// mismatch) while still looking scattered across the whole viewport.
const COLORS = ["#00a3e0", "#fad105", "#20603d", "#c14b2c", "#fff6e5"];
const PARTICLES_PER_BURST = 12;
const BURST_COUNT = 32; // bursts every 0.95s; last one finishes at ~31s
const BURSTS = Array.from({ length: BURST_COUNT }, (_, i) => ({
  x: 6 + ((i * 37) % 88),
  y: 8 + ((i * 23) % 76),
  delay: i * 950,
}));

export default function Fireworks() {
  // Results are only reached after a client interaction, so a portal is safe
  // here and guarantees full-viewport positioning regardless of CSS transforms.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    >
      {BURSTS.map((burst, burstIndex) => (
        <div key={burstIndex}>
          <span
            className="animate-firework-ring absolute rounded-full border-2"
            style={{
              left: `${burst.x}%`,
              top: `${burst.y}%`,
              width: 20,
              height: 20,
              marginLeft: -10,
              marginTop: -10,
              borderColor: COLORS[burstIndex % COLORS.length],
              animationDelay: `${burst.delay}ms`,
            }}
          />
          {Array.from({ length: PARTICLES_PER_BURST }, (_, i) => {
            const angle = (i * 360) / PARTICLES_PER_BURST + burstIndex * 13;
            const distance = 90 + ((i * 31 + burstIndex * 13) % 210);
            const size = i % 3 === 0 ? 10 : 6;
            return (
              <span
                key={i}
                className="animate-firework-burst absolute rounded-full will-change-transform"
                style={
                  {
                    left: `${burst.x}%`,
                    top: `${burst.y}%`,
                    width: size,
                    height: size,
                    backgroundColor: COLORS[(i + burstIndex * 2) % COLORS.length],
                    "--fw-angle": `${angle}deg`,
                    "--fw-distance": `${distance}px`,
                    animationDelay: `${burst.delay + (i % 3) * 40}ms`,
                  } as CSSProperties
                }
              />
            );
          })}
        </div>
      ))}
    </div>,
    document.body,
  );
}
