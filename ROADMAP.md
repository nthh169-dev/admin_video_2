# Lộ trình Thực hiện Dự án (Vibe Coding Roadmap)

Tài liệu này chia nhỏ dự án thành 5 giai đoạn rõ ràng. Tất cả các giai đoạn đã được hoàn thành đầy đủ dựa trên các file `.MD` đặc tả.

---

## Giai đoạn 1: Khởi tạo tầng Database SQLite (`sql.js` + `IndexedDB`)
- [x] Tạo file `assets/js/db/sqlite-manager.js` nạp thư viện `sql.js` (WebAssembly).
- [x] Thiết lập cơ chế khởi tạo và lưu trữ tự động 4 cơ sở dữ liệu:
  - `users.db`
  - `videos.db`
  - `video_categories.db`
  - `video_analytics.db`
- [x] Viết hàm `seedDatabase()` tự động chạy các câu lệnh `CREATE TABLE` và `INSERT` dữ liệu mẫu theo đúng thiết kế trong `DATABASE.md`.
- [x] Thêm tiện ích cho phép Xuất (Export) từng file `.db` về máy tính hoặc Khôi phục (Reset) dữ liệu mẫu.

## Giai đoạn 2: Xây dựng Hệ thống Giao diện Light Mode (CSS Framework nội bộ)
- [x] Tạo bộ file CSS (`variables.css`, `base.css`, `auth.css`, `dashboard.css`, `videos.css`) định nghĩa các biến màu sắc Light Mode (nền trắng `#FFFFFF`, nền phụ `#F8FAFC`, chữ `#0F172A`, màu nhấn `#2563EB`).
- [x] Thiết kế khung Layout chuẩn gồm Sidebar bên trái, Header phía trên và vùng nội dung chính.
- [x] Thiết kế style cho Bảng dữ liệu (Table), Nút bấm (Buttons), Thẻ thống kê (KPI Cards) và Cửa sổ bật lên (Modal).

## Giai đoạn 3: Xây dựng 3 trang Xác thực (Login, Register, Forgot Password)
- [x] Tạo `login.html`: Form đăng nhập kiểm tra trực tiếp bảng `users` trong `users.db`. Có nút điền nhanh tài khoản mẫu.
- [x] Tạo `register.html`: Form đăng ký tài khoản mới, kiểm tra trùng email và lưu vào `users.db`.
- [x] Tạo `forgot-password.html`: Form xác minh email + mã khôi phục bảo mật để cập nhật mật khẩu mới vào `users.db`.

## Giai đoạn 4: Xây dựng trang Dashboard (`index.html`)
- [x] Hiển thị 3 thẻ KPI lấy dữ liệu thực từ `videos.db`:
  1. **Tổng số video** (`COUNT(*)`)
  2. **Tổng lượt xem** (`SUM(views)`)
  3. **Dung lượng Storage** (`SUM(file_size_mb)` quy đổi ra GB kèm thanh phần trăm)
- [x] Tích hợp **Chart.js** vẽ **Biểu đồ cột (Bar Chart)**: Top 10 video nhiều lượt xem nhất từ `videos.db`.
- [x] Tích hợp **Chart.js** vẽ **Biểu đồ đường (Line Chart)**: Lượt xem theo Ngày và theo Tháng từ `video_analytics.db` (có nút chuyển đổi Ngày / Tháng).

## Giai đoạn 5: Xây dựng trang List Video (`videos.html`)
- [x] Hiển thị bảng danh sách video với đầy đủ các cột: `ID`, `Thumbnail`, `Title` (kèm tên danh mục từ `video_categories.db`), `Views`, và `Action (Edit, Delete)`.
- [x] Xây dựng tính năng **Thêm mới Video** và **Chỉnh sửa Video (Edit)** qua Modal, cập nhật trực tiếp vào `videos.db`.
- [x] Xây dựng tính năng **Xóa Video (Delete)** có xác nhận, xóa bản ghi khỏi `videos.db` và tự động cập nhật lại số liệu Dashboard.
- [x] Thêm thanh tìm kiếm theo tiêu đề và bộ lọc theo danh mục (`video_categories.db`).
