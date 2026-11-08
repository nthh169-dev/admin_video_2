/**
 * SQLite + Supabase Hybrid Database Manager
 * Kết nối trực tiếp tới Supabase (từ cấu hình trong supabase.txt) đồng thời
 * duy trì 4 cơ sở dữ liệu SQLite (users.db, videos.db, video_categories.db, video_analytics.db).
 *
 * Cơ chế hoạt động:
 * 1. Khi mở trang web, hệ thống ưu tiên tải dữ liệu trực tiếp từ Supabase Cloud
 *    (https://qhkdldltwqnwpmifqdcj.supabase.co) và nạp vào bộ máy SQLite trên trình duyệt.
 * 2. Khi bạn Thêm / Sửa / Xóa video, đổi Role phân quyền, đăng ký hoặc đổi mật khẩu,
 *    dữ liệu được đồng bộ ngay lập tức lên cả Supabase lẫn SQLite!
 */

window.SQLiteManager = {
    SQL: null,
    databases: {
        'users.db': null,
        'videos.db': null,
        'video_categories.db': null,
        'video_analytics.db': null
    },
    fallbackStore: null,
    isInitialized: false,
    STORAGE_PREFIX: 'vibe_sqlite_v3_db_',
    DISK_SIG_PREFIX: 'vibe_sqlite_v3_disk_sig_',
    FALLBACK_KEY: 'vibe_sqlite_v3_fallback_json',

    /**
     * Khởi tạo SQL.js (WebAssembly), nạp dữ liệu từ Supabase Cloud (nếu có) hoặc file .db cục bộ
     */
    async init() {
        if (this.isInitialized) return;

        if (typeof window.initSqlJs === 'function') {
            try {
                this.SQL = await window.initSqlJs({
                    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
                });
            } catch (err) {
                console.warn('Không thể tải wasm từ CDN, kích hoạt bộ máy SQLite nội bộ dự phòng:', err);
                this.SQL = null;
            }
        }

        // Bước 1: Thử đồng bộ dữ liệu trực tiếp từ Supabase Cloud
        let supabaseData = null;
        if (window.SupabaseClient) {
            supabaseData = await window.SupabaseClient.syncWithLocalSQLite(this);
        }

        if (this.SQL) {
            const dbNames = ['users.db', 'video_categories.db', 'videos.db', 'video_analytics.db'];
            if (supabaseData) {
                // Nếu lấy được dữ liệu từ Supabase, nạp dữ liệu Supabase vào cả 4 DB SQLite
                for (const name of dbNames) {
                    this.databases[name] = new this.SQL.Database();
                    this.seedDatabase(name, supabaseData);
                    this.saveDatabase(name);
                }
            } else {
                // Nếu bảng Supabase chưa tạo hoặc đang offline, dùng file .db trong thư mục data/
                for (const name of dbNames) {
                    await this.loadOrCreateDatabase(name);
                }
                this.ensureUsersRoleMigration();
            }
        } else {
            if (supabaseData) {
                this.fallbackStore = supabaseData;
                this.saveFallbackStore();
            } else {
                this.initFallbackStore();
                this.ensureFallbackUsersMigration();
            }
        }

        this.isInitialized = true;
        this.bindExportButtons();
    },

    /**
     * Ưu tiên kiểm tra file vật lý trong `data/<dbName>`
     */
    async loadOrCreateDatabase(dbName) {
        const diskBytes = await this.fetchPhysicalDbFile(dbName);
        const savedBytes = this.loadBytesFromStorage(dbName);

        if (diskBytes && diskBytes.length > 0) {
            const diskB64 = this.uint8ToBase64(diskBytes);
            const lastDiskB64 = localStorage.getItem(this.DISK_SIG_PREFIX + dbName);

            if (!savedBytes || diskB64 !== lastDiskB64) {
                this.databases[dbName] = new this.SQL.Database(diskBytes);
                localStorage.setItem(this.DISK_SIG_PREFIX + dbName, diskB64);
                this.saveDatabase(dbName);
                return;
            }
        }

        if (savedBytes && savedBytes.length > 0) {
            this.databases[dbName] = new this.SQL.Database(savedBytes);
        } else {
            this.databases[dbName] = new this.SQL.Database();
            this.seedDatabase(dbName);
            this.saveDatabase(dbName);
        }
    },

    async fetchPhysicalDbFile(dbName) {
        try {
            const res = await fetch(`data/${dbName}?t=${Date.now()}`, { cache: 'no-store' });
            if (!res.ok) return null;
            const buf = await res.arrayBuffer();
            if (!buf || buf.byteLength < 100) return null;
            return new Uint8Array(buf);
        } catch (err) {
            return null;
        }
    },

    ensureUsersRoleMigration() {
        const db = this.databases['users.db'];
        if (!db) return;

        try {
            db.run(`UPDATE users SET role = 'ADMIN' WHERE LOWER(role) = 'admin'`);
            db.run(`UPDATE users SET role = 'USER' WHERE UPPER(role) NOT IN ('ADMIN', 'USER')`);

            const seedUsers = this.getInitialSeedObjects().users;
            seedUsers.forEach(u => {
                const stmt = db.prepare(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`);
                stmt.bind([u.email]);
                const exists = stmt.step();
                stmt.free();

                if (!exists) {
                    db.run(
                        `INSERT INTO users (full_name, email, password, security_answer, role, avatar, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [u.full_name, u.email, u.password, u.security_answer, u.role, u.avatar, u.created_at]
                    );
                }
            });

            this.saveDatabase('users.db');
        } catch (err) {
            console.error('Lỗi đồng bộ dữ liệu phân quyền users.db:', err);
        }
    },

    ensureFallbackUsersMigration() {
        if (!this.fallbackStore || !this.fallbackStore.users) return;
        this.fallbackStore.users.forEach(u => {
            u.role = String(u.role || 'USER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
        });
        const seedUsers = this.getInitialSeedObjects().users;
        seedUsers.forEach(su => {
            const exists = this.fallbackStore.users.some(u => u.email.toLowerCase() === su.email.toLowerCase());
            if (!exists) {
                const nextId = this.fallbackStore.users.reduce((m, x) => Math.max(m, x.id), 0) + 1;
                this.fallbackStore.users.push({ ...su, id: nextId });
            }
        });
        this.saveFallbackStore();
    },

    uint8ToBase64(u8Arr) {
        let CHUNK_SIZE = 0x8000;
        let index = 0;
        let length = u8Arr.length;
        let result = '';
        let slice;
        while (index < length) {
            slice = u8Arr.subarray(index, Math.min(index + CHUNK_SIZE, length));
            result += String.fromCharCode.apply(null, slice);
            index += CHUNK_SIZE;
        }
        return btoa(result);
    },

    base64ToUint8(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    },

    loadBytesFromStorage(dbName) {
        try {
            const b64 = localStorage.getItem(this.STORAGE_PREFIX + dbName);
            if (!b64) return null;
            return this.base64ToUint8(b64);
        } catch (e) {
            return null;
        }
    },

    saveDatabase(dbName) {
        if (!this.SQL) {
            this.saveFallbackStore();
            return;
        }
        const db = this.databases[dbName];
        if (!db) return;
        try {
            const binaryArray = db.export();
            const b64 = this.uint8ToBase64(binaryArray);
            localStorage.setItem(this.STORAGE_PREFIX + dbName, b64);
        } catch (e) {
            console.error('Lỗi lưu database:', dbName, e);
        }
    },

    importDatabaseFromFile(dbName, file) {
        if (!file || !this.SQL) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const u8 = new Uint8Array(reader.result);
                this.databases[dbName] = new this.SQL.Database(u8);
                const b64 = this.uint8ToBase64(u8);
                localStorage.setItem(this.DISK_SIG_PREFIX + dbName, b64);
                this.saveDatabase(dbName);
                if (window.Formatters) {
                    window.Formatters.showToast(`Đã nạp thành công dữ liệu mới từ ${file.name}!`);
                }
                setTimeout(() => window.location.reload(), 400);
            } catch (err) {
                alert('File không đúng định dạng SQLite .db!');
            }
        };
        reader.readAsArrayBuffer(file);
    },

    queryAll(dbName, sql, params = []) {
        if (!this.SQL) {
            return this.fallbackQueryAll(dbName, sql, params);
        }
        const db = this.databases[dbName];
        if (!db) return [];
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
    },

    queryOne(dbName, sql, params = []) {
        const rows = this.queryAll(dbName, sql, params);
        return rows.length > 0 ? rows[0] : null;
    },

    run(dbName, sql, params = []) {
        if (!this.SQL) {
            this.fallbackRun(dbName, sql, params);
            return;
        }
        const db = this.databases[dbName];
        if (!db) return;
        db.run(sql, params);
        this.saveDatabase(dbName);
    },

    getInitialSeedObjects() {
        return {
            users: [
                { id: 1, full_name: 'Quản Trị Viên Chính', email: 'admin@gmail.com', password: '123456', security_answer: 'vibe2026', role: 'ADMIN', avatar: 'https://ui-avatars.com/api/?name=Admin&background=2563EB&color=fff', created_at: '2026-10-01' },
                { id: 2, full_name: 'Nguyễn Văn An (User 1)', email: 'user1@demo.com', password: '123456', security_answer: 'vibe2026', role: 'USER', avatar: 'https://ui-avatars.com/api/?name=User+1&background=10B981&color=fff', created_at: '2026-10-03' },
                { id: 3, full_name: 'Trần Thị Bình (User 2)', email: 'user2@demo.com', password: '123456', security_answer: 'vibe2026', role: 'USER', avatar: 'https://ui-avatars.com/api/?name=User+2&background=059669&color=fff', created_at: '2026-10-05' },
                { id: 4, full_name: 'Lê Hoàng Cường (User 3)', email: 'user3@demo.com', password: '123456', security_answer: 'vibe2026', role: 'USER', avatar: 'https://ui-avatars.com/api/?name=User+3&background=7C3AED&color=fff', created_at: '2026-10-07' },
                { id: 5, full_name: 'Phạm Minh Dung (User 4)', email: 'user4@demo.com', password: '123456', security_answer: 'vibe2026', role: 'USER', avatar: 'https://ui-avatars.com/api/?name=User+4&background=D97706&color=fff', created_at: '2026-10-09' },
                { id: 6, full_name: 'Hoàng Quốc Đạt (User 5)', email: 'user5@demo.com', password: '123456', security_answer: 'vibe2026', role: 'USER', avatar: 'https://ui-avatars.com/api/?name=User+5&background=DB2777&color=fff', created_at: '2026-10-12' },
                { id: 7, full_name: 'Vũ Thu Hà (User 6)', email: 'user6@demo.com', password: '123456', security_answer: 'vibe2026', role: 'USER', avatar: 'https://ui-avatars.com/api/?name=User+6&background=0284C7&color=fff', created_at: '2026-10-15' },
                { id: 8, full_name: 'Đặng Gia Huy (User 7)', email: 'user7@demo.com', password: '123456', security_answer: 'vibe2026', role: 'USER', avatar: 'https://ui-avatars.com/api/?name=User+7&background=4F46E5&color=fff', created_at: '2026-10-18' },
                { id: 9, full_name: 'Bùi Ngọc Khánh (User 8)', email: 'user8@demo.com', password: '123456', security_answer: 'vibe2026', role: 'USER', avatar: 'https://ui-avatars.com/api/?name=User+8&background=0D9488&color=fff', created_at: '2026-10-21' },
                { id: 10, full_name: 'Đỗ Tuấn Kiệt (User 9)', email: 'user9@demo.com', password: '123456', security_answer: 'vibe2026', role: 'USER', avatar: 'https://ui-avatars.com/api/?name=User+9&background=EA580C&color=fff', created_at: '2026-10-25' },
                { id: 11, full_name: 'Ngô Phương Linh (User 10)', email: 'user10@demo.com', password: '123456', security_answer: 'vibe2026', role: 'USER', avatar: 'https://ui-avatars.com/api/?name=User+10&background=9333EA&color=fff', created_at: '2026-10-28' }
            ],
            categories: [
                { id: 1, name: 'Vibe Coding & AI', slug: 'vibe-coding-ai', color_badge: '#2563EB', description: 'Các video hướng dẫn lập trình cùng AI' },
                { id: 2, name: 'Lập trình Web', slug: 'lap-trinh-web', color_badge: '#059669', description: 'HTML, CSS, JavaScript và cơ sở dữ liệu' },
                { id: 3, name: 'Thiết kế UI/UX', slug: 'thiet-ke-ui-ux', color_badge: '#7C3AED', description: 'Thiết kế giao diện sáng sủa, hiện đại' },
                { id: 4, name: 'Công nghệ & Review', slug: 'cong-nghe-review', color_badge: '#D97706', description: 'Đánh giá công cụ và xu hướng công nghệ' },
                { id: 5, name: 'Giải trí & Vlogs', slug: 'giai-tri-vlogs', color_badge: '#DB2777', description: 'Chia sẻ cuộc sống lập trình viên' }
            ],
            videos: [
                { id: 1, title: 'Hướng dẫn Vibe Coding từ A-Z cho người mới bắt đầu 11111', thumbnail: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=400&q=80', views: 154200, file_size_mb: 450.5, duration: '24:15', category_id: 1, status: 'published', created_at: '2026-10-01' },
                { id: 2, title: 'Làm chủ SQLite trên trình duyệt không cần Backend', thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80', views: 128900, file_size_mb: 380.0, duration: '18:40', category_id: 2, status: 'published', created_at: '2026-10-04' },
                { id: 3, title: 'Thiết kế Dashboard Light Mode chuẩn UI/UX 2026', thumbnail: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&q=80', views: 98450, file_size_mb: 310.2, duration: '15:10', category_id: 3, status: 'published', created_at: '2026-10-08' },
                { id: 4, title: '10 mẹo viết Prompt giúp AI sinh code chuẩn xác 100%', thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&q=80', views: 87600, file_size_mb: 520.0, duration: '29:05', category_id: 1, status: 'published', created_at: '2026-10-11' },
                { id: 5, title: 'HTML CSS JavaScript thuần: Xây dựng SPA hoàn chỉnh', thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&q=80', views: 76300, file_size_mb: 610.8, duration: '35:20', category_id: 2, status: 'published', created_at: '2026-10-14' },
                { id: 6, title: 'So sánh Chart.js và D3.js khi vẽ biểu đồ Admin', thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80', views: 65120, file_size_mb: 275.4, duration: '12:50', category_id: 2, status: 'published', created_at: '2026-10-17' },
                { id: 7, title: 'Tối ưu dung lượng Video Streaming trên nền tảng Web', thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&q=80', views: 54800, file_size_mb: 890.0, duration: '42:00', category_id: 4, status: 'published', created_at: '2026-10-20' },
                { id: 8, title: 'Một ngày làm việc của Vibe Coder sẽ như thế nào?', thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80', views: 49200, file_size_mb: 720.5, duration: '21:30', category_id: 5, status: 'published', created_at: '2026-10-23' },
                { id: 9, title: 'Cách tổ chức các file .MD trước khi bắt đầu dự án lớn', thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80', views: 43500, file_size_mb: 195.0, duration: '11:15', category_id: 1, status: 'published', created_at: '2026-10-26' },
                { id: 10, title: 'Bí quyết phối màu nền trắng (Light Theme) không gây mỏi mắt', thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&q=80', views: 38900, file_size_mb: 240.3, duration: '14:45', category_id: 3, status: 'published', created_at: '2026-10-29' },
                { id: 11, title: 'Review bàn phím cơ cho lập trình viên năm 2026', thumbnail: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80', views: 29400, file_size_mb: 410.0, duration: '16:20', category_id: 4, status: 'published', created_at: '2026-11-02' },
                { id: 12, title: 'Xây dựng tính năng Login/Register an toàn với SQLite', thumbnail: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&q=80', views: 21500, file_size_mb: 330.6, duration: '19:10', category_id: 2, status: 'published', created_at: '2026-11-05' }
            ],
            daily_views: [
                { id: 1, view_date: '2026-10-26', total_views: 12400 },
                { id: 2, view_date: '2026-10-27', total_views: 15800 },
                { id: 3, view_date: '2026-10-28', total_views: 14200 },
                { id: 4, view_date: '2026-10-29', total_views: 18900 },
                { id: 5, view_date: '2026-10-30', total_views: 22100 },
                { id: 6, view_date: '2026-10-31', total_views: 19500 },
                { id: 7, view_date: '2026-11-01', total_views: 25400 },
                { id: 8, view_date: '2026-11-02', total_views: 28900 },
                { id: 9, view_date: '2026-11-03', total_views: 24300 },
                { id: 10, view_date: '2026-11-04', total_views: 31200 },
                { id: 11, view_date: '2026-11-05', total_views: 29800 },
                { id: 12, view_date: '2026-11-06', total_views: 35600 },
                { id: 13, view_date: '2026-11-07', total_views: 38400 },
                { id: 14, view_date: '2026-11-08', total_views: 42100 }
            ],
            monthly_views: [
                { id: 1, view_month: '2026-01', month_label: 'Tháng 1', total_views: 45000 },
                { id: 2, view_month: '2026-02', month_label: 'Tháng 2', total_views: 52000 },
                { id: 3, view_month: '2026-03', month_label: 'Tháng 3', total_views: 48500 },
                { id: 4, view_month: '2026-04', month_label: 'Tháng 4', total_views: 61000 },
                { id: 5, view_month: '2026-05', month_label: 'Tháng 5', total_views: 68400 },
                { id: 6, view_month: '2026-06', month_label: 'Tháng 6', total_views: 74200 },
                { id: 7, view_month: '2026-07', month_label: 'Tháng 7', total_views: 82000 },
                { id: 8, view_month: '2026-08', month_label: 'Tháng 8', total_views: 79500 },
                { id: 9, view_month: '2026-09', month_label: 'Tháng 9', total_views: 94000 },
                { id: 10, view_month: '2026-10', month_label: 'Tháng 10', total_views: 118000 },
                { id: 11, view_month: '2026-11', month_label: 'Tháng 11', total_views: 125270 }
            ]
        };
    },

    /**
     * Khởi tạo cấu trúc bảng và nạp dữ liệu (từ Supabase hoặc từ Seed Data)
     */
    seedDatabase(dbName, customSource = null) {
        const db = this.databases[dbName];
        if (!db) return;
        const seed = customSource || this.getInitialSeedObjects();

        if (dbName === 'users.db') {
            db.run(`
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
            `);
            (seed.users || []).forEach(u => {
                db.run(
                    `INSERT OR REPLACE INTO users (id, full_name, email, password, security_answer, role, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [u.id, u.full_name, u.email, u.password || '123456', u.security_answer || 'vibe2026', String(u.role || 'USER').toUpperCase(), u.avatar || '', u.created_at || '2026-10-01']
                );
            });
        }

        if (dbName === 'video_categories.db') {
            db.run(`
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    slug TEXT NOT NULL UNIQUE,
                    color_badge TEXT DEFAULT '#2563EB',
                    description TEXT
                );
            `);
            (seed.categories || []).forEach(c => {
                db.run(
                    `INSERT OR REPLACE INTO categories (id, name, slug, color_badge, description) VALUES (?, ?, ?, ?, ?)`,
                    [c.id, c.name, c.slug, c.color_badge || '#2563EB', c.description || '']
                );
            });
        }

        if (dbName === 'videos.db') {
            db.run(`
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
            `);
            (seed.videos || []).forEach(v => {
                db.run(
                    `INSERT OR REPLACE INTO videos (id, title, thumbnail, views, file_size_mb, duration, category_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [v.id, v.title, v.thumbnail, Number(v.views || 0), Number(v.file_size_mb || 0), v.duration || '10:00', Number(v.category_id || 1), v.status || 'published', v.created_at || '2026-10-01']
                );
            });
        }

        if (dbName === 'video_analytics.db') {
            db.run(`
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
            `);
            (seed.daily_views || []).forEach((d, idx) => {
                db.run(`INSERT OR REPLACE INTO daily_views (id, view_date, total_views) VALUES (?, ?, ?)`, [d.id || idx + 1, d.view_date, Number(d.total_views || 0)]);
            });
            (seed.monthly_views || []).forEach((m, idx) => {
                db.run(`INSERT OR REPLACE INTO monthly_views (id, view_month, month_label, total_views) VALUES (?, ?, ?, ?)`, [m.id || idx + 1, m.view_month, m.month_label, Number(m.total_views || 0)]);
            });
        }
    },

    /* ---------------- Fallback Engine ---------------- */
    initFallbackStore() {
        try {
            const raw = localStorage.getItem(this.FALLBACK_KEY);
            if (raw) {
                this.fallbackStore = JSON.parse(raw);
            } else {
                this.fallbackStore = this.getInitialSeedObjects();
                this.saveFallbackStore();
            }
        } catch (e) {
            this.fallbackStore = this.getInitialSeedObjects();
        }
    },

    saveFallbackStore() {
        try {
            localStorage.setItem(this.FALLBACK_KEY, JSON.stringify(this.fallbackStore));
        } catch (e) {}
    },

    fallbackQueryAll(dbName, sql, params) {
        const s = sql.replace(/\s+/g, ' ').trim().toUpperCase();
        if (dbName === 'users.db') {
            const users = [...(this.fallbackStore.users || [])];
            if (s.includes('AND PASSWORD = ?')) {
                return users.filter(u => u.email.toLowerCase() === String(params[0]).toLowerCase() && u.password === params[1]);
            }
            if (s.includes('AND LOWER(SECURITY_ANSWER)')) {
                return users.filter(u => u.email.toLowerCase() === String(params[0]).toLowerCase() && u.security_answer.toLowerCase() === String(params[1]).toLowerCase());
            }
            if (s.includes('WHERE LOWER(EMAIL)')) {
                return users.filter(u => u.email.toLowerCase() === String(params[0]).toLowerCase());
            }
            if (s.includes('WHERE ID = ?')) {
                return users.filter(u => Number(u.id) === Number(params[0]));
            }
            return users.sort((a, b) => a.id - b.id);
        }
        if (dbName === 'video_categories.db') {
            return [...(this.fallbackStore.categories || [])];
        }
        if (dbName === 'video_analytics.db') {
            if (s.includes('FROM DAILY_VIEWS')) return [...(this.fallbackStore.daily_views || [])];
            if (s.includes('FROM MONTHLY_VIEWS')) return [...(this.fallbackStore.monthly_views || [])];
        }
        if (dbName === 'videos.db') {
            const videos = [...(this.fallbackStore.videos || [])];
            if (s.includes('COUNT(*) AS TOTAL_VIDEOS')) {
                return [{
                    total_videos: videos.length,
                    total_views: videos.reduce((acc, v) => acc + Number(v.views || 0), 0),
                    total_storage_mb: videos.reduce((acc, v) => acc + Number(v.file_size_mb || 0), 0)
                }];
            }
            if (s.includes('LIMIT 10')) {
                return videos.sort((a, b) => b.views - a.views).slice(0, 10);
            }
            if (s.includes('GROUP BY CATEGORY_ID')) {
                const map = {};
                videos.forEach(v => {
                    if (!map[v.category_id]) map[v.category_id] = { category_id: v.category_id, video_count: 0, total_views: 0 };
                    map[v.category_id].video_count++;
                    map[v.category_id].total_views += Number(v.views || 0);
                });
                return Object.values(map);
            }
            if (s.includes('WHERE ID = ?')) {
                return videos.filter(v => v.id === Number(params[0]));
            }
            let result = videos;
            let pIdx = 0;
            if (s.includes('LIKE LOWER(?)')) {
                const kw = String(params[0]).replace(/%/g, '').toLowerCase();
                const idMatch = String(params[1]);
                result = result.filter(v => v.title.toLowerCase().includes(kw) || String(v.id) === idMatch);
                pIdx += 2;
            }
            if (s.includes('AND CATEGORY_ID = ?')) {
                const cid = Number(params[pIdx]);
                result = result.filter(v => Number(v.category_id) === cid);
            }
            return result.sort((a, b) => b.id - a.id);
        }
        return [];
    },

    fallbackRun(dbName, sql, params) {
        const s = sql.replace(/\s+/g, ' ').trim().toUpperCase();
        if (dbName === 'users.db') {
            if (s.startsWith('INSERT INTO USERS')) {
                const nextId = (this.fallbackStore.users.reduce((m, u) => Math.max(m, u.id), 0)) + 1;
                this.fallbackStore.users.push({
                    id: nextId,
                    full_name: params[0],
                    email: params[1],
                    password: params[2],
                    security_answer: params[3],
                    role: params[4] || 'USER',
                    avatar: params[5],
                    created_at: new Date().toISOString().slice(0, 10)
                });
            } else if (s.startsWith('UPDATE USERS SET PASSWORD')) {
                const user = this.fallbackStore.users.find(u => u.email.toLowerCase() === String(params[1]).toLowerCase());
                if (user) user.password = params[0];
            } else if (s.startsWith('UPDATE USERS SET ROLE')) {
                const user = this.fallbackStore.users.find(u => Number(u.id) === Number(params[1]));
                if (user) user.role = String(params[0]).toUpperCase();
            }
        } else if (dbName === 'video_categories.db' && s.startsWith('INSERT INTO CATEGORIES')) {
            const nextId = (this.fallbackStore.categories.reduce((m, c) => Math.max(m, c.id), 0)) + 1;
            this.fallbackStore.categories.push({
                id: nextId,
                name: params[0],
                slug: params[1],
                color_badge: params[2],
                description: params[3]
            });
        } else if (dbName === 'videos.db') {
            if (s.startsWith('INSERT INTO VIDEOS')) {
                const nextId = (this.fallbackStore.videos.reduce((m, v) => Math.max(m, v.id), 0)) + 1;
                this.fallbackStore.videos.push({
                    id: nextId,
                    title: params[0],
                    thumbnail: params[1],
                    views: Number(params[2]),
                    file_size_mb: Number(params[3]),
                    duration: params[4],
                    category_id: Number(params[5]),
                    status: 'published',
                    created_at: params[6]
                });
            } else if (s.startsWith('UPDATE VIDEOS')) {
                const idx = this.fallbackStore.videos.findIndex(v => v.id === Number(params[6]));
                if (idx !== -1) {
                    this.fallbackStore.videos[idx] = {
                        ...this.fallbackStore.videos[idx],
                        title: params[0],
                        thumbnail: params[1],
                        views: Number(params[2]),
                        file_size_mb: Number(params[3]),
                        duration: params[4],
                        category_id: Number(params[5])
                    };
                }
            } else if (s.startsWith('DELETE FROM VIDEOS')) {
                this.fallbackStore.videos = this.fallbackStore.videos.filter(v => v.id !== Number(params[0]));
            }
        }
        this.saveFallbackStore();
    },

    exportDatabaseFile(dbName) {
        const db = this.databases[dbName];
        if (db) {
            const binaryArray = db.export();
            const blob = new Blob([binaryArray], { type: 'application/x-sqlite3' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = dbName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } else {
            const a = document.createElement('a');
            a.href = `data/${dbName}`;
            a.download = dbName;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
        if (window.Formatters) {
            window.Formatters.showToast(`Đã tải xuống file ${dbName}`);
        }
    },

    resetAllDatabases() {
        const dbNames = ['users.db', 'video_categories.db', 'videos.db', 'video_analytics.db'];
        dbNames.forEach(name => {
            localStorage.removeItem(this.STORAGE_PREFIX + name);
            localStorage.removeItem(this.DISK_SIG_PREFIX + name);
        });
        localStorage.removeItem(this.FALLBACK_KEY);
        window.location.reload();
    },

    bindExportButtons() {
        document.querySelectorAll('[data-export-db]').forEach(btn => {
            btn.addEventListener('click', () => {
                const dbName = btn.getAttribute('data-export-db');
                this.exportDatabaseFile(dbName);
            });
        });

        const resetBtn = document.getElementById('btn-reset-db');
        if (resetBtn) {
            resetBtn.textContent = '🔄 Đồng bộ Supabase / DB';
            resetBtn.addEventListener('click', () => {
                this.resetAllDatabases();
            });
        }
    }
};
