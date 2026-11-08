# Quy chuẩn Giao diện & Trải nghiệm Người dùng (UI/UX Design System)

Dự án tuân thủ nghiêm ngặt phong cách **Light Mode (Tông màu sáng, nền trắng)** hiện đại, sạch sẽ, lấy cảm hứng từ YouTube Studio (Light) và Vercel/Linear Light Theme.

---

## 1. Bảng màu (Color Palette — Light Mode)

| Thành phần | Biến CSS | Mã màu (Hex) | Mô tả sử dụng |
| :--- | :--- | :--- | :--- |
| **Nền chính (Primary BG)** | `--bg-surface` | `#FFFFFF` | Nền của Card, Bảng, Sidebar, Header, Modal |
| **Nền phụ (App Canvas)** | `--bg-canvas` | `#F8FAFC` | Nền tổng thể phía sau các Card để tạo chiều sâu nhẹ |
| **Viền (Border)** | `--border-color` | `#E2E8F0` | Viền mảnh `1px` cho các thẻ, ô nhập liệu và bảng |
| **Chữ chính (Text Primary)** | `--text-primary` | `#0F172A` | Tiêu đề, số liệu thống kê, tên video |
| **Chữ phụ (Text Secondary)** | `--text-secondary` | `#64748B` | Nhãn phụ, ngày tháng, chú thích |
| **Màu nhấn chính (Primary Accent)** | `--color-primary` | `#2563EB` | Nút bấm chính, đường biểu đồ Line, cột Bar Chart, trạng thái Active |
| **Màu nhấn phụ (Primary Light)** | `--color-primary-soft` | `#EFF6FF` | Nền menu đang chọn, nền icon KPI |
| **Thành công (Success)** | `--color-success` | `#10B981` | Badge trạng thái hoạt động, xu hướng tăng |
| **Cảnh báo (Warning)** | `--color-warning` | `#F59E0B` | Cảnh báo dung lượng Storage, nút Edit |
| **Nguy hiểm (Danger)** | `--color-danger` | `#EF4444` | Nút Delete (Xóa video), thông báo lỗi đăng nhập |

---

## 2. Kiểu chữ & Bo góc (Typography & Spacing)

- **Font chữ**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Kích thước chữ**:
  - Số liệu KPI lớn: `28px` (`font-weight: 700`)
  - Tiêu đề trang: `22px` (`font-weight: 700`)
  - Tiêu đề Card / Biểu đồ: `16px` (`font-weight: 600`)
  - Nội dung bảng & Form: `14px` (`font-weight: 400` / `500`)
- **Bo góc (Border Radius)**:
  - Thẻ lớn (Cards, Modals): `12px`
  - Nút bấm, Input, Thumbnail: `8px`
- **Đổ bóng (Box Shadow)**:
  - Nhẹ nhàng, tinh tế trên nền sáng: `0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)`

---

## 3. Bố cục từng màn hình (Wireframes)

### 3.1. Bố cục trang Quản trị (`index.html` & `videos.html`)

```text
+-----------------------------------------------------------------------------------+
|  [Logo] VIDEO ADMIN      |  Tìm kiếm nhanh...          | [DB Status] [Admin User] |
+--------------------------+--------------------------------------------------------+
|                          |                                                        |
|  MENU ĐIỀU HƯỚNG         |  TIÊU ĐỀ TRANG (Dashboard / Danh sách Video)           |
|  • [x] Dashboard         |  ----------------------------------------------------  |
|  • [ ] List Video        |                                                        |
|                          |  +---------------+ +---------------+ +---------------+ |
|  DATABASE (.DB)          |  | Tổng số Video | | Tổng lượt xem | | Dung lượng    | |
|  • users.db        (OK)  |  |      12       | |    847,870    | | 5.20 / 10 GB  | |
|  • videos.db       (OK)  |  +---------------+ +---------------+ +---------------+ |
|  • categories.db   (OK)  |                                                        |
|  • analytics.db    (OK)  |  +------------------------+ +------------------------+ |
|                          |  | Biểu đồ cột:           | | Biểu đồ Line:          | |
|  [Đăng xuất]             |  | Top 10 Video xem nhiều | | Lượt xem Ngày / Tháng  | |
|                          |  | [|||||||     ]         | | [   /\  /\/  ]         | |
|                          |  +------------------------+ +------------------------+ |
+--------------------------+--------------------------------------------------------+
```

### 3.2. Bố cục trang List Video (`videos.html`)

```text
+-----------------------------------------------------------------------------------+
|  DANH SÁCH VIDEO                           [Lọc Danh Mục v] [+ Thêm Video Mới]    |
+-----------------------------------------------------------------------------------+
|  ID    | Thumbnail      | Title & Danh mục                 | Views    | Action    |
+--------+----------------+----------------------------------+----------+-----------+
|  #1    | [Ảnh 16:9]     | Hướng dẫn Vibe Coding từ A-Z     | 154,200  | [Edit]    |
|        |  24:15         | [Vibe Coding & AI] • 450.5 MB    |          | [Delete]  |
+--------+----------------+----------------------------------+----------+-----------+
|  #2    | [Ảnh 16:9]     | Làm chủ SQLite không cần Backend | 128,900  | [Edit]    |
|        |  18:40         | [Lập trình Web] • 380.0 MB       |          | [Delete]  |
+--------+----------------+----------------------------------+----------+-----------+
```

### 3.3. Bố cục 3 trang Auth (`login.html`, `register.html`, `forgot-password.html`)
- Nền trang: Màu trắng xám cực nhẹ (`#F8FAFC`) kèm họa tiết lưới chấm bi mảnh.
- Khung Form nằm chính giữa màn hình (`max-width: 420px`), nền trắng tinh (`#FFFFFF`), viền `#E2E8F0`, bo góc `16px`.
- Có hiển thị thông tin tài khoản mẫu (`admin@gmail.com` / `123456`) ngay dưới form Login để người học test nhanh chỉ với 1 cú click.
