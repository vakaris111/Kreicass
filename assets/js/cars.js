const renderCarCard = (car) => {
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
                        ${car.wheelDiameter ? `<span>${car.wheelDiameter}</span>` : ''}
                        ${car.drivetrain ? `<span>${car.drivetrain}</span>` : ''}
                    </div>
                </div>
            </a>
        </article>
    `;
};

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('carsList');
    const searchInput = document.getElementById('search');
    const fuelSelect = document.getElementById('fuel');
    const transmissionSelect = document.getElementById('transmission');

    if (!container || !window.CarData) return;

    let cars = [];

    const applyFilters = () => {
        const term = searchInput.value.toLowerCase();
        const fuel = fuelSelect.value;
        const transmission = transmissionSelect.value;

        const filtered = cars.filter((car) => {
            const matchesTerm = !term
                || `${car.title} ${car.year} ${car.fuel} ${car.transmission}`.toLowerCase().includes(term);
            const matchesFuel = !fuel || car.fuel === fuel;
            const matchesTransmission = !transmission || car.transmission === transmission;
            return matchesTerm && matchesFuel && matchesTransmission;
        });

        if (!filtered.length) {
            container.innerHTML = '<p data-empty>Nerasta automobilių pagal pasirinktus kriterijus.</p>';
            return;
        }

        container.innerHTML = filtered.map(renderCarCard).join('');
    };

    try {
        container.setAttribute('data-empty', 'Įkeliama...');
        cars = await window.CarData.getCars();
        container.removeAttribute('data-empty');
        applyFilters();
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p data-empty>Nepavyko įkelti automobilių. Bandykite dar kartą.</p>';
    }

    [searchInput, fuelSelect, transmissionSelect].forEach((element) => {
        element.addEventListener('input', applyFilters);
        element.addEventListener('change', applyFilters);
    });

    window.addEventListener('cars:updated', async () => {
        cars = await window.CarData.getCars();
        applyFilters();
    });
});
