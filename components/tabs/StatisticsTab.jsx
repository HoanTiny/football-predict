"use client";

import { fmt } from "@/lib/constants";

/** NEW StatisticsTab — compact sports-first KPI cards */
export default function StatisticsTab({ player }) {
  const predictions = player.predictions || [];
  const settled = predictions.filter((p) => p.status !== "pending");
  const wins = settled.filter((p) => p.status !== "lost").length;
  const accuracy = settled.length ? Math.round((wins / settled.length) * 100) : 0;
  const perfect = predictions.filter((p) => p.status === "won_exact").length;
  const total = predictions.length;
  const chips = player.chips;

  const kpis = [
    {
      title: "Tổng dự đoán",
      value: total,
      subtext: `${settled.length} trận đã kết thúc`,
      icon: "🎯",
    },
    {
      title: "Tỉ lệ chính xác",
      value: `${accuracy}%`,
      subtext: `${wins} lần đoán trúng kết quả`,
      icon: "📈",
    },
    {
      title: "Đúng tỉ số",
      value: perfect,
      subtext: "Số lần đoán chính xác tỉ số",
      icon: "⭐",
    },
    {
      title: "Số chip hiện có",
      value: `💎 ${fmt(chips)}`,
      subtext: "Dùng để dự đoán các trận đấu",
      icon: "💳",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#334BFF] mb-1">
          THỐNG KÊ CÁ NHÂN
        </div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
          STATISTICS
        </h2>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.title}
            className="match-card p-6 flex flex-col justify-between"
            style={{ minHeight: 140 }}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                {kpi.title}
              </span>
              <span className="text-xl opacity-80">{kpi.icon}</span>
            </div>
            
            <div className="mt-4">
              <div className="text-2xl font-bold text-white tracking-tight leading-none">
                {kpi.value}
              </div>
              <div className="text-[11px] text-white/50 mt-2 font-medium">
                {kpi.subtext}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
