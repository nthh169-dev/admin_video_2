# Thiết kế Cơ sở dữ liệu (Database Schema Specification)

Dự án sử dụng **4 file cơ sở dữ liệu SQLite riêng biệt** để quản lý các miền dữ liệu khác nhau theo yêu cầu:
1. `users.db` — Quản lý người dùng & xác thực
2. `videos.db` — Quản lý danh sách video
3. `video_categories.db` — Quản lý danh mục & phân loại video
4. `video_analytics.db` — Quản lý thống kê lượt xem theo ngày/tháng và dung lượng hệ thống

---

## 1. Database `users.db` (Quản lý người dùng)

Phục vụ 3 trang: **Login**, **Register**, và **Forgot Password**.

### Bảng `users`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Mã người dùng |
| `full_name` | `TEXT` | `NOT NULL` | Họ và tên hiển thị |
| `email` | `TEXT` | `NOT NULL UNIQUE` | Địa chỉ email đăng nhập |
| `password` | `TEXT` | `NOT NULL` | Mật khẩu người dùng |
| `security_answer` | `TEXT` | `NOT NULL` | Mã bảo mật / Câu trả lời khôi phục mật khẩu |
| `role` | `TEXT` | `DEFAULT 'USER'` | Vai trò phân quyền (`ADMIN`, `USER`) |
| `avatar` | `TEXT` | `NULL` | Đường dẫn ảnh đại diện |
| `created_at` | `TEXT` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm tạo tài khoản |

### SQL Khởi tạo & Dữ liệu mẫu (`users.db`)
```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    security_answer TEXT NOT NULL,
    role TEXT DEFAULT 'USER',
    avatar TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (full_name, email, password, security_answer, role, avatar, created_at) VALUES
('Quản Trị Viên Chính', 'admin@gmail.com', '123456', 'vibe2026', 'ADMIN', 'https://ui-avatars.com/api/?name=Admin&background=2563EB&color=fff', '2026-10-01'),
('Nguyễn Văn An (User 1)', 'user1@demo.com', '123456', 'vibe2026', 'USER', 'https://ui-avatars.com/api/?name=User+1&background=10B981&color=fff', '2026-10-03'),
('Trần Thị Bình (User 2)', 'user2@demo.com', '123456', 'vibe2026', 'USER', 'https://ui-avatars.com/api/?name=User+2&background=059669&color=fff', '2026-10-05'),
('Lê Hoàng Cường (User 3)', 'user3@demo.com', '123456', 'vibe2026', 'USER', 'https://ui-avatars.com/api/?name=User+3&background=7C3AED&color=fff', '2026-10-07'),
('Phạm Minh Dung (User 4)', 'user4@demo.com', '123456', 'vibe2026', 'USER', 'https://ui-avatars.com/api/?name=User+4&background=D97706&color=fff', '2026-10-09'),
('Hoàng Quốc Đạt (User 5)', 'user5@demo.com', '123456', 'vibe2026', 'USER', 'https://ui-avatars.com/api/?name=User+5&background=DB2777&color=fff', '2026-10-12'),
('Vũ Thu Hà (User 6)', 'user6@demo.com', '123456', 'vibe2026', 'USER', 'https://ui-avatars.com/api/?name=User+6&background=0284C7&color=fff', '2026-10-15'),
('Đặng Gia Huy (User 7)', 'user7@demo.com', '123456', 'vibe2026', 'USER', 'https://ui-avatars.com/api/?name=User+7&background=4F46E5&color=fff', '2026-10-18'),
('Bùi Ngọc Khánh (User 8)', 'user8@demo.com', '123456', 'vibe2026', 'USER', 'https://ui-avatars.com/api/?name=User+8&background=0D9488&color=fff', '2026-10-21'),
('Đỗ Tuấn Kiệt (User 9)', 'user9@demo.com', '123456', 'vibe2026', 'USER', 'https://ui-avatars.com/api/?name=User+9&background=EA580C&color=fff', '2026-10-25'),
('Ngô Phương Linh (User 10)', 'user10@demo.com', '123456', 'vibe2026', 'USER', 'https://ui-avatars.com/api/?name=User+10&background=9333EA&color=fff', '2026-10-28');
```

---

## 2. Database `video_categories.db` (Quản lý danh mục video)

Phục vụ việc phân loại video, lọc danh sách video và thống kê theo chủ đề.

### Bảng `categories`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Mã danh mục |
| `name` | `TEXT` | `NOT NULL UNIQUE` | Tên danh mục (VD: Lập trình, Âm nhạc, Gaming...) |
| `slug` | `TEXT` | `NOT NULL UNIQUE` | Đường dẫn tĩnh (`lap-trinh`, `am-nhac`) |
| `color_badge` | `TEXT` | `DEFAULT '#2563EB'` | Mã màu hiển thị nhãn trên bảng Video |
| `description` | `TEXT` | `NULL` | Mô tả danh mục |

### SQL Khởi tạo & Dữ liệu mẫu (`video_categories.db`)
```sql
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    color_badge TEXT DEFAULT '#2563EB',
    description TEXT
);

INSERT INTO categories (id, name, slug, color_badge, description) VALUES
(1, 'Vibe Coding & AI', 'vibe-coding-ai', '#2563EB', 'Các video hướng dẫn lập trình cùng AI'),
(2, 'Lập trình Web', 'lap-trinh-web', '#059669', 'HTML, CSS, JavaScript và cơ sở dữ liệu'),
(3, 'Thiết kế UI/UX', 'thiet-ke-ui-ux', '#7C3AED', 'Thiết kế giao diện sáng sủa, hiện đại'),
(4, 'Công nghệ & Review', 'cong-nghe-review', '#D97706', 'Đánh giá công cụ và xu hướng công nghệ'),
(5, 'Giải trí & Vlogs', 'giai-tri-vlogs', '#DB2777', 'Chia sẻ cuộc sống lập trình viên');
```

---

## 3. Database `videos.db` (Quản lý video)

Phục vụ trang **Dashboard** (Tổng số video, Tổng lượt xem, Dung lượng Storage, Biểu đồ cột Top 10 video) và trang **List Video** (`id`, `title`, `thumbnail`, `views`, `action`).

### Bảng `videos`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Mã định danh video |
| `title` | `TEXT` | `NOT NULL` | Tiêu đề video |
| `thumbnail` | `TEXT` | `NOT NULL` | URL hình ảnh thu nhỏ của video |
| `views` | `INTEGER` | `DEFAULT 0` | Tổng số lượt xem của video |
| `file_size_mb` | `REAL` | `DEFAULT 0` | Dung lượng video tính bằng MB (phục vụ tính Storage) |
| `duration` | `TEXT` | `DEFAULT '00:00'` | Thời lượng video (ví dụ: `14:25`) |
| `category_id` | `INTEGER` | `DEFAULT 1` | Tham chiếu tới `id` trong `video_categories.db` |
| `status` | `TEXT` | `DEFAULT 'published'` | Trạng thái (`published`, `draft`) |
| `created_at` | `TEXT` | `DEFAULT CURRENT_TIMESTAMP` | Ngày đăng tải video |

### SQL Khởi tạo & Dữ liệu mẫu (`videos.db`)
*(Có sẵn 12 video mẫu để biểu đồ cột "Top 10 video nhiều lượt xem nhất" hiển thị trực quan ngay khi mở web)*
```sql
CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    file_size_mb REAL DEFAULT 0,
    duration TEXT DEFAULT '10:00',
    category_id INTEGER DEFAULT 1,
    status TEXT DEFAULT 'published',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO videos (title, thumbnail, views, file_size_mb, duration, category_id, created_at) VALUES
('Hướng dẫn Vibe Coding từ A-Z cho người mới bắt đầu', 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=400&q=80', 154200, 450.5, '24:15', 1, '2026-10-01'),
('Làm chủ SQLite trên trình duyệt không cần Backend', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80', 128900, 380.0, '18:40', 2, '2026-10-04'),
('Thiết kế Dashboard Light Mode chuẩn UI/UX 2026', 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&q=80', 98450, 310.2, '15:10', 3, '2026-10-08'),
('10 mẹo viết Prompt giúp AI sinh code chuẩn xác 100%', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&q=80', 87600, 520.0, '29:05', 1, '2026-10-11'),
('HTML CSS JavaScript thuần: Xây dựng SPA hoàn chỉnh', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&q=80', 76300, 610.8, '35:20', 2, '2026-10-14'),
('So sánh Chart.js và D3.js khi vẽ biểu đồ Admin', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80', 65120, 275.4, '12:50', 2, '2026-10-17'),
('Tối ưu dung lượng Video Streaming trên nền tảng Web', 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&q=80', 54800, 890.0, '42:00', 4, '2026-10-20'),
('Một ngày làm việc của Vibe Coder sẽ như thế nào?', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80', 49200, 720.5, '21:30', 5, '2026-10-23'),
('Cách tổ chức các file .MD trước khi bắt đầu dự án lớn', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80', 43500, 195.0, '11:15', 1, '2026-10-26'),
('Bí quyết phối màu nền trắng (Light Theme) không gây mỏi mắt', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&q=80', 38900, 240.3, '14:45', 3, '2026-10-29'),
('Review bàn phím cơ cho lập trình viên năm 2026', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80', 29400, 410.0, '16:20', 4, '2026-11-02'),
('Xây dựng tính năng Login/Register an toàn với SQLite', 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&q=80', 21500, 330.6, '19:10', 2, '2026-11-05');
```

---

## 4. Database `video_analytics.db` (Thống kê lượt xem theo Ngày / Tháng)

Phục vụ **Biểu đồ Line: Lượt xem theo ngày / tháng** trên trang Dashboard và cấu hình dung lượng tối đa của hệ thống.

### Bảng 1: `daily_views` (Lượt xem theo ngày)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | ID bản ghi |
| `view_date` | `TEXT` | `NOT NULL UNIQUE` | Ngày thống kê (`YYYY-MM-DD`) |
| `total_views` | `INTEGER` | `NOT NULL DEFAULT 0` | Tổng lượt xem trong ngày đó |

### Bảng 2: `monthly_views` (Lượt xem theo tháng)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | ID bản ghi |
| `view_month` | `TEXT` | `NOT NULL UNIQUE` | Tháng thống kê (`YYYY-MM`, ví dụ `2026-01`) |
| `month_label` | `TEXT` | `NOT NULL` | Nhãn hiển thị (`Tháng 1`, `Tháng 2`...) |
| `total_views` | `INTEGER` | `NOT NULL DEFAULT 0` | Tổng lượt xem trong tháng đó |

### SQL Khởi tạo & Dữ liệu mẫu (`video_analytics.db`)
```sql
CREATE TABLE IF NOT EXISTS daily_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    view_date TEXT NOT NULL UNIQUE,
    total_views INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS monthly_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    view_month TEXT NOT NULL UNIQUE,
    month_label TEXT NOT NULL,
    total_views INTEGER NOT NULL DEFAULT 0
);

-- Dữ liệu mẫu 14 ngày gần nhất
INSERT INTO daily_views (view_date, total_views) VALUES
('2026-10-26', 12400),
('2026-10-27', 15800),
('2026-10-28', 14200),
('2026-10-29', 18900),
('2026-10-30', 22100),
('2026-10-31', 19500),
('2026-11-01', 25400),
('2026-11-02', 28900),
('2026-11-03', 24300),
('2026-11-04', 31200),
('2026-11-05', 29800),
('2026-11-06', 35600),
('2026-11-07', 38400),
('2026-11-08', 42100);

-- Dữ liệu mẫu 12 tháng trong năm
INSERT INTO monthly_views (view_month, month_label, total_views) VALUES
('2026-01', 'Tháng 1', 45000),
('2026-02', 'Tháng 2', 52000),
('2026-03', 'Tháng 3', 48500),
('2026-04', 'Tháng 4', 61000),
('2026-05', 'Tháng 5', 68400),
('2026-06', 'Tháng 6', 74200),
('2026-07', 'Tháng 7', 82000),
('2026-08', 'Tháng 8', 79500),
('2026-09', 'Tháng 9', 94000),
('2026-10', 'Tháng 10', 118000),
('2026-11', 'Tháng 11', 125270);
```
