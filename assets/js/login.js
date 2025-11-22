document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const passwordInput = document.getElementById('adminPassword');
    const messageEl = document.getElementById('loginMessage');
    const params = new URLSearchParams(window.location.search);
    const redirectTarget = params.get('redirect') || 'cars.html';

    if (!form || !window.authService) {
        return;
    }

    if (window.authService.isAuthenticated()) {
        window.location.replace(redirectTarget);
        return;
    }

    const showMessage = (text, isError = true) => {
        if (!messageEl) return;
        messageEl.textContent = text;
        messageEl.hidden = !text;
        messageEl.classList.toggle('form-error', isError);
        messageEl.classList.toggle('form-success', !isError);
    };

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        showMessage('');

        const password = passwordInput?.value || '';

        if (!password.trim()) {
            showMessage('Įveskite slaptažodį.');
            return;
        }

        const success = window.authService.login(password.trim());

        if (!success) {
            showMessage('Neteisingas slaptažodis. Bandykite dar kartą.');
            return;
        }

        form.reset();
        showMessage('Prisijungimas sėkmingas.', false);
        window.location.replace(redirectTarget);
    });
});
