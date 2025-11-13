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

    if (!form || !listEl || !window.CarData) return;

    let cars = [];
    let editingSlug = null;
    let uploadedImages = [];

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
        form.querySelector('#carSdk').value = car.sdk || car.vin || '';
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
        const sdk = form.querySelector('#carSdk').value.trim();

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
            sdk,
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

    renderUploadedImages();
    loadCars();
});
