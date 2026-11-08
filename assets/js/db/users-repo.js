/**
 * Repository thao tác với Database: users.db & Bảng `users` trên Supabase
 */
window.UsersRepo = {
    DB_NAME: 'users.db',

    authenticate(email, password) {
        const user = window.SQLiteManager.queryOne(
            this.DB_NAME,
            `SELECT id, full_name, email, role, avatar, created_at 
             FROM users 
             WHERE LOWER(email) = LOWER(?) AND password = ?`,
            [email.trim(), password]
        );
        if (user) {
            user.role = String(user.role || 'USER').toUpperCase();
        }
        return user;
    },

    findByEmail(email) {
        const user = window.SQLiteManager.queryOne(
            this.DB_NAME,
            `SELECT * FROM users WHERE LOWER(email) = LOWER(?)`,
            [email.trim()]
        );
        if (user) {
            user.role = String(user.role || 'USER').toUpperCase();
        }
        return user;
    },

    getById(id) {
        const user = window.SQLiteManager.queryOne(
            this.DB_NAME,
            `SELECT id, full_name, email, role, avatar, created_at FROM users WHERE id = ?`,
            [Number(id)]
        );
        if (user) {
            user.role = String(user.role || 'USER').toUpperCase();
        }
        return user;
    },

    /**
     * Đăng ký người dùng mới vào users.db và đồng bộ lên Supabase
     */
    registerUser({ full_name, email, password, security_answer, role = 'USER' }) {
        const existing = this.findByEmail(email);
        if (existing) {
            throw new Error('Email này đã được đăng ký!');
        }

        const normalizedRole = String(role).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(full_name)}&background=2563EB&color=fff`;
        const today = new Date().toISOString().slice(0, 10);

        window.SQLiteManager.run(
            this.DB_NAME,
            `INSERT INTO users (full_name, email, password, security_answer, role, avatar, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [full_name.trim(), email.trim().toLowerCase(), password, security_answer.trim(), normalizedRole, avatarUrl, today]
        );

        const created = this.findByEmail(email);

        if (window.SupabaseClient) {
            window.SupabaseClient.insert('users', {
                id: created?.id,
                full_name: full_name.trim(),
                email: email.trim().toLowerCase(),
                password,
                security_answer: security_answer.trim(),
                role: normalizedRole,
                avatar: avatarUrl,
                created_at: today
            });
        }

        return created;
    },

    verifyRecovery(email, securityAnswer) {
        return window.SQLiteManager.queryOne(
            this.DB_NAME,
            `SELECT id, full_name, email FROM users 
             WHERE LOWER(email) = LOWER(?) AND LOWER(security_answer) = LOWER(?)`,
            [email.trim(), securityAnswer.trim()]
        );
    },

    /**
     * Cập nhật mật khẩu mới vào users.db và đồng bộ trực tiếp lên Supabase
     */
    async updatePassword(email, newPassword) {
        window.SQLiteManager.run(
            this.DB_NAME,
            `UPDATE users SET password = ? WHERE LOWER(email) = LOWER(?)`,
            [newPassword, email.trim()]
        );

        if (window.SupabaseClient) {
            await window.SupabaseClient.update(
                'users',
                `email=eq.${encodeURIComponent(email.trim().toLowerCase())}`,
                { password: newPassword }
            );
        }
    },

    getAllUsers({ search = '', role = 'ALL' } = {}) {
        const rows = window.SQLiteManager.queryAll(
            this.DB_NAME,
            `SELECT id, full_name, email, role, avatar, created_at FROM users ORDER BY id ASC`
        );

        return rows
            .map(u => ({
                ...u,
                role: String(u.role || 'USER').toUpperCase()
            }))
            .filter(u => {
                const matchRole = !role || role === 'ALL' || u.role === role.toUpperCase();
                if (!matchRole) return false;
                if (!search || !search.trim()) return true;
                const kw = search.trim().toLowerCase();
                return (
                    u.full_name.toLowerCase().includes(kw) ||
                    u.email.toLowerCase().includes(kw) ||
                    String(u.id) === kw.replace(/^#/, '')
                );
            });
    },

    /**
     * Cập nhật quyền (role: ADMIN hoặc USER) trong users.db và đồng bộ lên Supabase
     */
    updateUserRole(userId, newRole) {
        const normalizedRole = String(newRole).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
        window.SQLiteManager.run(
            this.DB_NAME,
            `UPDATE users SET role = ? WHERE id = ?`,
            [normalizedRole, Number(userId)]
        );

        if (window.SupabaseClient) {
            window.SupabaseClient.update(
                'users',
                `id=eq.${Number(userId)}`,
                { role: normalizedRole }
            );
        }

        return this.getById(userId);
    },

    getRoleStats() {
        const all = this.getAllUsers();
        const adminCount = all.filter(u => u.role === 'ADMIN').length;
        const userCount = all.filter(u => u.role === 'USER').length;
        return {
            total: all.length,
            adminCount,
            userCount
        };
    }
};
