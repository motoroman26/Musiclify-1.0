document.addEventListener('DOMContentLoaded', function() {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const verifyCodeForm = document.getElementById('verifyCodeForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    
    let userEmail = '';
    let verificationCode = '';
    
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            userEmail = document.getElementById('email').value.trim();
            
            if (!userEmail) {
                alert('Будь ласка, введіть email');
                return;
            }
            
            try {
                const response = await fetch('http://localhost:5255/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail })
                });
                
                if (response.ok) {
                    forgotPasswordForm.style.display = 'none';
                    verifyCodeForm.style.display = 'block';
                    alert('Код відновлення надіслано на вашу пошту');
                } else {
                    const error = await response.json();
                    alert(error.message || 'Помилка відправки коду');
                }
            } catch (error) {
                alert('Сталася помилка при з\'єднанні з сервером');
            }
        });
    }
    
    if (verifyCodeForm) {
        verifyCodeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            verificationCode = document.getElementById('code').value.trim();
            
            if (!verificationCode || verificationCode.length !== 6) {
                alert('Будь ласка, введіть 6-значний код');
                return;
            }
            
            try {
                const response = await fetch('http://localhost:5255/api/auth/verify-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: userEmail, 
                        code: verificationCode 
                    })
                });
                
                if (response.ok) {
                    verifyCodeForm.style.display = 'none';
                    resetPasswordForm.style.display = 'block';
                } else {
                    const error = await response.json();
                    alert(error.message || 'Невірний код');
                }
            } catch (error) {
                alert('Сталася помилка при з\'єднанні з сервером');
            }
        });
    }
    
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (!newPassword || !confirmPassword) {
                alert('Будь ласка, заповніть всі поля');
                return;
            }
            
            if (newPassword.length < 6) {
                alert('Пароль має містити принаймні 6 символів');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                alert('Паролі не співпадають');
                return;
            }
            
            try {
                const response = await fetch('http://localhost:5255/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: userEmail, 
                        code: verificationCode,
                        newPassword: newPassword
                    })
                });
                
                if (response.ok) {
                    alert('Пароль успішно змінено! Тепер ви можете увійти з новим паролем.');
                    window.location.href = 'login.html';
                } else {
                    const error = await response.json();
                    alert(error.message || 'Помилка зміни пароля');
                }
            } catch (error) {
                alert('Сталася помилка при з\'єднанні з сервером');
            }
        });
    }
});