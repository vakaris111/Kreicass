(function () {
    const CONFIG_KEY = 'mbk_remote_sync_v1';
    const STATE_KEY = 'mbk_remote_sync_state_v1';
    const DEFAULT_CONFIG = {
        enabled: false,
        provider: 'github',
        owner: '',
        repo: '',
        branch: 'main',
        path: 'assets/data/cars.json',
        token: '',
        commitMessage: 'Atnaujinti automobilių sąrašą',
        authorName: 'MB Kreicas',
        authorEmail: 'info@mbkreicas.lt',
    };

    const isBrowser = typeof window !== 'undefined';

    const textEncoder = isBrowser && window.TextEncoder ? new TextEncoder() : null;
    const textDecoder = isBrowser && window.TextDecoder ? new TextDecoder() : null;

    const encodeBase64 = (text) => {
        if (textEncoder) {
            const bytes = textEncoder.encode(text);
            let binary = '';
            bytes.forEach((byte) => {
                binary += String.fromCharCode(byte);
            });
            return btoa(binary);
        }
        return btoa(unescape(encodeURIComponent(text)));
    };

    const decodeBase64 = (base64) => {
        const binary = atob(base64);
        if (textDecoder) {
            const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
            return textDecoder.decode(bytes);
        }
        return decodeURIComponent(escape(binary));
    };

    const readStorage = (key) => {
        if (!isBrowser) return null;
        try {
            const raw = window.localStorage.getItem(key);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (error) {
            console.warn('Nepavyko perskaityti remote sync nustatymų:', error);
            return null;
        }
    };

    const writeStorage = (key, value) => {
        if (!isBrowser) return;
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn('Nepavyko įrašyti remote sync nustatymų:', error);
        }
    };

    const getConfig = () => ({ ...DEFAULT_CONFIG, ...(readStorage(CONFIG_KEY) || {}) });

    const setConfig = (config) => {
        const merged = { ...DEFAULT_CONFIG, ...config };
        merged.owner = (merged.owner || '').trim();
        merged.repo = (merged.repo || '').trim();
        merged.branch = ((merged.branch || DEFAULT_CONFIG.branch).trim()) || DEFAULT_CONFIG.branch;
        merged.path = (merged.path || DEFAULT_CONFIG.path).trim().replace(/^\/+/, '');
        merged.commitMessage = (merged.commitMessage || DEFAULT_CONFIG.commitMessage).trim() || DEFAULT_CONFIG.commitMessage;
        writeStorage(CONFIG_KEY, merged);
        window.dispatchEvent(new CustomEvent('remote-sync:config-changed', { detail: { config: omitSensitive(merged) } }));
        return merged;
    };

    const getState = () => readStorage(STATE_KEY) || {};

    const setState = (patch) => {
        const state = { ...getState(), ...patch };
        writeStorage(STATE_KEY, state);
        return state;
    };

    const omitSensitive = (config) => {
        if (!config) return null;
        const clone = { ...config };
        if (clone.token) {
            clone.token = '***';
        }
        return clone;
    };

    const isEnabled = () => {
        const config = getConfig();
        return (
            !!config
            && config.enabled
            && config.provider === 'github'
            && config.owner.trim()
            && config.repo.trim()
            && config.path.trim()
        );
    };

    const normalizeCarsPayload = (payload) => {
        if (Array.isArray(payload)) return payload;
        if (payload && Array.isArray(payload.cars)) return payload.cars;
        return [];
    };

    const githubHeaders = (config) => {
        const headers = {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'mb-kreicas-app',
        };
        if (config.token) {
            headers.Authorization = `Bearer ${config.token}`;
        }
        return headers;
    };

    const readGitHubContent = async (config) => {
        const branch = (config.branch || DEFAULT_CONFIG.branch).trim() || DEFAULT_CONFIG.branch;
        const safePath = (config.path || DEFAULT_CONFIG.path).trim().replace(/^\/+/, '');
        const encodedPath = safePath
            .split('/')
            .map((segment) => encodeURIComponent(segment))
            .join('/');
        const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: githubHeaders(config),
            cache: 'no-store',
        });
        if (response.status === 404) {
            return { cars: [], sha: null };
        }
        if (!response.ok) {
            const message = await response.text();
            throw new Error(`GitHub klaida (${response.status}): ${message}`);
        }
        const data = await response.json();
        if (!data || typeof data !== 'object' || typeof data.content !== 'string') {
            throw new Error('Netinkamas GitHub atsakas.');
        }
        const decoded = decodeBase64(data.content);
        const json = decoded.trim() ? JSON.parse(decoded) : [];
        return { cars: normalizeCarsPayload(json), sha: data.sha || null };
    };

    const writeGitHubContent = async (config, cars) => {
        if (!config.token) {
            throw new Error('Nenurodytas GitHub asmeninis prieigos raktas.');
        }
        const branch = (config.branch || DEFAULT_CONFIG.branch).trim() || DEFAULT_CONFIG.branch;
        const safePath = (config.path || DEFAULT_CONFIG.path).trim().replace(/^\/+/, '');
        const encodedPath = safePath
            .split('/')
            .map((segment) => encodeURIComponent(segment))
            .join('/');
        const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodedPath}`;
        const state = getState();
        let sha = state.sha || null;
        if (!sha) {
            try {
                const current = await readGitHubContent(config);
                sha = current.sha;
            } catch (error) {
                if (error.message && error.message.includes('404')) {
                    sha = null;
                } else {
                    throw error;
                }
            }
        }

        const payload = JSON.stringify(cars, null, 2);
        const body = {
            message: config.commitMessage || DEFAULT_CONFIG.commitMessage,
            content: encodeBase64(`${payload}\n`),
            branch,
        };
        if (sha) {
            body.sha = sha;
        }
        if (config.authorName || config.authorEmail) {
            body.committer = {
                name: config.authorName || 'MB Kreicas',
                email: config.authorEmail || 'info@mbkreicas.lt',
            };
        }

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                ...githubHeaders(config),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const message = await response.text();
            throw new Error(`Nepavyko įrašyti į GitHub (${response.status}): ${message}`);
        }

        const result = await response.json();
        const newSha = result?.content?.sha || null;
        setState({ sha: newSha, pushedAt: new Date().toISOString() });
        window.dispatchEvent(new CustomEvent('remote-sync:push-success'));
        return result;
    };

    const fetchCars = async ({ force = false } = {}) => {
        if (!isEnabled()) return null;
        const config = getConfig();
        try {
            const result = await readGitHubContent(config);
            setState({ sha: result.sha || null, fetchedAt: new Date().toISOString() });
            window.dispatchEvent(new CustomEvent('remote-sync:pull-success'));
            return Array.isArray(result.cars) ? result.cars : [];
        } catch (error) {
            if (!force) {
                window.dispatchEvent(new CustomEvent('remote-sync:error', { detail: { error } }));
            }
            throw error;
        }
    };

    const pushCars = async (cars) => {
        if (!isEnabled()) return null;
        const config = getConfig();
        try {
            const result = await writeGitHubContent(config, cars);
            return result;
        } catch (error) {
            window.dispatchEvent(new CustomEvent('remote-sync:error', { detail: { error } }));
            throw error;
        }
    };

    const clearConfig = () => {
        if (!isBrowser) return;
        window.localStorage.removeItem(CONFIG_KEY);
        window.localStorage.removeItem(STATE_KEY);
        window.dispatchEvent(new CustomEvent('remote-sync:config-changed', { detail: { config: null } }));
    };

    const testConnection = async () => {
        if (!isEnabled()) {
            throw new Error('Nuotolinė sinchronizacija neįjungta.');
        }
        await fetchCars({ force: true });
        return true;
    };

    window.RemoteSync = {
        getConfig,
        saveConfig: setConfig,
        clearConfig,
        getState,
        setState,
        isEnabled,
        fetchCars,
        pushCars,
        testConnection,
    };
})();
