document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Siunčiama...';

        setTimeout(() => {
            alert('Dėkojame! Netrukus susisieksime.');
            form.reset();
            submitBtn.disabled = false;
            submitBtn.textContent = 'Siųsti užklausą';
        }, 600);
    });
});
