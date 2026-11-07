export type Role = 'ADMIN' | 'MANAGER' | 'SECRETARY' | 'STAFF';

export type StaffLevel =
  | 'LEVEL_1_MANAGER'   // Cấp 1: Quản Lý (Ban Giám Đốc / Trưởng phòng - Toàn quyền điều hành, phân quyền, giao dự án)
  | 'LEVEL_2_SECRETARY' // Cấp 2: Nhân Viên Điều Phối (Lên lịch làm việc cả team, giao việc hằng ngày, đồng nhận báo cáo, xuất file Excel)
  | 'LEVEL_3_LEAD'      // Cấp 3: Giám Sát (Giám sát thi công hiện trường, quản lý tổ đội, nộp báo cáo)
  | 'LEVEL_4_STAFF';    // Cấp 4: Nhân Viên (Kỹ thuật viên / Thực hiện trực tiếp)

export interface UserPermissions {
  canAssignTasks: boolean;       // Giao dự án / việc lớn
  canAssignDailyTasks: boolean;  // Nhân Viên Điều Phối / Quản lý giao việc hằng ngày
  canReviewReports: boolean;     // Duyệt báo cáo nghiệm thu
  canManagePermissions: boolean; // Phân quyền cấp độ nhân sự (chỉ Quản lý)
  canManageSchedule?: boolean;   // Lên lịch làm việc và phân ca cho cả team
}

export type ShiftId = string;

export interface ShiftInfo {
  id: ShiftId;
  name: string;
  timeRange: string;
  startTime?: string; // HH:mm, e.g. "07:30"
  endTime?: string;   // HH:mm, e.g. "16:00"
  badge: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotColor: string;
  shortName: string;
  isSystem?: boolean;
  hasNoTime?: boolean; // Chế độ nghỉ hoặc ca không ghi mốc thời gian
}

export const DEFAULT_SHIFTS: ShiftInfo[] = [
  {
    id: 'HANH_CHINH',
    name: 'Ca Hành Chính',
    timeRange: '7h30 - 16h',
    startTime: '07:30',
    endTime: '16:00',
    badge: 'bg-blue-100 text-blue-950 border-blue-400 font-bold',
    bgClass: 'bg-blue-50/80',
    textClass: 'text-blue-950 font-bold',
    borderClass: 'border-blue-300',
    dotColor: 'bg-blue-600',
    shortName: 'Hành Chính',
    isSystem: true,
  },
  {
    id: 'CA_1',
    name: 'Ca 1',
    timeRange: '6h - 14h',
    startTime: '06:00',
    endTime: '14:00',
    badge: 'bg-amber-100 text-amber-950 border-amber-400 font-bold',
    bgClass: 'bg-amber-50/80',
    textClass: 'text-amber-950 font-bold',
    borderClass: 'border-amber-300',
    dotColor: 'bg-amber-500',
    shortName: 'Ca 1',
    isSystem: true,
  },
  {
    id: 'CA_2',
    name: 'Ca 2',
    timeRange: '14h - 22h',
    startTime: '14:00',
    endTime: '22:00',
    badge: 'bg-indigo-100 text-indigo-950 border-indigo-400 font-bold',
    bgClass: 'bg-indigo-50/80',
    textClass: 'text-indigo-950 font-bold',
    borderClass: 'border-indigo-300',
    dotColor: 'bg-indigo-600',
    shortName: 'Ca 2',
    isSystem: true,
  },
  {
    id: 'CA_3',
    name: 'Ca 3',
    timeRange: '22h - 6h',
    startTime: '22:00',
    endTime: '06:00',
    badge: 'bg-purple-900 text-purple-50 border-purple-950 font-bold shadow-xs',
    bgClass: 'bg-purple-900/15',
    textClass: 'text-purple-950 font-bold',
    borderClass: 'border-purple-300',
    dotColor: 'bg-purple-700',
    shortName: 'Ca 3',
    isSystem: true,
  },
  {
    id: 'OFF',
    name: 'Nghỉ Ca',
    timeRange: 'Nghỉ ca',
    startTime: undefined,
    endTime: undefined,
    badge: 'bg-slate-200 text-slate-800 border-slate-300 font-bold',
    bgClass: 'bg-slate-100/70',
    textClass: 'text-slate-700 font-bold',
    borderClass: 'border-slate-300',
    dotColor: 'bg-slate-500',
    shortName: 'Nghỉ',
    isSystem: true,
    hasNoTime: true,
  },
  {
    id: 'CA_1794034335936',
    name: 'Ca Buggy',
    timeRange: '7h - 15h30',
    startTime: '07:00',
    endTime: '15:30',
    badge: 'bg-rose-100 text-rose-950 border-rose-400 font-bold',
    bgClass: 'bg-rose-50/80',
    textClass: 'text-rose-950 font-bold',
    borderClass: 'border-rose-300',
    dotColor: 'bg-rose-500',
    shortName: 'Buggy',
    isSystem: false,
  },
];

// Chế độ nghỉ nửa ngày dành riêng cho Cấp 2 Điều Phối & Quản lý khi sắp lịch
export const OFF_HALF_INFO: ShiftInfo = {
  id: 'OFF_HALF',
  name: 'Nghỉ Nửa Ngày',
  timeRange: 'Nghỉ 1/2',
  badge: 'bg-amber-100 text-amber-950 border-amber-400 font-bold',
  bgClass: 'bg-amber-50/80',
  textClass: 'text-amber-950 font-bold',
  borderClass: 'border-amber-300',
  dotColor: 'bg-amber-500',
  shortName: 'Nghỉ 1/2',
  isSystem: true,
  hasNoTime: true,
};

export const SHIFTS_CONFIG: Record<string, ShiftInfo> = {
  ...DEFAULT_SHIFTS.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {} as Record<string, ShiftInfo>),
  OFF_HALF: OFF_HALF_INFO,
};

export interface WorkShiftAssignment {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  shiftId: ShiftId;
  isHalfDay?: boolean; // Nghỉ nửa ngày (vẫn làm ca được chọn nhưng nghỉ 1/2)
  note?: string;
  assignedBy?: string;
  updatedAt: string;
}

export type ScheduleApprovalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED';

export interface WeekScheduleApproval {
  mondayDate: string; // YYYY-MM-DD
  status: ScheduleApprovalStatus;
  submittedBy?: string;
  submittedByName?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  notes?: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  employeeId?: string; // ID / Mã nhân viên (dùng làm tài khoản đăng nhập khi triển khai chính thức)
  name: string;
  email: string;
  role: Role;
  level?: StaffLevel;
  permissions?: UserPermissions;
  department: string;
  avatar: string;
  phone?: string;
}

export interface TeamGroup {
  id: string;
  name: string;
  description?: string;
  leaderId?: string;
  memberIds: string[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string; // data URL or remote URL
  size: number;
  type: string;
}

export interface TaskReport {
  id: string;
  taskId: string;
  submittedBy: string;
  submittedByName: string;
  summary: string;
  notes?: string;
  attachments: Attachment[];
  status: 'PENDING_REVIEW' | 'ACCEPTED' | 'REVISION_NEEDED';
  managerFeedback?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  leadReviewedBy?: string;
  leadReviewedByName?: string;
  leadReviewedAt?: string;
  leadFeedback?: string;
  leadStatus?: 'LEAD_ACCEPTED' | 'REVISION_NEEDED';
  submittedAt: string;
  reviewedAt?: string;
}

export interface TaskExtensionRequest {
  id: string;
  taskId: string;
  requestedBy: string;
  requestedByName: string;
  requestedNewDeadline: string; // ISO string
  reason: string;
  suggestedAssigneeId?: string; // Đề xuất người nhận bàn giao (nếu có)
  suggestedAssigneeName?: string;
  requestedAt: string; // ISO string
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string; // ISO string
  feedback?: string; // Ghi chú hoặc lý do duyệt / từ chối
  assignedReplacementId?: string; // Người thay thế được chỉ định chính thức
  assignedReplacementName?: string;
}

export interface TaskExtensionHistoryItem {
  extendedAt: string;
  extendedBy: string;
  extendedByName: string;
  oldDeadline: string;
  newDeadline: string;
  reason?: string;
  reassignedFromNames?: string[];
  reassignedToNames?: string[];
  actionType?: 'EXTEND' | 'REASSIGN' | 'EXTEND_AND_REASSIGN';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string[]; // danh sách user id của những người cùng làm
  assignedToNames: string[];
  teamName?: string; // Tên tổ/đội nếu giao theo tổ (vd: Tổ Kỹ Thuật 1)
  leadId?: string; // Người chịu trách nhiệm chính (Tổ trưởng)
  leadName?: string;
  reviewers: string[]; // Danh sách người nhận báo cáo (vd: Trưởng phòng + Thư ký)
  reviewerNames: string[];
  createdBy: string;
  createdByName: string;
  status: TaskStatus;
  priority: Priority;
  isDaily?: boolean; // Việc hằng ngày do Thư ký/Trưởng phòng giao
  isManagementOnly?: boolean; // Công việc nội bộ Ban Quản Lý (chỉ Cấp 1 thấy)
  timeSlot?: 'MORNING' | 'AFTERNOON' | 'FULL_DAY'; // Khung giờ thực hiện trong ngày
  startDate: string; // ISO string
  dueDate: string; // ISO string
  reportDeadline: string; // ISO string
  createdAt: string;
  reports?: TaskReport[];
  extensionRequest?: TaskExtensionRequest;
  extensionHistory?: TaskExtensionHistoryItem[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  taskId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DailyPlanItem {
  id: string;
  dayOfWeek: number; // 1 (Mon) - 7 (Sun)
  date: string;
  title: string;
  taskId?: string;
  assignedTo: string;
}

export type ChatChannelType = 'GENERAL' | 'TEAM' | 'DIRECT';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderLevel?: StaffLevel;
  channelType: ChatChannelType;
  channelId: string;
  recipientId?: string;
  content: string;
  imageUrl?: string;
  taskId?: string;
  taskTitle?: string;
  createdAt: string;
  readBy?: string[];
}
