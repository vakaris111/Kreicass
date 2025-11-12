if (window.authService) {
    window.authService.requireAuth();
} else {
    console.warn('Autentifikavimo paslauga nepasiekiama.');
}

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('carForm');
    const listEl = document.getElementById('adminList');
    const exportBtn = document.getElementById('exportCars');
    const importInput = document.getElementById('importCars');
    const resetBtn = document.getElementById('resetCars');
    const uploadInput = document.getElementById('carGalleryUpload');
    const uploadPreview = document.getElementById('localGalleryPreview');
    const passwordForm = document.getElementById('passwordForm');
    const passwordMessage = document.getElementById('passwordMessage');
    const logoutBtn = document.getElementById('logoutBtn');
    const syncForm = document.getElementById('syncForm');
    const syncEnabledInput = document.getElementById('syncEnabled');
    const syncOwnerInput = document.getElementById('syncOwner');
    const syncRepoInput = document.getElementById('syncRepo');
    const syncBranchInput = document.getElementById('syncBranch');
    const syncPathInput = document.getElementById('syncPath');
    const syncTokenInput = document.getElementById('syncToken');
    const syncCommitInput = document.getElementById('syncCommitMessage');
    const syncAuthorNameInput = document.getElementById('syncAuthorName');
    const syncAuthorEmailInput = document.getElementById('syncAuthorEmail');
    const syncMessage = document.getElementById('syncMessage');
    const syncStatusText = document.getElementById('syncStatusText');
    const syncNowBtn = document.getElementById('syncNow');
    const syncTestBtn = document.getElementById('syncTest');

    if (!form || !listEl || !window.CarData) return;

    let cars = [];
    let editingSlug = null;
    let uploadedImages = [];
    let cachedTokenPlaceholder = '';

    const escapeHtml = (value = '') =>
        String(value).replace(/[&<>"]|'/g, (char) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            }[char])
        );

    const renderUploadedImages = () => {
        if (!uploadPreview) return;

        if (!uploadedImages.length) {
            uploadPreview.innerHTML = `<p class="upload-preview__empty">${uploadPreview.dataset.empty || 'Dar nėra įkeltų nuotraukų.'}</p>`;
            return;
        }

        uploadPreview.innerHTML = `
            <ul class="upload-preview__list">
                ${uploadedImages
                    .map(
                        (item, index) => `
                            <li class="upload-preview__item">
                                <img src="${item.dataUrl}" alt="${escapeHtml(item.name)}" loading="lazy" />
                                <div class="upload-preview__meta">
                                    <span>${escapeHtml(item.name)}</span>
                                    <button type="button" class="upload-preview__remove" data-remove="${index}">Šalinti</button>
                                </div>
                            </li>
                        `
                    )
                    .join('')}
            </ul>
        `;

        uploadPreview.querySelectorAll('[data-remove]').forEach((button) => {
            button.addEventListener('click', () => {
                const index = Number(button.dataset.remove);
                if (Number.isNaN(index)) return;
                uploadedImages.splice(index, 1);
                renderUploadedImages();
            });
        });
    };

    const readFileAsDataUrl = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('Nepavyko nuskaityti failo.'));
            reader.readAsDataURL(file);
        });

    const handleUploads = async (fileList) => {
        if (!fileList || !fileList.length) return;
        const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));

        if (!files.length) {
            alert('Pasirinkite paveikslėlių failus.');
            return;
        }

        try {
            const results = await Promise.all(
                files.map((file) =>
                    readFileAsDataUrl(file).then((dataUrl) => ({
                        name: file.name || 'Nuotrauka',
                        dataUrl,
                    }))
                )
            );

            uploadedImages = [...uploadedImages, ...results];
            renderUploadedImages();
        } catch (error) {
            console.error('Nepavyko įkelti nuotraukų:', error);
            alert('Nepavyko įkelti kai kurių nuotraukų. Bandykite dar kartą.');
        } finally {
            if (uploadInput) uploadInput.value = '';
        }
    };

    const loadCars = async () => {
        cars = await window.CarData.getCars();
        renderList();
    };

    const remoteSyncAvailable = typeof window.RemoteSync !== 'undefined';

    const showSyncMessage = (text, isError = true) => {
        if (!syncMessage) return;
        syncMessage.textContent = text;
        syncMessage.hidden = !text;
        syncMessage.classList.toggle('form-error', isError);
        syncMessage.classList.toggle('form-success', !isError);
    };

    const updateSyncStatusText = (config) => {
        if (!syncStatusText) return;
        if (!config || !config.enabled) {
            syncStatusText.textContent = 'Nuotolinė sinchronizacija išjungta. Pakeitimai bus saugomi tik šiame įrenginyje.';
            return;
        }
        const owner = config.owner || '…';
        const repo = config.repo || '…';
        const branch = config.branch || 'main';
        syncStatusText.textContent = `Sinchronizuojama su https://github.com/${owner}/${repo} (${branch}).`;
    };

    const refreshSyncButtons = (config) => {
        const isActive = !!(config && config.enabled);
        if (syncNowBtn) syncNowBtn.disabled = !isActive;
        if (syncTestBtn) syncTestBtn.disabled = !isActive;
    };

    const populateSyncForm = async () => {
        if (!remoteSyncAvailable || !syncForm) return;

        if (typeof window.RemoteSync.whenReady === 'function') {
            try {
                await window.RemoteSync.whenReady();
            } catch (error) {
                console.warn('Nepavyko užkrauti nuotolinės sinchronizacijos nustatymų:', error);
            }
        }

        const config = window.RemoteSync.getConfig();
        if (syncEnabledInput) syncEnabledInput.checked = !!config.enabled;
        if (syncOwnerInput) syncOwnerInput.value = config.owner || '';
        if (syncRepoInput) syncRepoInput.value = config.repo || '';
        if (syncBranchInput) syncBranchInput.value = config.branch || '';
        if (syncPathInput) syncPathInput.value = config.path || '';
        if (syncCommitInput) syncCommitInput.value = config.commitMessage || '';
        if (syncAuthorNameInput) syncAuthorNameInput.value = config.authorName || '';
        if (syncAuthorEmailInput) syncAuthorEmailInput.value = config.authorEmail || '';
        if (syncTokenInput) {
            syncTokenInput.value = '';
            cachedTokenPlaceholder = config.token ? 'Raktas išsaugotas šiame įrenginyje' : '';
            syncTokenInput.placeholder = cachedTokenPlaceholder || 'ghp_...';
        }
        updateSyncStatusText(config);
        refreshSyncButtons(config);
    };

    const handleRemoteError = (event) => {
        const message = event?.detail?.error?.message || 'Nepavyko atlikti nuotolinės sinchronizacijos.';
        showSyncMessage(message, true);
    };

    const showPasswordMessage = (text, isError = true) => {
        if (!passwordMessage) return;
        passwordMessage.textContent = text;
        passwordMessage.hidden = !text;
        passwordMessage.classList.toggle('form-error', isError);
        passwordMessage.classList.toggle('form-success', !isError);
    };

    const renderList = () => {
        if (!cars.length) {
            listEl.innerHTML = '<p data-empty>Sąrašas tuščias. Pridėkite pirmą automobilį.</p>';
            return;
        }

        listEl.innerHTML = cars
            .map(
                (car) => `
                    <div class="admin-item">
                        <span class="admin-item__title">${car.title}</span>
                        <span class="admin-item__meta">${car.year} m. • ${car.mileage.toLocaleString('lt-LT')} km • ${car.price.toLocaleString('lt-LT')} €</span>
                        <div class="admin-item__actions">
                            <button type="button" data-edit="${car.slug}">Redaguoti</button>
                            <button type="button" class="delete" data-delete="${car.slug}">Ištrinti</button>
                        </div>
                    </div>
                `
            )
            .join('');

        listEl.querySelectorAll('[data-edit]').forEach((button) => {
            button.addEventListener('click', () => startEdit(button.dataset.edit));
        });

        listEl.querySelectorAll('[data-delete]').forEach((button) => {
            button.addEventListener('click', () => deleteCar(button.dataset.delete));
        });
    };

    const startEdit = (slug) => {
        const car = cars.find((item) => item.slug === slug);
        if (!car) return;
        editingSlug = car.slug;
        form.querySelector('#carTitleInput').value = car.title;
        form.querySelector('#carPrice').value = car.price;
        form.querySelector('#carYear').value = car.year;
        form.querySelector('#carMileage').value = car.mileage;
        form.querySelector('#carFuel').value = car.fuel;
        form.querySelector('#carTransmission').value = car.transmission;
        form.querySelector('#carDrivetrain').value = car.drivetrain || '';
        form.querySelector('#carWheelDiameter').value = car.wheelDiameter || '';
        form.querySelector('#carPower').value = car.power || '';
        form.querySelector('#carBody').value = car.body || '';
        form.querySelector('#carColor').value = car.color || '';
        form.querySelector('#carDescriptionInput').value = car.description || '';
        form.querySelector('#carFeatures').value = car.features ? car.features.join(', ') : '';
        const gallery = Array.isArray(car.gallery) ? car.gallery : [];
        const remoteGallery = gallery.filter((src) => typeof src === 'string' && !src.startsWith('data:'));
        const localGallery = gallery.filter((src) => typeof src === 'string' && src.startsWith('data:'));

        form.querySelector('#carGallery').value = remoteGallery.join(', ');
        uploadedImages = localGallery.map((src, index) => ({
            name: `Įkelta nuotrauka ${index + 1}`,
            dataUrl: src,
        }));
        renderUploadedImages();
        form.querySelector('#carVin').value = car.vin || '';
        form.querySelector('button[type="submit"]').textContent = 'Atnaujinti automobilį';
        form.scrollIntoView({ behavior: 'smooth' });
    };

    const deleteCar = async (slug) => {
        if (!confirm('Ar tikrai norite pašalinti automobilį?')) return;
        await window.CarData.deleteCar(slug);
        await loadCars();
    };

    const resetForm = () => {
        form.reset();
        editingSlug = null;
        uploadedImages = [];
        renderUploadedImages();
        form.querySelector('button[type="submit"]').textContent = 'Išsaugoti automobilį';
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const title = form.querySelector('#carTitleInput').value.trim();
        const price = Number(form.querySelector('#carPrice').value);
        const year = Number(form.querySelector('#carYear').value);
        const mileage = Number(form.querySelector('#carMileage').value);
        const fuel = form.querySelector('#carFuel').value.trim();
        const transmission = form.querySelector('#carTransmission').value.trim();
        const drivetrain = form.querySelector('#carDrivetrain').value.trim();
        const wheelDiameter = form.querySelector('#carWheelDiameter').value.trim();
        const power = Number(form.querySelector('#carPower').value) || null;
        const body = form.querySelector('#carBody').value.trim();
        const color = form.querySelector('#carColor').value.trim();
        const description = form.querySelector('#carDescriptionInput').value.trim();
        const features = form
            .querySelector('#carFeatures')
            .value.split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        const galleryLinks = form
            .querySelector('#carGallery')
            .value.split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        const vin = form.querySelector('#carVin').value.trim();

        const slug = editingSlug || window.CarData.generateSlug(title);

        const car = {
            slug,
            title,
            price,
            year,
            mileage,
            fuel,
            transmission,
            drivetrain,
            wheelDiameter,
            power,
            body,
            color,
            description,
            features,
            gallery: [...galleryLinks, ...uploadedImages.map((item) => item.dataUrl)],
            vin,
        };

        try {
            await window.CarData.upsertCar(car);
            await loadCars();
            resetForm();
            alert('Automobilis išsaugotas!');
        } catch (error) {
            console.error('Nepavyko išsaugoti automobilio:', error);
            alert(error?.message || 'Nepavyko išsaugoti automobilio.');
        } finally {
            submitBtn.disabled = false;
        }
    });

    if (uploadInput) {
        uploadInput.addEventListener('change', (event) => {
            handleUploads(event.target.files);
        });
    }

    exportBtn.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(cars, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mb-kreicas-automobiliai.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    importInput.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!Array.isArray(data)) throw new Error('Neteisingas failo formatas.');
                await window.CarData.saveCars(data);
                await loadCars();
                alert('Automobiliai sėkmingai importuoti.');
            } catch (error) {
                alert('Nepavyko importuoti: ' + error.message);
            } finally {
                importInput.value = '';
            }
        };
        reader.readAsText(file);
    });

    resetBtn.addEventListener('click', async () => {
        if (!confirm('Atstatyti numatytą automobilių sąrašą? Visi vietiniai pakeitimai bus prarasti.')) return;
        await window.CarData.resetCars();
        await loadCars();
    });

    if (passwordForm && window.authService) {
        passwordForm.addEventListener('submit', (event) => {
            event.preventDefault();
            showPasswordMessage('');

            const current = (passwordForm.querySelector('#currentPassword')?.value || '').trim();
            const next = (passwordForm.querySelector('#newPassword')?.value || '').trim();

            try {
                window.authService.updatePassword(current, next);
                showPasswordMessage('Slaptažodis atnaujintas. Prisijunkite iš naujo.', false);
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1200);
            } catch (error) {
                const message = error?.message || 'Nepavyko atnaujinti slaptažodžio. Bandykite dar kartą.';
                showPasswordMessage(message, true);
            } finally {
                passwordForm.reset();
            }
        });
    }

    if (logoutBtn && window.authService) {
        logoutBtn.addEventListener('click', () => {
            window.authService.logout();
            window.location.href = 'login.html';
        });
    }

    window.addEventListener('cars:updated', loadCars);

    if (remoteSyncAvailable) {
        await populateSyncForm();
        window.addEventListener('remote-sync:error', handleRemoteError);
        window.addEventListener('remote-sync:push-success', () => {
            showSyncMessage('Duomenys išsaugoti GitHub saugykloje.', false);
        });
        window.addEventListener('remote-sync:pull-success', () => {
            showSyncMessage('Duomenys atnaujinti iš GitHub.', false);
        });
        window.addEventListener('cars:sync-error', handleRemoteError);
    }

    if (remoteSyncAvailable && syncForm) {
        syncForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            showSyncMessage('');

            if (typeof window.RemoteSync.whenReady === 'function') {
                try {
                    await window.RemoteSync.whenReady();
                } catch (error) {
                    console.warn('Nepavyko paruošti nuotolinės sinchronizacijos nustatymų:', error);
                }
            }

            const currentConfig = window.RemoteSync.getConfig();
            const nextConfig = {
                ...currentConfig,
                enabled: syncEnabledInput?.checked || false,
                owner: (syncOwnerInput?.value || '').trim(),
                repo: (syncRepoInput?.value || '').trim(),
                branch: (syncBranchInput?.value || '').trim() || 'main',
                path: (syncPathInput?.value || '').trim() || 'assets/data/cars.json',
                commitMessage: (syncCommitInput?.value || '').trim() || 'Atnaujinti automobilių sąrašą',
                authorName: (syncAuthorNameInput?.value || '').trim(),
                authorEmail: (syncAuthorEmailInput?.value || '').trim(),
            };

            const tokenValue = (syncTokenInput?.value || '').trim();
            if (tokenValue) {
                nextConfig.token = tokenValue;
            } else if (!currentConfig.token) {
                nextConfig.token = '';
            }

            window.RemoteSync.saveConfig(nextConfig);
            await populateSyncForm();

            if (nextConfig.enabled) {
                try {
                    await window.CarData.syncFromRemote();
                    showSyncMessage('Nustatymai išsaugoti. Duomenys sinchronizuoti iš GitHub.', false);
                } catch (error) {
                    showSyncMessage(error?.message || 'Nustatymai išsaugoti, bet nepavyko nuskaityti duomenų iš GitHub.', true);
                }
            } else {
                showSyncMessage('Nuotolinė sinchronizacija išjungta.', false);
            }

            if (syncTokenInput) {
                syncTokenInput.value = '';
                syncTokenInput.placeholder = cachedTokenPlaceholder || 'ghp_...';
            }
        });

        if (syncNowBtn) {
            syncNowBtn.addEventListener('click', async () => {
                showSyncMessage('');
                try {
                    if (typeof window.RemoteSync.whenReady === 'function') {
                        await window.RemoteSync.whenReady();
                    }
                    await window.CarData.syncFromRemote();
                    await loadCars();
                    showSyncMessage('Automobilių sąrašas atnaujintas iš GitHub.', false);
                } catch (error) {
                    showSyncMessage(error?.message || 'Nepavyko gauti duomenų iš GitHub.', true);
                }
            });
        }

        if (syncTestBtn) {
            syncTestBtn.addEventListener('click', async () => {
                showSyncMessage('Tikrinamas ryšys...', false);
                try {
                    if (typeof window.RemoteSync.whenReady === 'function') {
                        await window.RemoteSync.whenReady();
                    }
                    await window.RemoteSync.testConnection();
                    showSyncMessage('Ryšys su GitHub sėkmingai užmegztas.', false);
                } catch (error) {
                    showSyncMessage(error?.message || 'Nepavyko prisijungti prie GitHub.', true);
                }
            });
        }
    }

    renderUploadedImages();
    loadCars();
});
