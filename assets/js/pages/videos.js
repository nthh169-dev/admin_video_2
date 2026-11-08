/**
 * Logic trang List Video (videos.html)
 * Hiển thị danh sách video gồm:
 * - id
 * - title
 * - thumbnail
 * - views
 * - action (Edit, Delete)
 * Kết nối trực tiếp với videos.db và video_categories.db
 */
document.addEventListener('DOMContentLoaded', async () => {
    window.AuthGuard.requireAuth();
    await window.SQLiteManager.init();

    populateCategoryDropdowns();
    renderVideosTable();
    bindToolbarEvents();
    bindVideoModalEvents();
    bindCategoryModalEvents();
});

/**
 * Đổ dữ liệu danh mục từ video_categories.db vào bộ lọc và form Modal
 */
function populateCategoryDropdowns() {
    const categories = window.CategoriesRepo.getAll();
    const filterSelect = document.getElementById('filter-category');
    const modalSelect = document.getElementById('video-category');

    if (filterSelect) {
        const currentVal = filterSelect.value || 'all';
        filterSelect.innerHTML = `<option value="all">Tất cả danh mục (${categories.length})</option>` +
            categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        filterSelect.value = currentVal;
    }

    if (modalSelect) {
        modalSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
}

/**
 * Render bảng danh sách video (id, thumbnail, title, views, action: Edit, Delete)
 */
function renderVideosTable() {
    const tbody = document.getElementById('videos-table-body');
    const summaryEl = document.getElementById('table-summary-text');
    if (!tbody) return;

    const searchVal = document.getElementById('search-video')?.value || '';
    const categoryVal = document.getElementById('filter-category')?.value || 'all';

    const videos = window.VideosRepo.getAll({
        search: searchVal,
        categoryId: categoryVal
    });
    const categoryMap = window.CategoriesRepo.getCategoryMap();

    if (summaryEl) {
        const totalViews = videos.reduce((sum, v) => sum + Number(v.views || 0), 0);
        const totalSizeMB = videos.reduce((sum, v) => sum + Number(v.file_size_mb || 0), 0);
        summaryEl.textContent = `Hiển thị ${videos.length} video • Tổng lượt xem: ${window.Formatters.formatNumber(totalViews)} • Dung lượng: ${window.Formatters.formatStorageFromMB(totalSizeMB)}`;
    }

    if (videos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <h4>Không tìm thấy video nào</h4>
                        <p>Hãy thử từ khóa khác hoặc bấm "+ Thêm Video mới" để thêm vào videos.db.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = videos.map(v => {
        const cat = categoryMap[v.category_id] || { name: 'Chưa phân loại', color_badge: '#2563EB' };
        return `
            <tr>
                <td class="col-id">#${v.id}</td>
                <td class="col-thumb">
                    <div class="video-thumb-box">
                        <img src="${escapeHtml(v.thumbnail)}" alt="${escapeHtml(v.title)}" onerror="this.src='https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=400&q=80'">
                        <span class="video-duration-badge">${escapeHtml(v.duration || '10:00')}</span>
                    </div>
                </td>
                <td>
                    <div class="video-title-cell">
                        <span class="video-title-text">${escapeHtml(v.title)}</span>
                        <div class="video-meta-row">
                            <span class="category-badge" style="background-color: ${cat.color_badge}15; color: ${cat.color_badge}">
                                ● ${escapeHtml(cat.name)}
                            </span>
                            <span>📦 ${Number(v.file_size_mb || 0).toFixed(1)} MB</span>
                            <span>📅 ${escapeHtml(v.created_at || '')}</span>
                        </div>
                    </div>
                </td>
                <td class="views-cell">
                    👁️ ${window.Formatters.formatNumber(v.views)}
                    <span class="views-sub">lượt xem</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button type="button" class="btn btn-warning btn-sm" data-edit-id="${v.id}">
                            ✏️ Edit
                        </button>
                        <button type="button" class="btn btn-danger btn-sm" data-delete-id="${v.id}">
                            🗑️ Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Gắn sự kiện cho nút Edit
    tbody.querySelectorAll('[data-edit-id]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-edit-id');
            openVideoModalForEdit(id);
        });
    });

    // Gắn sự kiện cho nút Delete
    tbody.querySelectorAll('[data-delete-id]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-delete-id');
            handleDeleteVideo(id);
        });
    });
}

function bindToolbarEvents() {
    const searchInput = document.getElementById('search-video');
    const filterSelect = document.getElementById('filter-category');
    const addBtn = document.getElementById('btn-open-add-video');

    if (searchInput) {
        searchInput.addEventListener('input', () => renderVideosTable());
    }
    if (filterSelect) {
        filterSelect.addEventListener('change', () => renderVideosTable());
    }
    if (addBtn) {
        addBtn.addEventListener('click', () => openVideoModalForAdd());
    }
}

/**
 * Mở Modal ở chế độ Thêm mới Video
 */
function openVideoModalForAdd() {
    const modal = document.getElementById('video-modal');
    const titleEl = document.getElementById('video-modal-title');
    const form = document.getElementById('video-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('video-id').value = '';
    document.getElementById('video-thumbnail').value = 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=400&q=80';
    document.getElementById('video-views').value = '15000';
    document.getElementById('video-size').value = '250.5';
    document.getElementById('video-duration').value = '15:30';
    updateThumbPreview();

    if (titleEl) titleEl.textContent = 'Thêm Video Mới (videos.db)';
    modal.classList.add('open');
}

/**
 * Mở Modal ở chế độ Chỉnh sửa Video (Action: Edit)
 */
function openVideoModalForEdit(id) {
    const video = window.VideosRepo.getById(id);
    if (!video) return;

    const modal = document.getElementById('video-modal');
    const titleEl = document.getElementById('video-modal-title');
    if (!modal) return;

    document.getElementById('video-id').value = video.id;
    document.getElementById('video-title').value = video.title;
    document.getElementById('video-thumbnail').value = video.thumbnail;
    document.getElementById('video-views').value = video.views;
    document.getElementById('video-size').value = video.file_size_mb;
    document.getElementById('video-duration').value = video.duration || '10:00';
    document.getElementById('video-category').value = video.category_id || 1;
    updateThumbPreview();

    if (titleEl) titleEl.textContent = `Chỉnh sửa Video #${video.id} (videos.db)`;
    modal.classList.add('open');
}

/**
 * Xử lý xóa Video khỏi videos.db (Action: Delete)
 */
function handleDeleteVideo(id) {
    const video = window.VideosRepo.getById(id);
    if (!video) return;

    const confirmed = confirm(`Bạn có chắc chắn muốn xóa video #${video.id}: "${video.title}" khỏi videos.db không?`);
    if (!confirmed) return;

    window.VideosRepo.delete(id);
    renderVideosTable();
    window.Formatters.showToast(`Đã xóa video #${id} khỏi videos.db`);
}

function updateThumbPreview() {
    const url = document.getElementById('video-thumbnail')?.value || '';
    const previewImg = document.getElementById('thumb-preview-img');
    if (previewImg && url) {
        previewImg.src = url;
    }
}

function bindVideoModalEvents() {
    const modal = document.getElementById('video-modal');
    const form = document.getElementById('video-form');
    const thumbInput = document.getElementById('video-thumbnail');

    document.querySelectorAll('[data-close-video-modal]').forEach(btn => {
        btn.addEventListener('click', () => modal?.classList.remove('open'));
    });

    if (thumbInput) {
        thumbInput.addEventListener('input', updateThumbPreview);
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('video-id').value;
            const payload = {
                title: document.getElementById('video-title').value,
                thumbnail: document.getElementById('video-thumbnail').value,
                views: document.getElementById('video-views').value,
                file_size_mb: document.getElementById('video-size').value,
                duration: document.getElementById('video-duration').value,
                category_id: document.getElementById('video-category').value
            };

            if (id) {
                window.VideosRepo.update(id, payload);
                window.Formatters.showToast(`Đã cập nhật video #${id} trong videos.db`);
            } else {
                window.VideosRepo.create(payload);
                window.Formatters.showToast('Đã thêm video mới vào videos.db');
            }

            modal?.classList.remove('open');
            renderVideosTable();
        });
    }
}

/**
 * Modal Thêm Danh Mục vào video_categories.db
 */
function bindCategoryModalEvents() {
    const modal = document.getElementById('category-modal');
    const openBtn = document.getElementById('btn-open-add-category');
    const form = document.getElementById('category-form');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            form?.reset();
            modal?.classList.add('open');
        });
    }

    document.querySelectorAll('[data-close-category-modal]').forEach(btn => {
        btn.addEventListener('click', () => modal?.classList.remove('open'));
    });

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('cat-name').value;
            const color = document.getElementById('cat-color').value;
            const desc = document.getElementById('cat-desc').value;

            try {
                window.CategoriesRepo.create({
                    name,
                    color_badge: color,
                    description: desc
                });
                populateCategoryDropdowns();
                renderVideosTable();
                modal?.classList.remove('open');
                window.Formatters.showToast(`Đã thêm danh mục "${name}" vào video_categories.db`);
            } catch (err) {
                window.Formatters.showToast('Tên danh mục đã tồn tại!', 'error');
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
