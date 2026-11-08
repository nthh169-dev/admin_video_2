# Product Requirements Document (PRD)
**Tên dự án:** Hệ thống Quản trị Video (Video Admin Portal)  
**Phương pháp phát triển:** Vibe Coding  
**Nền tảng:** Web Client-side (HTML, CSS, JS + SQLite WebAssembly)

---

## 1. Mục tiêu sản phẩm
Xây dựng một hệ thống quản trị video trực quan, tốc độ phản hồi tức thì, giao diện sáng (Light Mode) giúp người quản trị:
1. Quản lý tài khoản truy cập (Đăng nhập, Đăng ký, Khôi phục mật khẩu).
2. Theo dõi các chỉ số tổng quan (Tổng số video, Tổng lượt xem, Dung lượng lưu trữ) và biểu đồ phân tích trực quan.
3. Quản lý danh sách video (Xem danh sách, Thêm mới, Chỉnh sửa, Xóa, Lọc theo danh mục).

---

## 2. Chi tiết các trang chức năng

### 2.1. Nhóm trang Xác thực (Authentication) — Sử dụng `users.db`

#### A. Trang Đăng nhập (`login.html`)
- **Mục đích:** Xác thực người dùng trước khi vào trang quản trị.
- **Trường dữ liệu:**
  - `Email / Username` (bắt buộc)
  - `Password` (bắt buộc, có nút ẩn/hiện mật khẩu)
  - Checkbox `Ghi nhớ đăng nhập`
- **Hành động & Điều hướng:**
  - Nút **Đăng nhập**: Kiểm tra thông tin trong bảng `users` của `users.db`. Nếu khớp, lưu phiên làm việc (`sessionStorage`/`localStorage`) và chuyển hướng sang `index.html` (Dashboard).
  - Liên kết **Quên mật khẩu?**: Chuyển sang `forgot-password.html`.
  - Liên kết **Đăng ký tài khoản mới**: Chuyển sang `register.html`.

#### B. Trang Đăng ký (`register.html`)
- **Mục đích:** Tạo mới tài khoản quản trị viên.
- **Trường dữ liệu:**
  - `Họ và tên` (`full_name`)
  - `Email` (`email` - kiểm tra định dạng email và tính duy nhất trong `users.db`)
  - `Mật khẩu` (`password` - tối thiểu 6 ký tự)
  - `Xác nhận mật khẩu` (`confirm_password` - phải khớp với mật khẩu)
  - `Mã khôi phục dự phòng / Câu hỏi bảo mật` (dùng cho tính năng quên mật khẩu vì không có backend gửi mail)
- **Hành động:**
  - Lưu bản ghi mới vào bảng `users` trong `users.db`.
  - Hiển thị thông báo thành công và chuyển sang trang `login.html`.

#### C. Trang Quên mật khẩu (`forgot-password.html`)
- **Mục đích:** Đặt lại mật khẩu khi người dùng quên (hoạt động hoàn toàn ở Client-side thông qua `users.db`).
- **Quy trình 2 bước trên giao diện:**
  - **Bước 1 (Xác minh):** Nhập `Email` đã đăng ký + `Mã khôi phục / Câu trả lời bảo mật` (hoặc mã OTP mô phỏng hiển thị ngay trên màn hình thông báo).
  - **Bước 2 (Đặt lại mật khẩu):** Nhập `Mật khẩu mới` và `Xác nhận mật khẩu mới`.
- **Hành động:** Cập nhật cột `password_hash` trong bảng `users` (`users.db`) và điều hướng về `login.html`.

---

### 2.2. Trang Tổng quan (`index.html` - Dashboard)
Sử dụng dữ liệu kết hợp từ `videos.db`, `video_categories.db` và `video_analytics.db`.

#### A. Khu vực Thẻ chỉ số (KPI Summary Cards)
Hiển thị 3 thẻ thống kê lớn nằm ngang trên cùng:
1. **Tổng số video (Total Videos):**
   - Đếm tổng số bản ghi trong bảng `videos` (`SELECT COUNT(*) FROM videos`).
   - Hiển thị thêm số video mới thêm trong tháng.
2. **Tổng lượt xem (Total Views):**
   - Tổng giá trị cột `views` của tất cả video (`SELECT SUM(views) FROM videos`).
   - Định dạng số có dấu phân cách hàng nghìn (ví dụ: `1,245,890`).
3. **Dung lượng Storage (Storage Used):**
   - Tổng giá trị cột `file_size_mb` (`SELECT SUM(file_size_mb) FROM videos`).
   - Hiển thị theo đơn vị `MB` hoặc `GB` kèm thanh tiến trình (Progress Bar) so với giới hạn định mức (ví dụ: `14.5 GB / 50 GB - 29%`).

#### B. Khu vực Biểu đồ phân tích (Charts)
1. **Biểu đồ cột (Bar Chart) — 10 Video nhiều lượt xem nhất:**
   - Truy vấn 10 video có `views` cao nhất (`SELECT title, views FROM videos ORDER BY views DESC LIMIT 10`).
   - Trục X (hoặc trục Y nếu dùng biểu đồ cột ngang): Tên video (rút gọn nếu quá dài, hiển thị đầy đủ khi rê chuột vào tooltip).
   - Trục giá trị: Số lượt xem.
2. **Biểu đồ đường (Line Chart) — Lượt xem theo Ngày / Tháng:**
   - Có bộ chuyển đổi (Tabs hoặc Select): **Theo Ngày (7/30 ngày gần nhất)** và **Theo Tháng (12 tháng trong năm)**.
   - Truy vấn từ bảng `daily_views` trong `video_analytics.db`.
   - Đường biểu diễn mượt (`tension: 0.4`), có đổ bóng mờ phía dưới đường kẻ (Area gradient nhẹ phù hợp Light Mode).

---

### 2.3. Trang Danh sách Video (`videos.html` - List Video)
Sử dụng dữ liệu từ `videos.db` và `video_categories.db`.

#### A. Thanh công cụ (Toolbar)
- **Ô tìm kiếm (Search):** Tìm nhanh theo `title` hoặc `id` video.
- **Bộ lọc danh mục (Category Filter):** Dropdown lấy danh sách từ `video_categories.db`.
- **Nút "+ Thêm Video mới":** Mở Modal thêm video.
- **Nút "Xuất / Nhập file .db":** Cho phép tải file SQLite `.db` về máy hoặc nạp file `.db` từ máy tính.

#### B. Bảng Danh sách Video (Video Table)
Các cột bắt buộc theo yêu cầu:
1. **`ID`**: Mã định danh video (ví dụ: `#VID-001` hoặc số tự tăng `1, 2, 3...`).
2. **`Thumbnail`**: Ảnh thu nhỏ của video (tỷ lệ `16:9`, bo góc `6px`, có thời lượng video đè nhẹ ở góc dưới phải).
3. **`Title`**: Tiêu đề video (in đậm, kèm badge tên Danh mục lấy từ `video_categories.db` và dung lượng MB bên dưới).
4. **`Views`**: Số lượt xem (định dạng `125,400` kèm icon con mắt).
5. **`Action`**:
   - **Edit (Sửa)**: Mở Modal chỉnh sửa thông tin video (`title`, `thumbnail`, `category_id`, `views`, `file_size_mb`) và cập nhật vào `videos.db`.
   - **Delete (Xóa)**: Hiển thị hộp thoại xác nhận trước khi chạy lệnh `DELETE FROM videos WHERE id = ?` trong `videos.db`.

---

### 2.4. Module Phân Quyền (`permissions.html` - Permission Management)
Sử dụng cơ sở dữ liệu `users.db`.

- **Các quyền (Roles) trong hệ thống:**
  - `ADMIN`: Toàn quyền quản trị, được phép truy cập trang **Phân Quyền (`permissions.html`)** và thay đổi role của các tài khoản khác.
  - `USER`: Quyền người dùng thông thường, không được phép truy cập trang Phân Quyền.
- **Chức năng trên trang Phân Quyền (`permissions.html`):**
  - Hiển thị 3 thẻ thống kê: Tổng số tài khoản, Số lượng `ADMIN`, Số lượng `USER`.
  - Tìm kiếm tài khoản theo Email / Họ tên và lọc theo Role (`ALL`, `ADMIN`, `USER`).
  - Bảng danh sách tài khoản gồm: `ID`, `Họ tên & Email`, `Role hiện tại` (`ADMIN` / `USER`), `Ngày tạo`, và cột `Chỉnh sửa Role` (Dropdown chọn `ADMIN` / `USER` + nút **Lưu quyền** cập nhật trực tiếp xuống `users.db`).
  - Có sẵn 1 tài khoản `ADMIN` (`admin@gmail.com`) và 10 tài khoản `USER` mẫu (`user1@demo.com` đến `user10@demo.com`) để thực hành đổi quyền.

---

## 3. Yêu cầu phi chức năng (Non-Functional Requirements)
- **Không dùng Backend**: Toàn bộ thao tác CRUD phải thực thi bằng SQL thông qua `sql.js` và tự động lưu trạng thái nhị phân của các database vào `IndexedDB` để khi F5 (tải lại trang) không bị mất dữ liệu.
- **Dữ liệu khởi tạo tự động (Auto-Seeding)**: Lần đầu tiên người dùng mở web, nếu các database chưa có dữ liệu, hệ thống tự động tạo bảng và thêm sẵn ít nhất:
  - 2 tài khoản mẫu trong `users.db` (ví dụ: `admin@video.com` / `123456`).
  - 5 danh mục trong `video_categories.db`.
  - 15 video mẫu trong `videos.db` để biểu đồ Top 10 hiển thị đầy đặn ngay lập tức.
  - Dữ liệu lượt xem 30 ngày & 12 tháng trong `video_analytics.db`.
- **Giao diện Light Mode**: Tuyệt đối không dùng nền tối cho vùng làm việc chính; độ tương phản chữ đạt chuẩn dễ đọc.
