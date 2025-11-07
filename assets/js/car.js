document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    const titleEl = document.getElementById('carTitle');
    const subtitleEl = document.getElementById('carSubtitle');
    const detailsEl = document.getElementById('carDetails');
    const descriptionEl = document.getElementById('carDescription');
    const featuresEl = document.getElementById('carFeatures');
    const specsEl = document.getElementById('carSpecs');
    const mainImage = document.getElementById('mainImage');
    const mainImageButton = document.getElementById('mainImageButton');
    const thumbs = document.getElementById('galleryThumbs');
    const galleryModal = document.getElementById('galleryModal');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxStrip = document.getElementById('lightboxStrip');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');

    let activeIndex = 0;
    let lightboxIndex = 0;
    let lastFocus = null;

    if (!slug || !window.CarData) {
        if (subtitleEl) subtitleEl.textContent = 'Automobilis nerastas.';
        return;
    }

    try {
        const car = await window.CarData.getCar(slug);
        if (!car) {
            if (subtitleEl) subtitleEl.textContent = 'Automobilio duomenų rasti nepavyko.';
            if (detailsEl) detailsEl.innerHTML = '<p data-empty>Paspauskite „Automobiliai“ ir pasirinkite kitą pasiūlymą.</p>';
            return;
        }

        if (titleEl) titleEl.textContent = car.title;
        if (subtitleEl) subtitleEl.textContent = `${car.year} m. | ${car.mileage.toLocaleString('lt-LT')} km | ${car.fuel}`;

        const gallery = car.gallery && car.gallery.length ? car.gallery : ['https://placehold.co/800x500?text=MB+Kreicas'];

        const setThumbActive = (index) => {
            if (!thumbs) return;
            const buttons = Array.from(thumbs.querySelectorAll('button'));
            buttons.forEach((btn) => btn.classList.remove('active'));
            const target = buttons.find((btn) => Number(btn.dataset.index) === index);
            if (target) {
                target.classList.add('active');
            } else if (buttons.length) {
                buttons[buttons.length - 1].classList.add('active');
            }
        };

        const updateMainImage = (index) => {
            const safeIndex = Math.max(0, Math.min(index, gallery.length - 1));
            activeIndex = safeIndex;
            if (mainImage) {
                mainImage.src = gallery[safeIndex];
                mainImage.alt = `${car.title} nuotrauka ${safeIndex + 1}`;
            }
            setThumbActive(safeIndex);
        };

        const setLightboxImage = (index) => {
            const safeIndex = Math.max(0, Math.min(index, gallery.length - 1));
            lightboxIndex = safeIndex;
            if (lightboxImage) {
                lightboxImage.src = gallery[safeIndex];
                lightboxImage.alt = `${car.title} nuotrauka ${safeIndex + 1}`;
            }
            updateMainImage(safeIndex);
        };

        const buildLightboxStrip = () => {
            if (!lightboxStrip) return;
            lightboxStrip.innerHTML = gallery
                .map(
                    (src, index) => `
                        <button type="button" data-index="${index}" class="${index === lightboxIndex ? 'active' : ''}">
                            <img src="${src}" alt="${car.title} miniatiūra ${index + 1}" loading="lazy" />
                        </button>
                    `
                )
                .join('');
        };

        const openLightbox = (index = 0) => {
            if (!galleryModal) return;
            lastFocus = document.activeElement;
            galleryModal.removeAttribute('hidden');
            galleryModal.classList.add('open');
            document.body.classList.add('no-scroll');
            setLightboxImage(index);
            buildLightboxStrip();
        };

        const closeLightbox = () => {
            if (!galleryModal || galleryModal.hasAttribute('hidden')) return;
            galleryModal.classList.remove('open');
            galleryModal.setAttribute('hidden', '');
            document.body.classList.remove('no-scroll');
            if (lastFocus && typeof lastFocus.focus === 'function') {
                lastFocus.focus();
            }
        };

        const navigateLightbox = (direction) => {
            if (!gallery || !gallery.length) return;
            const nextIndex = (lightboxIndex + direction + gallery.length) % gallery.length;
            setLightboxImage(nextIndex);
            buildLightboxStrip();
        };

        const maxPreview = 5;
        const preview = thumbs ? gallery.slice(0, maxPreview) : [];
        const extraCount = Math.max(gallery.length - maxPreview, 0);

        if (thumbs) {
            thumbs.innerHTML = preview
                .map((src, index) => {
                    const isOverflow = extraCount > 0 && index === preview.length - 1;
                    const openIndex = isOverflow ? maxPreview : index;
                    const thumbSrc = isOverflow ? gallery[openIndex] : src;
                    return `
                        <button type="button" class="${index === 0 ? 'active' : ''}${isOverflow ? ' has-overlay' : ''}" data-src="${thumbSrc}" data-index="${openIndex}" ${
                        isOverflow ? 'data-more="true"' : ''
                    }>
                            <img src="${thumbSrc}" alt="${car.title} nuotrauka ${openIndex + 1}" loading="lazy" />
                            ${isOverflow ? `<span class="thumb-overlay">+${extraCount} foto</span>` : ''}
                        </button>
                    `;
                })
                .join('');

            thumbs.querySelectorAll('button').forEach((button) => {
                button.addEventListener('click', () => {
                    const index = Number(button.dataset.index);
                    if (button.dataset.more === 'true') {
                        openLightbox(index);
                        return;
                    }
                    updateMainImage(index);
                    openLightbox(index);
                });
            });
        }

        updateMainImage(0);

        if (mainImageButton) {
            mainImageButton.addEventListener('click', () => openLightbox(activeIndex));
        }

        if (lightboxStrip) {
            lightboxStrip.addEventListener('click', (event) => {
                const target = event.target.closest('button[data-index]');
                if (!target) return;
                const index = Number(target.dataset.index);
                setLightboxImage(index);
                buildLightboxStrip();
                updateMainImage(index);
            });
        }

        if (lightboxPrev) {
            lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
        }

        if (lightboxNext) {
            lightboxNext.addEventListener('click', () => navigateLightbox(1));
        }

        if (galleryModal) {
            galleryModal.addEventListener('click', (event) => {
                if (event.target.dataset.close !== undefined) {
                    closeLightbox();
                }
            });
        }

        document.addEventListener('keydown', (event) => {
            const modalOpen = galleryModal && !galleryModal.hasAttribute('hidden');
            if (!modalOpen) return;
            if (event.key === 'Escape') {
                closeLightbox();
            }
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                navigateLightbox(1);
            }
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                navigateLightbox(-1);
            }
        });

        const specItems = [
            { label: 'Kaina', value: `${car.price.toLocaleString('lt-LT')} €` },
            { label: 'Metai', value: car.year },
            { label: 'Rida', value: `${car.mileage.toLocaleString('lt-LT')} km` },
            { label: 'Kuras', value: car.fuel },
            { label: 'Pavarų dėžė', value: car.transmission },
            { label: 'Varantieji ratai', value: car.drivetrain || 'Nenurodyta' },
            { label: 'Galia', value: car.power ? `${car.power} kW` : 'Nenurodyta' },
            { label: 'Kėbulas', value: car.body || 'Nenurodyta' },
            { label: 'Spalva', value: car.color || 'Nenurodyta' },
            { label: 'VIN', value: car.vin || 'Pateikiama apžiūros metu' },
        ];

        if (specsEl) {
            specsEl.innerHTML = `
                <div class="spec-grid">
                    ${specItems
                        .map(
                            (item) => `
                                <div class="spec-item">
                                    <span>${item.label}</span>
                                    <strong>${item.value}</strong>
                                </div>
                            `
                        )
                        .join('')}
                </div>
            `;
        }

        if (descriptionEl) {
            descriptionEl.innerHTML = `
                <h2>Aprašymas</h2>
                <p>${car.description}</p>
                <div class="info-note">Norite daugiau informacijos ar papildomų nuotraukų? Susisiekite ir atsiųsime pilną ataskaitą bei video apžvalgą.</div>
            `;
        }

        if (car.features && car.features.length && featuresEl) {
            featuresEl.innerHTML = `
                <h2>Įranga ir ypatumai</h2>
                <ul class="features-list">
                    ${car.features.map((feature) => `<li>${feature}</li>`).join('')}
                </ul>
            `;
        } else if (featuresEl) {
            featuresEl.innerHTML = '<p data-empty>Įrangos sąrašas bus pateiktas artimiausiu metu.</p>';
        }
    } catch (error) {
        console.error(error);
        if (subtitleEl) subtitleEl.textContent = 'Įvyko klaida įkeliant automobilį.';
        if (detailsEl) detailsEl.innerHTML = '<p data-empty>Pabandykite atnaujinti puslapį arba grįžkite į sąrašą.</p>';
    }
});
