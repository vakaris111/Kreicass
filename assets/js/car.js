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
    const mainImageCounter = document.getElementById('mainImageCounter');
    const mainPrev = document.getElementById('mainPrev');
    const mainNext = document.getElementById('mainNext');
    const galleryModal = document.getElementById('galleryModal');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCounter = document.getElementById('lightboxCounter');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');

    let activeIndex = 0;
    let lightboxIndex = 0;
    let lastFocus = null;
    const pointerCache = new Map();
    const zoomState = {
        scale: 1,
        originScale: 1,
        translateX: 0,
        translateY: 0,
    };
    let pinchStartDistance = 0;
    let panStart = { x: 0, y: 0 };
    let lastTapTime = 0;
    const MAX_SCALE = 4;

    const applyZoom = () => {
        if (!lightboxImage) return;
        const { scale, translateX, translateY } = zoomState;
        lightboxImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        lightboxImage.classList.toggle('is-zoomed', scale > 1.01);
    };

    const resetZoom = () => {
        zoomState.scale = 1;
        zoomState.originScale = 1;
        zoomState.translateX = 0;
        zoomState.translateY = 0;
        pinchStartDistance = 0;
        panStart = { x: 0, y: 0 };
        applyZoom();
    };

    const distanceBetweenPointers = () => {
        if (pointerCache.size < 2) return 0;
        const [first, second] = Array.from(pointerCache.values());
        return Math.hypot(second.x - first.x, second.y - first.y);
    };

    const handlePointerEnd = (event) => {
        pointerCache.delete(event.pointerId);
        if (pointerCache.size < 2) {
            pinchStartDistance = 0;
            zoomState.originScale = zoomState.scale;
        }
        if (!pointerCache.size && zoomState.scale <= 1.01) {
            resetZoom();
        }
    };

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

        const setLightboxImage = (index) => {
            const safeIndex = wrapIndex(index);
            lightboxIndex = safeIndex;
            if (lightboxImage) {
                pointerCache.clear();
                resetZoom();
                lightboxImage.src = gallery[safeIndex];
                lightboxImage.alt = `${car.title} nuotrauka ${safeIndex + 1}`;
            }
            if (lightboxCounter) {
                lightboxCounter.textContent = `${safeIndex + 1}/${gallery.length}`;
            }
            updateMainImage(safeIndex);
        };

        const openLightbox = (index = 0) => {
            if (!galleryModal) return;
            lastFocus = document.activeElement;
            galleryModal.removeAttribute('hidden');
            galleryModal.classList.add('open');
            document.body.classList.add('no-scroll');
            pointerCache.clear();
            resetZoom();
            lastTapTime = 0;
            setLightboxImage(index);
        };

        const closeLightbox = () => {
            if (!galleryModal || galleryModal.hasAttribute('hidden')) return;
            pointerCache.clear();
            resetZoom();
            lastTapTime = 0;
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
        };

        const navigateMain = (direction) => {
            if (!gallery || !gallery.length) return;
            const nextIndex = wrapIndex(activeIndex + direction);
            updateMainImage(nextIndex);
        };

        if (lightboxImage) {
            resetZoom();
            lightboxImage.addEventListener('load', () => {
                if (zoomState.scale <= 1.01) {
                    resetZoom();
                }
            });

            lightboxImage.addEventListener('pointerdown', (event) => {
                lightboxImage.setPointerCapture(event.pointerId);
                pointerCache.set(event.pointerId, { x: event.clientX, y: event.clientY });
                if (event.pointerType === 'touch') {
                    event.preventDefault();
                    const now = Date.now();
                    if (now - lastTapTime < 280 && pointerCache.size === 1) {
                        if (zoomState.scale > 1.01) {
                            resetZoom();
                        } else {
                            zoomState.scale = 2;
                            zoomState.originScale = 2;
                            zoomState.translateX = 0;
                            zoomState.translateY = 0;
                            applyZoom();
                        }
                    }
                    lastTapTime = now;
                }
                if (pointerCache.size === 2) {
                    pinchStartDistance = distanceBetweenPointers();
                    zoomState.originScale = zoomState.scale;
                } else if (pointerCache.size === 1) {
                    panStart = { x: event.clientX - zoomState.translateX, y: event.clientY - zoomState.translateY };
                }
            });

            lightboxImage.addEventListener('pointermove', (event) => {
                if (!pointerCache.has(event.pointerId)) return;
                pointerCache.set(event.pointerId, { x: event.clientX, y: event.clientY });
                if (pointerCache.size === 2) {
                    const distance = distanceBetweenPointers();
                    if (pinchStartDistance) {
                        const scale = Math.max(1, Math.min(MAX_SCALE, zoomState.originScale * (distance / pinchStartDistance)));
                        zoomState.scale = scale;
                        if (scale === 1) {
                            zoomState.translateX = 0;
                            zoomState.translateY = 0;
                        }
                        applyZoom();
                    }
                } else if (zoomState.scale > 1) {
                    const point = pointerCache.get(event.pointerId);
                    if (point) {
                        zoomState.translateX = point.x - panStart.x;
                        zoomState.translateY = point.y - panStart.y;
                        applyZoom();
                    }
                }
            });

            ['pointerup', 'pointercancel', 'pointerleave', 'pointerout'].forEach((type) => {
                lightboxImage.addEventListener(type, handlePointerEnd);
            });

            lightboxImage.addEventListener(
                'wheel',
                (event) => {
                    event.preventDefault();
                    const factor = event.deltaY < 0 ? 1.15 : 0.85;
                    const scale = Math.max(1, Math.min(MAX_SCALE, zoomState.scale * factor));
                    zoomState.scale = scale;
                    if (scale === 1) {
                        zoomState.translateX = 0;
                        zoomState.translateY = 0;
                    }
                    applyZoom();
                },
                { passive: false }
            );

            lightboxImage.addEventListener('dblclick', (event) => {
                event.preventDefault();
                if (zoomState.scale > 1.01) {
                    resetZoom();
                } else {
                    zoomState.scale = 2;
                    zoomState.originScale = 2;
                    zoomState.translateX = 0;
                    zoomState.translateY = 0;
                    applyZoom();
                }
            });
        }

        updateMainImage(0);

        if (mainPrev) {
            mainPrev.addEventListener('click', () => navigateMain(-1));
        }

        if (mainNext) {
            mainNext.addEventListener('click', () => navigateMain(1));
        }

        if (mainImageButton) {
            mainImageButton.addEventListener('click', () => openLightbox(activeIndex));
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
            car.sdk ? { label: 'SKD kodas', value: car.sdk } : null,
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
