"use client";

import { useState, useEffect } from "react";
import { LEAGUES, teamLogo } from "@/lib/leagues";
import { useFavTeams } from "@/hooks/useFavTeams";
import Icon from "@/components/Icon";
import AuthModal from "@/components/AuthModal";
import PushToggle from "@/components/PushToggle";

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

const POPULAR_TEAMS = [
  { id: "8633", name: "Real Madrid", leagueId: 87 },
  { id: "8634", name: "Barcelona", leagueId: 87 },
  { id: "10260", name: "Man United", leagueId: 47 },
  { id: "8457", name: "Man City", leagueId: 47 },
  { id: "8650", name: "Liverpool", leagueId: 47 },
  { id: "9825", name: "Arsenal", leagueId: 47 },
  { id: "8455", name: "Chelsea", leagueId: 47 },
  { id: "9823", name: "Bayern Munich", leagueId: 54 },
  { id: "9847", name: "PSG", leagueId: 53 },
  { id: "9885", name: "Juventus", leagueId: 55 },
  { id: "8564", name: "AC Milan", leagueId: 55 },
  { id: "8636", name: "Inter Milan", leagueId: 55 },
];

export default function CalendarProfileView({ onClose, authSession }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { teams: favTeams, isFav, toggle } = useFavTeams();

  const userId = authSession?.user?.id || "guest";
  
  const [profile, setProfile] = useState({ avatar: null, followedLeagues: [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("global_profile_" + userId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setProfile({
            avatar: parsed.avatar || null,
            followedLeagues: Array.isArray(parsed.followedLeagues) ? parsed.followedLeagues : []
          });
        }
      }
    } catch {}
  }, [userId]);

  const updateProfile = (fields) => {
    setProfile((prev) => {
      const current = prev || { avatar: null, followedLeagues: [] };
      const next = { ...current, ...fields };
      localStorage.setItem("global_profile_" + userId, JSON.stringify(next));
      window.dispatchEvent(new Event("profile-update"));
      return next;
    });
  };

  const followedLeagues = profile?.followedLeagues || [];
  const isLeagueFollowed = (id) => followedLeagues.includes(id);

  const toggleLeague = (id) => {
    const next = isLeagueFollowed(id)
      ? followedLeagues.filter((x) => x !== id)
      : [...followedLeagues, id];
    updateProfile({ followedLeagues: next });
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
      updateProfile({ avatar: event.target.result });
      setPickerOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const selectPreset = (url) => {
    updateProfile({ avatar: url });
    setPickerOpen(false);
  };

  const initial = (authSession?.user?.email || "Guest").charAt(0).toUpperCase();

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12 select-none">
      {/* Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors cursor-pointer"
        >
          ‹
        </button>
        <h2 className="text-sm font-black text-white">★ Trang cá nhân</h2>
      </div>

      {/* Main Profile Summary Block */}
      <div className="bg-white/[0.08] border border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] rounded-[28px] p-6 flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar circle */}
        <div className="relative group shrink-0">
          <div className="w-20 h-20 rounded-full border-2 border-white/20 overflow-hidden bg-gradient-to-tr from-[#334bff] to-[#62F2C0] flex items-center justify-center text-2xl font-black text-white uppercase shadow-[0_8px_24px_rgba(98,242,192,0.15)]">
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt="Profile Avatar"
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
            {authSession?.user?.email ? authSession.user.email.split("@")[0] : "Khách"}
          </h3>
          {authSession?.user?.email ? (
            <p className="text-xs text-white/50 truncate flex items-center justify-center sm:justify-start gap-1.5">
              <Icon name="mail" className="w-3.5 h-3.5 text-white/40" />
              {authSession.user.email}
            </p>
          ) : (
            <p className="text-xs text-white/40 italic">Đăng nhập để lưu lịch sử và đồng bộ</p>
          )}
        </div>
      </div>

      {/* Followed Leagues (Giải đấu theo dõi) */}
      <div className="bg-white/[0.08] border border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] rounded-[28px] p-5 space-y-4">
        <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#334BFF] uppercase">
          GIẢI ĐẤU THEO DÕI
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LEAGUES.map((league) => {
            const followed = isLeagueFollowed(league.id);
            return (
              <button
                key={league.id}
                onClick={() => toggleLeague(league.id)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  followed
                    ? "bg-white/10 border-white/15 text-white shadow-sm"
                    : "bg-white/[0.03] border-white/5 text-white/50 hover:bg-white/[0.06]"
                }`}
              >
                <span className="text-xs font-bold whitespace-nowrap leading-none">
                  {league.name}
                </span>
                <span
                  className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${
                    followed ? "bg-[#62F2C0]" : "bg-white/10"
                  } flex items-center`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      followed ? "translate-x-3.5" : "translate-x-0"
                    } shadow-sm`}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Followed Teams (Đội bóng yêu thích) */}
      <div className="bg-white/[0.08] border border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] rounded-[28px] p-5 space-y-4">
        <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#334BFF] uppercase">
          ĐỘI BÓNG YÊU THÍCH
        </h3>

        {!authSession ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-xs text-white/50 max-w-xs mx-auto leading-relaxed">
              Vui lòng đăng nhập để theo dõi và đồng bộ các câu lạc bộ bóng đá yêu thích của bạn.
            </p>
            <button
              onClick={() => setAuthOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#334BFF] hover:bg-[#2539cc] text-white transition-colors cursor-pointer"
            >
              Đăng nhập tài khoản
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current followed teams row */}
            {favTeams.length === 0 ? (
              <p className="text-xs text-white/45 italic py-1">
                Chưa chọn đội bóng yêu thích. Bấm chọn nhanh các câu lạc bộ nổi tiếng bên dưới:
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pb-1.5 border-b border-white/10">
                {favTeams.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-1.5 pl-2 pr-1.5 py-1.5 rounded-full bg-[#62F2C0]/10 border border-[#62F2C0]/25"
                  >
                    <img src={teamLogo(t.id)} alt={t.name} className="w-4 h-4 object-contain" />
                    <span className="text-[10px] font-bold text-[#62F2C0]">{t.name}</span>
                    <button
                      onClick={() => toggle(t)}
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors text-[9px] cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Add Grid */}
            <div className="space-y-2">
              <label className="block text-[10px] text-white/50 font-bold uppercase tracking-wider">
                Gợi ý CLB nổi tiếng
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {POPULAR_TEAMS.map((team) => {
                  const active = isFav(team.id);
                  return (
                    <button
                      key={team.id}
                      onClick={() => toggle(team)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? "bg-white/10 border-white/15 text-white"
                          : "bg-white/[0.03] border-white/5 text-white/60 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <img src={teamLogo(team.id)} alt={team.name} className="w-5 h-5 object-contain" />
                      <span className="text-[10px] font-bold truncate leading-none">
                        {team.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Thông báo (Push Toggle) */}
      <div className="bg-white/[0.08] border border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] rounded-[28px] p-5 space-y-4">
        <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#334BFF] uppercase">
          THÔNG BÁO
        </h3>
        <PushToggle authSession={authSession} />
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

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
