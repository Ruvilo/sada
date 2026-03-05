import type { IconType } from "react-icons";

// en SADAIcons agrega:
import {
  LuChevronDown,
  LuChevronRight,
  LuLayoutDashboard,
  LuClipboardList,
  LuUpload,
  LuCalendarClock,
  LuUsers,
  LuHistory,
  LuSettings,
  LuSearch,
  LuFilter,
  LuPlus,
  LuDownload,
  LuArrowRight,
  LuBookmark,
  LuBookmarkCheck,
  LuPencil,
  LuTrash2,
  LuRefreshCw,
  LuX,
  LuCircleCheck,
  LuClock3,
  LuCircleX,
  LuInfo,
  LuBan,
  LuUserX,
  LuBadgeCheck,
  LuTimer,
  LuLogOut,
  LuList,
  LuFileUp,
  LuCalendarArrowUp,
  LuUserPlus,
  LuFileSpreadsheet,
  LuListChecks,
  LuTriangleAlert,
  LuCircleHelp,
} from "react-icons/lu";

export const SADAIcons: Record<string, IconType> = {
  // Sidebar
  dashboard: LuLayoutDashboard,
  attendance: LuClipboardList,
  imports: LuUpload,
  schedules: LuCalendarClock,
  employees: LuUsers,
  reports: LuFileSpreadsheet,
  history: LuHistory,
  settings: LuSettings,
  help: LuCircleHelp,

  // Actions
  search: LuSearch,
  filter: LuFilter,
  plus: LuPlus,
  download: LuDownload,
  arrowRight: LuArrowRight,
  bookmark: LuBookmark,
  bookmarkActive: LuBookmarkCheck,
  edit: LuPencil,
  delete: LuTrash2,
  refresh: LuRefreshCw,
  close: LuX,
  chevronDown: LuChevronDown,
  chevronRight: LuChevronRight,

  // States
  success: LuCircleCheck,
  pending: LuClock3,
  error: LuCircleX,
  info: LuInfo,
  disabled: LuBan,

  // Attendance semantic
  absent: LuUserX,
  onTime: LuBadgeCheck,
  late: LuTimer,
  earlyExit: LuLogOut,
  all: LuList,

  // Imports semantic
  fileUp: LuFileUp,
  calendar: LuCalendarArrowUp,
  userPlus: LuUserPlus,
  spreadsheet: LuFileSpreadsheet,
  validation: LuListChecks,
  rowError: LuTriangleAlert,
} as const;

export type SADAIconName = keyof typeof SADAIcons;