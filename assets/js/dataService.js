(function () {
    const STORAGE_KEY = 'mbk_cars_v1';
    let cache = null;
    let dataSource = null;

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

        return normalized;
    };

    const normalizeCars = (cars) => {
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

    const tryFetchRemote = async ({ existingCars = null } = {}) => {
        if (!window.RemoteSync || !window.RemoteSync.isEnabled()) return null;
        try {
            const remoteCars = await window.RemoteSync.fetchCars();
            if (!Array.isArray(remoteCars)) return null;
            const normalized = normalizeCars(remoteCars);
            if (!normalized.length && existingCars && existingCars.length) {
                console.warn('Nuotolinė saugykla grąžino tuščią sąrašą. Paliekami esami duomenys.');
                return null;
            }
            cache = normalized;
            dataSource = 'remote';
            writeToStorage(normalized);
            return normalized;
        } catch (error) {
            console.warn('Nepavyko gauti duomenų iš nuotolinės saugyklos:', error);
            return null;
        }
    };

    const ensureData = async ({ forceRemote = false } = {}) => {
        if (window.RemoteSync && typeof window.RemoteSync.whenReady === 'function') {
            try {
                await window.RemoteSync.whenReady();
            } catch (error) {
                console.warn('Nepavyko paruošti nuotolinės sinchronizacijos:', error);
            }
        }

        if (!forceRemote && cache) return cache;

        if (forceRemote) {
            cache = null;
        }

        const stored = readFromStorage();
        const normalizedStored = stored ? normalizeCars(stored) : null;

        if (!forceRemote && normalizedStored) {
            cache = normalizedStored;
            dataSource = 'storage';
            if (JSON.stringify(normalizedStored) !== JSON.stringify(stored)) {
                writeToStorage(normalizedStored);
            }
        }

        if (window.RemoteSync && window.RemoteSync.isEnabled()) {
            const existingCars = cache && cache.length ? cache : normalizedStored;
            const remote = await tryFetchRemote({ existingCars });
            if (remote) return remote;
        }

        if (!forceRemote && Array.isArray(cache)) {
            return cache;
        }

        if (Array.isArray(normalizedStored)) {
            cache = normalizedStored;
            dataSource = 'storage';
            if (JSON.stringify(normalizedStored) !== JSON.stringify(stored)) {
                writeToStorage(normalizedStored);
            }
            return normalizedStored;
        }

        const defaults = await fetchDefaults();
        const normalizedDefaults = normalizeCars(defaults);
        cache = normalizedDefaults;
        dataSource = 'defaults';
        writeToStorage(normalizedDefaults);
        return normalizedDefaults;
    };

    const getCars = async () => ensureData();

    const matchBySlug = (cars, slug) => {
        if (!slug) return null;
        let normalizedSlug = String(slug);
        try {
            normalizedSlug = decodeURIComponent(normalizedSlug);
        } catch (error) {
            // ignore decode issues and fall back to raw slug
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

        if (dataSource !== 'defaults') {
            try {
                const defaults = normalizeCars(await fetchDefaults());
                cache = defaults;
                dataSource = 'defaults';
                writeToStorage(defaults);
                notify();
                found = matchBySlug(defaults, slug);
                if (found) {
                    return found;
                }
            } catch (error) {
                console.warn('Nepavyko atkurti numatytų automobilių:', error);
            }
        }

        return null;
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
                    // RFC4122 v4 UUID variant & version bits
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

    const persistRemotely = async (cars) => {
        if (!window.RemoteSync || !window.RemoteSync.isEnabled()) return null;
        try {
            await window.RemoteSync.pushCars(cars);
        } catch (error) {
            console.warn('Nuotolinės sinchronizacijos klaida:', error);
            window.dispatchEvent(new CustomEvent('cars:sync-error', { detail: { error } }));
        }
    };

    const saveCars = async (cars, { skipRemote = false } = {}) => {
        cache = cars;
        dataSource = 'storage';
        writeToStorage(cars);
        notify();
        if (!skipRemote) {
            await persistRemotely(cars);
        }
        return cars;
    };

    const upsertCar = async (car) => {
        if (!car.slug) {
            car.slug = generateSlug(car.title || car.name || `auto-${Date.now()}`);
        }
        const cars = cache ? [...cache] : [];
        const index = cars.findIndex((item) => item.slug === car.slug || item.id === car.id);
        if (index >= 0) {
            cars[index] = { ...cars[index], ...car };
        } else {
            cars.push({ id: createId(), ...car });
        }
        const normalized = normalizeCars(cars);
        const targetIndex = index >= 0 ? index : normalized.length - 1;
        await saveCars(normalized);
        return normalized[targetIndex];
    };

    const deleteCar = async (slug) => {
        if (!cache) return;
        const filtered = cache.filter((item) => item.slug !== slug && String(item.id) !== String(slug));
        await saveCars(filtered);
    };

    const resetCars = async () => {
        const defaults = await fetchDefaults();
        const normalizedDefaults = normalizeCars(defaults);
        await saveCars(normalizedDefaults);
        dataSource = 'defaults';
        return normalizedDefaults;
    };

    const syncFromRemote = async () => {
        const data = await ensureData({ forceRemote: true });
        notify();
        return data;
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
        syncFromRemote,
    };
})();
