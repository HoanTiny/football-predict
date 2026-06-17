"use client";

// Trang demo tạm — xem giao diện LineupPitch với dữ liệu mẫu.
// Có thể xoá khi không còn cần.
import LineupPitch from "@/components/LineupPitch";

const MOCK = {
  home: {
    team: "USA",
    teamId: 1,
    formation: "4-2-3-1",
    coach: "Mauricio Pochettino",
    startXI: [
      { number: 1, name: "M. Freese", pos: "G", grid: "1:1" },
      { number: 3, name: "A. Robinson", pos: "D", grid: "2:1" },
      { number: 13, name: "T. Ream", pos: "D", grid: "2:2" },
      { number: 22, name: "M. McKenzie", pos: "D", grid: "2:3" },
      { number: 21, name: "T. Weah", pos: "D", grid: "2:4" },
      { number: 11, name: "T. Tessmann", pos: "M", grid: "3:1" },
      { number: 15, name: "J. Cardoso", pos: "M", grid: "3:2" },
      { number: 10, name: "C. Pulisic", pos: "M", grid: "4:1" },
      { number: 8, name: "W. McKennie", pos: "M", grid: "4:2" },
      { number: 17, name: "M. Tillman", pos: "M", grid: "4:3" },
      { number: 20, name: "F. Balogun", pos: "F", grid: "5:1" },
    ],
    substitutes: [
      { number: 4, name: "C. Roldan", pos: "M" },
      { number: 18, name: "M. Arfsten", pos: "D" },
      { number: 14, name: "S. Berhalter", pos: "M" },
      { number: 9, name: "J. Pepi", pos: "F" },
      { number: 12, name: "P. Schulte", pos: "G" },
    ],
  },
  away: {
    team: "Paraguay",
    teamId: 2,
    formation: "4-4-2",
    coach: "Gustavo Alfaro",
    startXI: [
      { number: 1, name: "A. Silva", pos: "G", grid: "1:1" },
      { number: 2, name: "G. Gómez", pos: "D", grid: "2:1" },
      { number: 4, name: "F. Balbuena", pos: "D", grid: "2:2" },
      { number: 14, name: "O. Alderete", pos: "D", grid: "2:3" },
      { number: 6, name: "J. Espinoza", pos: "D", grid: "2:4" },
      { number: 8, name: "M. Almirón", pos: "M", grid: "3:1" },
      { number: 5, name: "A. Cubas", pos: "M", grid: "3:2" },
      { number: 11, name: "D. Galeano", pos: "M", grid: "3:3" },
      { number: 7, name: "J. Ramírez", pos: "M", grid: "3:4" },
      { number: 9, name: "A. Sanabria", pos: "F", grid: "4:1" },
      { number: 19, name: "J. Enciso", pos: "F", grid: "4:2" },
    ],
    substitutes: [],
  },
};

export default function LineupDemo() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #06101e 0%, #08142d 100%)",
        padding: "24px 16px 64px",
      }}
    >
      <div className="w-full max-w-md lg:max-w-5xl mx-auto flex flex-col gap-4">
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.25em",
              color: "#62F2C0",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            FIFA World Cup 2026
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Demo · Đội hình ra sân
          </h1>
          <p style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", marginTop: 6 }}>
            Dữ liệu mẫu (USA 4-2-3-1 vs Paraguay 4-4-2)
          </p>
        </div>
        <LineupPitch lineups={MOCK} />
      </div>
    </div>
  );
}
