/**
 * Supabase Client & Supabase Auth Connector (Cấu hình từ file supabase.txt)
 * - Project URL: https://qhkdldltwqnwpmifqdcj.supabase.co
 * - Publishable key: sb_publishable_th6ALyrrhz5qWwppeBOlRw_ouLOX2CU
 *
 * Tích hợp đầy đủ:
 * 1. Supabase AuthSDK (@supabase/supabase-js v2):
 *    - supabase.auth.resetPasswordForEmail() (Quên mật khẩu qua Email Supabase Auth)
 *    - supabase.auth.verifyOtp({ type: 'recovery' }) (Xác thực OTP khôi phục)
 *    - supabase.auth.onAuthStateChange('PASSWORD_RECOVERY') (Bắt phiên từ Link Email)
 *    - supabase.auth.updateUser({ password }) (Đổi mật khẩu trên Supabase Auth)
 *    - supabase.auth.signUp() & supabase.auth.signInWithPassword()
 * 2. Supabase Database REST API (PostgREST) cho các bảng users, videos, categories, daily_views, monthly_views.
 */

window.SupabaseClient = {
    PROJECT_URL: 'https://qhkdldltwqnwpmifqdcj.supabase.co',
    PUBLISHABLE_KEY: 'sb_publishable_th6ALyrrhz5qWwppeBOlRw_ouLOX2CU',
    sdk: null,
    isConnected: false,
    missingTables: false,
    lastError: null,

    /**
     * Khởi tạo Supabase JS SDK (@supabase/supabase-js) cho Supabase Auth
     */
    initAuthSDK() {
        if (this.sdk) return this.sdk;
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            this.sdk = window.supabase.createClient(this.PROJECT_URL, this.PUBLISHABLE_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            });
        }
        return this.sdk;
    },

    /* ========================================================================
     * SUPABASE AUTH METHODS (FORGOT PASSWORD, SIGN UP, SIGN IN, UPDATE USER)
     * ======================================================================== */

    /**
     * 1. Gửi email khôi phục mật khẩu bằng Supabase Auth:
     *    supabase.auth.resetPasswordForEmail(email, { redirectTo })
     */
    async sendPasswordResetEmail(email) {
        const client = this.initAuthSDK();
        // Nếu đang mở trên http/https thì truyền redirectTo về trang forgot-password.html hiện tại,
        // nếu mở bằng file:// thì dùng origin mặc định đã cấu hình trên Supabase Auth (http://localhost:3000)
        const isHttp = window.location.protocol.startsWith('http');
        const redirectTo = isHttp
            ? window.location.origin + window.location.pathname
            : 'http://localhost:3000/forgot-password.html';

        if (client) {
            const { data, error } = await client.auth.resetPasswordForEmail(email.trim(), {
                redirectTo
            });
            if (error) throw error;
            return data;
        }

        // Fallback gọi trực tiếp REST endpoint /auth/v1/recover của Supabase Auth
        const res = await fetch(`${this.PROJECT_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ email: email.trim() })
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.msg || errBody.error_description || errBody.message || `Lỗi Supabase Auth (${res.status})`);
        }
        return await res.json().catch(() => ({}));
    },

    /**
     * 2. Xác thực mã OTP (6 số) hoặc Token nhận từ Email của Supabase Auth:
     *    supabase.auth.verifyOtp({ email, token, type: 'recovery' })
     */
    async verifyRecoveryOtp(email, token) {
        const client = this.initAuthSDK();
        if (!client) {
            throw new Error('Thư viện @supabase/supabase-js chưa được tải!');
        }
        const { data, error } = await client.auth.verifyOtp({
            email: email.trim(),
            token: token.trim(),
            type: 'recovery'
        });
        if (error) throw error;
        return data;
    },

    /**
     * 3. Nạp phiên khôi phục mật khẩu từ URL chứa #access_token=...&refresh_token=...&type=recovery
     *    (Hỗ trợ cả khi người dùng mở web qua file:// và dán đường link từ email vào)
     */
    async setRecoverySessionFromUrlOrHash(urlOrHash) {
        const client = this.initAuthSDK();
        if (!client) throw new Error('Chưa khởi tạo Supabase SDK');

        let hashPart = urlOrHash.trim();
        if (hashPart.includes('#')) {
            hashPart = hashPart.split('#')[1];
        } else if (hashPart.includes('?')) {
            hashPart = hashPart.split('?')[1];
        }

        const params = new URLSearchParams(hashPart);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const tokenHash = params.get('token_hash') || params.get('token');
        const type = params.get('type') || 'recovery';

        if (accessToken && refreshToken) {
            const { data, error } = await client.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });
            if (error) throw error;
            return data;
        }

        if (tokenHash) {
            const { data, error } = await client.auth.verifyOtp({
                token_hash: tokenHash,
                type
            });
            if (error) throw error;
            return data;
        }

        throw new Error('Đường link không chứa access_token hoặc token_hash hợp lệ của Supabase Auth!');
    },

    /**
     * 4. Cập nhật mật khẩu mới cho tài khoản trên Supabase Auth:
     *    supabase.auth.updateUser({ password: newPassword })
     */
    async updateAuthUserPassword(newPassword) {
        const client = this.initAuthSDK();
        if (!client) {
            throw new Error('Thư viện @supabase/supabase-js chưa được tải!');
        }
        const { data, error } = await client.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return data;
    },

    /**
     * 5. Đăng ký tài khoản lên Supabase Auth (auth.users)
     */
    async signUpAuthUser(email, password, fullName = '') {
        const client = this.initAuthSDK();
        if (!client) return null;
        const { data, error } = await client.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: { full_name: fullName }
            }
        });
        if (error) throw error;
        return data;
    },

    /**
     * 6. Đăng nhập qua Supabase Auth (auth.users)
     */
    async signInAuthUser(email, password) {
        const client = this.initAuthSDK();
        if (!client) return null;
        const { data, error } = await client.auth.signInWithPassword({
            email: email.trim(),
            password
        });
        if (error) throw error;
        return data;
    },

    /* ========================================================================
     * SUPABASE DATABASE REST API (POSTGREST)
     * ======================================================================== */

    getHeaders(extra = {}) {
        return {
            'apikey': this.PUBLISHABLE_KEY,
            'Authorization': `Bearer ${this.PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
            ...extra
        };
    },

    async selectAll(table, orderCol = 'id', ascending = true) {
        const dir = ascending ? 'asc' : 'desc';
        const url = `${this.PROJECT_URL}/rest/v1/${table}?select=*&order=${orderCol}.${dir}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders()
        });

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            const err = new Error(errBody.message || `HTTP ${res.status}`);
            err.code = errBody.code || String(res.status);
            throw err;
        }
        return await res.json();
    },

    async insert(table, payload) {
        try {
            const url = `${this.PROJECT_URL}/rest/v1/${table}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders({ 'Prefer': 'return=representation,resolution=ignore-duplicates' }),
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.warn(`[Supabase INSERT ${table}]`, err);
                return null;
            }
            return await res.json();
        } catch (e) {
            console.warn(`[Supabase INSERT ${table} failed]`, e);
            return null;
        }
    },

    async update(table, matchQuery, payload) {
        try {
            const url = `${this.PROJECT_URL}/rest/v1/${table}?${matchQuery}`;
            const res = await fetch(url, {
                method: 'PATCH',
                headers: this.getHeaders({ 'Prefer': 'return=representation' }),
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.warn(`[Supabase UPDATE ${table}]`, err);
                return null;
            }
            return await res.json();
        } catch (e) {
            console.warn(`[Supabase UPDATE ${table} failed]`, e);
            return null;
        }
    },

    async remove(table, matchQuery) {
        try {
            const url = `${this.PROJECT_URL}/rest/v1/${table}?${matchQuery}`;
            const res = await fetch(url, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return res.ok;
        } catch (e) {
            console.warn(`[Supabase DELETE ${table} failed]`, e);
            return false;
        }
    },

    async syncWithLocalSQLite(sqliteManager) {
        this.initAuthSDK();
        const seed = sqliteManager.getInitialSeedObjects();
        try {
            const [users, categories, videos, dailyViews, monthlyViews] = await Promise.all([
                this.selectAll('users', 'id', true),
                this.selectAll('categories', 'id', true),
                this.selectAll('videos', 'id', true),
                this.selectAll('daily_views', 'view_date', true),
                this.selectAll('monthly_views', 'view_month', true)
            ]);

            this.isConnected = true;
            this.missingTables = false;

            const finalUsers = users.length > 0 ? users : (await this.insert('users', seed.users)) || seed.users;
            const finalCategories = categories.length > 0 ? categories : (await this.insert('categories', seed.categories)) || seed.categories;
            const finalVideos = videos.length > 0 ? videos : (await this.insert('videos', seed.videos)) || seed.videos;
            const finalDaily = dailyViews.length > 0 ? dailyViews : (await this.insert('daily_views', seed.daily_views)) || seed.daily_views;
            const finalMonthly = monthlyViews.length > 0 ? monthlyViews : (await this.insert('monthly_views', seed.monthly_views)) || seed.monthly_views;

            this.renderStatusBadge('connected');

            return {
                users: finalUsers,
                categories: finalCategories,
                videos: finalVideos,
                daily_views: finalDaily,
                monthly_views: finalMonthly
            };
        } catch (err) {
            this.lastError = err;
            if (err.code === 'PGRST205' || err.code === '42P01' || String(err.message).includes('Could not find the table')) {
                this.isConnected = true;
                this.missingTables = true;
                this.renderStatusBadge('missing_tables');
            } else {
                this.isConnected = false;
                this.renderStatusBadge('offline');
            }
            return null;
        }
    },

    renderStatusBadge(status) {
        document.querySelectorAll('.brand-subtitle').forEach(el => {
            if (status === 'connected') {
                el.innerHTML = '<span style="color:#059669;font-weight:700;">⚡ Supabase Live</span>';
            }
        });

        document.querySelectorAll('.db-panel-title').forEach(el => {
            if (status === 'connected') {
                el.innerHTML = '⚡ Supabase Cloud DB';
            }
        });

        const badgeEngines = document.querySelectorAll('.db-badge-engine');
        badgeEngines.forEach(el => {
            if (status === 'connected') {
                el.innerHTML = '🟢 Connected: Supabase Live';
                el.style.backgroundColor = '#ECFDF5';
                el.style.color = '#059669';
                el.style.border = '1px solid #A7F3D0';
            } else if (status === 'missing_tables') {
                el.textContent = '⚠️ Cần tạo bảng Supabase';
                el.style.backgroundColor = '#FFFBEB';
                el.style.color = '#B45309';
                el.style.border = '1px solid #FDE68A';
                el.style.cursor = 'pointer';
                el.title = 'Bấm để xem hướng dẫn chạy supabase_setup.sql trên Supabase';
                el.onclick = () => this.showSetupGuideModal();
            } else {
                el.textContent = 'SQLite Local (Offline)';
            }
        });

        const headerRight = document.querySelector('.header-right');
        if (headerRight && !document.getElementById('header-supabase-pill')) {
            const pill = document.createElement('div');
            pill.id = 'header-supabase-pill';
            pill.className = 'header-supabase-badge';
            if (status === 'connected') {
                pill.innerHTML = '<span class="header-supabase-dot"></span><span>⚡ Supabase Live (qhkdldltwqnwpmifqdcj)</span>';
            } else {
                pill.innerHTML = '<span>🗄️ SQLite Local Mode</span>';
            }
            headerRight.insertBefore(pill, headerRight.firstChild);
        }

        const authTags = document.querySelectorAll('.auth-db-tag');
        authTags.forEach(el => {
            if (status === 'connected') {
                el.innerHTML = '⚡ Connected: <strong>Supabase Auth & Cloud DB</strong>';
                el.style.backgroundColor = '#ECFDF5';
                el.style.color = '#059669';
                el.style.borderColor = '#A7F3D0';
            }
        });
    },

    showSetupGuideModal() {
        alert(
            'Kết nối tới Supabase (https://qhkdldltwqnwpmifqdcj.supabase.co) đã THÀNH CÔNG!\n\n' +
            'Tuy nhiên trên Supabase của bạn chưa có các bảng (users, videos, categories...).\n' +
            'Hãy mở file "supabase_setup.sql" trong thư mục dự án, copy nội dung và chạy trong mục SQL Editor trên trang quản trị Supabase của bạn.'
        );
    }
};
