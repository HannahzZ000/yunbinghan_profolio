// ============================================
// Yunbing Han — Portfolio
// Premium interactions inspired by landonorris.com
// ============================================

gsap.registerPlugin(ScrollTrigger);

// --- Prevent overscroll above hero (blocks Safari rubber-band bounce) ---
window.addEventListener('scroll', function() {
    if (window.scrollY < 0) window.scrollTo(0, 0);
}, { passive: false });
document.addEventListener('touchmove', function(e) {
    if (window.scrollY <= 0) {
        var touch = e.touches[0];
        if (touch && touch.clientY > (window._lastTouchY || 0)) {
            e.preventDefault();
        }
    }
    window._lastTouchY = e.touches[0] ? e.touches[0].clientY : 0;
}, { passive: false });
document.addEventListener('touchstart', function(e) {
    window._lastTouchY = e.touches[0] ? e.touches[0].clientY : 0;
}, { passive: true });

// --- Footer Titles: auto-size so the longest line fills container width ---
(function() {
    var block = document.querySelector('.footer-titles-block');
    if (!block) return;
    var lines = Array.from(block.querySelectorAll('.hero-title-line'));
    if (!lines.length) return;

    function sizeFooterTitles() {
        var containerWidth = block.clientWidth;
        if (containerWidth <= 0) return;

        // Set a known test size, measure widest line, then scale proportionally
        var testSize = 100;
        lines.forEach(function(l) { l.style.fontSize = testSize + 'px'; });

        var maxWidth = 0;
        lines.forEach(function(l) {
            var w = l.scrollWidth;
            if (w > maxWidth) maxWidth = w;
        });

        if (maxWidth <= 0) return;

        // Scale so the widest line uses ~90% of the container (leaves room for right-shift)
        var idealSize = Math.floor(testSize * (containerWidth / maxWidth) * 0.9);
        lines.forEach(function(l) { l.style.fontSize = idealSize + 'px'; });
    }

    sizeFooterTitles();
    window.addEventListener('resize', function() {
        sizeFooterTitles();
        ScrollTrigger.refresh();
    });
    document.fonts.ready.then(function() {
        sizeFooterTitles();
        initTitleScrollAnimations();
    });

    // --- Scroll animation: slide out from behind hero, then shift left→right ---
    function initTitleScrollAnimations() {
        // Entire block starts pushed above the section, clipped by overflow:hidden
        gsap.set(block, { yPercent: -100 });

        var tl = gsap.timeline({
            scrollTrigger: {
                trigger: '.titles-section',
                start: 'top 95%',
                end: 'bottom top',
                scrub: 1,
                invalidateOnRefresh: true,
            }
        });

        // Phase 1: Slide entire block down into view as one unit
        tl.to(block, {
            yPercent: 0,
            duration: 1,
            ease: 'none',
        }, 0);

        // Phase 2: Shift each line from left-aligned → right-aligned
        // Using functional values so GSAP recalculates on resize/refresh
        lines.forEach(function(line) {
            tl.to(line, {
                x: function() {
                    return block.clientWidth - line.scrollWidth;
                },
                duration: 2,
                ease: 'none',
            }, 1);
        });
    }
})();

// --- Page Load Transition ---
// Wait for BOTH a minimum splash display time AND the 3D model to finish loading.
// This keeps the splash animation smooth and only reveals once the model is ready.
const pageTransition = document.getElementById('pageTransition');
(function() {
    let minTimeElapsed = false;
    let modelReady = false;

    function tryReveal() {
        if (!minTimeElapsed || !modelReady) return;
        pageTransition.classList.add('done');
        // Let the model entrance start immediately (runs behind the shrinking splash)
        window.dispatchEvent(new Event('pageTransitionDone'));
        // Clean up the overlay element after the shrink animation finishes
        pageTransition.addEventListener('animationend', function(e) {
            if (e.animationName === 'splashShrink') {
                pageTransition.style.display = 'none';
            }
        });
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            minTimeElapsed = true;
            tryReveal();
        }, 600);
    });

    window.addEventListener('modelReady', () => {
        modelReady = true;
        tryReveal();
    });
})();

// --- Theme Toggle (Day/Night) ---
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

function setThemeColor(dark) {
    const color = dark ? '#111111' : '#FAFAFA';
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', color));
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    html.setAttribute('data-theme', 'dark');
    setThemeColor(true);
} else if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    html.setAttribute('data-theme', 'dark');
    setThemeColor(true);
}

themeToggle.addEventListener('click', () => {
    const isDark = html.getAttribute('data-theme') === 'dark';
    if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        setThemeColor(false);
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        setThemeColor(true);
    }
});

// --- Custom Cursor ---
const cursor = document.getElementById('cursor');
const cursorFollower = document.getElementById('cursorFollower');
let mouseX = 0, mouseY = 0;
let followerX = 0, followerY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
});

// Smooth follower
function updateFollower() {
    followerX += (mouseX - followerX) * 0.12;
    followerY += (mouseY - followerY) * 0.12;
    cursorFollower.style.left = followerX + 'px';
    cursorFollower.style.top = followerY + 'px';
    requestAnimationFrame(updateFollower);
}
updateFollower();

// Hover effect on interactive elements
document.querySelectorAll('[data-hover]').forEach(el => {
    el.addEventListener('mouseenter', () => {
        cursor.classList.add('hovering');
        cursorFollower.classList.add('hovering');
    });
    el.addEventListener('mouseleave', () => {
        cursor.classList.remove('hovering');
        cursorFollower.classList.remove('hovering');
    });
});

// --- Navigation ---
const nav = document.querySelector('.nav');
let lastScrollY = 0;

window.addEventListener('scroll', () => {
    const scroll = window.scrollY;
    if (scroll > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }

    if (scroll > lastScrollY && scroll > 200) {
        nav.classList.add('nav-hidden');
    } else {
        nav.classList.remove('nav-hidden');
    }
    lastScrollY = scroll;
});

// --- Split Text Animation ---
document.querySelectorAll('.split-text').forEach(el => {
    const delay = parseInt(el.dataset.delay) || 0;
    const nodes = [];
    el.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            [...node.textContent].forEach(ch => nodes.push({ char: ch, classes: [] }));
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const cls = [...node.classList];
            [...node.textContent].forEach(ch => nodes.push({ char: ch, classes: cls }));
        }
    });
    el.innerHTML = '';
    nodes.forEach((n, i) => {
        const span = document.createElement('span');
        span.classList.add('char', ...n.classes);
        span.textContent = n.char === ' ' ? '\u00A0' : n.char;
        span.style.transitionDelay = `${delay + i * 25}ms`;
        el.appendChild(span);
    });
});

// --- Scroll Reveal (IntersectionObserver) ---
const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            } else {
                entry.target.classList.remove('visible');
            }
        });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
);

document.querySelectorAll('.split-text, .reveal-up, .work-card').forEach(el => {
    revealObserver.observe(el);
});

// --- Work Grid Filter ---
const filterButtons = document.querySelectorAll('.filter-btn');
const workCards = document.querySelectorAll('.work-card');

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        workCards.forEach(card => {
            if (filter === 'all' || card.dataset.category === filter) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    });
});

// --- Smooth Scroll for Nav Links ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// --- Magnetic Button Effect ---
document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    });

    el.addEventListener('mouseleave', () => {
        el.style.transform = '';
    });
});

// --- Parallax Floating Shapes ---
const shapes = document.querySelectorAll('.shape');
let shapeMouseX = 0, shapeMouseY = 0;

document.addEventListener('mousemove', (e) => {
    shapeMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    shapeMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

function updateShapes() {
    shapes.forEach((shape, i) => {
        const speed = (i + 1) * 6;
        shape.style.transform = `translate(${shapeMouseX * speed}px, ${shapeMouseY * speed}px)`;
    });
    requestAnimationFrame(updateShapes);
}
updateShapes();

// --- Showcase Grid Parallax (GSAP ScrollTrigger — ported from landonorris.com) ---
(function initShowcaseParallax() {
    const grid = document.querySelector('[data-showcase-grid]');
    if (!grid || window.innerWidth < 992) return;

    const items = grid.querySelectorAll('.showcase-card');
    if (!items.length) return;

    const columns = [[], [], [], []];

    // Distribute items round-robin into 4 columns
    items.forEach((item, index) => {
        columns[index % 4].push(item);
    });

    // Col 0 & 2 (odd columns): same offset & speed
    // Col 1 & 3 (even columns): different offset & speed
    const offsets = [0, 10, 0, 10];  // initial Y offset in rem
    const speeds  = [2, 8, 2, 8];   // how far they travel (parallax amount)

    columns.forEach((colItems, colIndex) => {
        if (offsets[colIndex] > 0) {
            gsap.set(colItems, { y: `${offsets[colIndex]}rem` });
        }
    });

    // Scrub-animate each column at its own speed
    columns.forEach((colItems, colIndex) => {
        if (speeds[colIndex] > 0) {
            gsap.to(colItems, {
                y: `-${speeds[colIndex]}rem`,
                ease: 'none',
                scrollTrigger: {
                    trigger: grid,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true,
                },
            });
        }
    });
})();

// --- Fan Card Gallery (GSAP — ported from landonorris.com source) ---
(function fanCardGallery() {
    const wrap = document.querySelector('.fan-container');
    if (!wrap) return;

    const cards = Array.from(wrap.querySelectorAll('.fan-card'));
    if (!cards.length) return;

    const center = Math.floor(cards.length / 2);

    // Exact GSAP transform values from landonorris.com JS bundle
    const desktopLayout = [
        { scale: 0.7756, rotation: -21, x: -30, y: 7.3, zIndex: 1 },
        { scale: 0.8498, rotation: -14, x: -22, y: 4,   zIndex: 2 },
        { scale: 0.9346, rotation: -7,  x: -11, y: 1.3, zIndex: 3 },
        { scale: 1,      rotation: 0,   x: 0,   y: 0,   zIndex: 10 },
        { scale: 0.9346, rotation: 7,   x: 11,  y: 1.3, zIndex: 3 },
        { scale: 0.8498, rotation: 14,  x: 22,  y: 4,   zIndex: 2 },
        { scale: 0.7756, rotation: 21,  x: 30,  y: 7.3, zIndex: 1 },
    ];

    const tabletLayout = [
        { scale: 0.7756, rotation: -21, x: -15, y: 7.3, zIndex: 1 },
        { scale: 0.8498, rotation: -14, x: -11, y: 4,   zIndex: 2 },
        { scale: 0.9346, rotation: -7,  x: -6,  y: 1.3, zIndex: 3 },
        { scale: 1,      rotation: 0,   x: 0,   y: 0,   zIndex: 10 },
        { scale: 0.9346, rotation: 7,   x: 6,   y: 1.3, zIndex: 3 },
        { scale: 0.8498, rotation: 14,  x: 11,  y: 4,   zIndex: 2 },
        { scale: 0.7756, rotation: 21,  x: 15,  y: 7.3, zIndex: 1 },
    ];

    const mobileLayout = [
        { scale: 0.85, rotation: -10, x: -8,  y: 1.8, zIndex: 1 },
        { scale: 0.9,  rotation: -6,  x: -5.5, y: 1,  zIndex: 2 },
        { scale: 0.95, rotation: -3,  x: -3,  y: 0.3, zIndex: 3 },
        { scale: 1,    rotation: 0,   x: 0,   y: 0,   zIndex: 10 },
        { scale: 0.95, rotation: 3,   x: 3,   y: 0.3, zIndex: 3 },
        { scale: 0.9,  rotation: 6,   x: 5.5, y: 1,   zIndex: 2 },
        { scale: 0.85, rotation: 10,  x: 8,   y: 1.8, zIndex: 1 },
    ];

    function getLayout() {
        if (window.innerWidth <= 480) return mobileLayout;
        if (window.innerWidth <= 991) return tabletLayout;
        return desktopLayout;
    }

    let layout = getLayout();
    let restLayout = [...layout];

    // Initial state: stacked in center, below view
    gsap.set(cards, {
        x: 0,
        y: '10rem',
        scale: 1,
        rotation: 0,
        transformOrigin: 'center center',
        opacity: 1,
    });

    cards.forEach((card, i) => {
        card.style.zIndex = layout[i].zIndex;
    });

    // --- Hover interaction ---
    function setupHover() {
        let hoveredIndex = null;
        let leaveTimeout = null;

        const onResize = () => {
            layout = getLayout();
            restLayout = [...layout];
            if (hoveredIndex === null) resetToRest();
        };
        window.addEventListener('resize', onResize);

        function animateHover(hoverIdx) {
            layout = getLayout();
            const tl = gsap.timeline();
            const sorted = cards.map((card, i) => ({
                card, index: i, distance: Math.abs(i - hoverIdx),
            }));
            sorted.sort((a, b) => {
                if (a.index === hoverIdx) return -1;
                if (b.index === hoverIdx) return 1;
                return a.distance - b.distance;
            });

            const lastIdx = cards.length - 1;

            sorted.forEach(({ card, index, distance }) => {
                const isLeft = index < hoverIdx;
                const isRight = index > hoverIdx;
                const isHovered = index === hoverIdx;
                const isLast = index === lastIdx;
                const normalized = (index - center) / center;
                const proximity = 1 - Math.abs(normalized);
                const pushStrength = window.innerWidth <= 480 ? 2 : 3;
                const pushMultiplier = 1 + 0.2 * Math.max(0, 3 - distance);
                let props = {};

                if (isHovered) {
                    props = {
                        y: restLayout[index].y - 2.5 + 'rem',
                        x: restLayout[index].x + 'rem',
                        scale: restLayout[index].scale * 1.08,
                        rotation: restLayout[index].rotation,
                        duration: 0.5,
                        ease: 'elastic.out(1, 0.75)',
                        overwrite: 'auto',
                    };
                } else if (isLeft) {
                    const push = pushStrength * proximity * pushMultiplier;
                    const rotAdj = -3 * (1 / (distance + 1));
                    props = {
                        x: restLayout[index].x - push + 'rem',
                        y: restLayout[index].y + 'rem',
                        scale: restLayout[index].scale,
                        rotation: restLayout[index].rotation + rotAdj,
                        duration: 0.5,
                        ease: 'elastic.out(1, 0.75)',
                        overwrite: 'auto',
                    };
                } else if (isRight) {
                    const push = isLast ? 0 : pushStrength * proximity * pushMultiplier;
                    const rotAdj = 3 * (1 / (distance + 1));
                    props = {
                        x: restLayout[index].x + push + 'rem',
                        y: restLayout[index].y + (isLast ? -1 : 0) + 'rem',
                        scale: restLayout[index].scale,
                        rotation: restLayout[index].rotation + rotAdj,
                        duration: 0.5,
                        ease: 'elastic.out(1, 0.75)',
                        overwrite: 'auto',
                    };
                }

                tl.to(card, props, distance * 0.02);
            });

            return tl;
        }

        function resetToRest() {
            layout = getLayout();
            const tl = gsap.timeline();
            const sorted = cards.map((card, i) => ({
                card, index: i, distance: Math.abs(i - center),
            }));
            sorted.sort((a, b) => a.distance - b.distance);

            sorted.forEach(({ card, index, distance }) => {
                tl.to(card, {
                    x: restLayout[index].x + 'rem',
                    y: restLayout[index].y + 'rem',
                    scale: restLayout[index].scale,
                    rotation: restLayout[index].rotation,
                    duration: 0.5,
                    ease: 'elastic.out(1, 0.75)',
                    overwrite: 'auto',
                }, distance * 0.02);
            });

            return tl;
        }

        cards.forEach((card, idx) => {
            card.addEventListener('mouseenter', () => {
                if (leaveTimeout) { clearTimeout(leaveTimeout); leaveTimeout = null; }
                hoveredIndex = idx;
                animateHover(idx);
            });
            card.addEventListener('mouseleave', () => {
                if (hoveredIndex === idx) {
                    leaveTimeout = setTimeout(() => {
                        if (hoveredIndex === idx) {
                            hoveredIndex = null;
                            resetToRest();
                        }
                        leaveTimeout = null;
                    }, 50);
                }
            });
        });

        wrap.addEventListener('mouseleave', () => {
            if (leaveTimeout) { clearTimeout(leaveTimeout); leaveTimeout = null; }
            hoveredIndex = null;
            resetToRest();
        });
    }

    // --- Scroll-triggered entrance animation ---
    gsap.timeline({
        scrollTrigger: {
            trigger: wrap,
            start: 'top 90%',
            once: true,
        },
        onComplete: setupHover,
    })
    .to(cards, {
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
        stagger: { amount: 0.5, from: 'end' },
    })
    .to(cards, {
        x: (i) => layout[i].x + 'rem',
        y: (i) => layout[i].y + 'rem',
        scale: (i) => layout[i].scale,
        rotation: (i) => layout[i].rotation,
        duration: 1.2,
        ease: 'elastic.out(1, 0.75)',
        stagger: { amount: 0.2, from: 'center' },
    }, '-=0.4');
})();

// --- Panther Window: Resize + Drag ---
(function pantherWindowInteractions() {
    const win = document.getElementById('pantherWindow');
    if (!win) return;

    const handle = win.querySelector('.panther-resize-handle');
    const titlebar = win.querySelector('.panther-titlebar');
    const content = win.querySelector('.panther-content');

    // --- Resize from bottom-right handle ---
    let isResizing = false;
    let startX, startY, startW, startH;

    function onResizeStart(e) {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;
        startW = win.offsetWidth;
        startH = win.offsetHeight;
        win.style.maxWidth = 'none';
        win.style.transition = 'none';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onResizeMove);
        document.addEventListener('mouseup', onResizeEnd);
        document.addEventListener('touchmove', onResizeMove, { passive: false });
        document.addEventListener('touchend', onResizeEnd);
    }

    function onResizeMove(e) {
        if (!isResizing) return;
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        const newW = Math.max(320, startW + dx);
        const newH = Math.max(200, startH + dy);
        win.style.width = newW + 'px';
        content.style.minHeight = Math.max(100, newH - 75) + 'px';
    }

    function onResizeEnd() {
        isResizing = false;
        document.body.style.userSelect = '';
        win.style.transition = '';
        document.removeEventListener('mousemove', onResizeMove);
        document.removeEventListener('mouseup', onResizeEnd);
        document.removeEventListener('touchmove', onResizeMove);
        document.removeEventListener('touchend', onResizeEnd);
    }

    handle.addEventListener('mousedown', onResizeStart);
    handle.addEventListener('touchstart', onResizeStart, { passive: false });

    // --- Title bar and traffic lights: visual only, no drag/close/minimize ---

    // --- Alignment buttons: toggle active ---
    const alignBtns = win.querySelectorAll('[data-align]');
    alignBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            alignBtns.forEach(b => b.classList.remove('panther-icon-active'));
            btn.classList.add('panther-icon-active');
            content.style.textAlign = btn.dataset.align;
        });
    });

    // --- Dropdown menus ---
    function setupDropdown(btnId, menuId, wrapId, onSelect) {
        const btn = document.getElementById(btnId);
        const menu = document.getElementById(menuId);
        const wrap = document.getElementById(wrapId);
        if (!btn || !menu) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menu.classList.contains('panther-menu-open');
            closeAllMenus();
            if (!isOpen) {
                menu.classList.add('panther-menu-open');
                btn.classList.add('panther-dropdown-open');
            }
        });

        menu.querySelectorAll('.panther-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.querySelectorAll('.panther-menu-item').forEach(i => i.classList.remove('panther-menu-active'));
                item.classList.add('panther-menu-active');
                onSelect(item);
                closeAllMenus();
            });
        });
    }

    function closeAllMenus() {
        win.querySelectorAll('.panther-menu').forEach(m => m.classList.remove('panther-menu-open'));
        win.querySelectorAll('.panther-toolbar-btn').forEach(b => b.classList.remove('panther-dropdown-open'));
    }

    document.addEventListener('click', closeAllMenus);

    // --- Styles dropdown: change content font ---
    const styleMap = {
        'times':      { fontFamily: "'Times New Roman', Times, serif", fontSize: '16px', fontStyle: 'normal', letterSpacing: 'normal' },
        'default':    { fontFamily: "'Lucida Grande', 'Lucida Sans Unicode', Helvetica, sans-serif", fontSize: '15px', fontStyle: 'normal', letterSpacing: 'normal' },
        'typewriter': { fontFamily: "'Courier New', Courier, monospace", fontSize: '15px', fontStyle: 'normal', letterSpacing: '0.02em' },
        'elegant':    { fontFamily: "'Merriweather', Georgia, serif", fontSize: '15px', fontStyle: 'italic', letterSpacing: '0.01em' },
        'comic':      { fontFamily: "'Comic Sans MS', 'Chalkboard SE', cursive", fontSize: '15px', fontStyle: 'normal', letterSpacing: 'normal' },
    };

    const stylesBtn = document.getElementById('pantherStylesBtn');
    setupDropdown('pantherStylesBtn', 'pantherStylesMenu', 'pantherStylesWrap', (item) => {
        const style = item.dataset.style;
        const s = styleMap[style];
        if (!s) return;
        content.style.fontFamily = s.fontFamily;
        content.style.fontSize = s.fontSize;
        content.style.fontStyle = s.fontStyle;
        content.style.letterSpacing = s.letterSpacing;
        const label = item.querySelector('.panther-menu-label');
        if (stylesBtn && label) stylesBtn.querySelector('span').textContent = label.textContent;
    });

    // --- Spacing dropdown: change line-height ---
    setupDropdown('pantherSpacingBtn', 'pantherSpacingMenu', 'pantherSpacingWrap', (item) => {
        const spacing = item.dataset.spacing;
        if (spacing) content.style.lineHeight = spacing;
    });

    // --- Citation Format dropdown: switch citation style ---
    const citations = {
        chicago: 'Han, Yunbing. 2025. \u201CEEG-Driven Dynamic Immersion Design for XR Gaming Experiences.\u201D In <i>Proceedings of the 2nd International Conference on Engineering Management, Information Technology and Intelligence - Volume 1: EMITI</i>, 517\u2013521. SciTePress. https://doi.org/10.5220/0014362100004718.',
        apa: 'Han, Y. (2025). EEG-driven dynamic immersion design for XR gaming experiences. In <i>Proceedings of the 2nd International Conference on Engineering Management, Information Technology and Intelligence - Volume 1: EMITI</i> (pp. 517\u2013521). SciTePress. https://doi.org/10.5220/0014362100004718',
        mla: 'Han, Yunbing. \u201CEEG-Driven Dynamic Immersion Design for XR Gaming Experiences.\u201D <i>Proceedings of the 2nd International Conference on Engineering Management, Information Technology and Intelligence - Volume 1: EMITI</i>, SciTePress, 2025, pp. 517\u2013521. https://doi.org/10.5220/0014362100004718.',
        ieee: 'Y. Han, \u201CEEG-Driven Dynamic Immersion Design for XR Gaming Experiences,\u201D in <i>Proc. 2nd Int. Conf. Eng. Manag., Inf. Technol. Intell. (EMITI)</i>, 2025, pp. 517\u2013521, doi: 10.5220/0014362100004718.',
        harvard: 'Han, Y. (2025) \u2018EEG-Driven Dynamic Immersion Design for XR Gaming Experiences\u2019, in <i>Proceedings of the 2nd International Conference on Engineering Management, Information Technology and Intelligence - Volume 1: EMITI</i>. SciTePress, pp. 517\u2013521. doi: 10.5220/0014362100004718.',
    };

    setupDropdown('pantherCiteBtn', 'pantherCiteMenu', 'pantherCiteWrap', (item) => {
        const format = item.dataset.cite;
        if (citations[format]) content.innerHTML = citations[format];
    });
})();

// --- Folder → Window Reveal Animation ---
(function folderWindowAnimation() {
    const section = document.getElementById('pantherSection');
    const folder = document.getElementById('macFolder');
    const win = document.getElementById('pantherWindow');
    const closeBtn = win && win.querySelector('.panther-btn-close');
    if (!section || !folder || !win || !closeBtn) return;

    // Start: window hidden, folder not yet visible
    win.classList.add('window-hidden');
    win.style.display = 'none';
    let isOpen = false;
    let animating = false;

    // Helper: get center of an element relative to the viewport
    function getCenter(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    // Scroll-driven: folder scales up as user scrolls
    // Never destroyed — just paused via flag while folder is open
    let scrollLocked = false;

    ScrollTrigger.create({
        trigger: section,
        start: 'top 90%',
        end: 'top 20%',
        onUpdate: (self) => {
            if (scrollLocked) return;
            var s = 0.3 + 0.7 * self.progress;
            var o = self.progress;
            folder.style.transform = 'scale(' + s + ')';
            folder.style.opacity = o;
        },
    });

    // Shared close logic
    function closeWindow() {
        if (!isOpen || animating) return;
        animating = true;

        const folderC = getCenter(folder);
        const winC = getCenter(win);
        const dx = folderC.x - winC.x;
        const dy = folderC.y - winC.y;

        gsap.to(win, {
            scale: 0.08,
            x: dx,
            y: dy,
            opacity: 0,
            duration: 0.55,
            ease: 'power3.in',
            onComplete: () => {
                gsap.set(win, { clearProps: 'transform,opacity' });
                win.classList.add('window-hidden');
                win.style.display = 'none';

                folder.classList.remove('folder-opened');
                gsap.to(folder, {
                    marginBottom: 10,
                    duration: 0.4,
                    ease: 'power2.inOut',
                    onComplete: () => {
                        isOpen = false;
                        animating = false;
                        // Unlock scroll-driven scaling — folder stays at scale(1) until user scrolls
                        scrollLocked = false;
                        ScrollTrigger.refresh();
                    },
                });
            },
        });
    }

    // Click folder: toggle open/close
    folder.addEventListener('click', () => {
        if (animating) return;

        if (isOpen) {
            closeWindow();
            return;
        }

        animating = true;

        // Lock scroll scaling and keep folder fully visible
        scrollLocked = true;
        folder.style.transform = 'scale(1)';
        folder.style.opacity = '1';

        folder.classList.add('folder-opened');

        gsap.to(folder, {
            marginBottom: 80,
            duration: 0.4,
            ease: 'power2.out',
            onComplete: () => {
                win.style.display = '';
                win.classList.remove('window-hidden');

                const folderC = getCenter(folder);
                const winC = getCenter(win);
                const dx = folderC.x - winC.x;
                const dy = folderC.y - winC.y;

                gsap.set(win, { scale: 0.08, x: dx, y: dy, opacity: 0 });

                gsap.to(win, {
                    scale: 1,
                    x: 0,
                    y: 0,
                    opacity: 1,
                    duration: 0.7,
                    ease: 'back.out(1.2)',
                    onComplete: () => {
                        gsap.set(win, { clearProps: 'transform,opacity' });
                        isOpen = true;
                        animating = false;
                        ScrollTrigger.refresh();
                    },
                });
            },
        });
    });

    // Close button
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeWindow();
    });
})();
