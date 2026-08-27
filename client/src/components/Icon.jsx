// Central icon component — maps legacy Material Symbols names to Lucide
// (premium open-source icon set) so the whole app uses one consistent pack.
import {
  Wallet, Plus, ShieldCheck, ChartColumn, Building2, ArrowLeft, ArrowRight,
  Landmark, Zap, Calendar, Check, CircleCheckBig, X, LayoutDashboard,
  FileText, Download, Trophy, CircleAlert, CalendarCheck, Scan, Gavel,
  Handshake, ShieldPlus, House, Hourglass, UserPlus, Inbox, ChartLine,
  Languages, Medal, ListChecks, Flame, MapPin, Lock, LogOut, Menu, Bell,
  IndianRupee, Timer, Percent, User, UserX, UserSearch, LoaderCircle,
  QrCode, CircleDot, TriangleAlert, Save, Clock, GraduationCap, Sparkles,
  Wrench, Ellipsis, Search, Send, Settings, Star, SquareCheckBig,
  TrendingUp, Undo2, Upload, BadgeCheck, Award, HardHat, Phone, Mail,
  IdCard,
  Eye,
  EyeOff,
  MailCheck,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import { AIIcon, AIChipIcon } from './AIIcon';

const MAP = {
  ai: AIIcon,
  auto_awesome: AIIcon,
  smart_toy: AIIcon,
  psychology: AIIcon,
  brain: AIIcon,
  chip: AIChipIcon,
  account_balance_wallet: Wallet,
  add: Plus,
  admin_panel_settings: ShieldCheck,
  analytics: ChartColumn,
  apartment: Building2,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  assured_workload: Landmark,
  badge: IdCard,
  bolt: Zap,
  calendar_today: Calendar,
  call: Phone,
  check: Check,
  check_circle: CircleCheckBig,
  cleaning_services: Sparkles,
  close: X,
  dashboard: LayoutDashboard,
  description: FileText,
  domain: Building2,
  domain_add: Building2,
  download: Download,
  emoji_events: Trophy,
  engineering: HardHat,
  error: CircleAlert,
  event_available: CalendarCheck,
  fingerprint: Scan,
  gavel: Gavel,
  handshake: Handshake,
  handyman: Wrench,
  health_and_safety: ShieldPlus,
  home: House,
  hourglass_top: Hourglass,
  how_to_reg: UserPlus,
  inbox: Inbox,
  insights: ChartLine,
  language: Languages,
  leaderboard: Medal,
  list_alt: ListChecks,
  local_fire_department: Flame,
  location_on: MapPin,
  lock: Lock,
  logout: LogOut,
  mail: Mail,
  menu: Menu,
  more_horiz: Ellipsis,
  notifications: Bell,
  payments: IndianRupee,
  pending_actions: Timer,
  percent: Percent,
  person: User,
  person_off: UserX,
  person_search: UserSearch,
  progress_activity: LoaderCircle,
  qr_code_2: QrCode,
  radio_button_checked: CircleDot,
  report_problem: TriangleAlert,
  save: Save,
  schedule: Clock,
  school: GraduationCap,
  search: Search,
  security: ShieldCheck,
  send: Send,
  settings: Settings,
  star: Star,
  task_alt: SquareCheckBig,
  trending_up: TrendingUp,
  undo: Undo2,
  upload: Upload,
  verified: BadgeCheck,
  verified_user: ShieldCheck,
  visibility: Eye,
  visibility_off: EyeOff,
  workspace_premium: Award,
  mark_email_read: MailCheck,
  refresh: RefreshCw,
  gpp_maybe: ShieldAlert,
};

export default function Icon({ name, className = "", strokeWidth = 2, ...rest }) {
  const Cmp = MAP[name] || CircleDot;
  // Preserve legacy sizing written as text-[Npx] utility classes
  const m = /text-\[(\d+)px\]/.exec(className);
  const size = m ? Number(m[1]) : 24;
  return (
    <Cmp
      className={className.replace(/(^|\s)material-symbols-outlined(\s|$)/g, "$1").trim()}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      {...rest}
    />
  );
}