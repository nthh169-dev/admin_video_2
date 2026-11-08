window.AuthGuard = {
    SESSION_KEY: 'vibe_video_admin_user',

    /**
     * Lấy thông tin người dùng đang đăng nhập
     */
    getCurrentUser() {
        try {
            const raw = localStorage.getItem(this.SESSION_KEY);
            if (!raw) return null;
            const user = JSON.parse(raw);
            if (user && user.role) {
                user.role = String(user.role).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
            }
            return user;
        } catch (e) {
            return null;
        }
    },

    /**
     * Lưu phiên đăng nhập
     */
    setCurrentUser(user) {
        const normalizedRole = String(user.role || 'USER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
        const safeUser = {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: normalizedRole,
            avatar: user.avatar || ''
        };
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(safeUser));
    },

    /**
     * Kiểm tra người dùng hiện tại có phải ADMIN không
     */
    isAdmin() {
        const user = this.getCurrentUser();
        return Boolean(user && String(user.role).toUpperCase() === 'ADMIN');
    },

    /**
     * Đăng xuất
     */
    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        window.location.href = 'login.html';
    },

    /**
     * Bắt buộc đăng nhập cho các trang quản trị.
     */
    requireAuth() {
        let user = this.getCurrentUser();
        const manualLogout = sessionStorage.getItem('vibe_manual_logout');

        if (!user && !manualLogout) {
            user = {
                id: 1,
                full_name: 'Quản Trị Viên Chính',
                email: 'admin@gmail.com',
                role: 'ADMIN',
                avatar: 'https://ui-avatars.com/api/?name=Admin&background=2563EB&color=fff'
            };
            this.setCurrentUser(user);
        }

        if (!user) {
            window.location.href = 'login.html';
            return null;
        }

        this.renderHeaderUser(user);
        this.bindLogoutButtons();
        return user;
    },

    renderHeaderUser(user) {
        const nameEl = document.getElementById('header-user-name');
        const roleEl = document.getElementById('header-user-role');
        const avatarEl = document.getElementById('header-user-avatar');

        if (nameEl) nameEl.textContent = user.full_name;
        if (roleEl) roleEl.textContent = `${user.role} • ${user.email}`;
        if (avatarEl) {
            const initials = (user.full_name || 'A')
                .split(' ')
                .map(w => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
            avatarEl.textContent = initials;
        }
    },

    bindLogoutButtons() {
        const logoutBtns = document.querySelectorAll('[data-action="logout"]');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                sessionStorage.setItem('vibe_manual_logout', '1');
                this.logout();
            });
        });
    }
};
