/**
 * Repository thao tác với Database: video_analytics.db
 * Phục vụ Biểu đồ Line: Lượt xem theo ngày / tháng
 */
window.AnalyticsRepo = {
    DB_NAME: 'video_analytics.db',

    /**
     * Lấy dữ liệu lượt xem theo ngày
     */
    getDailyViews() {
        return window.SQLiteManager.queryAll(
            this.DB_NAME,
            `SELECT view_date, total_views FROM daily_views ORDER BY view_date ASC`
        );
    },

    /**
     * Lấy dữ liệu lượt xem theo tháng
     */
    getMonthlyViews() {
        return window.SQLiteManager.queryAll(
            this.DB_NAME,
            `SELECT view_month, month_label, total_views FROM monthly_views ORDER BY view_month ASC`
        );
    }
};
