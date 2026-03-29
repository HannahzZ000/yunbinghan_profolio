/* ============================================
   Dot Grid Background — flowing cyan wave mesh
   Visible in both light and dark mode
   ============================================ */
(function () {
  var canvas = document.createElement('canvas');
  canvas.id = 'dotGridBG';
  document.body.prepend(canvas);

  var ctx = canvas.getContext('2d');
  var SPACING = 8;
  var RADIUS = 3.6;
  var cols, rows;

  /* --- Perlin noise for smooth flowing patterns --- */
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }

  var perm = new Uint8Array(512);
  (function () {
    var p = new Uint8Array(256);
    for (var i = 0; i < 256; i++) p[i] = i;
    for (var i = 255; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (var i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();

  var GRAD = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  function grad2d(hash, x, y) {
    var g = GRAD[hash & 7];
    return g[0] * x + g[1] * y;
  }

  function noise(x, y) {
    var xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    var xf = x - Math.floor(x), yf = y - Math.floor(y);
    var u = fade(xf), v = fade(yf);
    var aa = perm[perm[xi] + yi], ab = perm[perm[xi] + yi + 1];
    var ba = perm[perm[xi + 1] + yi], bb = perm[perm[xi + 1] + yi + 1];
    return lerp(
      lerp(grad2d(aa, xf, yf), grad2d(ba, xf - 1, yf), u),
      lerp(grad2d(ab, xf, yf - 1), grad2d(bb, xf - 1, yf - 1), u),
      v
    );
  }

  // --- Theme-aware colors ---
  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function getColors() {
    if (isDark()) {
      return { r: 55, g: 216, b: 255, arc: '#111111' };
    } else {
      return { r: 55, g: 196, b: 235, arc: '#FAFAFA' };
    }
  }

  var lastDotH = window.innerHeight;
  function resize() {
    var newH = window.innerHeight;
    var widthChanged = window.innerWidth !== canvas.width;
    var bigHeightChange = Math.abs(newH - lastDotH) > 100;
    if (canvas.width && !widthChanged && !bigHeightChange) return;
    lastDotH = newH;
    canvas.width = window.innerWidth;
    canvas.height = newH;
    cols = Math.ceil(canvas.width / SPACING) + 1;
    rows = Math.ceil(canvas.height / SPACING) + 1;
  }

  function draw(time) {
    if (paused) return;
    var t = time * 0.001;
    var colors = getColors();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Slow time drift for each noise layer
    var t1 = t * 0.08;
    var t2 = t * 0.06;

    for (var row = 0; row < rows; row++) {
      var py = row * SPACING;
      for (var col = 0; col < cols; col++) {
        var px = col * SPACING;

        var nx = px * 0.003;
        var ny = py * 0.003;

        var n1 = noise(nx * 1.0 + t1, ny * 1.0 + t1 * 0.7);
        var n2 = noise(nx * 2.0 - t2 * 0.8, ny * 2.0 + t2);

        var v = n1 * 0.65 + n2 * 0.35;
        var brightness = (v + 1) * 0.5;
        brightness = brightness * brightness * brightness;

        var alpha = brightness * 0.9;

        ctx.fillStyle = 'rgba(' + colors.r + ',' + colors.g + ',' + colors.b + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(px, py, RADIUS, 0, 6.2832);
        ctx.fill();
      }
    }

    // --- Arc mask: tracks the actual last row of showcase cards ---
    var allCards = document.querySelectorAll('.showcase-card');
    var lastRowCard = allCards.length ? allCards[allCards.length - 1] : null;
    if (lastRowCard) {
      var rect = lastRowCard.getBoundingClientRect();
      var arcY = rect.bottom + 30;
      if (arcY < canvas.height + 200) {
        var w = canvas.width;
        var h = canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, arcY);
        ctx.quadraticCurveTo(w / 2, arcY + 120, w, arcY);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = colors.arc;
        ctx.fill();
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  // --- Visibility / pause ---
  var paused = false;
  var rafId = 0;

  function start() {
    if (!paused) return;
    paused = false;
    rafId = requestAnimationFrame(draw);
  }

  function stop() {
    paused = true;
    cancelAnimationFrame(rafId);
  }

  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });

  function applyTheme() {
    canvas.style.opacity = '1';
    start();
  }

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === 'data-theme') {
        applyTheme();
        return;
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true });

  // --- Init ---
  window.addEventListener('resize', resize);
  resize();
  paused = true;
  applyTheme();
})();
