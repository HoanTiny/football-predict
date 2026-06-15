"use client";

/**
 * Wrapper quanh lucide-react (https://lucide.dev) — icon line premium, đồng bộ.
 * Giữ API `name` để các nơi gọi không phải đổi. Map tên nội bộ → component Lucide.
 */
import {
  CalendarDays,
  Table,
  ListTree,
  History,
  BarChart3,
  Trophy,
  Tv,
  Gem,
  Users,
  User,
  Plus,
  Settings,
  LineChart,
  Mail,
  LogOut,
  Check,
  ChevronDown,
  Menu,
  MessagesSquare,
  Send,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";

const MAP = {
  calendar: CalendarDays,
  table: Table,
  bracket: ListTree,
  history: History,
  chart: BarChart3,
  trophy: Trophy,
  tv: Tv,
  gem: Gem,
  users: Users,
  user: User,
  plus: Plus,
  settings: Settings,
  activity: LineChart,
  mail: Mail,
  logout: LogOut,
  check: Check,
  chevron: ChevronDown,
  menu: Menu,
  message: MessagesSquare,
  send: Send,
  close: X,
  sound: Volume2,
  mute: VolumeX,
};

export default function Icon({ name, className = "w-4 h-4", strokeWidth = 2 }) {
  const Cmp = MAP[name];
  if (!Cmp) return null;
  return <Cmp className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
