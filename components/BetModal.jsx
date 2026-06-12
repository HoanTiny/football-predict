"use client";

import { useState } from "react";
import { flagOf, flagImgOf, fmt } from "@/lib/constants";
import { vnTime, vnDateHeader } from "@/lib/time";

const renderModalFlag = (teamName) => {
  const imgUrl = flagImgOf(teamName);
  if (imgUrl) {
    return (
      <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-slate-900/50">
        <img
          src={imgUrl}
          alt={teamName}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow bg-slate-900/50 text-[13px] leading-none">
      {flagOf(teamName)}
    </div>
  );
};

function ScoreButton({ value, onChange, label }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-center truncate max-w-[100px]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95 border border-white/5 transition-all"
        >
          −
        </button>
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold bg-[#334BFF]/10 border border-[#334BFF]/25 text-white tabular-nums"
        >
          {value}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(20, value + 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95 border border-white/5 transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function BetModal({ match, chips, onConfirm, onClose, roomBets, prediction, initialTab }) {
  const canEdit = match.status === "SCHEDULED" || match.status === "TIMED";
  const [modalTab, setModalTab] = useState(
    (initialTab === "friends" && (!roomBets || roomBets.length === 0))
      ? (canEdit ? "predict" : "stats")
      : (initialTab || (canEdit ? "predict" : "stats"))
  );
  const homeName = match.homeTeam?.name;
  const awayName = match.awayTeam?.name;

  const firstPred = Array.isArray(prediction) ? prediction[0] : prediction;
  const [home, setHome] = useState(firstPred?.homeGoals ?? 0);
  const [away, setAway] = useState(firstPred?.awayGoals ?? 0);
  const maxWager = Math.max(10, chips);
  const [wager, setWager] = useState(firstPred?.wager ?? Math.min(50, chips));
  const valid = chips >= 10 && wager >= 10 && wager <= chips && home >= 0 && away >= 0;

  const friendBets = (roomBets || []).filter((b) => !b.isMe);
  const kickedOff = new Date(match.utcDate) <= new Date();

  const homeRank = Math.abs((homeName || "").charCodeAt(0) - 50) + 5;
  const awayRank = Math.abs((awayName || "").charCodeAt(0) - 50) + 8;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg glass-strong rounded-2xl p-6 shadow-xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-4 relative z-10 border-b border-white/5 pb-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            {vnDateHeader(match.utcDate)} · {vnTime(match.utcDate)}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg font-bold text-white uppercase tracking-wider w-full mt-2">
            <div className="flex items-center justify-end gap-2 text-right min-w-0">
              <span className="truncate">{homeName}</span>
              {renderModalFlag(homeName)}
            </div>
            <span className="text-xs font-black text-[#334BFF] px-2 shrink-0">VS</span>
            <div className="flex items-center justify-start gap-2 text-left min-w-0">
              {renderModalFlag(awayName)}
              <span className="truncate">{awayName}</span>
            </div>
          </div>

          {/* Modal Tabs */}
          <div className="flex justify-center gap-1.5 sm:gap-2 mt-4 overflow-x-auto scrollbar-none max-w-full pb-1">
            <button
              onClick={() => setModalTab("predict")}
              className={`px-3 sm:px-4 py-1 text-[11px] sm:text-xs font-bold rounded-full transition-all shrink-0 ${
                modalTab === "predict"
                  ? "bg-[#334BFF] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Dự đoán
            </button>
            {roomBets && roomBets.length > 0 && (
              <button
                onClick={() => setModalTab("friends")}
                className={`px-3 sm:px-4 py-1 text-[11px] sm:text-xs font-bold rounded-full transition-all shrink-0 ${
                  modalTab === "friends"
                    ? "bg-[#334BFF] text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Bạn bè ({roomBets.length})
              </button>
            )}
            <button
              onClick={() => setModalTab("stats")}
              className={`px-3 sm:px-4 py-1 text-[11px] sm:text-xs font-bold rounded-full transition-all shrink-0 ${
                modalTab === "stats"
                  ? "bg-[#334BFF] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Chi tiết trận đấu
            </button>
          </div>
        </div>

        {/* Tab 1: Predict Form */}
        {modalTab === "predict" && (
          <div className="space-y-5">
            {!canEdit ? (
              <div className="bg-[#0B1735]/40 border border-white/5 rounded-xl p-6 text-center space-y-4">
                <span className="text-3xl block">🔒</span>
                <div className="text-sm font-bold text-white">Đã Khóa Dự Đoán</div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Trận đấu này đã bắt đầu hoặc kết thúc. Bạn không thể tạo hoặc chỉnh sửa dự đoán nữa.
                </p>
                {prediction && prediction.length > 0 ? (
                  <div className="space-y-2.5 max-w-xs mx-auto w-full">
                    <span className="text-[10px] font-bold text-[#7b8fff] uppercase tracking-wider block">Dự đoán của bạn ({prediction.length})</span>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {prediction.map((p, pIdx) => (
                        <div key={pIdx} className="inline-flex flex-col items-center gap-1 bg-[#334BFF]/10 border border-[#334BFF]/25 rounded-xl px-4 py-2 shrink-0">
                          <span className="text-sm font-black text-white">{p.homeGoals} – {p.awayGoals}</span>
                          <span className="text-[9px] text-slate-400 font-bold">Đặt cược: 💎{p.wager}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-2">Bạn đã không đặt cược cho trận đấu này.</div>
                )}
                <button
                  onClick={onClose}
                  className="btn-secondary w-full py-2.5 rounded-lg text-xs font-bold mt-2"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <>
                {/* Score inputs */}
                <div className="flex items-center justify-center gap-4">
                  <ScoreButton value={home} onChange={setHome} label={homeName} />
                  <div className="text-xl font-bold text-slate-600 self-end mb-2">:</div>
                  <ScoreButton value={away} onChange={setAway} label={awayName} />
                </div>

                {/* Existing predictions list */}
                {prediction && prediction.length > 0 && (
                  <div className="bg-[#0B1735]/40 border border-white/5 rounded-xl p-3.5 space-y-2">
                    <span className="text-[10px] font-bold text-[#7b8fff] uppercase tracking-wide block">
                      Các cược đã chốt cho trận này ({prediction.length})
                    </span>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {prediction.map((p, pIdx) => (
                        <div key={pIdx} className="inline-flex items-center gap-2 bg-[#334BFF]/10 border border-[#334BFF]/25 px-3 py-1 rounded-lg text-xs font-semibold text-white shrink-0">
                          <span>{p.homeGoals} – {p.awayGoals}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-[#62F2C0] font-bold">💎{fmt(p.wager)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wager slider */}
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium whitespace-nowrap">Số chips muốn cược: </span>
                      <div className="relative flex items-center">
                        <span className="absolute left-2 text-slate-400 text-[10px] pointer-events-none">💎</span>
                        <input
                          type="number"
                          min="10"
                          max={chips}
                          value={wager || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setWager(isNaN(val) ? 0 : val);
                          }}
                          onBlur={() => {
                            const clamped = Math.max(10, Math.min(chips, wager || 10));
                            setWager(clamped);
                          }}
                          className="glass-input w-20 pl-6 pr-1.5 py-1 text-xs font-bold text-center text-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <span className="text-slate-300 whitespace-nowrap">
                      Số dư: <span className="font-bold text-[#62F2C0]">💎 {fmt(chips)}</span>
                    </span>
                  </div>
                  <input
                    type="range" min="10" max={maxWager} step="10" value={wager}
                    onChange={(e) => setWager(parseInt(e.target.value, 10))}
                    className="w-full mb-3"
                    style={{ accentColor: "#334BFF" }}
                  />
                  <div className="flex gap-2 justify-center">
                    {[25, 50, 100, 200].filter(v => v <= chips).map(v => (
                      <button
                        key={v}
                        onClick={() => setWager(Math.min(chips, v))}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          wager === v
                            ? "bg-[#334BFF]/20 border border-[#334BFF] text-[#7b8fff]"
                            : "bg-slate-800/40 border border-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        {fmt(v)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reward table */}
                <div className="bg-[#0B1735] border border-white/5 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">🎯 Đúng tỉ số</span>
                    <span className="font-bold text-[#62F2C0]">+{fmt(wager * 3)} 💎 <span className="opacity-60 font-normal">(x3)</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">✅ Đúng kết quả</span>
                    <span className="font-bold text-[#7b8fff]">+{fmt(wager)} 💎 <span className="opacity-60 font-normal">(x1)</span></span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span className="text-slate-400 font-medium">❌ Sai</span>
                    <span className="font-bold text-[#ff5a5a]">−{fmt(wager)} 💎</span>
                  </div>
                </div>

                {/* Current wager display */}
                <div className="text-center font-bold text-base text-[#334BFF]">
                  Đặt cược: 💎 {fmt(wager)}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={onClose}
                    className="btn-secondary flex-1 py-2.5 rounded-lg text-xs font-bold"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={() => valid && onConfirm({ matchId: match.id, homeGoals: home, awayGoals: away, wager })}
                    disabled={!valid}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-xs ${valid ? "btn-primary" : "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"}`}
                  >
                    Xác nhận
                  </button>
                </div>
                {chips < 10 && (
                  <div className="text-center text-xs text-[#ff5a5a] font-medium">
                    Không đủ chip để đặt cược (tối thiểu 10 💎)
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Friends Bets */}
        {modalTab === "friends" && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin text-xs text-slate-300">
            <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-[#7b8fff] uppercase tracking-wide block border-b border-white/5 pb-2 mb-2">
                Danh sách dự đoán trong phòng ({roomBets?.length || 0} người)
              </span>
              {roomBets && roomBets.length > 0 ? (
                <div className="space-y-3 divide-y divide-white/5">
                  {roomBets.map((b, idx) => (
                    <div
                      key={b.playerName}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-slate-400 ${
                        idx > 0 ? "pt-3" : ""
                      }`}
                    >
                      {/* Left: Player Name & Status Indicator */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.isMe ? "bg-[#62F2C0]" : "bg-[#334BFF]"}`} />
                        <span className="font-semibold text-white truncate text-xs sm:text-sm">
                          {b.playerName}
                        </span>
                        {b.isMe && (
                          <span className="shrink-0 text-[8px] sm:text-[9px] bg-[#62F2C0]/10 text-[#62F2C0] border border-[#62F2C0]/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            Bạn
                          </span>
                        )}
                      </div>

                      {/* Right: Score Predict & Wager badges */}
                      <div className="flex items-center gap-2 pl-3.5 sm:pl-0 self-start sm:self-auto flex-wrap">
                        {/* Score Predict Pill */}
                        <div className="flex items-center gap-1.5 bg-[#334BFF]/10 border border-[#334BFF]/20 px-2 py-0.5 rounded text-[10px] sm:text-xs">
                          <span className="text-slate-400 text-[9px] sm:text-[10px]">Dự đoán:</span>
                          <strong className="text-white font-extrabold tabular-nums font-mono">
                            {b.homeGoals}–{b.awayGoals}
                          </strong>
                        </div>

                        {/* Wager Pill */}
                        <div className="flex items-center gap-1 bg-[#62F2C0]/10 border border-[#62F2C0]/20 px-2 py-0.5 rounded text-[10px] sm:text-xs">
                          <span className="text-slate-400 text-[9px] sm:text-[10px]">Cược:</span>
                          <span className="font-bold text-[#62F2C0] tabular-nums font-mono flex items-center gap-0.5">
                            <span>💎</span>
                            {fmt(b.wager)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 italic py-4 text-center">
                  Chưa có bạn bè nào trong phòng đặt cược.
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="btn-secondary w-full py-2.5 rounded-lg text-xs font-bold"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Tab 3: Stats Details */}
        {modalTab === "stats" && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin text-xs text-slate-300">
            {/* FIFA Rankings & Form */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-3 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">BXH FIFA</span>
                <div className="flex justify-between items-center text-white font-bold">
                  <span>{homeName}: #{homeRank}</span>
                  <span>{awayName}: #{awayRank}</span>
                </div>
              </div>
              <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-3 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Phong độ 5 trận</span>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-[#62F2C0]">W W L D W</span>
                  <span className="text-[#ff5a5a]">L D W L D</span>
                </div>
              </div>
            </div>

            {/* Stadium, Referee, Weather */}
            <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Thông tin sân & điều kiện</span>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-slate-400">🏟 Sân đấu:</span>
                  <span className="font-semibold text-white">MetLife Stadium</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-slate-400">☀️ Thời tiết:</span>
                  <span className="font-semibold text-white">22°C (Clear Sky)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">🏁 Trọng tài:</span>
                  <span className="font-semibold text-white">Sandro Schärer</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">📍 Thành phố:</span>
                  <span className="font-semibold text-white">New York</span>
                </div>
              </div>
            </div>

            {/* Head to Head (H2H) */}
            <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Lịch sử đối đầu (H2H)</span>
              <div className="space-y-1 text-slate-400 font-medium">
                <div className="flex justify-between">
                  <span>World Cup 2022</span>
                  <span className="text-white font-bold">{homeName} 2 - 1 {awayName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Giao hữu 2021</span>
                  <span className="text-white font-bold">{homeName} 0 - 0 {awayName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Giao hữu 2018</span>
                  <span className="text-white font-bold">{homeName} 1 - 2 {awayName}</span>
                </div>
              </div>
            </div>

            {/* Prediction Distribution (Community Picks) */}
            <div className="bg-[#0B1735]/60 border border-white/5 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tỉ lệ lựa chọn cộng đồng</span>
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-white text-[10px]">
                  <span>Thắng ({homeName}): 65%</span>
                  <span>Hòa: 20%</span>
                  <span>Thắng ({awayName}): 15%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800">
                  <div className="bg-[#334BFF] h-full" style={{ width: "65%" }} />
                  <div className="bg-slate-500 h-full" style={{ width: "20%" }} />
                  <div className="bg-[#FFA07A] h-full" style={{ width: "15%" }} />
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="btn-secondary w-full py-2.5 rounded-lg text-xs font-bold"
            >
              Đóng chi tiết
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
