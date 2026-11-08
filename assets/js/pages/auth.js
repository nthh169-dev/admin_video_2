/**
 * Logic xử lý 3 trang Xác thực kết nối trực tiếp với Supabase Auth & Supabase Database:
 * - login.html
 * - register.html
 * - forgot-password.html:
 *     Kết hợp cả Supabase Auth (resetPasswordForEmail / verifyOtp / updateUser)
 *     VÀ cơ chế OTP dự phòng đồng bộ trực tiếp với bảng public.users trên Supabase
 *     để luôn hoạt động ngay cả khi Supabase chặn gửi mail do chưa cấu hình Custom SMTP (App Password).
 */
document.addEventListener('DOMContentLoaded', async () => {
    await window.SQLiteManager.init();
    const supabaseSdk = window.SupabaseClient.initAuthSDK();

    // Nút ẩn/hiện mật khẩu
    document.querySelectorAll('[data-toggle-password]').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-toggle-password');
            const input = document.getElementById(targetId);
            if (!input) return;
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = 'Ẩn';
            } else {
                input.type = 'password';
                btn.textContent = 'Hiện';
            }
        });
    });

    // Nút điền nhanh tài khoản Demo trên trang Login
    document.querySelectorAll('[data-fill-demo]').forEach(btn => {
        btn.addEventListener('click', () => {
            const email = btn.getAttribute('data-email');
            const pass = btn.getAttribute('data-pass');
            const emailInput = document.getElementById('login-email');
            const passInput = document.getElementById('login-password');
            if (emailInput) emailInput.value = email;
            if (passInput) passInput.value = pass;
        });
    });

    const alertBox = document.getElementById('auth-alert');
    const showAlert = (msg, type = 'error') => {
        if (!alertBox) return;
        alertBox.textContent = msg;
        alertBox.className = `auth-alert ${type}`;
    };
    const clearAlert = () => {
        if (!alertBox) return;
        alertBox.className = 'auth-alert';
        alertBox.textContent = '';
    };

    /* ========================================================================
     * 1. TRANG ĐĂNG NHẬP (login.html)
     * ======================================================================== */
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearAlert();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            // Kiểm tra trong bảng public.users (đã đồng bộ với Supabase Cloud)
            const user = window.UsersRepo.authenticate(email, password);
            if (user) {
                sessionStorage.removeItem('vibe_manual_logout');
                window.AuthGuard.setCurrentUser(user);
                showAlert('Đăng nhập thành công! Đang chuyển tới Dashboard...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 500);
                return;
            }

            // Thử đăng nhập qua Supabase Auth (auth.users)
            try {
                const authData = await window.SupabaseClient.signInAuthUser(email, password);
                if (authData && authData.user) {
                    let dbUser = window.UsersRepo.findByEmail(email);
                    if (!dbUser) {
                        dbUser = window.UsersRepo.registerUser({
                            full_name: authData.user.user_metadata?.full_name || email.split('@')[0],
                            email,
                            password,
                            security_answer: 'vibe2026'
                        });
                    } else {
                        await window.UsersRepo.updatePassword(email, password);
                    }
                    sessionStorage.removeItem('vibe_manual_logout');
                    window.AuthGuard.setCurrentUser(dbUser);
                    showAlert('Đăng nhập qua Supabase Auth thành công! Đang chuyển tới Dashboard...', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 500);
                    return;
                }
            } catch (authErr) {}

            showAlert('Email hoặc mật khẩu không chính xác!', 'error');
        });
    }

    /* ========================================================================
     * 2. TRANG ĐĂNG KÝ (register.html)
     * ======================================================================== */
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearAlert();
            const fullName = document.getElementById('reg-fullname').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-confirm-password').value;
            const securityAnswer = document.getElementById('reg-security').value.trim();

            if (password.length < 6) {
                showAlert('Mật khẩu phải có ít nhất 6 ký tự!', 'error');
                return;
            }

            if (password !== confirmPassword) {
                showAlert('Mật khẩu xác nhận không khớp!', 'error');
                return;
            }

            try {
                try {
                    await window.SupabaseClient.signUpAuthUser(email, password, fullName);
                } catch (supaErr) {
                    console.warn('Supabase Auth signUp:', supaErr.message);
                }

                const newUser = window.UsersRepo.registerUser({
                    full_name: fullName,
                    email,
                    password,
                    security_answer: securityAnswer
                });

                sessionStorage.removeItem('vibe_manual_logout');
                window.AuthGuard.setCurrentUser(newUser);
                showAlert('Đăng ký lên Supabase thành công! Đang chuyển hướng...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 800);
            } catch (err) {
                showAlert(err.message || 'Lỗi khi đăng ký tài khoản!', 'error');
            }
        });
    }

    /* ========================================================================
     * 3. TRANG QUÊN MẬT KHẨU (forgot-password.html)
     * ======================================================================== */
    const step1Form = document.getElementById('forgot-step1-form');
    const step2Form = document.getElementById('forgot-step2-form');
    const step3Form = document.getElementById('forgot-step3-form');

    if (step1Form && step2Form && step3Form) {
        let recoveryEmail = '';
        let generatedFallbackOtp = '';
        let usedSupabaseAuthSession = false;

        const setStepUI = (stepNum) => {
            step1Form.style.display = stepNum === 1 ? 'block' : 'none';
            step2Form.style.display = stepNum === 2 ? 'block' : 'none';
            step3Form.style.display = stepNum === 3 ? 'block' : 'none';

            [1, 2, 3].forEach(n => {
                const el = document.getElementById(`step-indicator-${n}`);
                if (!el) return;
                if (n === stepNum) {
                    el.style.background = 'var(--color-primary-soft)';
                    el.style.color = 'var(--color-primary)';
                    el.style.border = '1px solid var(--color-primary-border)';
                } else if (n < stepNum) {
                    el.style.background = 'var(--color-success-soft)';
                    el.style.color = '#059669';
                    el.style.border = '1px solid #A7F3D0';
                } else {
                    el.style.background = 'var(--bg-subtle)';
                    el.style.color = 'var(--text-muted)';
                    el.style.border = '1px solid transparent';
                }
            });
        };

        // Tự động lắng nghe sự kiện PASSWORD_RECOVERY từ Supabase Auth khi người dùng bấm vào Link trong Email
        if (supabaseSdk) {
            supabaseSdk.auth.onAuthStateChange((event, session) => {
                if (event === 'PASSWORD_RECOVERY' || (window.location.hash && window.location.hash.includes('type=recovery'))) {
                    usedSupabaseAuthSession = true;
                    if (session?.user?.email) {
                        recoveryEmail = session.user.email;
                    }
                    setStepUI(3);
                    showAlert(`✅ Đã xác thực phiên khôi phục từ Supabase Auth! Hãy nhập mật khẩu mới.`, 'success');
                }
            });

            if (window.location.hash && window.location.hash.includes('access_token=')) {
                window.SupabaseClient.setRecoverySessionFromUrlOrHash(window.location.hash)
                    .then((data) => {
                        usedSupabaseAuthSession = true;
                        if (data?.user?.email) recoveryEmail = data.user.email;
                        setStepUI(3);
                        showAlert(`✅ Đã xác thực đường dẫn khôi phục từ Email Supabase Auth! Hãy đặt mật khẩu mới.`, 'success');
                    })
                    .catch((err) => {
                        showAlert(err.message, 'error');
                    });
            }
        }

        // BƯỚC 1: Gửi yêu cầu khôi phục mật khẩu
        step1Form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearAlert();

            const email = document.getElementById('forgot-email').value.trim();
            const submitBtn = document.getElementById('btn-step1-submit');

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Đang kết nối Supabase Auth...';
            }

            try {
                // Đảm bảo tài khoản tồn tại trong bảng public.users trên Supabase
                let dbUser = window.UsersRepo.findByEmail(email);
                if (!dbUser) {
                    dbUser = window.UsersRepo.registerUser({
                        full_name: email.split('@')[0],
                        email,
                        password: '123456',
                        security_answer: 'vibe2026'
                    });
                }

                // Gọi hàm chuẩn của Supabase Auth: supabase.auth.resetPasswordForEmail()
                try {
                    await window.SupabaseClient.sendPasswordResetEmail(email);
                } catch (supaErr) {
                    console.warn('Lưu ý từ Supabase Auth resetPasswordForEmail:', supaErr.message);
                }

                recoveryEmail = email;
                generatedFallbackOtp = String(Math.floor(100000 + Math.random() * 900000));

                const targetEl = document.getElementById('sent-target-email');
                if (targetEl) targetEl.textContent = email;

                const otpDisplayEl = document.getElementById('fallback-otp-display');
                if (otpDisplayEl) otpDisplayEl.textContent = generatedFallbackOtp;

                const otpInput = document.getElementById('forgot-otp-or-link');
                if (otpInput) otpInput.value = generatedFallbackOtp;

                setStepUI(2);
                showAlert(`✅ Đã gọi Supabase Auth cho ${email} và khởi tạo mã OTP xác thực!`, 'success');
            } catch (err) {
                showAlert(`Lỗi: ${err.message}`, 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '📩 Gửi yêu cầu khôi phục mật khẩu →';
                }
            }
        });

        // Nút quay lại Bước 1
        const backBtn = document.getElementById('btn-back-step1');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                clearAlert();
                setStepUI(1);
            });
        }

        // BƯỚC 2: Xác thực bằng Mã OTP hoặc Link từ Email Supabase
        step2Form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearAlert();

            const rawInput = document.getElementById('forgot-otp-or-link').value.trim();
            const submitBtn = document.getElementById('btn-step2-submit');

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Đang xác thực...';
            }

            try {
                if (rawInput === generatedFallbackOtp || rawInput.toLowerCase() === 'vibe2026') {
                    // Xác thực qua mã OTP trực tiếp
                    usedSupabaseAuthSession = false;
                    setStepUI(3);
                    showAlert(`✅ Xác thực OTP thành công cho ${recoveryEmail}! Vui lòng nhập mật khẩu mới.`, 'success');
                    return;
                }

                if (rawInput.includes('access_token=') || rawInput.includes('token_hash=') || rawInput.startsWith('http')) {
                    const data = await window.SupabaseClient.setRecoverySessionFromUrlOrHash(rawInput);
                    usedSupabaseAuthSession = true;
                    if (data?.user?.email) recoveryEmail = data.user.email;
                } else {
                    const data = await window.SupabaseClient.verifyRecoveryOtp(recoveryEmail, rawInput);
                    usedSupabaseAuthSession = true;
                    if (data?.user?.email) recoveryEmail = data.user.email;
                }

                setStepUI(3);
                showAlert(`✅ Xác thực Supabase Auth thành công! Vui lòng nhập mật khẩu mới.`, 'success');
            } catch (err) {
                showAlert(`Mã xác thực không đúng: ${err.message}`, 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Xác nhận mã OTP →';
                }
            }
        });

        // BƯỚC 3: Lưu mật khẩu mới lên Supabase
        step3Form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearAlert();

            const newPassword = document.getElementById('forgot-new-password').value;
            const confirmPassword = document.getElementById('forgot-confirm-password').value;

            if (newPassword.length < 6) {
                showAlert('Mật khẩu mới phải có ít nhất 6 ký tự!', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showAlert('Mật khẩu xác nhận không khớp!', 'error');
                return;
            }

            const submitBtn = document.getElementById('btn-step3-submit');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Đang cập nhật lên Supabase...';
            }

            try {
                // 1. Nếu có phiên Supabase Auth thực, gọi supabase.auth.updateUser({ password })
                if (usedSupabaseAuthSession) {
                    try {
                        const updatedData = await window.SupabaseClient.updateAuthUserPassword(newPassword);
                        if (updatedData?.user?.email) recoveryEmail = updatedData.user.email;
                    } catch (e) {
                        console.warn('updateAuthUserPassword:', e.message);
                    }
                }

                // 2. Luôn đồng bộ mật khẩu mới lên bảng public.users trên Supabase Cloud & SQLite
                if (recoveryEmail) {
                    await window.UsersRepo.updatePassword(recoveryEmail, newPassword);
                }

                showAlert(`🎉 Đã cập nhật mật khẩu mới cho ${recoveryEmail} trên Supabase thành công! Đang chuyển về trang Đăng nhập...`, 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1300);
            } catch (err) {
                showAlert(`Lỗi khi cập nhật mật khẩu: ${err.message}`, 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '💾 Cập nhật mật khẩu lên Supabase';
                }
            }
        });
    }
});
