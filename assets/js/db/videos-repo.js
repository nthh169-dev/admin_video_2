/**
 * Repository thao tác với Database: videos.db & Bảng `videos` trên Supabase
 */
window.VideosRepo = {
    DB_NAME: 'videos.db',

    getAll({ search = '', categoryId = '' } = {}) {
        let sql = `
            SELECT id, title, thumbnail, views, file_size_mb, duration, category_id, status, created_at
            FROM videos
            WHERE 1=1
        `;
        const params = [];

        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(title) LIKE LOWER(?) OR CAST(id AS TEXT) = ?)`;
            params.push(`%${search.trim()}%`, search.trim().replace(/^#/, ''));
        }

        if (categoryId && categoryId !== 'all') {
            sql += ` AND category_id = ?`;
            params.push(Number(categoryId));
        }

        sql += ` ORDER BY id DESC`;
        return window.SQLiteManager.queryAll(this.DB_NAME, sql, params);
    },

    getById(id) {
        return window.SQLiteManager.queryOne(
            this.DB_NAME,
            `SELECT * FROM videos WHERE id = ?`,
            [Number(id)]
        );
    },

    getDashboardStats() {
        const row = window.SQLiteManager.queryOne(
            this.DB_NAME,
            `SELECT 
                COUNT(*) AS total_videos,
                COALESCE(SUM(views), 0) AS total_views,
                COALESCE(SUM(file_size_mb), 0) AS total_storage_mb
             FROM videos`
        );
        return {
            totalVideos: Number(row?.total_videos || 0),
            totalViews: Number(row?.total_views || 0),
            totalStorageMB: Number(row?.total_storage_mb || 0)
        };
    },

    getTop10ByViews() {
        return window.SQLiteManager.queryAll(
            this.DB_NAME,
            `SELECT id, title, views, category_id
             FROM videos
             ORDER BY views DESC
             LIMIT 10`
        );
    },

    getCountByCategory() {
        const rows = window.SQLiteManager.queryAll(
            this.DB_NAME,
            `SELECT category_id, COUNT(*) AS video_count, COALESCE(SUM(views), 0) AS total_views
             FROM videos
             GROUP BY category_id`
        );
        const map = {};
        rows.forEach(r => {
            map[r.category_id] = {
                count: Number(r.video_count),
                views: Number(r.total_views)
            };
        });
        return map;
    },

    /**
     * Thêm mới video vào videos.db và đồng bộ trực tiếp lên Supabase
     */
    create(video) {
        const today = new Date().toISOString().slice(0, 10);
        const payload = {
            title: video.title.trim(),
            thumbnail: video.thumbnail.trim(),
            views: Number(video.views) || 0,
            file_size_mb: Number(video.file_size_mb) || 120.0,
            duration: video.duration || '12:30',
            category_id: Number(video.category_id) || 1,
            status: 'published',
            created_at: today
        };

        window.SQLiteManager.run(
            this.DB_NAME,
            `INSERT INTO videos (title, thumbnail, views, file_size_mb, duration, category_id, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'published', ?)`,
            [
                payload.title,
                payload.thumbnail,
                payload.views,
                payload.file_size_mb,
                payload.duration,
                payload.category_id,
                payload.created_at
            ]
        );

        const latest = window.SQLiteManager.queryOne(this.DB_NAME, `SELECT * FROM videos ORDER BY id DESC LIMIT 1`);

        if (window.SupabaseClient) {
            window.SupabaseClient.insert('videos', {
                id: latest?.id,
                ...payload
            });
        }
    },

    /**
     * Cập nhật thông tin video (Action: Edit) và đồng bộ trực tiếp lên Supabase
     */
    update(id, video) {
        const payload = {
            title: video.title.trim(),
            thumbnail: video.thumbnail.trim(),
            views: Number(video.views) || 0,
            file_size_mb: Number(video.file_size_mb) || 100.0,
            duration: video.duration || '10:00',
            category_id: Number(video.category_id) || 1
        };

        window.SQLiteManager.run(
            this.DB_NAME,
            `UPDATE videos
             SET title = ?,
                 thumbnail = ?,
                 views = ?,
                 file_size_mb = ?,
                 duration = ?,
                 category_id = ?
             WHERE id = ?`,
            [
                payload.title,
                payload.thumbnail,
                payload.views,
                payload.file_size_mb,
                payload.duration,
                payload.category_id,
                Number(id)
            ]
        );

        if (window.SupabaseClient) {
            window.SupabaseClient.update('videos', `id=eq.${Number(id)}`, payload);
        }
    },

    /**
     * Xóa video theo ID (Action: Delete) và đồng bộ trực tiếp lên Supabase
     */
    delete(id) {
        window.SQLiteManager.run(
            this.DB_NAME,
            `DELETE FROM videos WHERE id = ?`,
            [Number(id)]
        );

        if (window.SupabaseClient) {
            window.SupabaseClient.remove('videos', `id=eq.${Number(id)}`);
        }
    }
};
