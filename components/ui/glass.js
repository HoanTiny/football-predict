// Preset class dùng chung cho toàn app — "liquid glass" indigo (AppShell/HomeTab/Leagues).
// Sửa 1 chỗ ở đây → cập nhật toàn bộ. Import: `import { GLASS_CARD, ... } from "@/components/ui/glass"`.

// Card nội dung (mặc định — mọi thẻ trận, khối thống kê, section trắng mờ).
export const GLASS_CARD =
  "rounded-2xl bg-white/[0.08] border border-white/15 backdrop-blur-xl " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_18px_rgba(0,0,0,0.15)]";

// Card lớn/nổi bật (hero, panel chính, bảng xếp hạng…). Bo góc + blur mạnh hơn.
export const GLASS_CARD_LG =
  "rounded-[24px] bg-white/[0.09] border border-white/[0.18] backdrop-blur-2xl " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_32px_rgba(0,0,0,0.22)]";

// Card "chồng chéo" trên card khác (modal, popover) — đục hơn để tách khỏi nền.
export const GLASS_SURFACE =
  "rounded-2xl bg-white/[0.12] border border-white/20 backdrop-blur-2xl " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_32px_rgba(0,0,0,0.3)]";

// Hàng trận, list item — phẳng nhẹ, hover ấm lên.
export const GLASS_ROW =
  "rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md " +
  "transition-colors hover:bg-white/[0.1]";

// Container pill (thanh tab, nhóm nút toggle) — nền glass + inner shadow.
export const GLASS_PILL_WRAP =
  "flex items-center gap-0.5 p-1 rounded-full bg-white/10 border border-white/20 " +
  "backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]";

// Một item bên trong pill wrap.
export const GLASS_PILL_ITEM_ACTIVE =
  "bg-white/25 text-white";
export const GLASS_PILL_ITEM_IDLE =
  "text-white/60 hover:text-white/85";
export const GLASS_PILL_ITEM_BASE =
  "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer";

// Input (ô số, ô text) — nền tối nhẹ, viền glass, focus ring indigo.
export const GLASS_INPUT =
  "rounded-2xl bg-black/25 border border-white/15 backdrop-blur-xl " +
  "focus-within:border-[#7b8fff] focus-within:shadow-[0_0_18px_rgba(123,143,255,0.25)] " +
  "transition-all";

// Button primary (CTA "Dự đoán ngay", "Xác nhận"…) — indigo đậm nổi bật trên nền glass.
export const GLASS_BTN_PRIMARY =
  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white " +
  "bg-gradient-to-b from-[#5b6bff] to-[#3a48d6] border border-white/20 " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_14px_rgba(58,72,214,0.4)] " +
  "hover:from-[#6a79ff] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed";

// Button ghost (secondary — huỷ, phụ trợ).
export const GLASS_BTN_GHOST =
  "px-4 py-2 rounded-xl text-xs font-bold text-white/80 " +
  "bg-white/10 border border-white/15 backdrop-blur-xl " +
  "hover:bg-white/[0.18] hover:text-white active:scale-[0.98] transition-all";

// Button danger (rời phòng, huỷ cược cuối).
export const GLASS_BTN_DANGER =
  "px-4 py-2 rounded-xl text-xs font-bold text-[#ff8a8a] " +
  "bg-[#ff5a5a]/10 border border-[#ff5a5a]/30 backdrop-blur-xl " +
  "hover:bg-[#ff5a5a]/20 hover:text-white active:scale-[0.98] transition-all";

// Chip / badge nhỏ (trạng thái, tag). Có 3 tone: neutral, live, mint (win).
export const GLASS_CHIP_NEUTRAL =
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider " +
  "bg-white/10 border border-white/15 text-white/70";
export const GLASS_CHIP_LIVE =
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider " +
  "bg-[#ff5a5a]/15 border border-[#ff5a5a]/30 text-[#ff8a8a]";
export const GLASS_CHIP_WIN =
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider " +
  "bg-[#62F2C0]/15 border border-[#62F2C0]/30 text-[#8fffc9]";

// Nhãn section (chữ nhỏ, uppercase, mờ) — dùng đầu mỗi khối.
export const SECTION_LABEL =
  "text-[10px] font-bold text-white/50 uppercase tracking-widest";
