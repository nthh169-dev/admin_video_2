# Video Admin Portal — Vibe Coding Project

Dự án **Website Admin Quản Lý Video** được xây dựng theo phương pháp **Vibe Coding** (lập trình hướng đặc tả cùng AI). Toàn bộ ứng dụng chạy thuần trên trình duyệt (**Client-side Only**) sử dụng **HTML5, CSS3, Vanilla JavaScript** kết hợp với **SQLite (thông qua WebAssembly `sql.js`)** mà không cần bất kỳ Backend Server nào.

---

## 1. Điểm nổi bật của dự án

- **Không sử dụng Backend (Serverless / Client-side 100%)**: Sử dụng thư viện `sql.js` (SQLite biên dịch sang WebAssembly) để thực thi câu lệnh SQL trực tiếp trên trình duyệt.
- **Đa cơ sở dữ liệu SQLite tách biệt**:
  - `users.db`: Quản lý tài khoản quản trị viên, phiên đăng nhập và khôi phục mật khẩu.
  - `videos.db`: Quản lý thông tin video, dung lượng, lượt xem, trạng thái.
  - `video_categories.db`: Quản lý danh mục phân loại video và thẻ (tags).
  - `video_analytics.db`: Lưu trữ lịch sử lượt xem theo ngày/tháng để vẽ biểu đồ thống kê.
- **Giao diện Light Mode hiện đại**: Tông màu sáng, nền trắng chủ đạo (`#FFFFFF`, `#F8FAFC`), điểm nhấn xanh dương (`#2563EB`), bố cục rõ ràng, dễ nhìn.

---

## 2. Danh sách các tài liệu `.MD` trong dự án

Để quá trình **Vibe Coding** đạt hiệu quả cao nhất, dự án được chia thành các file tài liệu đặc tả chuẩn mực:

1. **[PRD.md](./PRD.md)** *(Product Requirements Document)*: Mô tả chi tiết yêu cầu nghiệp vụ, luồng người dùng và tính năng của từng trang (Login, Register, Forgot Password, Dashboard, List Video).
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Kiến trúc hệ thống thuần Frontend, cơ chế hoạt động của SQLite trên trình duyệt (`sql.js` + `IndexedDB`) và cách giao tiếp giữa các file `.db`.
3. **[DATABASE.md](./DATABASE.md)**: Thiết kế bảng (Schema), kiểu dữ liệu, khóa ngoại và câu lệnh SQL tạo dữ liệu mẫu (Seed Data) cho `users.db`, `videos.db`, `video_categories.db`, và `video_analytics.db`.
4. **[UI_DESIGN.md](./UI_DESIGN.md)**: Hệ thống thiết kế giao diện (Design System) theo phong cách Light Mode, bảng màu, font chữ, lưới bố cục và wireframe từng màn hình.
5. **[ROADMAP.md](./ROADMAP.md)**: Kế hoạch triển khai từng bước (Checklist & Prompt mẫu) để bạn từng bước yêu cầu AI sinh code hoàn chỉnh.

---

## 3. Cấu trúc thư mục dự kiến

```text
Bai4_1/
├── docs/ (hoặc đặt tại thư mục gốc)
│   ├── README.md
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── UI_DESIGN.md
│   └── ROADMAP.md
├── assets/
│   ├── css/
│   │   ├── variables.css      # Biến màu sắc Light Mode, spacing, shadow
│   │   ├── base.css           # Reset CSS, kiểu chữ, layout chung
│   │   ├── auth.css           # Giao diện Login, Register, Forgot Password
│   │   ├── dashboard.css      # Giao diện thẻ thống kê & vùng biểu đồ
│   │   └── videos.css         # Giao diện bảng danh sách video, modal CRUD
│   └── js/
│       ├── db/
│       │   ├── sqlite-manager.js      # Khởi tạo sql.js & đồng bộ IndexedDB
│       │   ├── users-repo.js          # Truy vấn trên users.db
│       │   ├── videos-repo.js         # Truy vấn trên videos.db
│       │   ├── categories-repo.js     # Truy vấn trên video_categories.db
│       │   └── analytics-repo.js      # Truy vấn trên video_analytics.db
│       ├── pages/
│       │   ├── auth.js                # Logic xử lý đăng nhập, đăng ký, quên MK
│       │   ├── dashboard.js           # Logic tính KPI & vẽ biểu đồ Chart.js
│       │   └── videos.js              # Logic hiển thị danh sách, thêm/sửa/xóa video
│       └── utils/
│           ├── auth-guard.js          # Kiểm tra trạng thái đăng nhập
│           └── formatters.js          # Định dạng số lượt xem, dung lượng MB/GB, ngày tháng
├── data/                              # Chứa các file .db mẫu (nếu xuất/nhập trực tiếp)
│   ├── users.db
│   ├── videos.db
│   ├── video_categories.db
│   └── video_analytics.db
├── login.html                         # Trang đăng nhập
├── register.html                      # Trang đăng ký
├── forgot-password.html               # Trang quên mật khẩu
├── index.html                         # Trang Dashboard chính
└── videos.html                        # Trang quản lý danh sách Video
```

---

## 4. Công nghệ & Thư viện sử dụng (CDN)

Vì không dùng Backend hay Node.js build tool phức tạp, toàn bộ thư viện được nhúng qua CDN:
- **HTML5 / CSS3 / Vanilla JavaScript (ES6+)**
- **SQL.js (`sql-wasm.js`)**: Chạy SQLite trực tiếp trên trình duyệt.
- **Chart.js**: Vẽ biểu đồ cột (Top 10 video) và biểu đồ đường (Lượt xem theo ngày/tháng).
- **Lucide Icons / FontAwesome**: Bộ icon sắc nét, tối giản cho giao diện Light Mode.
- **Google Fonts (Inter / Plus Jakarta Sans)**: Font chữ hiện đại, chuyên dụng cho Dashboard.
