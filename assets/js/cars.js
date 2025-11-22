const renderCarCard = (car) => `
    <article class="car-card">
        <a href="car.html?slug=${encodeURIComponent(car.slug)}">
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

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('carsList');
    const makeSelect = document.getElementById('make');
    const modelSelect = document.getElementById('model');
    const priceSelect = document.getElementById('priceMax');
    const bodySelect = document.getElementById('body');
    const transmissionSelect = document.getElementById('transmission');
    const fuelSelect = document.getElementById('fuel');

    if (!container || !window.CarData) return;

    let cars = [];
    const filters = {
        make: '',
        model: '',
        priceMax: '',
        body: '',
        transmission: '',
        fuel: '',
    };

    const priceOptions = [15000, 20000, 30000, 40000, 50000, 60000, 80000];

    const matchesFilters = (car, activeFilters, skipKey) => {
        if (skipKey !== 'make' && activeFilters.make && car.make !== activeFilters.make) return false;
        if (skipKey !== 'model' && activeFilters.model && car.model !== activeFilters.model) return false;
        if (skipKey !== 'priceMax' && activeFilters.priceMax && car.price > Number(activeFilters.priceMax)) return false;
        if (skipKey !== 'body' && activeFilters.body && car.body !== activeFilters.body) return false;
        if (skipKey !== 'transmission' && activeFilters.transmission && car.transmission !== activeFilters.transmission)
            return false;
        if (skipKey !== 'fuel' && activeFilters.fuel && car.fuel !== activeFilters.fuel) return false;
        return true;
    };

    const getCountWith = (key, value) => {
        const nextFilters = { ...filters, [key]: value };
        return cars.filter((car) => matchesFilters(car, nextFilters)).length;
    };

    const getAvailableValues = (key) => {
        const filtered = cars.filter((car) => matchesFilters(car, filters, key));
        const values = new Set(filtered.map((car) => car[key]).filter(Boolean));
        return Array.from(values).sort((a, b) => a.localeCompare(b, 'lt', { numeric: true }));
    };

    const renderOptions = (select, key, values, formatValue) => {
        const total = getCountWith(key, '');
        const options = [`<option value="">Visi (${total})</option>`];
        values.forEach((value) => {
            const count = getCountWith(key, value);
            options.push(`<option value="${value}">${formatValue(value, count)}</option>`);
        });
        select.innerHTML = options.join('');
    };

    const renderFilters = () => {
        renderOptions(makeSelect, 'make', getAvailableValues('make'), (value, count) => `${value} (${count})`);

        const models = filters.make ? getAvailableValues('model') : [];
        if (!filters.make) {
            modelSelect.innerHTML = '<option value="">Pasirinkite markę</option>';
            modelSelect.disabled = true;
        } else {
            modelSelect.disabled = false;
            renderOptions(modelSelect, 'model', models, (value, count) => `${value} (${count})`);
            if (filters.model && !models.includes(filters.model)) {
                filters.model = '';
                modelSelect.value = '';
            }
        }

        renderOptions(
            priceSelect,
            'priceMax',
            priceOptions,
            (value, count) => `Iki ${Number(value).toLocaleString('lt-LT')} € (${count})`
        );
        renderOptions(bodySelect, 'body', getAvailableValues('body'), (value, count) => `${value} (${count})`);
        renderOptions(
            transmissionSelect,
            'transmission',
            getAvailableValues('transmission'),
            (value, count) => `${value} (${count})`
        );
        renderOptions(fuelSelect, 'fuel', getAvailableValues('fuel'), (value, count) => `${value} (${count})`);

        if (filters.model && !models.includes(filters.model)) {
            filters.model = '';
            modelSelect.value = '';
        }
    };

    const applyFilters = () => {
        const filtered = cars.filter((car) => matchesFilters(car, filters));

        if (!filtered.length) {
            container.innerHTML = '<p data-empty>Nerasta automobilių pagal pasirinktus kriterijus.</p>';
            return;
        }

        container.innerHTML = filtered.map(renderCarCard).join('');
    };

    const handleChange = (event) => {
        const { id, value } = event.target;
        filters[id] = value;
        if (id === 'make' && !value) {
            filters.model = '';
        }
        renderFilters();
        applyFilters();
    };

    try {
        container.setAttribute('data-empty', 'Įkeliama...');
        cars = await window.CarData.getCars();
        container.removeAttribute('data-empty');
        renderFilters();
        applyFilters();
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p data-empty>Nepavyko įkelti automobilių. Bandykite dar kartą.</p>';
    }

    [makeSelect, modelSelect, priceSelect, bodySelect, transmissionSelect, fuelSelect].forEach((element) => {
        element.addEventListener('change', handleChange);
    });

    window.addEventListener('cars:updated', async () => {
        cars = await window.CarData.getCars();
        renderFilters();
        applyFilters();
    });
});
