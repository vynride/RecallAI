"use client";

export function DashboardBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      {/* Coral orb — top right */}
      <div
        className="absolute rounded-full bg-coral/[0.06]"
        style={{
          width: 520,
          height: 520,
          top: "-12%",
          right: "-8%",
          filter: "blur(64px)",
          animation: "orb1 22s ease-in-out infinite",
        }}
      />
      {/* Blue orb — bottom left */}
      <div
        className="absolute rounded-full bg-action-blue/[0.06]"
        style={{
          width: 400,
          height: 400,
          bottom: "10%",
          left: "-6%",
          filter: "blur(80px)",
          animation: "orb2 28s ease-in-out infinite",
        }}
      />
      {/* Green orb — center right */}
      <div
        className="absolute rounded-full bg-deep-green/[0.05]"
        style={{
          width: 340,
          height: 340,
          top: "45%",
          right: "15%",
          filter: "blur(56px)",
          animation: "orb3 34s ease-in-out infinite",
        }}
      />
    </div>
  );
}
