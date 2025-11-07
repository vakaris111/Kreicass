document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.main-nav');

    if (!navToggle || !nav) return;

    const toggleNav = () => {
        nav.classList.toggle('open');
    };

    navToggle.addEventListener('click', toggleNav);
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => nav.classList.remove('open')));
});
