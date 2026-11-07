# SPEC.md — Bộ Phận RM PWA (Hệ Thống Quản Lý & Điều Hành Công Việc Tinh Gọn)

## 1. Mục Tiêu & Đối Tượng Sử Dụng (Objective & Users)
- **Mục tiêu**: Cung cấp nền tảng web/mobile PWA điều hành, giao việc, lên kế hoạch và nghiệm thu báo cáo công việc tức thì qua mạng di động 4G/5G, hoạt động 24/7/365, tự động sao lưu dữ liệu sang bên thứ 3 và chi phí vận hành 0 VNĐ.
- **Quy mô đối tượng**: Đội ngũ dưới 20 nhân sự, gồm 2 nhóm vai trò chính:
  1. **Quản lý / Trưởng phòng (Manager / Admin)**: Lên kế hoạch tuần/ngày, giao việc đích danh, theo dõi tiến độ, nhận thông báo tức thì khi nhân viên nộp bài, duyệt/yêu cầu sửa báo cáo kèm file/ảnh.
  2. **Nhân viên (Staff / Member)**: Nhận thông báo việc mới qua chuông & push banner, xem danh sách việc cần làm, nộp báo cáo kèm ghi chú và ảnh/file kết quả nén tự động.

---

## 2. Kiến Trúc Kỹ Thuật (Architecture & Free Tier Contract)

```
[ PWA Mobile / Web Client (Next.js + Tailwind) ]
                     │
         (Mạng 4G/5G HTTPS TLS 1.3)
                     │
                     ▼
         [ Vercel Serverless Edge ]
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
[ Supabase PostgreSQL ]    [ Supabase Storage ]
   (Data + RLS Auth)       (Ảnh / File Báo Cáo)
         │
         ▼ (Mỗi 00:00 hằng ngày)
[ GitHub Actions Backup ] ──> [ Google Drive Cá Nhân ]
```

- **Frontend & App**: Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons.
- **PWA Capabilities**: Service Worker, Web App Manifest, App Icon, Add to Home Screen, Web Push Notifications API.
- **Database & Auth**: PostgreSQL (Supabase Free Tier) với Row-Level Security (RLS) bảo vệ từng dòng dữ liệu.
- **File Storage**: Supabase Storage Bucket (Private Signed URLs) + Nén ảnh tự động phía Client (Canvas/Browser compression < 200KB).
- **Hạ tầng 0 VNĐ**:
  - Hosting: Vercel Free Hobby Plan (Băng thông 100GB/tháng, SSL tự động, domain `.vercel.app`).
  - Database & Auth: Supabase Free Tier (500MB DB, 50.000 users).
  - Backup: GitHub Actions Cron Job -> Google Drive API (0 VNĐ).

---

## 3. Cấu Trúc Dữ Liệu Cốt Lõi (Core Data Schema)

### 3.1. Bảng `users`
- `id` (UUID, Primary Key)
- `email` (String, Unique)
- `full_name` (String)
- `role` ('ADMIN' | 'MANAGER' | 'STAFF')
- `department` (String)
- `avatar_url` (String, optional)
- `phone` (String, optional)
- `created_at` (Timestamp)

### 3.2. Bảng `tasks`
- `id` (UUID, Primary Key)
- `title` (String): Tiêu đề công việc
- `description` (Text): Chi tiết yêu cầu công việc
- `assigned_to` (UUID[] -> users.id): Danh sách các nhân sự cùng thực hiện trong tổ
- `team_name` (String, optional): Tên tổ/đội (VD: "Tổ 1: Kỹ Thuật Điện", "Tổ Thi Công")
- `lead_id` (UUID -> users.id): Tổ trưởng / Người phụ trách chính
- `reviewers` (UUID[] -> users.id): Danh sách người nhận báo cáo (Mặc định: Trưởng phòng & Thư ký)
- `created_by` (UUID -> users.id): Người giao việc
- `status` ('TODO' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED')
- `priority` ('LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')
- `start_date` (Timestamp): Thời gian bắt đầu
- `due_date` (Timestamp): Hạn hoàn thành
- `report_deadline` (Timestamp): Hạn chót nộp báo cáo
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### 3.3. Bảng `task_reports`
- `id` (UUID, Primary Key)
- `task_id` (UUID -> tasks.id)
- `submitted_by` (UUID -> users.id)
- `summary` (Text): Tóm tắt kết quả công việc
- `notes` (Text, optional): Khó khăn, đề xuất
- `status` ('PENDING_REVIEW' | 'ACCEPTED' | 'REVISION_NEEDED')
- `manager_feedback` (Text, optional): Nhận xét của sếp
- `submitted_at` (Timestamp)
- `reviewed_at` (Timestamp, optional)

### 3.4. Bảng `task_attachments`
- `id` (UUID, Primary Key)
- `report_id` (UUID -> task_reports.id)
- `file_name` (String)
- `file_url` (String)
- `file_size` (Integer): Dung lượng (bytes)
- `file_type` ('IMAGE' | 'DOCUMENT' | 'SPREADSHEET' | 'OTHER')
- `created_at` (Timestamp)

### 3.5. Bảng `weekly_plans`
- `id` (UUID, Primary Key)
- `week_number` (Integer): Số tuần trong năm (1-52)
- `year` (Integer)
- `title` (String): Mục tiêu tuần
- `created_by` (UUID -> users.id)
- `created_at` (Timestamp)

### 3.6. Bảng `notifications`
- `id` (UUID, Primary Key)
- `user_id` (UUID -> users.id): Người nhận thông báo
- `title` (String)
- `message` (String)
- `link` (String): Đường dẫn đến việc cần xử lý
- `is_read` (Boolean, default: false)
- `created_at` (Timestamp)

---

## 4. Đặc Tả Giao Diện & Trải Nghiệm (UI/UX Specification)
Tuân thủ chặt chẽ nguyên tắc từ `ui-ux-pro-max` và `impeccable`:
- **Phong cách**: Bento Box Modern Grid (khối bo góc 16px - 20px, bóng đổ êm dịu, không lạm dụng viền dày).
- **Màu sắc Semantic**:
  - Nền chính: `#F8FAFC` (Slate 50) dịu mắt khi nhìn lâu.
  - Thẻ card: `#FFFFFF` với border viền mảnh `#E2E8F0`.
  - Màu nhấn chính (Brand Primary): Xanh dương hiện đại `#2563EB` (Blue 600) — tượng trưng cho sự tin cậy, hành động nhanh.
  - Trạng thái: Xanh lá `#16A34A` (Hoàn thành), Vàng `#D97706` (Chờ duyệt), Đỏ `#DC2626` (Quá hạn/Khẩn).
- **Trải nghiệm di động (Mobile-First touch discipline)**:
  - Tất cả các nút bấm, icon thao tác đều có kích thước tối thiểu **44×44px**.
  - Font chữ hệ thống (System Font Stack) tải 0ms, không lag giật trên 4G.
  - Nút nộp báo cáo chụp ảnh có preview ảnh trực tiếp và hiển thị % nén ảnh rõ ràng.

---

## 5. Ranh Giới Kỹ Thuật (System Boundaries)
- **Always do**:
  - Nén ảnh phía trình duyệt (Client-side Canvas Compression) trước khi gửi lên Cloud để tiết kiệm băng thông và dung lượng 1GB.
  - Phân quyền chặt chẽ: Nhân viên không thể xem bảng lương/kế hoạch bí mật của quản trị viên.
  - Bắt buộc kiểm tra độ tương phản văn bản chuẩn WCAG 2.1 AA (tối thiểu 4.5:1).
- **Never do**:
  - Không dùng các thư viện trả phí hay dịch vụ tính tiền theo lượt gọi API.
  - Không hardcode thông tin bí mật (API keys, passwords) vào mã nguồn.

---

## 6. Tiêu Chí Nghiệm Thu (Definition of Done - DoD)
1. Ứng dụng chạy mượt mà trên cả trình duyệt Desktop và Mobile (Responsive 100%).
2. Đăng ký/Đăng nhập phân quyền chuẩn 2 cấp (Quản lý và Nhân viên).
3. Quản lý tạo việc: chỉ định người làm, hạn chót, hạn báo cáo -> Nhân viên nhận được thông báo chuông và danh sách việc.
4. Nhân viên nộp báo cáo: Tải được ảnh chụp/file tài liệu -> Quản lý nhận được thông báo kèm file kết quả.
5. Quản lý duyệt báo cáo: Chuyển trạng thái sang Hoàn thành hoặc Yêu cầu sửa.
6. Khu vực Lập kế hoạch Ngày & Tuần: Bảng Kanban/Timeline hiển thị trực quan các đầu việc theo ngày.
7. PWA Ready: Có manifest, app icon, cài được lên màn hình chính điện thoại iOS và Android.
8. Kịch bản sao lưu tự động (Automated Backup Script) sẵn sàng kết nối.
