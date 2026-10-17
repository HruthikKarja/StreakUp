/**
 * StreakUp - Authentication & Route Protection
 * Manages user session, login validation, protected page redirection, and logout.
 */

(function () {
    const path = (window.location.pathname || '').toLowerCase();
    const isLoginPage = path.endsWith('index.html') || 
                        path.endsWith('/') || 
                        path.endsWith('\\') || 
                        path === '' || 
                        (!path.includes('home.html') && !path.includes('streak.html') && !path.includes('monthly.html'));

    // Initialize Auth state
    document.addEventListener('DOMContentLoaded', () => {
        const currentUser = window.StorageService ? window.StorageService.getUser() : null;

        if (isLoginPage) {
            initLoginPage(currentUser);
        } else {
            initProtectedPage(currentUser);
        }
    });

    /**
     * Handle Login Page Logic
     */
    function initLoginPage(currentUser) {
        const loginForm = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const usernameError = document.getElementById('usernameError');
        const passwordError = document.getElementById('passwordError');
        const message = document.getElementById('message');
        const alreadyLoggedIn = document.getElementById('alreadyLoggedIn');
        const currentUsername = document.getElementById('currentUsername');
        const switchUserBtn = document.getElementById('switchUserBtn');

        // If already logged in, display banner with option to proceed or switch
        if (currentUser && alreadyLoggedIn && currentUsername) {
            alreadyLoggedIn.style.display = 'block';
            currentUsername.textContent = currentUser.username;
            if (loginForm) loginForm.style.display = 'none';

            if (switchUserBtn) {
                switchUserBtn.addEventListener('click', () => {
                    window.StorageService.clearUser();
                    alreadyLoggedIn.style.display = 'none';
                    if (loginForm) loginForm.style.display = 'block';
                    if (usernameInput) {
                        usernameInput.value = '';
                        usernameInput.focus();
                    }
                    if (passwordInput) passwordInput.value = '';
                });
            }
        }

        function clearErrors() {
            if (usernameError) usernameError.textContent = '';
            if (passwordError) passwordError.textContent = '';
            if (message) {
                message.textContent = '';
                message.className = 'auth-message';
            }
        }

        function handleLogin(e) {
            if (e) e.preventDefault();
            clearErrors();

            const username = (usernameInput ? usernameInput.value : '').trim();
            const password = (passwordInput ? passwordInput.value : '').trim();
            let isValid = true;

            if (!username) {
                if (usernameError) usernameError.textContent = 'Please enter your username.';
                isValid = false;
            } else if (username.length < 2) {
                if (usernameError) usernameError.textContent = 'Username must be at least 2 characters.';
                isValid = false;
            }

            if (!password) {
                if (passwordError) passwordError.textContent = 'Please enter your password.';
                isValid = false;
            } else if (password.length < 3) {
                if (passwordError) passwordError.textContent = 'Password must be at least 3 characters.';
                isValid = false;
            }

            if (!isValid) {
                if (message) {
                    message.textContent = 'Please fix the errors above.';
                    message.className = 'auth-message error';
                }
                return;
            }

            // Client-side authentication demonstration
            const user = {
                username: username,
                loggedInAt: new Date().toISOString()
            };

            window.StorageService.setUser(user);

            if (message) {
                message.textContent = `Welcome back, ${username}! Redirecting...`;
                message.className = 'auth-message success';
            }

            setTimeout(() => {
                window.location.href = 'home.html';
            }, 300);
        }

        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        } else if (loginBtn) {
            loginBtn.addEventListener('click', handleLogin);
        }
    }

    /**
     * Handle Protected Page Logic
     */
    function initProtectedPage(currentUser) {
        if (!currentUser) {
            // Unauthenticated user attempting to access protected page
            window.location.href = 'index.html';
            return;
        }

        // Display username in navbar and greeting elements
        const navUsername = document.getElementById('navUsername');
        if (navUsername) {
            navUsername.textContent = currentUser.username;
        }

        const welcomeUsername = document.getElementById('welcomeUsername');
        if (welcomeUsername) {
            welcomeUsername.textContent = currentUser.username;
        }

        // Attach logout listeners
        const logoutBtns = document.querySelectorAll('#logoutBtn, .logout-btn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.StorageService.clearUser();
                window.location.href = 'index.html';
            });
        });
    }

    // Expose helpers if needed
    window.AuthService = {
        logout() {
            if (window.StorageService) {
                window.StorageService.clearUser();
            }
            window.location.href = 'index.html';
        }
    };
})();