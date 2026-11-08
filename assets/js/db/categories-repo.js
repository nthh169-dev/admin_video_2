/**
 * Repository thao tác với Database: video_categories.db & Bảng `categories` trên Supabase
 */
window.CategoriesRepo = {
    DB_NAME: 'video_categories.db',

    getAll() {
        return window.SQLiteManager.queryAll(
            this.DB_NAME,
            `SELECT id, name, slug, color_badge, description FROM categories ORDER BY id ASC`
        );
    },

    getCategoryMap() {
        const list = this.getAll();
        const map = {};
        list.forEach(cat => {
            map[cat.id] = cat;
        });
        return map;
    },

    create({ name, color_badge, description }) {
        const slug = name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || ('category-' + Date.now());

        const payload = {
            name: name.trim(),
            slug,
            color_badge: color_badge || '#2563EB',
            description: description || ''
        };

        window.SQLiteManager.run(
            this.DB_NAME,
            `INSERT INTO categories (name, slug, color_badge, description) VALUES (?, ?, ?, ?)`,
            [payload.name, payload.slug, payload.color_badge, payload.description]
        );

        const latest = window.SQLiteManager.queryOne(this.DB_NAME, `SELECT * FROM categories ORDER BY id DESC LIMIT 1`);

        if (window.SupabaseClient) {
            window.SupabaseClient.insert('categories', {
                id: latest?.id,
                ...payload
            });
        }
    }
};
