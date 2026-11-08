/**
 * Logic trang Dashboard (index.html)
 * - 3 KPI Cards: Tổng số video, Tổng lượt xem, Dung lượng Storage
 * - Biểu đồ cột (Bar Chart): 10 video nhiều lượt xem nhất
 * - Biểu đồ đường (Line Chart): Lượt xem theo ngày / tháng
 * - Thống kê nhanh theo danh mục từ video_categories.db
 */
let topVideosChartInstance = null;
let viewsLineChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    window.AuthGuard.requireAuth();
    await window.SQLiteManager.init();

    renderDashboardKPIs();
    renderTop10BarChart();
    renderViewsLineChart('daily');
    renderCategoryBreakdown();

    // Chuyển đổi tab Ngày / Tháng trên biểu đồ Line
    document.querySelectorAll('[data-line-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-line-mode]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.getAttribute('data-line-mode');
            renderViewsLineChart(mode);
        });
    });
});

/**
 * 1. Hiển thị 3 thẻ KPI: Tổng số video, Tổng lượt xem, Dung lượng Storage
 */
function renderDashboardKPIs() {
    const stats = window.VideosRepo.getDashboardStats();
    const maxQuotaMB = 10240; // 10 GB định mức lưu trữ (10,240 MB)
    const percentUsed = Math.min(100, ((stats.totalStorageMB / maxQuotaMB) * 100)).toFixed(1);

    const totalVideosEl = document.getElementById('kpi-total-videos');
    const totalViewsEl = document.getElementById('kpi-total-views');
    const storageValueEl = document.getElementById('kpi-storage-value');
    const storagePercentEl = document.getElementById('kpi-storage-percent');
    const storageBarEl = document.getElementById('kpi-storage-bar');

    if (totalVideosEl) totalVideosEl.textContent = window.Formatters.formatNumber(stats.totalVideos);
    if (totalViewsEl) totalViewsEl.textContent = window.Formatters.formatNumber(stats.totalViews);
    if (storageValueEl) {
        storageValueEl.textContent = window.Formatters.formatStorageFromMB(stats.totalStorageMB);
    }
    if (storagePercentEl) {
        storagePercentEl.textContent = `${percentUsed}% của 10 GB`;
    }
    if (storageBarEl) {
        storageBarEl.style.width = `${percentUsed}%`;
    }
}

/**
 * 2. Vẽ Biểu đồ Cột (Bar Chart): 10 Video nhiều lượt xem nhất (từ videos.db)
 */
function renderTop10BarChart() {
    const canvas = document.getElementById('topVideosBarChart');
    if (!canvas || typeof window.Chart === 'undefined') return;

    const top10 = window.VideosRepo.getTop10ByViews();
    const fullTitles = top10.map(v => v.title);
    const shortLabels = top10.map(v => window.Formatters.truncateText(v.title, 18));
    const viewsData = top10.map(v => Number(v.views));

    if (topVideosChartInstance) {
        topVideosChartInstance.destroy();
    }

    topVideosChartInstance = new window.Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: shortLabels,
            datasets: [
                {
                    label: 'Lượt xem (Views)',
                    data: viewsData,
                    backgroundColor: '#2563EB',
                    hoverBackgroundColor: '#1D4ED8',
                    borderRadius: 6,
                    maxBarThickness: 34
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#FFFFFF',
                    titleColor: '#0F172A',
                    bodyColor: '#2563EB',
                    borderColor: '#E2E8F0',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        title(items) {
                            const idx = items[0].dataIndex;
                            return fullTitles[idx] || items[0].label;
                        },
                        label(item) {
                            return ` Lượt xem: ${window.Formatters.formatNumber(item.raw)} views`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748B',
                        font: { size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#F1F5F9'
                    },
                    ticks: {
                        color: '#64748B',
                        font: { size: 11 },
                        callback(value) {
                            return window.Formatters.formatCompactNumber(value);
                        }
                    }
                }
            }
        }
    });
}

/**
 * 3. Vẽ Biểu đồ Đường (Line Chart): Lượt xem theo Ngày / Tháng (từ video_analytics.db)
 */
function renderViewsLineChart(mode = 'daily') {
    const canvas = document.getElementById('viewsLineChart');
    if (!canvas || typeof window.Chart === 'undefined') return;

    let labels = [];
    let values = [];

    if (mode === 'daily') {
        const rows = window.AnalyticsRepo.getDailyViews();
        labels = rows.map(r => {
            const parts = r.view_date.split('-');
            return `${parts[2]}/${parts[1]}`;
        });
        values = rows.map(r => Number(r.total_views));
    } else {
        const rows = window.AnalyticsRepo.getMonthlyViews();
        labels = rows.map(r => r.month_label);
        values = rows.map(r => Number(r.total_views));
    }

    if (viewsLineChartInstance) {
        viewsLineChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.22)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)');

    viewsLineChartInstance = new window.Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: mode === 'daily' ? 'Lượt xem theo ngày' : 'Lượt xem theo tháng',
                    data: values,
                    borderColor: '#2563EB',
                    backgroundColor: gradient,
                    borderWidth: 2.5,
                    pointBackgroundColor: '#FFFFFF',
                    pointBorderColor: '#2563EB',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.38
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#FFFFFF',
                    titleColor: '#0F172A',
                    bodyColor: '#2563EB',
                    borderColor: '#E2E8F0',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label(item) {
                            return ` Lượt xem: ${window.Formatters.formatNumber(item.raw)} views`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748B',
                        font: { size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#F1F5F9'
                    },
                    ticks: {
                        color: '#64748B',
                        font: { size: 11 },
                        callback(value) {
                            return window.Formatters.formatCompactNumber(value);
                        }
                    }
                }
            }
        }
    });
}

/**
 * 4. Hiển thị thống kê phân bổ theo danh mục (kết hợp video_categories.db và videos.db)
 */
function renderCategoryBreakdown() {
    const container = document.getElementById('category-breakdown-list');
    if (!container) return;

    const categories = window.CategoriesRepo.getAll();
    const countsMap = window.VideosRepo.getCountByCategory();

    container.innerHTML = categories.map(cat => {
        const stat = countsMap[cat.id] || { count: 0, views: 0 };
        return `
            <div class="category-stat-item">
                <div class="category-stat-name">
                    <span class="category-dot" style="background-color: ${cat.color_badge}"></span>
                    <span>${cat.name}</span>
                </div>
                <span class="category-stat-count">${stat.count} video • ${window.Formatters.formatCompactNumber(stat.views)} views</span>
            </div>
        `;
    }).join('');
}
