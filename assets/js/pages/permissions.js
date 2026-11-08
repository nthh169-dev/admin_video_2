/**
 * Module 1: Phân Quyền (Permission Management — permissions.js)
 * - Có 2 quyền (role): ADMIN và USER
 * - Chỉ tài khoản có role ADMIN mới được phép truy cập và chỉnh sửa role của các tài khoản khác
 * - Mọi thay đổi được lưu trực tiếp vào database SQLite: users.db
 */
document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = window.AuthGuard.requireAuth();
    if (!currentUser) return;

    await window.SQLiteManager.init();

    // Đồng bộ lại thông tin role mới nhất của người dùng hiện tại từ users.db
    const freshUser = window.UsersRepo.findByEmail(currentUser.email);
    if (freshUser) {
        window.AuthGuard.setCurrentUser(freshUser);
        window.AuthGuard.renderHeaderUser(freshUser);
    }

    const activeUser = window.AuthGuard.getCurrentUser();
    const adminSection = document.getElementById('permission-admin-content');
    const deniedSection = document.getElementById('permission-denied-content');

    // Kiểm tra quyền truy cập: Chỉ tài khoản role ADMIN mới được vào trang Phân Quyền
    if (!activeUser || activeUser.role !== 'ADMIN') {
        if (adminSection) adminSection.style.display = 'none';
        if (deniedSection) {
            deniedSection.style.display = 'block';
            const deniedEmailEl = document.getElementById('denied-user-email');
            if (deniedEmailEl) {
                deniedEmailEl.textContent = `${activeUser?.email || ''} (Role: ${activeUser?.role || 'USER'})`;
            }
        }
        bindQuickSwitchAdmin();
        return;
    }

    if (adminSection) adminSection.style.display = 'block';
    if (deniedSection) deniedSection.style.display = 'none';

    renderRoleKPIs();
    renderPermissionsTable();
    bindPermissionFilters();
});

/**
 * Hiển thị 3 thẻ thống kê số lượng tài khoản theo Role (Tổng tài khoản, ADMIN, USER)
 */
function renderRoleKPIs() {
    const stats = window.UsersRepo.getRoleStats();
    const totalEl = document.getElementById('perm-total-users');
    const adminEl = document.getElementById('perm-admin-count');
    const userEl = document.getElementById('perm-user-count');

    if (totalEl) totalEl.textContent = stats.total;
    if (adminEl) adminEl.textContent = stats.adminCount;
    if (userEl) userEl.textContent = stats.userCount;
}

/**
 * Render bảng danh sách tài khoản và chỉnh sửa Role (ADMIN / USER)
 */
function renderPermissionsTable() {
    const tbody = document.getElementById('permissions-table-body');
    const summaryEl = document.getElementById('perm-table-summary');
    if (!tbody) return;

    const currentUser = window.AuthGuard.getCurrentUser();
    const searchVal = document.getElementById('perm-search')?.value || '';
    const roleFilter = document.getElementById('perm-role-filter')?.value || 'ALL';

    const users = window.UsersRepo.getAllUsers({
        search: searchVal,
        role: roleFilter
    });

    if (summaryEl) {
        summaryEl.textContent = `Hiển thị ${users.length} tài khoản từ users.db`;
    }

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                    Không tìm thấy tài khoản nào phù hợp với bộ lọc.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(u => {
        const isCurrentAccount = currentUser && (Number(u.id) === Number(currentUser.id) || u.email.toLowerCase() === currentUser.email.toLowerCase());
        const isRoleAdmin = u.role === 'ADMIN';

        const badgeClass = isRoleAdmin ? 'role-badge role-admin' : 'role-badge role-user';
        const badgeIcon = isRoleAdmin ? '🛡️ ADMIN' : '👤 USER';

        const avatarSrc = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=2563EB&color=fff`;

        return `
            <tr>
                <td class="col-id">#${u.id}</td>
                <td>
                    <div class="user-account-cell">
                        <img class="account-avatar" src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(u.full_name)}">
                        <div class="account-details">
                            <div class="account-name">
                                <span>${escapeHtml(u.full_name)}</span>
                                ${isCurrentAccount ? '<span class="self-tag">Tài khoản của bạn</span>' : ''}
                            </div>
                            <span class="account-email">${escapeHtml(u.email)}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="${badgeClass}">${badgeIcon}</span>
                </td>
                <td style="color: var(--text-muted); font-size: 13px;">
                    ${escapeHtml(u.created_at || '2026-10-01')}
                </td>
                <td>
                    ${isCurrentAccount ? `
                        <div class="role-action-group">
                            <select class="role-select" disabled title="Không thể tự hạ quyền của tài khoản đang đăng nhập">
                                <option value="ADMIN" selected>ADMIN</option>
                            </select>
                            <span class="self-lock-note">Đang đăng nhập</span>
                        </div>
                    ` : `
                        <div class="role-action-group">
                            <select class="role-select" data-role-select-id="${u.id}">
                                <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
                                <option value="USER" ${u.role === 'USER' ? 'selected' : ''}>USER</option>
                            </select>
                            <button type="button" class="btn btn-primary btn-sm" data-save-role-id="${u.id}">
                                Lưu quyền
                            </button>
                        </div>
                    `}
                </td>
            </tr>
        `;
    }).join('');

    // Sự kiện bấm nút "Lưu quyền" hoặc thay đổi quyền cho tài khoản khác
    tbody.querySelectorAll('[data-save-role-id]').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-save-role-id');
            const selectEl = tbody.querySelector(`[data-role-select-id="${userId}"]`);
            if (!selectEl) return;

            const newRole = selectEl.value;
            const updated = window.UsersRepo.updateUserRole(userId, newRole);
            renderRoleKPIs();
            renderPermissionsTable();

            if (window.Formatters && updated) {
                window.Formatters.showToast(`Đã cập nhật quyền của ${updated.email} thành ${updated.role} trong users.db!`);
            }
        });
    });
}

function bindPermissionFilters() {
    const searchInput = document.getElementById('perm-search');
    const roleSelect = document.getElementById('perm-role-filter');

    if (searchInput) {
        searchInput.addEventListener('input', () => renderPermissionsTable());
    }
    if (roleSelect) {
        roleSelect.addEventListener('change', () => renderPermissionsTable());
    }
}

/**
 * Hỗ trợ chuyển nhanh sang tài khoản ADMIN nếu người học đang đăng nhập bằng tài khoản USER để test
 */
function bindQuickSwitchAdmin() {
    const switchBtn = document.getElementById('btn-switch-to-admin');
    if (switchBtn) {
        switchBtn.addEventListener('click', () => {
            const adminUser = window.UsersRepo.findByEmail('admin@gmail.com');
            if (adminUser) {
                window.AuthGuard.setCurrentUser(adminUser);
                window.location.reload();
            }
        });
    }
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
