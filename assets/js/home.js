const createCarCard = (car) => {
    const thumbnail = car.gallery?.[0] || 'https://placehold.co/600x400?text=MB+Kreicas';
    return `
        <article class="car-card">
            <a href="car.html?slug=${encodeURIComponent(car.slug)}">
                <img src="${thumbnail}" alt="${car.title}" loading="lazy" />
                <div class="car-card__body">
                    <h3 class="car-card__title">${car.title}</h3>
                    <p class="car-card__price">${car.price.toLocaleString('lt-LT')} €</p>
                    <div class="car-card__meta">
                        <span>${car.year} m.</span>
                        <span>${car.mileage.toLocaleString('lt-LT')} km</span>
                        <span>${car.fuel}</span>
                        <span>${car.transmission}</span>
                    </div>
                </div>
            </a>
        </article>
    `;
};

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('featuredCars');
    if (!container || !window.CarData) return;

    container.setAttribute('data-empty', 'Įkeliama...');

    try {
        const cars = await window.CarData.getCars();
        const featured = cars.slice(0, 4);
        if (!featured.length) {
            container.innerHTML = '<p data-empty>Šiuo metu pasiūlymų nėra. Atnaujinkite sąrašą administravimo skiltyje.</p>';
            return;
        }
        container.removeAttribute('data-empty');
        container.innerHTML = featured.map(createCarCard).join('');
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p data-empty>Nepavyko įkelti automobilių duomenų. Pabandykite dar kartą.</p>';
    }
});
