import type { CSSProperties } from "react";

// Fixed values keep the server and client markup identical (no hydration
// mismatch) while still looking scattered across the banner.
const COLORS = ["#00a3e0", "#fad105", "#20603d", "#c14b2c", "#fff6e5"];
const PARTICLES_PER_BURST = 16;
const BURSTS = [
  { x: 20, y: 34, delay: 0 },
  { x: 78, y: 26, delay: 420 },
  { x: 64, y: 62, delay: 840 },
  { x: 32, y: 70, delay: 1260 },
] as const;

export default function Fireworks() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
    >
      {BURSTS.map((burst, burstIndex) => (
        <div key={burstIndex}>
          <span
            className="animate-firework-ring absolute rounded-full border-2"
            style={{
              left: `${burst.x}%`,
              top: `${burst.y}%`,
              width: 18,
              height: 18,
              marginLeft: -9,
              marginTop: -9,
              borderColor: COLORS[burstIndex % COLORS.length],
              animationDelay: `${burst.delay}ms`,
            }}
          />
          {Array.from({ length: PARTICLES_PER_BURST }, (_, i) => {
            const angle = (i * 360) / PARTICLES_PER_BURST + burstIndex * 11;
            const distance = 74 + ((i * 29 + burstIndex * 17) % 66);
            const size = i % 3 === 0 ? 9 : 6;
            return (
              <span
                key={i}
                className="animate-firework-burst absolute rounded-full"
                style={
                  {
                    left: `${burst.x}%`,
                    top: `${burst.y}%`,
                    width: size,
                    height: size,
                    backgroundColor: COLORS[(i + burstIndex * 2) % COLORS.length],
                    "--fw-angle": `${angle}deg`,
                    "--fw-distance": `${distance}px`,
                    animationDelay: `${burst.delay + (i % 4) * 35}ms`,
                  } as CSSProperties
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
