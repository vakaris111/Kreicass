const formatNumber = (value, options = {}) => {
    const number = Number(value);
    if (Number.isFinite(number)) {
        return new Intl.NumberFormat('lt-LT', options).format(number);
    }
    return value || 'Nenurodyta';
};

const formatPrice = (price) => {
    const formatted = formatNumber(price);
    return Number.isFinite(Number(price)) ? `${formatted} €` : formatted;
};

const createCarCard = (car) => {
    const cover = (car.gallery && car.gallery.length && car.gallery[0]) || 'https://placehold.co/600x400?text=MB+Kreicas';

    return `
        <article class="car-card">
            <a class="car-card__link" href="car.html?slug=${encodeURIComponent(car.slug)}">
                <div class="car-card__media">
                    <img src="${cover}" alt="${car.title} nuotrauka" loading="lazy" />
                </div>
                <div class="car-card__body">
                    <h3 class="car-card__title">${car.title}</h3>
                    <p class="car-card__price">${formatPrice(car.price)}</p>
                    <div class="car-card__meta">
                        <span>${car.year || 'Nenurodyta'} m.</span>
                        <span>${formatNumber(car.mileage)} km</span>
                        <span>${car.body || 'Kėbulo tipas nenurodytas'}</span>
                        <span>${car.fuel || 'Kuro tipas nenurodytas'}</span>
                        <span>${car.transmission || 'Pavarų dėžė nenurodyta'}</span>
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
            container.innerHTML = '<p data-empty>Šiuo metu pasiūlymų nėra. Apsilankykite netrukus!</p>';
            return;
        }
        container.removeAttribute('data-empty');
        container.innerHTML = featured.map(createCarCard).join('');
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p data-empty>Nepavyko įkelti automobilių duomenų. Pabandykite dar kartą.</p>';
    }
});
