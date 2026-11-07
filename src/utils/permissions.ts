import { User, StaffLevel, Task } from '@/types';

export const STAFF_LEVEL_LABELS: Record<
  StaffLevel,
  { title: string; short: string; badgeColor: string; roleDesc: string }
> = {
  LEVEL_1_MANAGER: {
    title: 'Cấp 1: Quản Lý',
    short: 'Quản Lý',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    roleDesc: 'Toàn quyền điều hành, phân quyền nhân sự, giao dự án và phê duyệt công việc.',
  },
  LEVEL_2_SECRETARY: {
    title: 'Cấp 2: Nhân Viên Điều Phối',
    short: 'Nhân Viên Điều Phối',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    roleDesc: 'Lên lịch làm việc cho cả team, giao việc hằng ngày cho Giám sát và Nhân viên, đồng nhận báo cáo, xuất file Excel.',
  },
  LEVEL_3_LEAD: {
    title: 'Cấp 3: Giám Sát',
    short: 'Giám Sát',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    roleDesc: 'Giao việc và duyệt các công việc hằng ngày cho tổ kỹ thuật, không duyệt dự án dài hạn.',
  },
  LEVEL_4_STAFF: {
    title: 'Cấp 4: Nhân Viên',
    short: 'Nhân Viên',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    roleDesc: 'Tiếp nhận công việc từ cấp trên, thi công trực tiếp và báo cáo kết quả kèm ảnh.',
  },
};

/**
 * Lấy thứ tự cấp bậc (1: Cao nhất, 4: Cơ sở)
 */
export function getLevelRank(level?: StaffLevel): number {
  switch (level) {
    case 'LEVEL_1_MANAGER':
      return 1;
    case 'LEVEL_2_SECRETARY':
      return 2;
    case 'LEVEL_3_LEAD':
      return 3;
    case 'LEVEL_4_STAFF':
    default:
      return 4;
  }
}

/**
 * Kiểm tra xem người giao việc (assigner) có quyền giao việc cho nhân sự (assignee) theo phân tầng hay không.
 * - Cấp 1 (Quản Lý): Giao được cho Cấp 1 (cùng cấp), Cấp 2, Cấp 3, Cấp 4.
 * - Cấp 2 (Điều Phối): Giao được cho Cấp 3 và Cấp 4.
 * - Cấp 3 (Giám Sát): Giao được cho Cấp 3 (cùng cấp có thể giao việc cho nhau) và Cấp 4.
 * - Cấp 4 (Nhân Viên): Không giao việc.
 */
export function canAssignToTarget(assigner?: User | null, assignee?: User | null): boolean {
  if (!assigner || !assignee) return false;
  // Quản trị viên chỉ vận hành hệ thống, không giao việc và không nhận việc
  if (assigner.role === 'ADMIN' || assignee.role === 'ADMIN') return false;
  const assignerRank = getLevelRank(assigner.level || (assigner.role === 'MANAGER' ? 'LEVEL_1_MANAGER' : assigner.role === 'SECRETARY' ? 'LEVEL_2_SECRETARY' : 'LEVEL_4_STAFF'));
  const assigneeRank = getLevelRank(assignee.level || (assignee.role === 'MANAGER' ? 'LEVEL_1_MANAGER' : assignee.role === 'SECRETARY' ? 'LEVEL_2_SECRETARY' : 'LEVEL_4_STAFF'));

  // Cấp 1 có thể giao cho mọi cấp (kể cả cùng cấp quản lý)
  if (assignerRank === 1) return true;

  // Cấp 3 (Giám Sát) có thể giao việc cho nhau (cùng Cấp 3) và giao cho Cấp 4
  if (assignerRank === 3) {
    return assigneeRank === 3 || assigneeRank === 4;
  }

  // Cấp trên giao việc cho các cấp dưới hơn
  return assignerRank < assigneeRank;
}

/**
 * Kiểm tra xem người dùng có quyền giao dự án và công việc dài hạn hay không.
 * Quy tắc: Cấp 1 (Ban Quản Lý / Điều Hành) có quyền giao dự án và công việc dài hạn.
 * Cấp 2 (Điều Phối) chỉ được nhận báo cáo và giao việc hằng ngày.
 * Quản trị viên: Chỉ làm công tác vận hành hệ thống, không tham gia giao việc.
 */
export function canAssignProject(user?: User | null): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return false;
  const isAuthorizedExecutive =
    user.level === 'LEVEL_1_MANAGER' ||
    user.role === 'MANAGER' ||
    user.id === 'user-tong-truong-xa' ||
    user.id === 'user-nguyen-tran-hoang-vu';
  return isAuthorizedExecutive && (user.permissions?.canAssignTasks ?? true);
}

/**
 * Kiểm tra xem người dùng có quyền giao việc hằng ngày hay không.
 * Quy định: Cấp 1 (Quản lý), Cấp 2 (Điều phối) và Cấp 3 (Giám sát) có quyền giao việc hằng ngày.
 * Cấp 4 (Nhân viên) không có quyền giao việc.
 * Quản trị viên: Chỉ làm công tác vận hành hệ thống, không tham gia giao việc.
 */
export function canAssignDaily(user?: User | null): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return false;
  if (user.level === 'LEVEL_4_STAFF' || (user.role === 'STAFF' && user.level !== 'LEVEL_3_LEAD')) {
    return false;
  }
  return (
    user.level === 'LEVEL_1_MANAGER' ||
    user.level === 'LEVEL_2_SECRETARY' ||
    user.level === 'LEVEL_3_LEAD' ||
    user.role === 'MANAGER' ||
    user.role === 'SECRETARY' ||
    (user.permissions?.canAssignDailyTasks ?? false)
  );
}

/**
 * Kiểm tra xem người dùng có quyền mở modal giao bất kỳ công việc nào hay không.
 */
export function canAssignAnyTask(user?: User | null): boolean {
  return canAssignDaily(user);
}

/**
 * Kiểm tra xem người dùng có quyền xuất file Excel công việc hằng ngày hay không.
 * Quy định: CHỈ Nhân Viên Điều Phối (Chị Nguyên - user-nguyen-thi-thao-nguyen / SECRETARY / LEVEL_2_SECRETARY)
 * mới có quyền xuất file Excel tổng hợp công việc hằng ngày.
 * Ở cấp bậc Anh Xa (Phó Giám Đốc) và Anh Vũ (Trưởng phòng) chỉ phê duyệt công việc.
 * Cấp 3 (Giám sát) và Cấp 4 (Nhân viên) KHÔNG CÓ chức năng xuất file báo cáo.
 */
export function canExportDailyExcel(user?: User | null): boolean {
  if (!user) return false;
  // Cấp bậc anh Xa và anh Vũ chỉ phê duyệt công việc
  if (user.id === 'user-tong-truong-xa' || user.id === 'user-nguyen-tran-hoang-vu') {
    return false;
  }
  return (
    user.id === 'user-nguyen-thi-thao-nguyen' ||
    user.role === 'SECRETARY' ||
    user.level === 'LEVEL_2_SECRETARY'
  );
}

/**
 * Kiểm tra xem người dùng có quyền sắp xếp ca làm việc hay không.
 * Quy định MỚI: CHỈ CÓ Cấp Nhân Viên Điều Phối (Cấp 2) mới được thực hiện sắp xếp ca làm việc.
 * Các cấp độ khác (Cấp 1 Quản Lý, Cấp 3 Giám Sát, Cấp 4 Nhân Viên) chỉ có quyền xem.
 */
export function canArrangeSchedule(user?: User | null): boolean {
  if (!user) return false;
  return (
    user.id === 'user-nguyen-thi-thao-nguyen' ||
    user.level === 'LEVEL_2_SECRETARY' ||
    user.role === 'SECRETARY'
  );
}

/**
 * Kiểm tra xem người dùng có quyền phê duyệt lịch làm việc do Điều Phối gửi hay không.
 * Quy định: Cấp Quản Lý (Cấp 1: Anh Xa, Anh Vũ) có quyền phê duyệt.
 */
export function canApproveSchedule(user?: User | null): boolean {
  if (!user) return false;
  // Quản trị viên không có quyền duyệt lịch làm việc
  if (user.role === 'ADMIN') return false;
  return (
    user.id === 'user-tong-truong-xa' ||
    user.id === 'user-nguyen-tran-hoang-vu' ||
    user.level === 'LEVEL_1_MANAGER' ||
    user.role === 'MANAGER'
  );
}

/**
 * Alias cho canArrangeSchedule (sắp xếp ca làm việc).
 */
export function canManageSchedule(user?: User | null): boolean {
  return canArrangeSchedule(user);
}

/**
 * Kiểm tra xem người dùng có được phép xem lịch làm việc của một tuần hay không.
 * Quy định: Lịch làm việc luôn luôn xuất hiện cho mọi nhân sự ở tất cả các cấp cùng xem.
 */
export function canViewSchedule(): boolean {
  return true;
}

/**
 * Kiểm tra xem người dùng có quyền phân quyền và quản lý nhân sự hay không.
 * Quy định:
 * - Tài khoản Quản trị viên (ADMIN): Có đầy đủ mọi thẩm quyền cao nhất: thêm/sửa/xoá nhân viên, phân quyền 4 cấp bậc, tạo tổ/đội.
 * - Cấp 1 (Ban Quản Lý: LEVEL_1_MANAGER, MANAGER).
 */
export function canManageStaffPermissions(user?: User | null): boolean {
  if (!user) return false;
  return (
    user.role === 'ADMIN' ||
    user.level === 'LEVEL_1_MANAGER' ||
    user.role === 'MANAGER' ||
    user.id === 'user-tong-truong-xa' ||
    user.id === 'user-nguyen-tran-hoang-vu' ||
    (user.permissions?.canManagePermissions ?? false)
  );
}

/**
 * Kiểm tra xem người dùng có quyền quản lý tổ đội (thêm, sửa, xoá tổ đội) hay không.
 */
export function canManageTeams(user?: User | null): boolean {
  if (!user) return false;
  return (
    user.role === 'ADMIN' ||
    user.level === 'LEVEL_1_MANAGER' ||
    user.role === 'MANAGER' ||
    user.level === 'LEVEL_2_SECRETARY' ||
    user.role === 'SECRETARY'
  );
}

/**
 * Kiểm tra xem một nhân sự có thuộc Cấp 4 (Nhân Viên) hay không.
 */
export function isLevel4Staff(user?: User | null): boolean {
  if (!user) return false;
  return user.level === 'LEVEL_4_STAFF' || (user.role === 'STAFF' && user.level !== 'LEVEL_3_LEAD');
}

/**
 * Kiểm tra xem người dùng có quyền phê duyệt báo cáo của một task cụ thể hay không.
 * Quy định cốt lõi:
 * 1. Quản trị viên (ADMIN): Không có quyền duyệt.
 * 2. Không tự duyệt việc của mình: Kể cả Cấp 1, nếu được giao việc và nộp báo cáo thì không tự duyệt.
 * 3. Cấp 1 (Quản Lý: Anh Xa, Anh Vũ): Toàn quyền duyệt tất cả công việc trong hệ thống.
 * 4. Người trực tiếp giao việc: Là người có thẩm quyền phê duyệt công việc đó.
 * 5. Quy tắc Cấp 3 (Tổ Trưởng / Giám Sát):
 *    "Ai ở Cấp 3 giao việc thì người đó có quyền duyệt, người cùng cấp KHÔNG CÓ QUYỀN DUYỆT".
 */
export function canReviewTask(user?: User | null, task?: Task | null, allUsers?: User[]): boolean {
  if (!user || !task) return false;

  // Quản trị viên chỉ vận hành hệ thống, không có quyền duyệt
  if (user.role === 'ADMIN') {
    return false;
  }

  // Cấp 4 (Nhân Viên) không có quyền duyệt bất kỳ công việc nào
  if (isLevel4Staff(user)) {
    return false;
  }

  // 1. Không bao giờ được tự duyệt công việc được giao cho chính bản thân mình làm (kể cả Cấp 1)
  if (task.assignedTo.includes(user.id)) {
    return false;
  }

  // 2. Cấp 1 (Quản Lý: Anh Xa, Anh Vũ): Toàn quyền duyệt tất cả công việc trong hệ thống
  if (
    user.id === 'user-tong-truong-xa' ||
    user.id === 'user-nguyen-tran-hoang-vu' ||
    user.level === 'LEVEL_1_MANAGER' ||
    user.role === 'MANAGER'
  ) {
    return true;
  }

  // 3. Nguyên tắc: Người trực tiếp giao việc (task.createdBy === user.id) là người được duyệt
  if (task.createdBy === user.id) {
    return true;
  }

  // 4. Quy tắc Cấp 3: Ai ở Cấp 3 giao việc thì người đó có quyền duyệt, người cùng cấp không có quyền duyệt
  // (trừ trường hợp được người giao việc chính thức chỉ định làm Giám Sát / Đầu mối phụ trách)
  if (user.level === 'LEVEL_3_LEAD') {
    // Nếu được chỉ định làm Tổ Trưởng / Giám sát hiện trường (leadId hoặc có tên trong reviewers)
    if (task.leadId === user.id || task.reviewers?.includes(user.id)) {
      return true;
    }

    // Xác định xem người tạo task có phải là một Cấp 3 khác không
    let isCreatorPeerLead = false;
    if (allUsers && allUsers.length > 0) {
      const creator = allUsers.find((u) => u.id === task.createdBy);
      isCreatorPeerLead = creator?.level === 'LEVEL_3_LEAD';
    } else {
      isCreatorPeerLead =
        task.createdBy === 'user-tran-tuan-hai' || task.createdBy === 'user-phan-thanh-tai';
    }

    // Nếu do Cấp 3 khác giao việc và KHÔNG chỉ định user này làm giám sát: Cùng cấp không được duyệt chéo!
    if (isCreatorPeerLead && task.createdBy !== user.id) {
      return false;
    }
  }

  // Cấp 2 (Điều Phối): có quyền duyệt các công việc do mình tạo hoặc được chỉ định nhận báo cáo
  if (user.level === 'LEVEL_2_SECRETARY' || user.role === 'SECRETARY') {
    if (task.createdBy === user.id || task.reviewers?.includes(user.id) || task.isDaily) {
      return true;
    }
  }

  // Mọi nhân sự khác không phải người giao việc -> KHÔNG ĐƯỢC DUYỆT (chỉ xem)
  return false;
}

/**
 * Kiểm tra xem người dùng có quyền TRỰC TIẾP thay đổi thời gian hoàn thành / gia hạn & chuyển giao công việc ngay lập tức hay không.
 * Thẩm quyền:
 * - Cấp 1 (Ban Lãnh Đạo & Quản Lý): Toàn quyền
 * - Cấp 2 (Nhân Viên Điều Phối): Toàn quyền điều phối công việc hằng ngày
 * - Người trực tiếp giao việc (task.createdBy === user.id)
 * - Cấp 3 (Tổ Trưởng / Giám Sát):
 *   + Được đổi việc do chính mình giao (task.createdBy === user.id).
 *   + Đổi việc thuộc Tổ của mình nếu do Cấp 1, Cấp 2 giao.
 *   + KHÔNG ĐƯỢC đổi việc do Cấp 3 cùng cấp khác giao việc.
 * - Cấp 4 (Nhân Viên): KHÔNG ĐƯỢC đổi trực tiếp (phải gửi yêu cầu xin gia hạn chờ duyệt).
 */
export function canDirectlyExtendTask(user?: User | null, task?: Task | null, allUsers?: User[]): boolean {
  if (!user || !task) return false;

  // Quản trị viên chỉ vận hành hệ thống, không can thiệp điều hành tiến độ công việc
  if (user.role === 'ADMIN') return false;

  // Cấp 4 (Nhân Viên) không có quyền tự thay đổi hạn chót công việc
  if (isLevel4Staff(user)) return false;

  // Cấp 1 có toàn quyền
  if (
    user.id === 'user-tong-truong-xa' ||
    user.id === 'user-nguyen-tran-hoang-vu' ||
    user.level === 'LEVEL_1_MANAGER' ||
    user.role === 'MANAGER'
  ) {
    return true;
  }

  // Cấp 2 (Điều Phối) có quyền thay đổi hạn các việc điều phối
  if (user.level === 'LEVEL_2_SECRETARY' || user.role === 'SECRETARY') {
    return true;
  }

  // Người trực tiếp giao việc luôn có toàn quyền gia hạn / phân công lại
  if (task.createdBy === user.id) {
    return true;
  }

  // Cấp 3 (Tổ trưởng):
  if (user.level === 'LEVEL_3_LEAD') {
    // Kiểm tra xem người tạo task có phải là Cấp 3 khác không
    let isCreatorPeerLead = false;
    if (allUsers && allUsers.length > 0) {
      const creator = allUsers.find((u) => u.id === task.createdBy);
      isCreatorPeerLead = creator?.level === 'LEVEL_3_LEAD';
    } else {
      isCreatorPeerLead =
        task.createdBy === 'user-tran-tuan-hai' || task.createdBy === 'user-phan-thanh-tai';
    }

    // Nếu là do Cấp 3 khác giao -> Cùng cấp KHÔNG ĐƯỢC thay đổi
    if (isCreatorPeerLead && task.createdBy !== user.id) {
      return false;
    }

    // Nếu việc do Cấp 1/Cấp 2 giao và chỉ định tổ của mình
    if (task.leadId === user.id || task.reviewers?.includes(user.id)) {
      return true;
    }
  }

  return false;
}

/**
 * Alias cho canDirectlyExtendTask
 */
export function canExtendTaskDeadline(user?: User | null, task?: Task | null, allUsers?: User[]): boolean {
  return canDirectlyExtendTask(user, task, allUsers);
}

/**
 * Kiểm tra xem người dùng có quyền GỬI YÊU CẦU xin gia hạn & đề xuất bàn giao công việc hay không.
 * - Bất kỳ nhân sự nào đang được giao làm task đó (đặc biệt là Cấp 4)
 * - Task chưa hoàn thành (chưa APPROVED)
 */
export function canRequestExtension(user?: User | null, task?: Task | null): boolean {
  if (!user || !task) return false;
  if (task.status === 'APPROVED') return false;
  return task.assignedTo.includes(user.id);
}

/**
 * Kiểm tra xem người dùng có quyền PHÊ DUYỆT yêu cầu gia hạn & chỉ định người thay thế hay không.
 * Quy định cốt lõi:
 * "Quy tắc khi cấp nhỏ yêu cầu đổi thời gian hoàn thành thì các cấp trên hoặc người giao việc mới có quyền duyệt thay đổi hoặc chỉ định người khác làm thay thế,
 *  ai ở cấp 3 giao việc thì người đó có quyền duyệt người cùng cấp không có quyền duyệt."
 */
export function canApproveExtensionRequest(user?: User | null, task?: Task | null, allUsers?: User[]): boolean {
  if (!user || !task) return false;

  // Quản trị viên chỉ vận hành hệ thống, không có quyền duyệt
  if (user.role === 'ADMIN') return false;

  // Cấp 4 không có thẩm quyền duyệt
  if (isLevel4Staff(user)) return false;

  // 1. Cấp 1 (Ban Lãnh Đạo): Toàn quyền duyệt mọi yêu cầu gia hạn và chỉ định người thay thế
  if (
    user.id === 'user-tong-truong-xa' ||
    user.id === 'user-nguyen-tran-hoang-vu' ||
    user.level === 'LEVEL_1_MANAGER' ||
    user.role === 'MANAGER'
  ) {
    return true;
  }

  // 2. Người trực tiếp giao việc (bất kể cấp nào) luôn có quyền duyệt gia hạn hoặc chỉ định thay thế
  if (task.createdBy === user.id) {
    return true;
  }

  // 3. Cấp 2 (Điều Phối): Có quyền duyệt các công việc hằng ngày, công việc điều phối
  if (user.level === 'LEVEL_2_SECRETARY' || user.role === 'SECRETARY') {
    return true;
  }

  // 4. Cấp 3 (Tổ Trưởng / Giám Sát):
  // "Ai ở Cấp 3 giao việc thì người đó có quyền duyệt, người cùng cấp KHÔNG CÓ QUYỀN DUYỆT"
  if (user.level === 'LEVEL_3_LEAD') {
    // Nếu người tạo task là một Cấp 3 khác -> Cấm duyệt!
    let isCreatorPeerLead = false;
    if (allUsers && allUsers.length > 0) {
      const creator = allUsers.find((u) => u.id === task.createdBy);
      isCreatorPeerLead = creator?.level === 'LEVEL_3_LEAD';
    } else {
      isCreatorPeerLead =
        task.createdBy === 'user-tran-tuan-hai' || task.createdBy === 'user-phan-thanh-tai';
    }

    if (isCreatorPeerLead && task.createdBy !== user.id) {
      return false;
    }

    // Nếu do Cấp 1/Cấp 2 giao và phân công cho Tổ của mình
    if (task.leadId === user.id || task.reviewers?.includes(user.id)) {
      return true;
    }
  }

  return false;
}

/**
 * Kiểm tra xem người dùng có quyền nhìn thấy một task hay không.
 * Quy tắc phân quyền hiển thị theo yêu cầu:
 * 1. Điểm 4: Nếu là công việc nội bộ Ban Quản Lý (task.isManagementOnly = true),
 *    CHỈ CÓ Cấp 1 (Anh Xa & Anh Vũ) mới nhìn thấy. Cấp 2 (Điều Phối), Cấp 3, Cấp 4 hoàn toàn KHÔNG THẤY.
 * 2. Cấp 1 (Quản Lý) & Cấp 2 (Nhân Viên Điều Phối): Thấy tất cả các task thông thường trong hệ thống.
 * 3. Cấp 4 (Nhân Viên): CHỈ THẤY công việc được giao cho chính mình (task.assignedTo.includes(user.id)),
 *    hoàn toàn KHÔNG THẤY công việc của người khác.
 * 4. Cấp 3 (Giám Sát):
 *    - Thấy các công việc hằng ngày (task.isDaily = true) của Cấp 4 để theo dõi và duyệt.
 *    - Thấy các công việc được giao cho chính bản thân mình hoặc tổ của mình phụ trách.
 *    - KHÔNG THẤY các dự án/kế hoạch dài hạn của người khác, KHÔNG thấy công việc của Cấp 1, Cấp 2 hoặc Giám sát khác.
 */
export function canViewTask(user?: User | null, task?: Task | null, allUsers?: User[]): boolean {
  if (!user || !task) return false;

  const isLevel1 =
    user.id === 'user-tong-truong-xa' ||
    user.id === 'user-nguyen-tran-hoang-vu' ||
    user.level === 'LEVEL_1_MANAGER' ||
    user.role === 'ADMIN' ||
    user.role === 'MANAGER';

  // Điểm 4: Công việc nội bộ Ban Quản Lý -> CHỈ Cấp 1 thấy
  if (task.isManagementOnly) {
    return isLevel1;
  }

  // 1. Cấp 1 & Cấp 2 thấy tất cả các công việc thông thường
  if (
    isLevel1 ||
    user.level === 'LEVEL_2_SECRETARY' ||
    user.role === 'SECRETARY'
  ) {
    return true;
  }

  // 2. Cấp 4 (Nhân Viên): CHỈ thấy công việc được giao cho mình, KHÔNG thấy việc của người khác
  if (isLevel4Staff(user)) {
    return task.assignedTo.includes(user.id);
  }

  // 3. Cấp 3 (Giám Sát):
  if (user.level === 'LEVEL_3_LEAD') {
    // Luôn thấy công việc được giao cho chính mình, do mình tạo ra, hoặc mình làm lead
    if (task.assignedTo.includes(user.id) || task.createdBy === user.id || task.leadId === user.id || task.reviewers?.includes(user.id)) {
      return true;
    }

    // Cấp 3 thấy được công việc hằng ngày của Cấp 4 để duyệt
    if (task.isDaily) {
      if (allUsers && allUsers.length > 0) {
        return task.assignedTo.some((memberId) => {
          const assignee = allUsers.find((u) => u.id === memberId);
          return assignee ? isLevel4Staff(assignee) : false;
        });
      }
      return true;
    }

    // Dự án dài hạn của người khác hoặc việc không thuộc Cấp 4: KHÔNG THẤY
    return false;
  }

  // Mặc định an toàn: chỉ thấy việc giao cho mình
  return task.assignedTo.includes(user.id);
}

/**
 * Kiểm tra xem người dùng có quyền đồng nhận và xem xét báo cáo hay không (tổng quát).
 */
export function canReviewReports(user?: User | null): boolean {
  if (!user) return false;
  // Quản trị viên chỉ làm công tác vận hành hệ thống, không có quyền duyệt báo cáo
  if (user.role === 'ADMIN') return false;
  return (
    user.level === 'LEVEL_1_MANAGER' ||
    user.level === 'LEVEL_2_SECRETARY' ||
    user.level === 'LEVEL_3_LEAD' ||
    (user.permissions?.canReviewReports ?? false) ||
    user.role === 'MANAGER' ||
    user.role === 'SECRETARY'
  );
}
