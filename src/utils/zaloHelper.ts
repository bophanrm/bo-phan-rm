import { Task, User } from '@/types';
import { getPersonalName } from './nameHelper';

/**
 * Gửi tin nhắn qua API Zalo Bot
 */
export async function sendZaloMessage(
  message: string,
  groupId?: string,
  type: 'NEW_TASK' | 'DAILY_REMINDER' | 'PROJECT_REMINDER' | 'TEST' = 'TEST'
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  try {
    const res = await fetch('/api/zalo/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, groupId, type }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Format và gửi tin thông báo khi có công việc mới được giao
 */
export async function notifyNewTaskToZalo(task: Task, users: User[], creatorUser?: User) {
  try {
    // Không gửi các công việc riêng của Ban Quản Lý (Cấp 1) hoặc việc riêng không qua giám sát ra ngoài nhóm chung
    if (task.isManagementOnly || task.isDirectToStaff) return;

    const assignees = users
      .filter((u) => task.assignedTo.includes(u.id))
      .map((u) => `@${getPersonalName(u.name, true)}`)
      .join(', ') || 'Chưa chỉ định';

    const supervisor = users.find((u) => u.id === task.leadId);
    const supervisorText = supervisor ? getPersonalName(supervisor.name, true) : 'Chưa có';
    const creatorText = creatorUser ? getPersonalName(creatorUser.name, true) : 'Ban Quản Lý';

    const priorityLabels: Record<string, string> = {
      LOW: '🟢 Thấp',
      MEDIUM: '🔵 Bình thường',
      HIGH: '🟠 Ưu tiên cao',
      URGENT: '🔴 Khẩn cấp',
    };

    let deadlineText = '';
    if (task.reportDeadline) {
      const d = new Date(task.reportDeadline);
      deadlineText = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } else if (task.dueDate) {
      const d = new Date(task.dueDate);
      deadlineText = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } else {
      deadlineText = 'Toàn ca trực hôm nay';
    }

    const typeLabel = task.isDaily ? '⚡ CÔNG VIỆC HẰNG NGÀY' : '📋 DỰ ÁN / KẾ HOẠCH DÀI HẠN';

    const message = 
`🔔 [BỘ PHẬN RM] ${typeLabel} MỚI
━━━━━━━━━━━━━━━━━━━━
📌 Nhiệm vụ: ${task.title}
👤 Phụ trách: ${assignees}
🛡️ Giám sát hiện trường: ${supervisorText}
⏰ Hạn nộp báo cáo: ${deadlineText}
⚡ Ưu tiên: ${priorityLabels[task.priority] || 'Bình thường'}
✍️ Giao bởi: ${creatorText}
━━━━━━━━━━━━━━━━━━━━
👉 Vui lòng mở ứng dụng Bộ Phận RM để nhận nhiệm vụ và nộp báo cáo kết quả!`;

    await sendZaloMessage(message, undefined, 'NEW_TASK');
  } catch (error) {
    console.error('[ZaloHelper] Error in notifyNewTaskToZalo:', error);
  }
}

/**
 * Format và gửi tin nhắc nhở trước khi hết ca trực 60 phút theo ca làm việc của từng nhân viên
 */
export async function notifyDailyShiftReminderToZalo(
  unsubmittedItems:
    | {
        task: Task;
        assignees?: User[];
      }[]
    | Task[],
  users: User[],
  shiftInfo?: {
    name: string;
    timeRange: string;
    reminderTime: string;
    endTime: string;
  }
) {
  try {
    if (!unsubmittedItems || unsubmittedItems.length === 0) return;

    // Chuẩn hoá danh sách task và assignees
    const normalizedTasks: { task: Task; assignees: User[] }[] = [];

    unsubmittedItems.forEach((item) => {
      if ('task' in item) {
        if (!item.task.isManagementOnly && !item.task.isDirectToStaff) {
          normalizedTasks.push({
            task: item.task,
            assignees: item.assignees && item.assignees.length > 0
              ? item.assignees
              : users.filter((u) => item.task.assignedTo.includes(u.id)),
          });
        }
      } else {
        const t = item as Task;
        if (!t.isManagementOnly && !t.isDirectToStaff) {
          normalizedTasks.push({
            task: t,
            assignees: users.filter((u) => t.assignedTo.includes(u.id)),
          });
        }
      }
    });

    if (normalizedTasks.length === 0) return;

    let taskListText = '';
    normalizedTasks.slice(0, 10).forEach((entry, idx) => {
      const assigneesText =
        entry.assignees.length > 0
          ? entry.assignees.map((u) => `@${getPersonalName(u.name, true)}`).join(', ')
          : 'Chưa phân công';
      taskListText += `${idx + 1}. ${entry.task.title} (${assigneesText})\n`;
    });

    if (normalizedTasks.length > 10) {
      taskListText += `... và ${normalizedTasks.length - 10} công việc khác.\n`;
    }

    const shiftHeader = shiftInfo ? ` (${shiftInfo.name}: ${shiftInfo.timeRange})` : '';
    const reminderTimeStr = shiftInfo?.reminderTime || '15:00';
    const endTimeStr = shiftInfo?.endTime || '16:00';

    const message = 
`⏰ [BỘ PHẬN RM] NHẮC NHỞ HẠN NỘP CA TRỰC${shiftHeader}
━━━━━━━━━━━━━━━━━━━━
Đã đến ${reminderTimeStr} (còn 60 phút nữa kết thúc ca làm việc ${endTimeStr}).
Hiện tại hệ thống ghi nhận các công việc sau CHƯA GỬI BÁO CÁO hoàn thành:

${taskListText.trim()}
━━━━━━━━━━━━━━━━━━━━
👉 Các anh vui lòng chụp ảnh nghiệm thu và gửi báo cáo hoàn thành trên hệ thống trước ${endTimeStr}!`;

    await sendZaloMessage(message, undefined, 'DAILY_REMINDER');
  } catch (error) {
    console.error('[ZaloHelper] Error in notifyDailyShiftReminderToZalo:', error);
  }
}

/**
 * Format và gửi tin nhắc nhở cho Dự án / Kế hoạch dài hạn
 */
export async function notifyProjectDeadlineReminderToZalo(task: Task, users: User[], daysLeft: number) {
  try {
    // Không gửi công việc nội bộ BQL hoặc việc riêng không qua giám sát ra Zalo
    if (task.isManagementOnly || task.isDirectToStaff) return;

    const assignees = users
      .filter((u) => task.assignedTo.includes(u.id))
      .map((u) => `@${getPersonalName(u.name, true)}`)
      .join(', ');

    const supervisor = users.find((u) => u.id === task.leadId);
    const supervisorText = supervisor ? getPersonalName(supervisor.name, true) : 'Chưa có';

    const deadline = new Date(task.reportDeadline || task.dueDate);
    const deadlineText = `${deadline.getDate()}/${deadline.getMonth() + 1}/${deadline.getFullYear()}`;

    const daysText = daysLeft === 0 ? 'HÔM NAY là hạn chót!' : `Còn ${daysLeft} ngày nữa đến hạn nộp!`;

    const message = 
`🚨 [BỘ PHẬN RM] NHẮC HẠN DỰ ÁN DÀI HẠN
━━━━━━━━━━━━━━━━━━━━
📁 Tên dự án: ${task.title}
⏳ Tình trạng: ${daysText}
📅 Hạn hoàn thành: ${deadlineText}
👤 Phụ trách: ${assignees}
🛡️ Giám sát: ${supervisorText}
━━━━━━━━━━━━━━━━━━━━
👉 Ban Quản Lý nhắc nhở các bộ phận đôn đốc tiến độ để hoàn thành đúng kế hoạch!`;

    await sendZaloMessage(message, undefined, 'PROJECT_REMINDER');
  } catch (error) {
    console.error('[ZaloHelper] Error in notifyProjectDeadlineReminderToZalo:', error);
  }
}
