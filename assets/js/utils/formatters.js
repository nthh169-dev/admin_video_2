window.Formatters = {
    /**
     * Định dạng số lượt xem có dấu phẩy phân cách hàng nghìn (VD: 154,200)
     */
    formatNumber(num) {
        const n = Number(num) || 0;
        return n.toLocaleString('en-US');
    },

    /**
     * Định dạng số rút gọn cho trục biểu đồ (VD: 154.2K)
     */
    formatCompactNumber(num) {
        const n = Number(num) || 0;
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return String(n);
    },

    /**
     * Định dạng dung lượng lưu trữ từ MB sang MB hoặc GB
     */
    formatStorageFromMB(sizeMB) {
        const mb = Number(sizeMB) || 0;
        if (mb >= 1024) {
            return (mb / 1024).toFixed(2) + ' GB';
        }
        return mb.toFixed(1) + ' MB';
    },

    /**
     * Cắt ngắn tiêu đề nếu quá dài để hiển thị trên trục biểu đồ cột
     */
    truncateText(text, maxLength = 22) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength - 1) + '…';
    },

    /**
     * Hiển thị thông báo Toast góc phải dưới
     */
    showToast(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${type === 'error' ? '⚠️' : '✅'}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.2s ease';
            setTimeout(() => toast.remove(), 220);
        }, 3000);
    }
};
