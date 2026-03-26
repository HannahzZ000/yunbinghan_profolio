// ============================================
// Yunbing Han — Portfolio
// Premium interactions inspired by landonorris.com
// ============================================

// --- Lenis Smooth Scroll ---
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

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

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    html.setAttribute('data-theme', 'dark');
} else if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    html.setAttribute('data-theme', 'dark');
}

themeToggle.addEventListener('click', () => {
    const isDark = html.getAttribute('data-theme') === 'dark';
    if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
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

lenis.on('scroll', ({ scroll }) => {
    // Add shadow on scroll
    if (scroll > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }

    // Hide nav on scroll down, show on scroll up
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

document.querySelectorAll('.split-text, .reveal-up, .work-card, .fan-container').forEach(el => {
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
            lenis.scrollTo(target, { offset: -80 });
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
        const currentTransform = shape.style.transform || '';
        shape.style.transform = `translate(${shapeMouseX * speed}px, ${shapeMouseY * speed}px)`;
    });
    requestAnimationFrame(updateShapes);
}
updateShapes();
