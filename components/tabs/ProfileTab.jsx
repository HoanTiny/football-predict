"use client";

import { useState, useEffect, useMemo } from "react";
import { fmt } from "@/lib/constants";
import Icon from "@/components/Icon";

// 8 high-end sports-themed preset SVGs as data URLs
const PRESET_AVATARS = [
  {
    id: "gold-ball",
    name: "Quả bóng vàng",
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="g1" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="%23FFE885"/><stop offset="100%" stop-color="%23F5C518"/></radialGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g1)"/><path d="M50 15L65 35H35L50 15z M20 40L35 35L42.5 55L25 55z M80 40L65 35L57.5 55L75 55z M35 75L42.5 55H57.5L65 75z" fill="%231E293B" opacity="0.85"/></svg>'
  },
  {
    id: "purple-shield",
    name: "Khiên hoàng gia",
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23C084FC"/><stop offset="100%" stop-color="%237C3AED"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g2)"/><path d="M50 20C40 20 30 25 30 35C30 55 50 75 50 80C50 75 70 55 70 35C70 25 60 20 50 20z" fill="white" opacity="0.9"/></svg>'
  },
  {
    id: "orange-trophy",
    name: "Cúp chiến thắng",
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23FDBA74"/><stop offset="100%" stop-color="%23EA580C"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g3)"/><path d="M35 30H65V45C65 53 58 60 50 60C42 60 35 53 35 45V30z M50 60V70 M40 70H60" stroke="white" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.9"/></svg>'
  },
  {
    id: "emerald-star",
    name: "Ngôi sao lục bảo",
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%236EE7B7"/><stop offset="100%" stop-color="%23059669"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g4)"/><polygon points="50,18 59,38 81,38 63,52 70,74 50,60 30,74 37,52 19,38 41,38" fill="white" opacity="0.95"/></svg>'
  },
  {
    id: "sky-fire",
    name: "Ngọn lửa xanh",
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%237DD3FC"/><stop offset="100%" stop-color="%230284C7"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g5)"/><path d="M50 20C50 20 65 35 65 50C65 65 50 80 50 80C50 80 35 65 35 50C35 35 50 20 50 20z" fill="white" opacity="0.9"/></svg>'
  },
  {
    id: "crimson-bolt",
    name: "Tia sét đỏ",
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23FCA5A5"/><stop offset="100%" stop-color="%23DC2626"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g6)"/><polygon points="55,18 35,50 48,50 43,82 65,46 52,46" fill="white" opacity="0.95"/></svg>'
  },
  {
    id: "pink-crown",
    name: "Vương miện hồng",
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g7" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23FBCFE8"/><stop offset="100%" stop-color="%23DB2777"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g7)"/><path d="M25 70L30 35L45 55L50 30L55 55L70 35L75 70H25z" fill="white" opacity="0.95"/></svg>'
  },
  {
    id: "neon-diamond",
    name: "Kim cương ngọc",
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g8" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2399F6E4"/><stop offset="100%" stop-color="%230D9488"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g8)"/><polygon points="50,20 80,45 50,80 20,45" fill="white" opacity="0.95"/></svg>'
  }
];

export default function ProfileTab({ player, updatePlayer, authSession }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const userId = authSession?.user?.id || "guest";

  const [avatar, setAvatar] = useState(player?.avatar || null);

  useEffect(() => {
    // Sync with global profile avatar if available
    try {
      const raw = localStorage.getItem("global_profile_" + userId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.avatar) {
          setAvatar(parsed.avatar);
          if (player && player.avatar !== parsed.avatar && updatePlayer) {
            updatePlayer({ avatar: parsed.avatar });
          }
        }
      }
    } catch {}
  }, [userId, player?.avatar, updatePlayer]);

  const updateAvatarGlobally = (url) => {
    setAvatar(url);
    if (updatePlayer) {
      updatePlayer({ avatar: url });
    }
    try {
      const raw = localStorage.getItem("global_profile_" + userId);
      const prev = raw ? JSON.parse(raw) : {};
      const next = { ...prev, avatar: url };
      localStorage.setItem("global_profile_" + userId, JSON.stringify(next));
      window.dispatchEvent(new Event("profile-update"));
    } catch {}
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert("Dung lượng ảnh tải lên tối đa là 1MB!");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      updateAvatarGlobally(event.target.result);
      setPickerOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const selectPreset = (url) => {
    updateAvatarGlobally(url);
    setPickerOpen(false);
  };

  // Compute prediction stats
  const stats = useMemo(() => {
    const predictions = player?.predictions || [];
    const settled = predictions.filter((p) => p.status !== "pending");
    const won = settled.filter((p) => p.status === "won" || p.status === "refund").length;
    const lost = settled.filter((p) => p.status === "lost").length;
    const accuracy = settled.length ? Math.round((won / settled.length) * 100) : 0;
    
    // Calculate total wagered and total payout
    const totalWagered = predictions.reduce((sum, p) => sum + (p.wager || 0), 0);
    const netGains = settled.reduce((sum, p) => {
      if (p.status === "won") return sum + (p.payout - p.wager);
      if (p.status === "lost") return sum - p.wager;
      return sum; // pending or refund
    }, 0);

    return {
      total: predictions.length,
      settled: settled.length,
      pending: predictions.length - settled.length,
      accuracy,
      won,
      lost,
      totalWagered,
      netGains
    };
  }, [player?.predictions]);

  const initial = (player?.playerName || "?").charAt(0).toUpperCase();

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12 select-none">
      {/* Section Title */}
      <div className="text-center">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#334BFF] mb-1">
          Hồ sơ dự đoán
        </div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
          GAME PROFILE
        </h2>
      </div>

      {/* Main Profile Summary Block */}
      <div className="bg-white/[0.08] border border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] rounded-[28px] p-6 flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar circle */}
        <div className="relative group shrink-0">
          <div className="w-20 h-20 rounded-full border-2 border-white/20 overflow-hidden bg-gradient-to-tr from-[#334bff] to-[#62F2C0] flex items-center justify-center text-2xl font-black text-white uppercase shadow-[0_8px_24px_rgba(98,242,192,0.15)]">
            {avatar ? (
              <img
                src={avatar}
                alt={player?.playerName}
                className="w-full h-full object-cover"
              />
            ) : (
              initial
            )}
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            className="absolute -bottom-1.5 -right-1.5 w-7.5 h-7.5 rounded-full bg-[#334BFF] hover:bg-[#2539cc] border border-white/20 flex items-center justify-center text-white transition-all shadow-md active:scale-90 cursor-pointer"
            title="Đổi ảnh đại diện"
          >
            <Icon name="plus" className="w-4 h-4" />
          </button>
        </div>

        {/* Identity Details */}
        <div className="flex-1 text-center sm:text-left space-y-1">
          <h3 className="text-lg font-black text-white truncate">
            {player?.playerName || "Người chơi"}
          </h3>
          <p className="text-xs text-white/40 font-medium">Chế độ chơi dự đoán</p>
          <div className="pt-2 flex justify-center sm:justify-start">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#62F2C0]/10 border border-[#62F2C0]/25 text-xs font-bold text-[#62F2C0] tabular-nums">
              <Icon name="gem" className="w-3.5 h-3.5 text-[#62F2C0]" />
              {fmt(player?.chips || 0)} Chips
            </span>
          </div>
        </div>
      </div>

      {/* Predictions Stats Section */}
      <div className="bg-white/[0.08] border border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] rounded-[28px] p-5 space-y-4">
        <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#334BFF] uppercase">
          THÀNH TÍCH DỰ ĐOÁN
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-center space-y-1">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Tổng lượt dự đoán</span>
            <span className="text-xl font-black text-white block">{stats.total}</span>
            <span className="text-[10px] text-white/50 block">({stats.settled} đã quyết toán)</span>
          </div>

          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-center space-y-1">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Tỷ lệ chính xác</span>
            <span className="text-xl font-black text-[#62F2C0] block">{stats.accuracy}%</span>
            <span className="text-[10px] text-white/50 block">({stats.won} thắng / {stats.lost} thua)</span>
          </div>

          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-center space-y-1">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Tổng điểm đã cược</span>
            <span className="text-xl font-black text-white block">💎 {fmt(stats.totalWagered)}</span>
          </div>

          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-center space-y-1">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Hiệu số thắng thua</span>
            <span className={`text-xl font-black block ${stats.netGains >= 0 ? "text-[#62F2C0]" : "text-[#ff6b6b]"}`}>
              {stats.netGains >= 0 ? "+" : ""}{fmt(stats.netGains)}
            </span>
          </div>
        </div>
      </div>

      {/* Preset Avatar Selector Modal / Overlay */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPickerOpen(false)}
          />
          {/* Modal Container */}
          <div className="relative w-full max-w-sm rounded-[28px] bg-[#0b1735]/95 border border-white/20 p-5 space-y-4 shadow-2xl animate-scale-up">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider select-none text-center">
              Chọn ảnh đại diện
            </h4>

            {/* Presets Grid */}
            <div className="grid grid-cols-4 gap-3 py-2">
              {PRESET_AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => selectPreset(avatar.url)}
                  className="aspect-square rounded-full overflow-hidden border border-white/10 hover:border-[#62F2C0] transition-colors p-1 cursor-pointer"
                  title={avatar.name}
                >
                  <img src={avatar.url} alt={avatar.name} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>

            {/* Custom upload option */}
            <div className="border-t border-white/10 pt-4 flex flex-col items-center">
              <label className="w-full py-2.5 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/15 transition-all text-xs font-bold text-center cursor-pointer">
                <span>📁 Tải ảnh từ thiết bị</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={() => setPickerOpen(false)}
              className="w-full py-2 rounded-xl text-xs font-bold text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
