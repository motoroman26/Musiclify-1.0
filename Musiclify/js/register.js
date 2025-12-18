document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.querySelector('.login-form');
    
    if (!registerForm) return;
    
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!username || !email || !password || !confirmPassword) {
            alert('Будь ласка, заповніть всі поля');
            return;
        }
        
        if (password.length < 6) {
            alert('Пароль має містити принаймні 6 символів');
            return;
        }
        
        if (password !== confirmPassword) {
            alert('Паролі не співпадають');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Будь ласка, введіть коректний email');
            return;
        }
        
        const submitBtn = registerForm.querySelector('.login-btn');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Реєстрація...';
            
            if (window.contentLoader) {
                await window.contentLoader.register(username, email, password);
            } else {
                const backendUrl = 'http://localhost:5255';
                
                const response = await fetch(`${backendUrl}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password })
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    
                    try {
                        const errorData = JSON.parse(errorText);
                        throw new Error(errorData.message || `Помилка реєстрації (${response.status})`);
                    } catch {
                        throw new Error(`Помилка сервера: ${response.status}`);
                    }
                }
                
                const result = await response.json();
                const userData = result.user || result;
                localStorage.setItem('musiclify_user', JSON.stringify(userData));
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
            
        } catch (error) {
            alert(error.message || 'Помилка реєстрації. Можливо, користувач з таким email вже існує.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});