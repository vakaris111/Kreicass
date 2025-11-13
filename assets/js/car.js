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
    const lightboxScroller = document.getElementById('lightboxScroller');

    let activeIndex = 0;
    let lightboxIndex = 0;
    let lastFocus = null;
    const pointerCache = new Map();
    let currentZoomImage = null;
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
        if (!currentZoomImage) return;
        const { scale, translateX, translateY } = zoomState;
        currentZoomImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        currentZoomImage.classList.toggle('is-zoomed', scale > 1.01);
    };

    const resetZoom = () => {
        zoomState.scale = 1;
        zoomState.originScale = 1;
        zoomState.translateX = 0;
        zoomState.translateY = 0;
        pinchStartDistance = 0;
        panStart = { x: 0, y: 0 };
        if (currentZoomImage) {
            currentZoomImage.style.transform = '';
            currentZoomImage.classList.remove('is-zoomed');
        }
    };

    const setActiveZoomTarget = (img) => {
        if (currentZoomImage === img) return;
        const previous = currentZoomImage;
        if (previous && previous !== img) {
            previous.style.transform = '';
            previous.classList.remove('is-zoomed');
        }
        pointerCache.clear();
        currentZoomImage = img;
        resetZoom();
        lastTapTime = 0;
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
            const items = lightboxScroller ? Array.from(lightboxScroller.querySelectorAll('[data-index]')) : [];
            items.forEach((item) => {
                const isActive = Number(item.dataset.index) === safeIndex;
                item.classList.toggle('active', isActive);
                if (isActive) {
                    const img = item.querySelector('img');
                    if (img) {
                        setActiveZoomTarget(img);
                        img.alt = `${car.title} nuotrauka ${safeIndex + 1}`;
                    }
                }
            });
            updateMainImage(safeIndex);
        };

        const scrollToLightboxIndex = (index, { instant = false } = {}) => {
            if (!lightboxScroller) return;
            const target = lightboxScroller.querySelector(`[data-index="${index}"]`);
            if (!target) return;
            target.scrollIntoView({
                block: 'center',
                inline: 'nearest',
                behavior: instant ? 'auto' : 'smooth',
            });
        };

        const attachZoomHandlers = (img) => {
            img.addEventListener('load', () => {
                if (currentZoomImage === img && zoomState.scale <= 1.01) {
                    resetZoom();
                }
            });

            img.addEventListener('pointerdown', (event) => {
                setActiveZoomTarget(img);
                pointerCache.set(event.pointerId, { x: event.clientX, y: event.clientY });
                const isTouch = event.pointerType === 'touch';
                const now = Date.now();

                if (isTouch) {
                    if (now - lastTapTime < 280 && pointerCache.size === 1) {
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
                    }
                    lastTapTime = now;
                }

                if (pointerCache.size === 2) {
                    event.preventDefault();
                    img.setPointerCapture(event.pointerId);
                    pinchStartDistance = distanceBetweenPointers();
                    zoomState.originScale = zoomState.scale;
                } else {
                    if (zoomState.scale > 1.01) {
                        img.setPointerCapture(event.pointerId);
                    }
                    panStart = { x: event.clientX - zoomState.translateX, y: event.clientY - zoomState.translateY };
                }
            });

            img.addEventListener('pointermove', (event) => {
                if (!pointerCache.has(event.pointerId) || currentZoomImage !== img) return;
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
                img.addEventListener(type, (event) => {
                    if (currentZoomImage !== img) return;
                    handlePointerEnd(event);
                });
            });

            img.addEventListener(
                'wheel',
                (event) => {
                    if (currentZoomImage !== img) return;
                    if (!event.ctrlKey && !event.metaKey) {
                        return;
                    }
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

            img.addEventListener('dblclick', (event) => {
                if (currentZoomImage !== img) return;
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
        };

        const buildLightboxScroller = () => {
            if (!lightboxScroller) return;
            lightboxScroller.innerHTML = gallery
                .map(
                    (src, index) => `
                        <figure class="lightbox__item" data-index="${index}">
                            <img src="${src}" alt="${car.title} nuotrauka ${index + 1}" loading="lazy" />
                        </figure>
                    `
                )
                .join('');

            Array.from(lightboxScroller.querySelectorAll('img')).forEach((img, index) => {
                img.addEventListener('click', () => {
                    setLightboxImage(index);
                    scrollToLightboxIndex(index);
                });
                attachZoomHandlers(img);
            });
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
            buildLightboxScroller();
            const hint = galleryModal.querySelector('.lightbox__hint');
            if (hint) {
                if (gallery.length > 1) {
                    hint.removeAttribute('hidden');
                } else {
                    hint.setAttribute('hidden', '');
                }
            }
            setLightboxImage(index);
            scrollToLightboxIndex(index, { instant: true });
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
            scrollToLightboxIndex(nextIndex);
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

        let scrollRaf = null;
        if (lightboxScroller) {
            lightboxScroller.addEventListener('scroll', () => {
                if (scrollRaf) {
                    cancelAnimationFrame(scrollRaf);
                }
                scrollRaf = requestAnimationFrame(() => {
                    const items = Array.from(lightboxScroller.querySelectorAll('[data-index]'));
                    if (!items.length) return;
                    const { top, height } = lightboxScroller.getBoundingClientRect();
                    const center = top + height / 2;
                    let closestIndex = lightboxIndex;
                    let closestDistance = Infinity;
                    items.forEach((item) => {
                        const rect = item.getBoundingClientRect();
                        const itemCenter = rect.top + rect.height / 2;
                        const distance = Math.abs(itemCenter - center);
                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestIndex = Number(item.dataset.index);
                        }
                    });
                    if (closestIndex !== lightboxIndex) {
                        setLightboxImage(closestIndex);
                    }
                });
            });
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
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                navigateLightbox(1);
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
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
            { label: 'Ratlankių skersmuo', value: car.wheelDiameter || 'Nenurodyta' },
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
