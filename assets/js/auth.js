(function () {
    const SESSION_KEY = 'mbk_admin_session';
    const PASSWORD_KEY = 'mbk_admin_password';
    const DEFAULT_PASSWORD = 'labas123labas';

    const getStoredPassword = () => localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;

    const isAuthenticated = () => sessionStorage.getItem(SESSION_KEY) === '1';

    const login = (password) => {
        if (typeof password !== 'string' || !password.trim()) {
            return false;
        }

        if (password === getStoredPassword()) {
            sessionStorage.setItem(SESSION_KEY, '1');
            return true;
        }

        return false;
    };

    const logout = () => {
        sessionStorage.removeItem(SESSION_KEY);
    };

    const requireAuth = () => {
        if (isAuthenticated()) return;

        const loginUrl = new URL('login.html', window.location.href);
        const redirectTarget = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        loginUrl.searchParams.set('redirect', redirectTarget);
        window.location.replace(loginUrl.toString());
    };

    const updatePassword = (currentPassword, newPassword) => {
        const storedPassword = getStoredPassword();

        if (storedPassword !== currentPassword) {
            throw new Error('Neteisingas dabartinis slaptažodis.');
        }

        if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
            throw new Error('Naujas slaptažodis turi būti bent 6 simbolių.');
        }

        const trimmedPassword = newPassword.trim();
        localStorage.setItem(PASSWORD_KEY, trimmedPassword);
        logout();
        return trimmedPassword;
    };

    window.authService = {
        login,
        logout,
        requireAuth,
        updatePassword,
        isAuthenticated,
        get defaultPassword() {
            return DEFAULT_PASSWORD;
        },
    };
})();
