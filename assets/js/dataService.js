(function () {
    const STORAGE_KEY = 'mbk_cars_v1';
    let cache = null;

    const fetchDefaults = async () => {
        const response = await fetch('assets/data/cars.json');
        if (!response.ok) throw new Error('Nepavyko įkelti automobilių duomenų.');
        return response.json();
    };

    const generateSlug = (text) =>
        text
            .toLowerCase()
            .replace(/[^a-z0-9ąčęėįšųūž\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');

    const ensureUniqueSlug = (slug, existing) => {
        let base = slug || '';
        if (!base) {
            base = `auto-${Date.now()}`;
        }
        let candidate = base;
        let counter = 1;
        while (existing.has(candidate)) {
            candidate = `${base}-${counter}`;
            counter += 1;
        }
        existing.add(candidate);
        return candidate;
    };

    const normalizeCar = (car, existingSlugs) => {
        const normalized = { ...car };

        if (!normalized.title && normalized.name) {
            normalized.title = normalized.name;
        }

        if (!normalized.sdk && normalized.vin) {
            normalized.sdk = normalized.vin;
            delete normalized.vin;
        }

        const fallbackSource = normalized.title || normalized.name || normalized.id || `auto-${Date.now()}`;
        let slugCandidate = normalized.slug;
        if (!slugCandidate || slugCandidate === 'undefined' || slugCandidate === 'null') {
            slugCandidate = generateSlug(String(fallbackSource));
        }

        normalized.slug = ensureUniqueSlug(slugCandidate, existingSlugs);

        if (!normalized.id) {
            normalized.id = normalized.slug;
        }

        if (!Array.isArray(normalized.gallery)) {
            normalized.gallery = [];
        }

        if (!Array.isArray(normalized.features)) {
            normalized.features = [];
        }

        if (typeof normalized.price === 'string') {
            const parsed = Number(normalized.price.replace(/[^0-9.-]/g, ''));
            if (!Number.isNaN(parsed)) {
                normalized.price = parsed;
            }
        }

        if (typeof normalized.mileage === 'string') {
            const parsed = Number(normalized.mileage.replace(/[^0-9.-]/g, ''));
            if (!Number.isNaN(parsed)) {
                normalized.mileage = parsed;
            }
        }

        if (typeof normalized.year === 'string') {
            const parsed = Number(normalized.year.replace(/[^0-9.-]/g, ''));
            if (!Number.isNaN(parsed)) {
                normalized.year = parsed;
            }
        }

        return normalized;
    };

    const normalizeCars = (cars = []) => {
        const existingSlugs = new Set();
        return cars.map((car) => normalizeCar(car, existingSlugs));
    };

    const readFromStorage = () => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('Blogas formatas');
            return parsed;
        } catch (error) {
            console.warn('Nepavyko nuskaityti automobilių iš saugyklos:', error);
            return null;
        }
    };

    const writeToStorage = (cars) => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
        } catch (error) {
            console.warn('Nepavyko išsaugoti automobilių:', error);
        }
    };

    const notify = () => {
        window.dispatchEvent(new CustomEvent('cars:updated'));
    };

    const loadFromStorage = () => {
        const stored = readFromStorage();
        if (!stored) return null;
        const normalized = normalizeCars(stored);
        if (JSON.stringify(normalized) !== JSON.stringify(stored)) {
            writeToStorage(normalized);
        }
        return normalized;
    };

    const ensureData = async () => {
        if (cache) return cache;

        const stored = loadFromStorage();
        if (Array.isArray(stored)) {
            cache = stored;
            return stored;
        }

        try {
            const defaults = normalizeCars(await fetchDefaults());
            cache = defaults;
            writeToStorage(defaults);
            return defaults;
        } catch (error) {
            console.error('Nepavyko įkelti numatytų automobilių:', error);
            cache = [];
            return [];
        }
    };

    const getCars = async () => ensureData();

    const matchBySlug = (cars, slug) => {
        if (!slug) return null;
        let normalizedSlug = String(slug);
        try {
            normalizedSlug = decodeURIComponent(normalizedSlug);
        } catch (error) {
            // ignoruoti dekodavimo klaidas
        }
        normalizedSlug = normalizedSlug.trim();
        return (
            cars.find((item) => item.slug === normalizedSlug || String(item.id) === normalizedSlug)
            || cars.find((item) => generateSlug(item.title || item.name || String(item.id || '')) === normalizedSlug)
        );
    };

    const getCar = async (slug) => {
        if (!slug) return null;
        const cars = await ensureData();
        let found = matchBySlug(cars, slug);
        if (found) return found;

        try {
            const defaults = normalizeCars(await fetchDefaults());
            cache = defaults;
            writeToStorage(defaults);
            notify();
            return matchBySlug(defaults, slug);
        } catch (error) {
            console.warn('Nepavyko rasti automobilio tarp numatytųjų duomenų:', error);
            return null;
        }
    };

    const createId = () => {
        try {
            if (typeof window !== 'undefined') {
                const cryptoObj = window.crypto || window.msCrypto;
                if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
                    return cryptoObj.randomUUID();
                }
                if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
                    const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
                    bytes[6] = (bytes[6] & 0x0f) | 0x40;
                    bytes[8] = (bytes[8] & 0x3f) | 0x80;
                    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
                    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex
                        .slice(8, 10)
                        .join('')}-${hex.slice(10, 16).join('')}`;
                }
            }
        } catch (error) {
            console.warn('Nepavyko sugeneruoti UUID:', error);
        }
        return `auto-${Date.now()}`;
    };

    const saveCars = async (cars) => {
        const normalized = normalizeCars(cars);
        cache = normalized;
        writeToStorage(normalized);
        notify();
        return normalized;
    };

    const upsertCar = async (car) => {
        await ensureData();
        const cars = cache ? [...cache] : [];
        const index = cars.findIndex((item) => item.slug === car.slug || item.id === car.id);
        const baseCar = { ...car };
        if (!baseCar.slug) {
            baseCar.slug = generateSlug(baseCar.title || baseCar.name || `auto-${Date.now()}`);
        }
        if (index >= 0) {
            cars[index] = { ...cars[index], ...baseCar };
        } else {
            cars.push({ id: createId(), ...baseCar });
        }
        const normalized = normalizeCars(cars);
        const targetIndex = index >= 0 ? index : normalized.length - 1;
        await saveCars(normalized);
        return normalized[targetIndex];
    };

    const deleteCar = async (slug) => {
        await ensureData();
        if (!cache) return;
        const filtered = cache.filter((item) => item.slug !== slug && String(item.id) !== String(slug));
        await saveCars(filtered);
    };

    const resetCars = async () => {
        const defaults = normalizeCars(await fetchDefaults());
        await saveCars(defaults);
        return defaults;
    };

    window.CarData = {
        STORAGE_KEY,
        getCars,
        getCar,
        saveCars,
        upsertCar,
        deleteCar,
        resetCars,
        generateSlug,
    };
})();
