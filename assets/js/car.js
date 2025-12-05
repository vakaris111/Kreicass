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
    const mainImageCounter = document.getElementById('mainImageCounter');
    const mainPrev = document.getElementById('mainPrev');
    const mainNext = document.getElementById('mainNext');

    let activeIndex = 0;

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

        const wrapIndex = (index) => (gallery.length ? (index + gallery.length) % gallery.length : 0);

        const openImageOverlay = ({ images, startIndex = 0, title = '' }) => {
            if (!images || !images.length) return;

            const overlay = document.createElement('div');
            overlay.className = 'image-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');

            overlay.innerHTML = `
                <div class="image-overlay__content">
                    <button type="button" class="image-overlay__close" aria-label="Užverti nuotrauką">×</button>
                    <button type="button" class="image-overlay__nav image-overlay__nav--prev" aria-label="Ankstesnė nuotrauka">
                        <span aria-hidden="true">‹</span>
                    </button>
                    <div class="image-overlay__frame">
                        <img alt="" />
                        <span class="image-overlay__counter"></span>
                    </div>
                    <button type="button" class="image-overlay__nav image-overlay__nav--next" aria-label="Kita nuotrauka">
                        <span aria-hidden="true">›</span>
                    </button>
                </div>
            `;

            const overlayImage = overlay.querySelector('img');
            const overlayCounter = overlay.querySelector('.image-overlay__counter');
            const prevButton = overlay.querySelector('.image-overlay__nav--prev');
            const nextButton = overlay.querySelector('.image-overlay__nav--next');

            const setImage = (index) => {
                const safeIndex = wrapIndex(index);
                activeIndex = safeIndex;
                updateMainImage(safeIndex);
                if (overlayImage) {
                    overlayImage.src = images[safeIndex];
                    overlayImage.alt = `${title || 'Automobilio'} nuotrauka ${safeIndex + 1}`;
                }
                if (overlayCounter) {
                    overlayCounter.textContent = `${safeIndex + 1}/${images.length}`;
                }
            };

            const closeOverlay = () => {
                overlay.classList.remove('is-visible');
                document.body.classList.remove('is-overlay-open');
                overlay.addEventListener(
                    'transitionend',
                    () => {
                        overlay.remove();
                    },
                    { once: true }
                );
                document.removeEventListener('keydown', handleKeydown);
            };

            const handleKeydown = (event) => {
                if (event.key === 'Escape') {
                    closeOverlay();
                }
                if (event.key === 'ArrowLeft') {
                    setImage(activeIndex - 1);
                }
                if (event.key === 'ArrowRight') {
                    setImage(activeIndex + 1);
                }
            };

            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    closeOverlay();
                }
            });

            overlay.querySelector('.image-overlay__close')?.addEventListener('click', closeOverlay);
            prevButton?.addEventListener('click', () => setImage(activeIndex - 1));
            nextButton?.addEventListener('click', () => setImage(activeIndex + 1));
            overlayImage?.addEventListener('click', () => {
                overlay.classList.toggle('is-zoomed');
            });

            document.addEventListener('keydown', handleKeydown);

            document.body.appendChild(overlay);
            document.body.classList.add('is-overlay-open');

            requestAnimationFrame(() => {
                overlay.classList.add('is-visible');
                setImage(startIndex);
            });
        };

        const updateMainImage = (index) => {
            const safeIndex = wrapIndex(index);
            activeIndex = safeIndex;
            if (mainImage) {
                mainImage.src = gallery[safeIndex];
                mainImage.alt = `${car.title} nuotrauka ${safeIndex + 1}`;
            }
            if (mainImageCounter) {
                mainImageCounter.textContent = `${safeIndex + 1}/${gallery.length}`;
            }
        };

        const navigateMain = (direction) => {
            if (!gallery || !gallery.length) return;
            const nextIndex = wrapIndex(activeIndex + direction);
            updateMainImage(nextIndex);
        };

        updateMainImage(0);

        if (mainPrev) {
            mainPrev.addEventListener('click', () => navigateMain(-1));
        }

        if (mainNext) {
            mainNext.addEventListener('click', () => navigateMain(1));
        }

        if (mainImage) {
            mainImage.addEventListener('click', () => {
                openImageOverlay({ images: gallery, startIndex: activeIndex, title: car.title });
            });
        }

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
            car.sdk ? { label: 'SDK kodas', value: car.sdk } : null,
            { label: 'VIN', value: car.vin || 'Pateikiama apžiūros metu' },
        ];

        if (specsEl) {
            specsEl.innerHTML = `
                <div class="spec-grid">
                    ${specItems
                        .map(
                            (item) =>
                                item
                                && `
                                <div class="spec-item">
                                    <span>${item.label}</span>
                                    <strong>${item.value}</strong>
                                </div>
                            `
                        )
                        .filter(Boolean)
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
