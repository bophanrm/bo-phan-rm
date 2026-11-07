# Bộ Phận RM — Hệ Thống Điều Hành & Báo Cáo Công Việc 24/7 (0 VNĐ)

Hệ thống quản lý, giao việc và nghiệm thu báo cáo công việc cho đội ngũ dưới 20 nhân sự, hoạt động 24/7 qua mạng 4G/5G, tự động sao lưu dữ liệu sang Google Drive cá nhân, chi phí hạ tầng 0 VNĐ/tháng.

---

## 🚀 Tính Năng Chính
1. **Phân quyền 2 cấp**: 
   - **Quản lý / Trưởng phòng**: Lên kế hoạch tuần, giao việc đích danh, đặt hạn chót & hạn báo cáo, xem và duyệt kết quả có file/ảnh đính kèm.
   - **Nhân viên**: Nhận thông báo việc mới tức thì, nộp báo cáo kết quả kèm ảnh chụp thực tế hoặc tài liệu.
2. **Nén ảnh tự động ngay trên điện thoại**:
   - Ảnh chụp từ điện thoại (5-10MB) được tự động nén xuống còn ~150-200KB trước khi gửi, tiết kiệm 95% băng thông và dung lượng lưu trữ.
3. **Kế hoạch Tuần & Ngày (Planning Board)**:
   - Trực quan hóa công việc từ Thứ Hai đến Chủ Nhật, lọc theo từng nhân sự hoặc xem cả team.
4. **Hạ tầng 0 VNĐ vĩnh viễn**:
   - Vercel (Hosting Web + CDN 4G/5G siêu tốc) + Supabase (Database PostgreSQL & Auth).
5. **Sao lưu tự động sang Google Drive**:
   - Kịch bản chạy lúc 00:00 hằng ngày trích xuất dữ liệu và đẩy về Google Drive cá nhân.

---

## 🛠️ Hướng Dẫn Chạy Thử Trên Máy

```bash
# 1. Đi đến thư mục dự án
cd /Users/a1234/.gemini/antigravity/scratch/taskmaster-pwa

# 2. Khởi chạy máy chủ phát triển
npm run dev
```

Mở trình duyệt truy cập: `http://localhost:3000`

---

## 📱 Cài Đặt Lên Điện Thoại Làm App (PWA)
1. Mở đường link ứng dụng trên **Safari (iOS)** hoặc **Chrome (Android)**.
2. Chọn biểu tượng Chia sẻ (iOS) hoặc Menu 3 chấm (Android) -> Chọn **"Thêm vào Màn hình chính (Add to Home Screen)"**.
3. Biểu tượng **Bộ Phận RM** sẽ xuất hiện ngoài màn hình, mở ra chạy toàn màn hình và nhận thông báo rung chuông qua 4G/5G!
