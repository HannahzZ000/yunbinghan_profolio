// ============================================
// Yunbing Han — Portfolio
// Premium interactions inspired by landonorris.com
// ============================================

gsap.registerPlugin(ScrollTrigger);

// --- Page Load Transition ---
const pageTransition = document.getElementById('pageTransition');
window.addEventListener('load', () => {
    setTimeout(() => {
        pageTransition.classList.add('done');
    }, 600);
});

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
    const text = el.textContent;
    el.innerHTML = '';
    const delay = parseInt(el.dataset.delay) || 0;

    [...text].forEach((char, i) => {
        const span = document.createElement('span');
        span.classList.add('char');
        span.textContent = char === ' ' ? '\u00A0' : char;
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

    const offsetRem = 5;
    const columns = [[], [], [], []];

    // Distribute items round-robin into 4 columns
    items.forEach((item, index) => {
        columns[index % 4].push(item);
    });

    // Set initial Y offset: col0=0, col1=5rem, col2=10rem, col3=15rem
    columns.forEach((colItems, colIndex) => {
        if (colIndex > 0) {
            gsap.set(colItems, { y: `${colIndex * offsetRem}rem` });
        }
    });

    // Scrub-animate each offset column to y:0 as user scrolls
    columns.forEach((colItems, colIndex) => {
        if (colIndex > 0) {
            gsap.to(colItems, {
                y: 0,
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
