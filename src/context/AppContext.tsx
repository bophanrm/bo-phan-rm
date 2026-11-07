'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Task,
  TaskStatus,
  TaskReport,
  NotificationItem,
  TeamGroup,
  StaffLevel,
  UserPermissions,
  Role,
  WorkShiftAssignment,
  ShiftId,
  ShiftInfo,
  DEFAULT_SHIFTS,
  SHIFTS_CONFIG,
  WeekScheduleApproval,
  ScheduleApprovalStatus,
  TaskExtensionRequest,
  TaskExtensionHistoryItem,
  ChatMessage,
  ChatChannelType,
} from '@/types';
import { getPersonalName } from '@/utils/nameHelper';
import { calculateShiftTimes } from '@/utils/shiftHelper';

// Predefined Team Groups / Tổ Đội chính thức
export const INITIAL_TEAMS: TeamGroup[] = [
  {
    id: 'team-1',
    name: 'Tổ Giám Sát',
    description: 'Đội ngũ giám sát hiện trường & kỹ thuật',
    leaderId: 'user-1794029435861', // Trần Tuấn Hải
    memberIds: [
      'user-1794028864725', // Nguyễn Hưng Thịnh
      'user-1794029277678', // Long Á Thành
      'user-1794029407279', // Phan Thanh Tài
      'user-1794029435861', // Trần Tuấn Hải
    ],
  },
  {
    id: 'team-2',
    name: 'Tổ Kỹ Thuật',
    description: 'Đội ngũ kỹ thuật viên vận hành trực tiếp',
    leaderId: 'user-1794029487288', // Nguyễn Minh Trí
    memberIds: [
      'user-1794028828908', // Nguyễn Tùng Lâm
      'user-1794029189349', // Nguyễn Hữu Tâm
      'user-1794029248752', // Trần Lê Hiếu Hậu
      'user-1794029304253', // Phạm Văn Dũng
      'user-1794029326444', // Lê Sanh Chung
      'user-1794029355937', // Nguyễn Mạnh Hùng
      'user-1794029374322', // Trịnh Hữu Đăng
      'user-1794029389599', // Lý Minh Kiệt
      'user-1794029465528', // Lê Tấn Phát
      'user-1794029487288', // Nguyễn Minh Trí
      'user-1794029518886', // Trần Hoàng Minh
    ],
  },
];

// Danh sách nhân sự chính thức kèm ID chính thức của Bộ Phận RM
export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    employeeId: 'ADMIN',
    name: 'Quản Trị Viên',
    email: '',
    role: 'ADMIN',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: false,
      canReviewReports: false,
      canManagePermissions: true,
      canManageSchedule: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    phone: '',
  },
  {
    id: 'user-1794028540003',
    employeeId: '2705',
    name: 'Tống Trường Xa',
    email: '',
    phone: '',
    role: 'MANAGER',
    level: 'LEVEL_1_MANAGER',
    permissions: {
      canAssignTasks: true,
      canAssignDailyTasks: true,
      canReviewReports: true,
      canManagePermissions: true,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794028696018',
    employeeId: '1660',
    name: 'Nguyễn Trần Hoàng Vũ',
    email: '',
    phone: '0834455369',
    role: 'MANAGER',
    level: 'LEVEL_1_MANAGER',
    permissions: {
      canAssignTasks: true,
      canAssignDailyTasks: true,
      canReviewReports: true,
      canManagePermissions: true,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794028728863',
    employeeId: '1624',
    name: 'Nguyễn Thị Thảo Nguyên',
    email: '',
    phone: '0933648973',
    role: 'SECRETARY',
    level: 'LEVEL_2_SECRETARY',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: true,
      canReviewReports: true,
      canManagePermissions: false,
      canManageSchedule: true,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794028828908',
    employeeId: '2498',
    name: 'Nguyễn Tùng Lâm',
    email: '',
    phone: '0367021752',
    role: 'STAFF',
    level: 'LEVEL_4_STAFF',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: false,
      canReviewReports: false,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794028864725',
    employeeId: '623',
    name: 'Nguyễn Hưng Thịnh',
    email: '',
    phone: '0918231582',
    role: 'STAFF',
    level: 'LEVEL_3_LEAD',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: true,
      canReviewReports: true,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794029189349',
    employeeId: '2638',
    name: 'Nguyễn Hữu Tâm',
    email: '',
    phone: '',
    role: 'STAFF',
    level: 'LEVEL_4_STAFF',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: false,
      canReviewReports: false,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794029248752',
    employeeId: '2442',
    name: 'Trần Lê Hiếu Hậu',
    email: '',
    phone: '0901874559',
    role: 'STAFF',
    level: 'LEVEL_4_STAFF',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: false,
      canReviewReports: false,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794029277678',
    employeeId: '2008',
    name: 'Long Á Thành',
    email: '',
    phone: '',
    role: 'STAFF',
    level: 'LEVEL_3_LEAD',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: true,
      canReviewReports: true,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794029304253',
    employeeId: '375',
    name: 'Phạm Văn Dũng',
    email: '',
    phone: '',
    role: 'STAFF',
    level: 'LEVEL_4_STAFF',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: false,
      canReviewReports: false,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794029326444',
    employeeId: '2715',
    name: 'Lê Sanh Chung',
    email: '',
    phone: '0918180032',
    role: 'STAFF',
    level: 'LEVEL_4_STAFF',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: false,
      canReviewReports: false,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794029355937',
    employeeId: '2727',
    name: 'Nguyễn Mạnh Hùng',
    email: '',
    phone: '0865545765',
    role: 'STAFF',
    level: 'LEVEL_4_STAFF',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: false,
      canReviewReports: false,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794029374322',
    employeeId: '2781',
    name: 'Trịnh Hữu Đăng',
    email: '',
    phone: '',
    role: 'STAFF',
    level: 'LEVEL_4_STAFF',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: false,
      canReviewReports: false,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794029389599',
    employeeId: '2780',
    name: 'Lý Minh Kiệt',
    email: '',
    phone: '',
    role: 'STAFF',
    level: 'LEVEL_4_STAFF',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: false,
      canReviewReports: false,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794029407279',
    employeeId: '742',
    name: 'Phan Thanh Tài',
    email: '',
    phone: '0908191929',
    role: 'STAFF',
    level: 'LEVEL_3_LEAD',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: true,
      canReviewReports: true,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794029435861',
    employeeId: '827',
    name: 'Trần Tuấn Hải',
    email: '',
    phone: '0937072767',
    role: 'STAFF',
    level: 'LEVEL_3_LEAD',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: true,
      canReviewReports: true,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794029465528',
    employeeId: '725',
    name: 'Lê Tấn Phát',
    email: '',
    phone: '0363743297',
    role: 'STAFF',
    level: 'LEVEL_4_STAFF',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: false,
      canReviewReports: false,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794029487288',
    employeeId: '2404',
    name: 'Nguyễn Minh Trí',
    email: '',
    phone: '0775050495',
    role: 'STAFF',
    level: 'LEVEL_4_STAFF',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: false,
      canReviewReports: false,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-1794029518886',
    employeeId: '1678',
    name: 'Trần Hoàng Minh',
    email: '',
    phone: '0913526216',
    role: 'STAFF',
    level: 'LEVEL_4_STAFF',
    permissions: {
      canAssignTasks: false,
      canAssignDailyTasks: false,
      canReviewReports: false,
      canManagePermissions: false,
    },
    department: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
];

const INITIAL_TASKS: Task[] = [];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export function generateInitialShifts(usersList: User[]): WorkShiftAssignment[] {
  const result: WorkShiftAssignment[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  const staffUsers = usersList.filter(
    (u) => u.role !== 'ADMIN' && (u.role === 'STAFF' || u.level === 'LEVEL_3_LEAD' || u.level === 'LEVEL_4_STAFF')
  );

  // Tạo lịch phân ca sẵn: các tuần quá khứ (-2, -1), tuần hiện tại (0), và tuần sau (+1)
  // Tuyệt đối không tạo lịch cho các tuần xa hơn tuần sau (weekOffset <= 1)
  for (let weekOffset = -2; weekOffset <= 1; weekOffset++) {
    const weekMonday = new Date(monday);
    weekMonday.setDate(monday.getDate() + weekOffset * 7);

    for (let d = 0; d < 7; d++) {
      const currentDay = new Date(weekMonday);
      currentDay.setDate(weekMonday.getDate() + d);
      const dateStr = currentDay.toISOString().split('T')[0];

      staffUsers.forEach((user, idx) => {
        const isSunday = d === 6;
        let shiftId: ShiftId;

        if (isSunday) {
          shiftId = (idx + weekOffset) % 3 === 0 ? 'CA_1' : (idx + weekOffset) % 3 === 1 ? 'CA_2' : 'OFF';
        } else {
          // 4 ca chính quy theo yêu cầu: Ca Hành Chính: 7h30 - 16h, Ca 1: 6h - 14h, Ca 2: 14h - 22h, Ca 3: 22h - 6h
          const shiftIdx = (idx * 2 + d + (weekOffset + 2)) % 4;
          shiftId = shiftIdx === 0 ? 'CA_1' : shiftIdx === 1 ? 'HANH_CHINH' : shiftIdx === 2 ? 'CA_2' : 'CA_3';
        }

        result.push({
          id: `shift-${user.id}-${dateStr}`,
          userId: user.id,
          userName: user.name,
          date: dateStr,
          shiftId,
          note: shiftId === 'CA_3' ? 'Trực đêm giám sát máy chủ & sự cố' : undefined,
          assignedBy: 'user-admin',
          updatedAt: new Date().toISOString(),
        });
      });
    }
  }

  return result;
}

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];
  teams: TeamGroup[];
  tasks: Task[];
  notifications: NotificationItem[];
  shifts: WorkShiftAssignment[];
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'status' | 'reports'>) => void;
  submitReport: (taskId: string, report: Omit<TaskReport, 'id' | 'submittedAt' | 'status'>) => void;
  reviewReport: (taskId: string, reportId: string, status: 'ACCEPTED' | 'REVISION_NEEDED', feedback?: string) => void;
  extendTaskDeadline: (taskId: string, newDeadlineIso: string, reason?: string, newAssigneeId?: string) => void;
  requestTaskExtension: (taskId: string, requestedNewDeadline: string, reason: string, suggestedAssigneeId?: string) => void;
  approveTaskExtension: (taskId: string, approvedDeadline: string, replacementAssigneeId?: string, feedback?: string) => void;
  rejectTaskExtension: (taskId: string, feedback: string) => void;
  rolloverTaskToTomorrow: (taskId: string) => void;
  markNotificationAsRead: (id: string) => void;
  updateUserPermissions: (
    userId: string,
    role: Role,
    level: StaffLevel,
    permissions: UserPermissions,
    department?: string,
    name?: string,
    phone?: string,
    email?: string
  ) => void;
  saveUser: (userData: Partial<User> & { id?: string }) => void;
  deleteUser: (userId: string) => void;
  saveTeam: (teamData: Omit<TeamGroup, 'id'> & { id?: string }) => void;
  deleteTeam: (teamId: string) => void;
  assignShift: (userId: string, date: string, shiftId: ShiftId, note?: string, isHalfDay?: boolean) => void;
  bulkAssignShifts: (userIds: string[], dates: string[], shiftId: ShiftId, note?: string) => void;
  saveFullWeekSchedule: (assignments: { userId: string; date: string; shiftId: ShiftId; isHalfDay?: boolean; note?: string }[]) => void;
  getShiftForUser: (userId: string, date: string) => WorkShiftAssignment | undefined;
  scheduleApprovals: Record<string, WeekScheduleApproval>;
  getScheduleApproval: (mondayDate: string) => WeekScheduleApproval;
  submitScheduleForApproval: (mondayDate: string, notes?: string) => void;
  approveSchedule: (mondayDate: string) => void;
  rejectSchedule: (mondayDate: string, feedback?: string) => void;
  unreadCount: number;
  messages: ChatMessage[];
  sendMessage: (data: {
    channelType: ChatChannelType;
    channelId: string;
    recipientId?: string;
    content: string;
    imageUrl?: string;
    taskId?: string;
    taskTitle?: string;
  }) => void;
  markChannelAsRead: (channelId: string) => void;
  unreadMessagesCount: number;
  shiftsConfig: ShiftInfo[];
  shiftsConfigMap: Record<string, ShiftInfo>;
  saveShiftConfig: (shift: ShiftInfo) => void;
  deleteShiftConfig: (shiftId: string) => void;
  resetShiftsConfig: () => void;
  importBackup: (backupData: any) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TASKS: 'bophanrm_tasks_v5',
  NOTIFS: 'bophanrm_notifs_v5',
  USERS: 'bophanrm_users_v5',
  TEAMS: 'bophanrm_teams_v5',
  SHIFTS: 'bophanrm_shifts_v5',
  APPROVALS: 'bophanrm_schedule_approvals_v5',
  SHIFTS_CONFIG: 'bophanrm_shifts_config',
  MESSAGES: 'bophanrm_messages_v5',
};

const getStoredItem = (newKey: string, legacyKey: string) => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(newKey) || localStorage.getItem(legacyKey);
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [teams, setTeams] = useState<TeamGroup[]>(INITIAL_TEAMS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]); // Default to Manager
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [shifts, setShifts] = useState<WorkShiftAssignment[]>([]);
  const [shiftsConfig, setShiftsConfig] = useState<ShiftInfo[]>(DEFAULT_SHIFTS);
  const [scheduleApprovals, setScheduleApprovals] = useState<Record<string, WeekScheduleApproval>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Helper tính thứ 2 của tuần
  const getMondayStr = (d: Date = new Date()): string => {
    const day = d.getDay();
    const diff = (day + 6) % 7;
    const mon = new Date(d);
    mon.setDate(d.getDate() - diff);
    return mon.toISOString().split('T')[0];
  };

  // Load from LocalStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Dọn dẹp dữ liệu mẫu cũ từ các phiên bản v1, v2, v3, v4
      [
        'taskmaster_tasks_v1', 'taskmaster_tasks_v2', 'taskmaster_tasks_v3', 'taskmaster_tasks_v4',
        'taskmaster_notifs_v1', 'taskmaster_notifs_v2', 'taskmaster_notifs_v3', 'taskmaster_notifs_v4',
        'taskmaster_users_v1', 'taskmaster_users_v2', 'taskmaster_users_v3', 'taskmaster_users_v4',
        'taskmaster_teams_v1', 'taskmaster_teams_v2', 'taskmaster_teams_v3', 'taskmaster_teams_v4',
        'taskmaster_shifts_v1', 'taskmaster_schedule_approvals_v1'
      ].forEach((key) => localStorage.removeItem(key));

      const savedTasks = getStoredItem(STORAGE_KEYS.TASKS, 'taskmaster_tasks_v5');
      const savedNotifs = getStoredItem(STORAGE_KEYS.NOTIFS, 'taskmaster_notifs_v5');
      const savedUsers = getStoredItem(STORAGE_KEYS.USERS, 'taskmaster_users_v5');
      const savedTeams = getStoredItem(STORAGE_KEYS.TEAMS, 'taskmaster_teams_v5');
      const savedShifts = getStoredItem(STORAGE_KEYS.SHIFTS, 'taskmaster_shifts_v5');
      const savedApprovals = getStoredItem(STORAGE_KEYS.APPROVALS, 'taskmaster_schedule_approvals_v5');

      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      } else {
        setTasks(INITIAL_TASKS);
      }

      if (savedNotifs) {
        setNotifications(JSON.parse(savedNotifs));
      } else {
        setNotifications(INITIAL_NOTIFICATIONS);
      }

      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers) as User[];
        // Tự động nâng cấp nếu người dùng trước đó chỉ tải bản trắng 1 tài khoản user-admin
        if (parsedUsers.length <= 1 && INITIAL_USERS.length > 1) {
          setUsers(INITIAL_USERS);
          setCurrentUser(INITIAL_USERS[0]);
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        } else if (parsedUsers.length > 0) {
          // Chuẩn hóa và đồng bộ các thay đổi chức vụ/phân quyền chính thức từ INITIAL_USERS
          const normalizedUsers = parsedUsers.map((u) => {
            const official = INITIAL_USERS.find((initU) => initU.id === u.id);
            if (official && (u.level !== official.level || u.role !== official.role)) {
              return {
                ...u,
                role: official.role,
                level: official.level,
                permissions: official.permissions,
              };
            }
            if (u.id === 'user-admin' || u.role === 'ADMIN') {
              return {
                ...u,
                name: u.name === 'Quản Lý' ? 'Quản Trị Viên' : u.name,
                role: 'ADMIN' as const,
                level: undefined,
                permissions: {
                  canAssignTasks: false,
                  canAssignDailyTasks: false,
                  canReviewReports: false,
                  canManagePermissions: true,
                  canManageSchedule: false,
                },
              };
            }
            return u;
          });
          setUsers(normalizedUsers);
          setCurrentUser(normalizedUsers[0]);
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(normalizedUsers));
        } else {
          setUsers(INITIAL_USERS);
          setCurrentUser(INITIAL_USERS[0]);
        }
      } else {
        setUsers(INITIAL_USERS);
        setCurrentUser(INITIAL_USERS[0]);
      }

      if (savedTeams) {
        const parsedTeams = JSON.parse(savedTeams) as TeamGroup[];
        if (parsedTeams.length === 0 && INITIAL_TEAMS.length > 0) {
          setTeams(INITIAL_TEAMS);
          localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(INITIAL_TEAMS));
        } else {
          // Đồng bộ nếu cơ cấu tổ đội chính thức có cập nhật thành viên
          const syncedTeams = parsedTeams.map((pt) => {
            const initT = INITIAL_TEAMS.find((it) => it.id === pt.id);
            if (initT) {
              return {
                ...pt,
                leaderId: initT.leaderId,
                memberIds: initT.memberIds,
              };
            }
            return pt;
          });
          setTeams(syncedTeams);
          localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(syncedTeams));
        }
      } else {
        setTeams(INITIAL_TEAMS);
      }

      if (savedShifts) {
        const parsedShifts = JSON.parse(savedShifts) as WorkShiftAssignment[];
        if (parsedShifts.length <= 5 && INITIAL_USERS.length > 1) {
          const initial = generateInitialShifts(INITIAL_USERS);
          setShifts(initial);
          localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(initial));
        } else {
          setShifts(parsedShifts);
        }
      } else {
        const initial = generateInitialShifts(INITIAL_USERS);
        setShifts(initial);
        localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(initial));
      }

      const savedShiftsConfig = getStoredItem(STORAGE_KEYS.SHIFTS_CONFIG, 'taskmaster_shifts_config');
      if (savedShiftsConfig) {
        try {
          let parsed = JSON.parse(savedShiftsConfig) as ShiftInfo[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Tách ca "Nghỉ Nửa Ngày" (OFF_HALF) khỏi danh sách ca chuẩn, chuyển thành quyền chọn riêng cho Cấp 2 khi sắp ca
            let hasThemeUpdate = false;
            if (parsed.some((s) => s.id === 'OFF_HALF')) {
              parsed = parsed.filter((s) => s.id !== 'OFF_HALF');
              hasThemeUpdate = true;
            }

            // Bổ sung Ca Buggy nếu chưa có
            if (!parsed.some((s) => s.id === 'CA_1794034335936')) {
              const buggyShift = DEFAULT_SHIFTS.find((s) => s.id === 'CA_1794034335936');
              if (buggyShift) {
                parsed.push(buggyShift);
                hasThemeUpdate = true;
              }
            }

            // Đồng bộ nâng cấp màu sắc tương phát cao và chế độ không ghi giờ cho các ca hệ thống mặc định
            DEFAULT_SHIFTS.forEach((defShift) => {
              const target = parsed.find((s) => s.id === defShift.id);
              if (target && target.isSystem) {
                // Cập nhật lại màu sắc tương phản cao và phân biệt rõ ràng
                if (
                  target.badge !== defShift.badge ||
                  target.dotColor !== defShift.dotColor ||
                  target.bgClass !== defShift.bgClass ||
                  target.textClass !== defShift.textClass
                ) {
                  target.badge = defShift.badge;
                  target.dotColor = defShift.dotColor;
                  target.bgClass = defShift.bgClass;
                  target.textClass = defShift.textClass;
                  target.borderClass = defShift.borderClass;
                  hasThemeUpdate = true;
                }

                // Cập nhật chế độ nghỉ không ghi thời gian nếu là OFF
                if (defShift.hasNoTime && target.hasNoTime !== true) {
                  target.hasNoTime = true;
                  target.startTime = undefined;
                  target.endTime = undefined;
                  target.timeRange = defShift.timeRange;
                  hasThemeUpdate = true;
                }
              }
            });

            if (hasThemeUpdate) {
              localStorage.setItem(STORAGE_KEYS.SHIFTS_CONFIG, JSON.stringify(parsed));
            }
            setShiftsConfig(parsed);
          }
        } catch (e) {
          console.error('Error loading shifts config:', e);
        }
      }

      // Schedule approvals initialization
      const currentMonday = getMondayStr(new Date());
      let parsedApprovals: Record<string, WeekScheduleApproval> = {};
      if (savedApprovals) {
        parsedApprovals = JSON.parse(savedApprovals);
      }
      if (!parsedApprovals[currentMonday]) {
        parsedApprovals[currentMonday] = {
          mondayDate: currentMonday,
          status: 'APPROVED',
          approvedBy: 'user-admin',
          approvedByName: 'Quản Lý',
          approvedAt: new Date().toISOString(),
          submittedBy: 'user-admin',
          submittedByName: 'Quản Lý',
          submittedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEYS.APPROVALS, JSON.stringify(parsedApprovals));
      }
      setScheduleApprovals(parsedApprovals);

      // Load Messages
      const savedMessages = getStoredItem(STORAGE_KEYS.MESSAGES, 'taskmaster_messages_v5');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        const welcomeMsg: ChatMessage = {
          id: 'msg-welcome',
          senderId: 'user-admin',
          senderName: 'Quản Trị Viên',
          senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          channelType: 'GENERAL',
          channelId: 'general',
          content: 'Chào mừng toàn thể nhân sự đến với hệ thống công việc Bộ Phận RM! Chúc mọi người một ngày làm việc an toàn, thuận lợi và hiệu quả.',
          createdAt: new Date().toISOString(),
          readBy: ['user-admin'],
        };
        setMessages([welcomeMsg]);
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify([welcomeMsg]));
      }
    } catch (e) {
      console.error('Error loading saved state:', e);
    }
  }, []);

  const updateTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(newTasks));
  };

  const updateNotifications = (newNotifs: NotificationItem[]) => {
    setNotifications(newNotifs);
    localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(newNotifs));
  };

  const updateUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(newUsers));
  };

  const updateTeams = (newTeams: TeamGroup[]) => {
    setTeams(newTeams);
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(newTeams));
  };

  // Cơ chế nhắc nhở hoàn thành công việc Daily:
  // Toàn thời gian làm việc trong ngày (ca hành chính 7h30 - 16h00).
  // Đến 15h (1 tiếng trước khi hết ca), nếu chưa gửi báo cáo hoàn thành công việc sẽ tự động nhắc nhở.
  useEffect(() => {
    const checkDailyTaskReminders = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      tasks.forEach((t) => {
        if (!t.isDaily) return;
        // Bỏ qua nếu đã được duyệt hoặc đã nộp đang chờ duyệt
        if (t.status === 'APPROVED' || t.status === 'SUBMITTED') return;
        if (t.reports && t.reports.some((r) => r.status === 'ACCEPTED' || r.status === 'PENDING_REVIEW')) return;

        // Kiểm tra task của ngày hôm nay
        const taskDate = new Date(t.reportDeadline || t.dueDate || t.createdAt);
        if (taskDate.toDateString() !== now.toDateString()) return;

        // Giờ nhắc nhở: 1 tiếng trước khi hết ca (Ví dụ deadline 16:00 thì nhắc từ 15:00)
        const deadline = new Date(t.reportDeadline || t.dueDate);
        const reminderTime = new Date(deadline.getTime() - 60 * 60 * 1000);

        if (now >= reminderTime) {
          t.assignedTo.forEach((assigneeId) => {
            const notifKey = `remind-daily-${t.id}-${assigneeId}-${todayStr}`;
            setNotifications((prev) => {
              if (prev.some((n) => n.id === notifKey)) return prev;
              const notif: NotificationItem = {
                id: notifKey,
                userId: assigneeId,
                title: '⏰ [Nhắc Nhở] Sắp hết ca làm việc - Vui lòng nộp báo cáo!',
                message: `Đã 15:00 (còn 1 tiếng nữa kết thúc ca trực 16:00). Bạn có công việc "${t.title}" chưa gửi báo cáo hoàn thành. Vui lòng cập nhật ngay!`,
                taskId: t.id,
                isRead: false,
                createdAt: now.toISOString(),
              };
              const updated = [notif, ...prev];
              localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(updated));
              return updated;
            });
          });
        }
      });
    };

    checkDailyTaskReminders();
    const interval = setInterval(checkDailyTaskReminders, 30000);
    return () => clearInterval(interval);
  }, [tasks]);

  const updateShifts = (newShifts: WorkShiftAssignment[]) => {
    setShifts(newShifts);
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(newShifts));
  };

  const assignShift = (userId: string, date: string, shiftId: ShiftId, note?: string, isHalfDay?: boolean) => {
    const userObj = users.find((u) => u.id === userId);
    setShifts((prev) => {
      const filtered = prev.filter((s) => !(s.userId === userId && s.date === date));
      const newShift: WorkShiftAssignment = {
        id: `shift-${userId}-${date}`,
        userId,
        userName: userObj ? userObj.name : userId,
        date,
        shiftId,
        isHalfDay: shiftId === 'OFF' ? false : isHalfDay,
        note,
        assignedBy: currentUser.id,
        updatedAt: new Date().toISOString(),
      };
      const updated = [...filtered, newShift];
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(updated));
      return updated;
    });
  };

  const bulkAssignShifts = (userIds: string[], dates: string[], shiftId: ShiftId, note?: string) => {
    setShifts((prev) => {
      let updated = [...prev];
      userIds.forEach((uId) => {
        const userObj = users.find((u) => u.id === uId);
        dates.forEach((d) => {
          updated = updated.filter((s) => !(s.userId === uId && s.date === d));
          updated.push({
            id: `shift-${uId}-${d}`,
            userId: uId,
            userName: userObj ? userObj.name : uId,
            date: d,
            shiftId,
            note,
            assignedBy: currentUser.id,
            updatedAt: new Date().toISOString(),
          });
        });
      });
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(updated));
      return updated;
    });
  };

  const saveFullWeekSchedule = (assignments: { userId: string; date: string; shiftId: ShiftId; isHalfDay?: boolean; note?: string }[]) => {
    setShifts((prev) => {
      let updated = [...prev];
      const keysToRemove = new Set(assignments.map((a) => `${a.userId}_${a.date}`));
      updated = updated.filter((s) => !keysToRemove.has(`${s.userId}_${s.date}`));

      assignments.forEach((a) => {
        const userObj = users.find((u) => u.id === a.userId);
        updated.push({
          id: `shift-${a.userId}-${a.date}`,
          userId: a.userId,
          userName: userObj ? userObj.name : a.userId,
          date: a.date,
          shiftId: a.shiftId,
          isHalfDay: a.shiftId === 'OFF' ? false : a.isHalfDay,
          note: a.note,
          assignedBy: currentUser.id,
          updatedAt: new Date().toISOString(),
        });
      });

      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(updated));
      return updated;
    });
  };

  const getShiftForUser = (userId: string, date: string): WorkShiftAssignment | undefined => {
    return shifts.find((s) => s.userId === userId && s.date === date);
  };

  const shiftsConfigMap: Record<string, ShiftInfo> = shiftsConfig.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {} as Record<string, ShiftInfo>);

  const saveShiftConfig = (shift: ShiftInfo) => {
    setShiftsConfig((prev) => {
      const idx = prev.findIndex((s) => s.id === shift.id);
      let updated: ShiftInfo[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = { ...updated[idx], ...shift };
      } else {
        updated = [...prev, shift];
      }
      localStorage.setItem(STORAGE_KEYS.SHIFTS_CONFIG, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteShiftConfig = (shiftId: string) => {
    setShiftsConfig((prev) => {
      const updated = prev.filter((s) => s.id !== shiftId);
      localStorage.setItem(STORAGE_KEYS.SHIFTS_CONFIG, JSON.stringify(updated));
      return updated;
    });
  };

  const resetShiftsConfig = () => {
    setShiftsConfig(DEFAULT_SHIFTS);
    localStorage.setItem(STORAGE_KEYS.SHIFTS_CONFIG, JSON.stringify(DEFAULT_SHIFTS));
  };

  const getScheduleApproval = (mondayDate: string): WeekScheduleApproval => {
    const existing = scheduleApprovals[mondayDate];
    if (existing) {
      if (existing.status === 'APPROVED') return existing;

      // Cơ chế Auto-Publish tối Chủ Nhật
      // Nếu đã qua 18:00 Chủ Nhật trước tuần làm việc mondayDate mà Quản Lý chưa kịp duyệt:
      // Tự động tạm thời kích hoạt bản dự thảo để toàn bộ nhân viên kịp nắm ca đi làm sáng Thứ Hai
      try {
        const monDate = new Date(`${mondayDate}T00:00:00`);
        const sunBeforeMon = new Date(monDate);
        sunBeforeMon.setDate(monDate.getDate() - 1);
        sunBeforeMon.setHours(18, 0, 0, 0);

        const now = new Date();
        if (now >= sunBeforeMon && (existing.status === 'PENDING_APPROVAL' || existing.status === 'DRAFT')) {
          return {
            ...existing,
            status: 'APPROVED',
            approvedBy: 'system-auto-publish',
            approvedByName: 'Hệ Thống (Tự động kích hoạt tối CN)',
            approvedAt: sunBeforeMon.toISOString(),
            notes: 'Tạm thời áp dụng bản dự thảo vào 18:00 Chủ Nhật để đảm bảo ca trực sáng Thứ Hai (Chờ Quản Lý xác nhận chính thức).',
          };
        }
      } catch (e) {
        console.error('Error checking auto-publish:', e);
      }

      return existing;
    }

    return {
      mondayDate,
      status: 'DRAFT',
    };
  };

  const submitScheduleForApproval = (mondayDate: string, notes?: string) => {
    const updated: Record<string, WeekScheduleApproval> = {
      ...scheduleApprovals,
      [mondayDate]: {
        mondayDate,
        status: 'PENDING_APPROVAL',
        submittedBy: currentUser.id,
        submittedByName: getPersonalName(currentUser.name, false),
        submittedAt: new Date().toISOString(),
        notes,
      },
    };
    setScheduleApprovals(updated);
    localStorage.setItem(STORAGE_KEYS.APPROVALS, JSON.stringify(updated));

    // Gửi thông báo nhắc nhở đẩy đến Ban Quản Lý (Cấp 1) - Quản trị viên không duyệt lịch
    const managerUsers = users.filter((u) => u.role !== 'ADMIN' && (u.level === 'LEVEL_1_MANAGER' || u.role === 'MANAGER'));
    const managerNotifs: NotificationItem[] = managerUsers.map((m, idx) => ({
      id: `notif-sched-pending-${Date.now()}-${idx}`,
      userId: m.id,
      title: '📋 Lịch Làm Việc Tuần Mới Chờ Phê Duyệt',
      message: `${getPersonalName(currentUser.name, false)} vừa hoàn tất sắp xếp ca và gửi phê duyệt Lịch Làm Việc tuần tới (${mondayDate}). Vui lòng kiểm tra và phê duyệt để công bố ca trực cho cả team.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    }));
    setNotifications((prev) => [...managerNotifs, ...prev]);
  };

  const approveSchedule = (mondayDate: string) => {
    const existing = scheduleApprovals[mondayDate] || { mondayDate, status: 'DRAFT' };
    const managerName = getPersonalName(currentUser.name, false);
    const updated: Record<string, WeekScheduleApproval> = {
      ...scheduleApprovals,
      [mondayDate]: {
        ...existing,
        status: 'APPROVED',
        approvedBy: currentUser.id,
        approvedByName: managerName,
        approvedAt: new Date().toISOString(),
      },
    };
    setScheduleApprovals(updated);
    localStorage.setItem(STORAGE_KEYS.APPROVALS, JSON.stringify(updated));

    // Gửi thông báo đến TẤT CẢ nhân viên trong công ty
    const nowTimestamp = Date.now();
    const broadcastNotifs: NotificationItem[] = users.map((u, idx) => ({
      id: `notif-sched-approved-${mondayDate}-${u.id}-${nowTimestamp + idx}`,
      userId: u.id,
      title: 'Lịch Làm Việc',
      message: 'Lịch làm việc mới đã được cập nhật, vui lòng kiểm tra ca trực của bạn.',
      isRead: false,
      createdAt: new Date().toISOString(),
    }));

    updateNotifications([...broadcastNotifs, ...notifications]);
  };

  const rejectSchedule = (mondayDate: string, feedback?: string) => {
    const existing = scheduleApprovals[mondayDate] || { mondayDate, status: 'DRAFT' };
    const updated: Record<string, WeekScheduleApproval> = {
      ...scheduleApprovals,
      [mondayDate]: {
        ...existing,
        status: 'DRAFT',
        notes: feedback || 'Cấp Quản Lý yêu cầu điều chỉnh lại ca làm việc.',
      },
    };
    setScheduleApprovals(updated);
    localStorage.setItem(STORAGE_KEYS.APPROVALS, JSON.stringify(updated));

    const targetUserIds = existing.submittedBy
      ? [existing.submittedBy]
      : users.filter((u) => u.level === 'LEVEL_2_SECRETARY' || u.role === 'SECRETARY').map((u) => u.id);

    const rejectNotifs: NotificationItem[] = targetUserIds.map((uId, idx) => ({
      id: `notif-sched-reject-${Date.now()}-${idx}`,
      userId: uId,
      title: '↩ Yêu Cầu Chỉnh Sửa Lịch Làm Việc',
      message: `Cấp Quản Lý (${getPersonalName(currentUser.name, false)}) yêu cầu điều chỉnh lại lịch làm việc tuần ${mondayDate}: "${feedback || 'Cần sắp xếp lại ca'}"`,
      isRead: false,
      createdAt: new Date().toISOString(),
    }));
    setNotifications((prev) => [...rejectNotifs, ...prev]);
  };

  // Ban điều hành sắp xếp, tạo mới, chỉnh sửa tổ
  const saveTeam = (teamData: Omit<TeamGroup, 'id'> & { id?: string }) => {
    let newTeams: TeamGroup[];
    if (teamData.id) {
      newTeams = teams.map((t) =>
        t.id === teamData.id
          ? {
              ...t,
              name: teamData.name.trim(),
              description: teamData.description?.trim(),
              leaderId: teamData.leaderId,
              memberIds: teamData.memberIds,
            }
          : t
      );
    } else {
      const newTeam: TeamGroup = {
        id: `team-${Date.now()}`,
        name: teamData.name.trim(),
        description: teamData.description?.trim(),
        leaderId: teamData.leaderId,
        memberIds: teamData.memberIds,
      };
      newTeams = [...teams, newTeam];
    }
    updateTeams(newTeams);
  };

  // Xóa tổ
  const deleteTeam = (teamId: string) => {
    const newTeams = teams.filter((t) => t.id !== teamId);
    updateTeams(newTeams);
  };

  // Lưu nhân sự (Tạo mới hoặc chỉnh sửa tự nhập thông tin, cập nhật danh sách)
  const saveUser = (userData: Partial<User> & { id?: string }) => {
    let updatedUsers: User[];
    let targetId = userData.id;

    if (userData.id) {
      updatedUsers = users.map((u) => {
        if (u.id === userData.id) {
          return {
            ...u,
            ...userData,
            employeeId: userData.employeeId !== undefined ? userData.employeeId.trim() : u.employeeId,
            name: userData.name?.trim() || u.name,
            email: userData.email?.trim() || u.email,
            phone: userData.phone?.trim() || u.phone,
            department: userData.department?.trim() || u.department,
            role: userData.role || u.role,
            level: userData.level || u.level,
            permissions: userData.permissions || u.permissions,
          };
        }
        return u;
      });
    } else {
      targetId = `user-${Date.now()}`;
      const newUser: User = {
        id: targetId,
        employeeId: userData.employeeId?.trim() || '',
        name: userData.name?.trim() || 'Nhân viên mới',
        email: userData.email?.trim() || '',
        phone: userData.phone?.trim() || '',
        role: userData.role || 'STAFF',
        level: userData.level || 'LEVEL_4_STAFF',
        permissions: userData.permissions || {
          canAssignTasks: false,
          canAssignDailyTasks: false,
          canReviewReports: false,
          canManagePermissions: false,
        },
        department: userData.department?.trim() || '',
        avatar: userData.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`,
      };
      updatedUsers = [...users, newUser];
    }

    updateUsers(updatedUsers);

    if (currentUser.id === targetId) {
      const updatedCurrent = updatedUsers.find((u) => u.id === targetId);
      if (updatedCurrent) setCurrentUser(updatedCurrent);
    }
  };

  // Xóa nhân sự khỏi danh sách
  const deleteUser = (userId: string) => {
    if (userId === 'user-admin' || users.length <= 1) {
      alert('Không thể xóa tài khoản Quản Lý gốc hoặc tài khoản duy nhất còn lại.');
      return;
    }
    const updatedUsers = users.filter((u) => u.id !== userId);
    updateUsers(updatedUsers);
    const updatedTeams = teams.map((tm) => ({
      ...tm,
      memberIds: tm.memberIds.filter((id) => id !== userId),
      leaderId: tm.leaderId === userId ? tm.memberIds.find((id) => id !== userId) : tm.leaderId,
    }));
    updateTeams(updatedTeams);
  };

  // Trưởng phòng phân quyền cho từng cấp độ nhân viên
  const updateUserPermissions = (
    userId: string,
    role: Role,
    level: StaffLevel,
    permissions: UserPermissions,
    department?: string,
    name?: string,
    phone?: string,
    email?: string
  ) => {
    saveUser({
      id: userId,
      role,
      level,
      permissions,
      department,
      name,
      phone,
      email,
    });

    const targetUser = users.find((u) => u.id === userId);
    if (targetUser) {
      const notif: NotificationItem = {
        id: `notif-${Date.now()}-perm`,
        userId,
        title: 'Cập nhật phân quyền chức vụ',
        message: `Lãnh đạo vừa cập nhật thông tin và phân quyền làm việc của bạn thành công.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      updateNotifications([notif, ...notifications]);
    }
  };

  // Create new task (hỗ trợ giao cho 1 tổ hoặc nhiều người cùng làm, chỉ định người nhận báo cáo)
  const createTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'status' | 'reports'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      status: 'TODO',
      createdAt: new Date().toISOString(),
      reports: [],
    };

    const newTasks = [newTask, ...tasks];
    updateTasks(newTasks);

    // Bắn thông báo đến TẤT CẢ các nhân viên trong tổ / danh sách cùng làm
    const createdNotifs: NotificationItem[] = taskData.assignedTo.map((memberId, idx) => ({
      id: `notif-${Date.now()}-${idx}`,
      userId: memberId,
      title: taskData.teamName ? `Việc mới giao cho [${taskData.teamName}]!` : 'Bạn có công việc mới được giao!',
      message: `${getPersonalName(currentUser.name)} vừa giao việc: "${taskData.title}". Hạn nộp báo cáo: ${new Date(
        taskData.reportDeadline
      ).toLocaleDateString('vi-VN')}.`,
      taskId: newTask.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    }));

    // Điểm 1 (Cách A): Nếu người giao là Cấp 2 (Điều Phối), gửi thêm thông báo cho các Tổ trưởng (Cấp 3 Lead) phụ trách
    const leadNotifs: NotificationItem[] = [];
    if (currentUser.level === 'LEVEL_2_SECRETARY' || currentUser.role === 'SECRETARY') {
      taskData.reviewers?.forEach((reviewerId, idx) => {
        const reviewerUser = users.find((u) => u.id === reviewerId);
        if (reviewerUser?.level === 'LEVEL_3_LEAD' && !taskData.assignedTo.includes(reviewerId)) {
          leadNotifs.push({
            id: `notif-${Date.now()}-lead-${reviewerId}-${idx}`,
            userId: reviewerId,
            title: `[Điều Phối] Giao việc cho thành viên tổ bạn`,
            message: `Nhân Viên Điều Phối vừa giao việc: "${taskData.title}" cho thành viên tổ bạn. Bạn có quyền theo dõi và duyệt sơ bộ.`,
            taskId: newTask.id,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      });
    }

    updateNotifications([...leadNotifs, ...createdNotifs, ...notifications]);

    // Native Web Push API simulation
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Việc mới được giao', { body: newTask.title });
    }
  };

  // Submit report (Gửi về CÙNG LÚC cho Trưởng phòng VÀ Thư ký)
  const submitReport = (taskId: string, reportData: Omit<TaskReport, 'id' | 'submittedAt' | 'status'>) => {
    const newReport: TaskReport = {
      ...reportData,
      id: `rep-${Date.now()}`,
      status: 'PENDING_REVIEW',
      submittedAt: new Date().toISOString(),
    };

    const targetTask = tasks.find((t) => t.id === taskId);
    const newTasks = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'SUBMITTED' as const,
          reports: [...(t.reports || []), newReport],
        };
      }
      return t;
    });

    updateTasks(newTasks);

    // Gửi thông báo đến CẢ Trưởng phòng và Thư ký (tất cả reviewers trong task)
    if (targetTask && targetTask.reviewers && targetTask.reviewers.length > 0) {
      const reviewerNotifs: NotificationItem[] = targetTask.reviewers.map((reviewerId, idx) => {
        const reviewerObj = users.find((u) => u.id === reviewerId);
        const isSecretary = reviewerObj?.role === 'SECRETARY';

        return {
          id: `notif-${Date.now()}-rev-${idx}`,
          userId: reviewerId,
          title: isSecretary
            ? 'Báo cáo mới gửi đến (Nhân Viên Điều Phối đồng nhận)'
            : 'Báo cáo mới cần duyệt',
          message: `${getPersonalName(currentUser.name, false)} đã nộp báo cáo kèm kết quả cho việc "${targetTask.title}".`,
          taskId: targetTask.id,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
      });

      updateNotifications([...reviewerNotifs, ...notifications]);
    }
  };

  // Review report (Thẩm quyền phân tầng: Cấp 3 duyệt sơ bộ hiện trường, Cấp 1 & 2 nghiệm thu hoàn tất. Chống xung đột: Yêu cầu sửa đổi có quyền ưu tiên cao nhất)
  const reviewReport = (taskId: string, reportId: string, status: 'ACCEPTED' | 'REVISION_NEEDED', feedback?: string) => {
    let assignedMembers: string[] = [];
    let taskTitle = '';
    const isLeadReviewer = currentUser.level === 'LEVEL_3_LEAD';

    const newTasks = tasks.map((t) => {
      if (t.id === taskId) {
        assignedMembers = t.assignedTo;
        taskTitle = t.title;

        // Điểm 1 (Rủi ro 1: Chống xung đột duyệt):
        // Nếu báo cáo hiện tại đang ở trạng thái REVISION_NEEDED, không cho phép ai bấm duyệt đè khi nhân viên chưa nộp báo cáo mới
        const currentRep = (t.reports || []).find((r) => r.id === reportId);
        if (status === 'ACCEPTED' && currentRep?.status === 'REVISION_NEEDED') {
          return t;
        }

        const updatedReports = (t.reports || []).map((r) => {
          if (r.id === reportId) {
            if (isLeadReviewer && t.createdBy !== currentUser.id) {
              // Cấp 3 (Tổ trưởng) duyệt sơ bộ hiện trường
              return {
                ...r,
                status: status === 'REVISION_NEEDED' ? ('REVISION_NEEDED' as const) : r.status,
                leadStatus: status === 'ACCEPTED' ? ('LEAD_ACCEPTED' as const) : ('REVISION_NEEDED' as const),
                leadFeedback: feedback,
                leadReviewedBy: currentUser.id,
                leadReviewedByName: getPersonalName(currentUser.name, true),
                leadReviewedAt: new Date().toISOString(),
                managerFeedback: status === 'REVISION_NEEDED' ? feedback : r.managerFeedback,
              };
            } else {
              // Cấp 1, Cấp 2 hoặc người tạo việc duyệt
              return {
                ...r,
                status,
                managerFeedback: feedback,
                reviewedBy: currentUser.id,
                reviewedByName: getPersonalName(currentUser.name, true),
                reviewedAt: new Date().toISOString(),
              };
            }
          }
          return r;
        });

        // Xác định trạng thái của Task:
        // Nếu bất kỳ ai bấm REVISION_NEEDED -> Khóa task về REJECTED ngay lập tức
        let nextTaskStatus: TaskStatus = t.status;
        if (status === 'REVISION_NEEDED') {
          nextTaskStatus = 'REJECTED';
        } else if (status === 'ACCEPTED') {
          nextTaskStatus = 'APPROVED';
        }

        return {
          ...t,
          status: nextTaskStatus,
          reports: updatedReports,
        };
      }
      return t;
    });

    updateTasks(newTasks);

    // Bắn thông báo kết quả duyệt về cho TẤT CẢ các thành viên trong tổ
    const isApproved = status === 'ACCEPTED';
    const feedbackNotifs: NotificationItem[] = assignedMembers.map((memberId, idx) => ({
      id: `notif-${Date.now()}-fb-${idx}`,
      userId: memberId,
      title: isApproved ? 'Báo cáo đã được DUYỆT ĐẠT ✓' : 'Báo cáo CẦN CHỈNH SỬA LẠI ⚠️',
      message: isApproved
        ? `${getPersonalName(currentUser.name)} (${currentUser.level === 'LEVEL_2_SECRETARY' || currentUser.role === 'SECRETARY' ? 'Nhân Viên Điều Phối' : currentUser.level === 'LEVEL_3_LEAD' ? 'Tổ Trưởng (Duyệt Hiện Trường)' : 'Trưởng phòng'}) đã duyệt việc "${taskTitle}".`
        : `${getPersonalName(currentUser.name)} yêu cầu sửa lại việc "${taskTitle}". Ý kiến: ${feedback || 'Vui lòng kiểm tra lại.'}`,
      taskId,
      isRead: false,
      createdAt: new Date().toISOString(),
    }));

    updateNotifications([...feedbackNotifs, ...notifications]);
  };

  // Chủ động thay đổi thời gian hoàn thành / Gia hạn & Chuyển giao công việc
  const extendTaskDeadline = (
    taskId: string,
    newDeadlineIso: string,
    reason?: string,
    newAssigneeId?: string
  ) => {
    let oldAssignedMembers: string[] = [];
    let taskTitle = '';
    let targetNewUser: User | undefined;

    if (newAssigneeId) {
      targetNewUser = users.find((u) => u.id === newAssigneeId);
    }

    const newTasks = tasks.map((t) => {
      if (t.id === taskId) {
        oldAssignedMembers = t.assignedTo;
        taskTitle = t.title;
        const oldDeadline = t.reportDeadline || t.dueDate;

        const isReassigned = !!(targetNewUser && !t.assignedTo.includes(targetNewUser.id));
        const updatedAssignedTo = isReassigned ? [targetNewUser!.id] : t.assignedTo;
        const updatedAssignedToNames = isReassigned ? [targetNewUser!.name] : t.assignedToNames;

        const actionType: 'EXTEND' | 'REASSIGN' | 'EXTEND_AND_REASSIGN' = isReassigned
          ? oldDeadline !== newDeadlineIso
            ? 'EXTEND_AND_REASSIGN'
            : 'REASSIGN'
          : 'EXTEND';

        const newExt: TaskExtensionHistoryItem = {
          extendedAt: new Date().toISOString(),
          extendedBy: currentUser.id,
          extendedByName: getPersonalName(currentUser.name, true),
          oldDeadline,
          newDeadline: newDeadlineIso,
          reason,
          reassignedFromNames: isReassigned ? t.assignedToNames : undefined,
          reassignedToNames: isReassigned ? updatedAssignedToNames : undefined,
          actionType,
        };

        return {
          ...t,
          dueDate: newDeadlineIso,
          reportDeadline: newDeadlineIso,
          assignedTo: updatedAssignedTo,
          assignedToNames: updatedAssignedToNames,
          // Đóng pending extensionRequest nếu có
          extensionRequest:
            t.extensionRequest?.status === 'PENDING'
              ? {
                  ...t.extensionRequest,
                  status: 'APPROVED' as const,
                  reviewedBy: currentUser.id,
                  reviewedByName: getPersonalName(currentUser.name, true),
                  reviewedAt: new Date().toISOString(),
                  feedback: reason || 'Đã phê duyệt gia hạn',
                  assignedReplacementId: targetNewUser?.id,
                  assignedReplacementName: targetNewUser?.name,
                }
              : t.extensionRequest,
          // Nếu task trước đó bị REJECTED hoặc quá hạn thì đưa về TODO để làm tiếp
          status: t.status === 'REJECTED' ? ('TODO' as const) : t.status,
          extensionHistory: [...(t.extensionHistory || []), newExt],
        };
      }
      return t;
    });

    updateTasks(newTasks);

    const formattedNewDeadline = new Date(newDeadlineIso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const notifs: NotificationItem[] = [];

    // Thông báo cho nhân sự cũ
    oldAssignedMembers.forEach((mId, idx) => {
      notifs.push({
        id: `notif-${Date.now()}-ext-${idx}`,
        userId: mId,
        title: targetNewUser ? '🔄 Điều phối / Chuyển giao công việc' : '🔄 Gia hạn thời gian hoàn thành',
        message: targetNewUser
          ? `${getPersonalName(currentUser.name, true)} đã chuyển giao công việc "${taskTitle}" cho ${getPersonalName(targetNewUser.name)}. Hạn mới: ${formattedNewDeadline}.${reason ? ` Lý do: ${reason}` : ''}`
          : `${getPersonalName(currentUser.name, true)} vừa gia hạn công việc "${taskTitle}". Hạn mới: ${formattedNewDeadline}.${reason ? ` Lý do: ${reason}` : ''}`,
        taskId,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    // Nếu chuyển giao cho nhân sự mới
    if (targetNewUser && !oldAssignedMembers.includes(targetNewUser.id)) {
      notifs.push({
        id: `notif-${Date.now()}-newassignee`,
        userId: targetNewUser.id,
        title: '📋 Tiếp nhận công việc bàn giao',
        message: `${getPersonalName(currentUser.name, true)} vừa bàn giao công việc "${taskTitle}" cho bạn. Hạn nộp báo cáo: ${formattedNewDeadline}.${reason ? ` Ghi chú: ${reason}` : ''}`,
        taskId,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    updateNotifications([...notifs, ...notifications]);
  };

  // Cấp 4 (Nhân viên) gửi yêu cầu xin gia hạn & đề xuất bàn giao
  const requestTaskExtension = (
    taskId: string,
    requestedNewDeadline: string,
    reason: string,
    suggestedAssigneeId?: string
  ) => {
    let taskTitle = '';
    let creatorId = '';
    let leadId = '';
    let suggestedUser: User | undefined;

    if (suggestedAssigneeId) {
      suggestedUser = users.find((u) => u.id === suggestedAssigneeId);
    }

    const newTasks = tasks.map((t) => {
      if (t.id === taskId) {
        taskTitle = t.title;
        creatorId = t.createdBy;
        leadId = t.leadId || '';

        const newReq: TaskExtensionRequest = {
          id: `req-ext-${Date.now()}`,
          taskId,
          requestedBy: currentUser.id,
          requestedByName: getPersonalName(currentUser.name, true),
          requestedNewDeadline,
          reason,
          suggestedAssigneeId,
          suggestedAssigneeName: suggestedUser ? getPersonalName(suggestedUser.name, true) : undefined,
          requestedAt: new Date().toISOString(),
          status: 'PENDING',
        };

        return {
          ...t,
          extensionRequest: newReq,
        };
      }
      return t;
    });

    updateTasks(newTasks);

    const formattedReqDeadline = new Date(requestedNewDeadline).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Người nhận thông báo: Người trực tiếp tạo task, Cấp 1, Cấp 2, và Lead phụ trách
    const recipientIds = new Set<string>();
    if (creatorId && creatorId !== currentUser.id) recipientIds.add(creatorId);
    if (leadId && leadId !== currentUser.id) recipientIds.add(leadId);
    users
      .filter((u) => u.role !== 'ADMIN' && (u.level === 'LEVEL_1_MANAGER' || u.level === 'LEVEL_2_SECRETARY' || u.role === 'MANAGER' || u.role === 'SECRETARY'))
      .forEach((u) => recipientIds.add(u.id));
    recipientIds.delete(currentUser.id);

    const notifs: NotificationItem[] = Array.from(recipientIds).map((recId, idx) => ({
      id: `notif-${Date.now()}-reqext-${idx}`,
      userId: recId,
      title: '⏳ Yêu cầu xin gia hạn / bàn giao công việc',
      message: `${getPersonalName(currentUser.name, true)} xin gia hạn việc "${taskTitle}" đến ${formattedReqDeadline}.${suggestedUser ? ` Đề xuất bàn giao cho: ${getPersonalName(suggestedUser.name)}.` : ''} Lý do: ${reason}`,
      taskId,
      isRead: false,
      createdAt: new Date().toISOString(),
    }));

    updateNotifications([...notifs, ...notifications]);
  };

  // Cấp trên / Người giao việc phê duyệt yêu cầu gia hạn và có thể chỉ định người thay thế
  const approveTaskExtension = (
    taskId: string,
    approvedDeadline: string,
    replacementAssigneeId?: string,
    feedback?: string
  ) => {
    extendTaskDeadline(
      taskId,
      approvedDeadline,
      feedback || 'Đã phê duyệt yêu cầu xin gia hạn',
      replacementAssigneeId
    );
  };

  // Từ chối yêu cầu gia hạn
  const rejectTaskExtension = (taskId: string, feedback: string) => {
    let requesterId = '';
    let taskTitle = '';

    const newTasks = tasks.map((t) => {
      if (t.id === taskId && t.extensionRequest) {
        requesterId = t.extensionRequest.requestedBy;
        taskTitle = t.title;

        return {
          ...t,
          extensionRequest: {
            ...t.extensionRequest,
            status: 'REJECTED' as const,
            reviewedBy: currentUser.id,
            reviewedByName: getPersonalName(currentUser.name, true),
            reviewedAt: new Date().toISOString(),
            feedback,
          },
        };
      }
      return t;
    });

    updateTasks(newTasks);

    if (requesterId) {
      const notif: NotificationItem = {
        id: `notif-${Date.now()}-rejext`,
        userId: requesterId,
        title: '❌ Yêu cầu gia hạn không được chấp thuận',
        message: `${getPersonalName(currentUser.name, true)} đã từ chối yêu cầu gia hạn công việc "${taskTitle}". Lý do: ${feedback || 'Vui lòng hoàn thành theo tiến độ hiện tại.'}`,
        taskId,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      updateNotifications([notif, ...notifications]);
    }
  };

  // Gia hạn nhanh sang ca làm việc ngày mai
  const rolloverTaskToTomorrow = (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const firstAssignee = targetTask.assignedTo[0];
    const tomorrowShift = firstAssignee ? getShiftForUser(firstAssignee, tomorrowStr) : undefined;
    const shiftCalc = calculateShiftTimes(tomorrowShift?.shiftId || 'HANH_CHINH', tomorrow);

    extendTaskDeadline(
      taskId,
      shiftCalc.reportDeadlineIso,
      `Chuyển tiếp sang ca trực ngày mai (${shiftCalc.formattedShiftText})`
    );
  };

  const markNotificationAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    updateNotifications(updated);
  };

  const unreadCount = notifications.filter(
    (n) => n.userId === currentUser.id && !n.isRead
  ).length;

  const sendMessage = (data: {
    channelType: ChatChannelType;
    channelId: string;
    recipientId?: string;
    content: string;
    imageUrl?: string;
    taskId?: string;
    taskTitle?: string;
  }) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: currentUser.id,
      senderName: getPersonalName(currentUser.name, false),
      senderAvatar: currentUser.avatar,
      senderLevel: currentUser.level,
      channelType: data.channelType,
      channelId: data.channelId,
      recipientId: data.recipientId,
      content: data.content.trim(),
      imageUrl: data.imageUrl,
      taskId: data.taskId,
      taskTitle: data.taskTitle,
      createdAt: new Date().toISOString(),
      readBy: [currentUser.id],
    };

    setMessages((prev) => {
      const updated = [...prev, newMsg];
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updated));
      return updated;
    });
  };

  const markChannelAsRead = (channelId: string) => {
    setMessages((prev) => {
      let changed = false;
      const updated = prev.map((m) => {
        if (m.channelId === channelId && !m.readBy?.includes(currentUser.id)) {
          changed = true;
          return {
            ...m,
            readBy: [...(m.readBy || []), currentUser.id],
          };
        }
        return m;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  };

  const unreadMessagesCount = messages.filter((m) => {
    if (m.senderId === currentUser.id) return false;
    if (m.readBy?.includes(currentUser.id)) return false;
    if (m.channelType === 'DIRECT') return m.recipientId === currentUser.id;
    if (m.channelType === 'TEAM') {
      const team = teams.find((t) => t.id === m.channelId);
      if (!team) return false;
      const isMember = team.memberIds.includes(currentUser.id);
      const isLeadership =
        currentUser.level === 'LEVEL_1_MANAGER' ||
        currentUser.role === 'ADMIN' ||
        currentUser.role === 'MANAGER' ||
        currentUser.level === 'LEVEL_2_SECRETARY';
      return isMember || isLeadership;
    }
    return true; // GENERAL
  }).length;

  const importBackup = (backupData: any): boolean => {
    try {
      if (!backupData || typeof backupData !== 'object') return false;
      if (Array.isArray(backupData.users) && backupData.users.length > 0) {
        setUsers(backupData.users);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(backupData.users));
      }
      if (Array.isArray(backupData.teams)) {
        setTeams(backupData.teams);
        localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(backupData.teams));
      }
      if (Array.isArray(backupData.tasks)) {
        setTasks(backupData.tasks);
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(backupData.tasks));
      }
      if (Array.isArray(backupData.notifications)) {
        setNotifications(backupData.notifications);
        localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(backupData.notifications));
      }
      if (Array.isArray(backupData.shifts) && backupData.shifts.length > 0) {
        setShifts(backupData.shifts);
        localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(backupData.shifts));
      }
      if (Array.isArray(backupData.shiftsConfig) && backupData.shiftsConfig.length > 0) {
        setShiftsConfig(backupData.shiftsConfig);
        localStorage.setItem(STORAGE_KEYS.SHIFTS_CONFIG, JSON.stringify(backupData.shiftsConfig));
      }
      return true;
    } catch (e) {
      console.error('Import backup failed:', e);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        teams,
        tasks,
        notifications,
        shifts,
        createTask,
        submitReport,
        reviewReport,
        extendTaskDeadline,
        requestTaskExtension,
        approveTaskExtension,
        rejectTaskExtension,
        rolloverTaskToTomorrow,
        markNotificationAsRead,
        updateUserPermissions,
        saveUser,
        deleteUser,
        saveTeam,
        deleteTeam,
        assignShift,
        bulkAssignShifts,
        saveFullWeekSchedule,
        getShiftForUser,
        scheduleApprovals,
        getScheduleApproval,
        submitScheduleForApproval,
        approveSchedule,
        rejectSchedule,
        unreadCount,
        messages,
        sendMessage,
        markChannelAsRead,
        unreadMessagesCount,
        shiftsConfig,
        shiftsConfigMap,
        saveShiftConfig,
        deleteShiftConfig,
        resetShiftsConfig,
        importBackup,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
