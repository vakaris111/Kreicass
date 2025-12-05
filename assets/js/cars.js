const renderCarCard = (car) => {
    const cover = (car.gallery && car.gallery.length && car.gallery[0]) || 'https://placehold.co/600x400?text=MB+Kreicas';

    return `
        <article class="car-card">
            <a class="car-card__link" href="car.html?slug=${encodeURIComponent(car.slug)}">
                <div class="car-card__media">
                    <img src="${cover}" alt="${car.title} nuotrauka" loading="lazy" />
                </div>
                <div class="car-card__body">
                    <h3 class="car-card__title">${car.title}</h3>
                    <p class="car-card__price">${car.price.toLocaleString('lt-LT')} €</p>
                    <div class="car-card__meta">
                        <span>${car.year} m.</span>
                        <span>${car.mileage.toLocaleString('lt-LT')} km</span>
                        <span>${car.body}</span>
                        <span>${car.fuel}</span>
                        <span>${car.transmission}</span>
                    </div>
                </div>
            </a>
        </article>
    `;
};

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('carsList');

    if (!container || !window.CarData) return;

    const renderList = (cars) => {
        if (!cars.length) {
            container.innerHTML = '<p data-empty>Nerasta automobilių.</p>';
            return;
        }

        container.innerHTML = cars.map(renderCarCard).join('');
    };

    const loadCars = async () => {
        try {
            container.setAttribute('data-empty', 'Įkeliama...');
            const cars = await window.CarData.getCars();
            container.removeAttribute('data-empty');
            renderList(cars);
        } catch (error) {
            console.error(error);
            container.innerHTML = '<p data-empty>Nepavyko įkelti automobilių. Bandykite dar kartą.</p>';
        }
    };

    await loadCars();

    window.addEventListener('cars:updated', loadCars);
});
