// ============================================
// Hero 3D Letters — Three.js + Cursor Trail
// Organic noise background with GPU cursor trail
// that reveals an alternate color palette.
// Inspired by landonorris.com fluid cursor.
// ============================================

(function hero3D() {
    const canvas = document.getElementById('heroGL');
    const modelCanvas = document.getElementById('heroModelGL');
    if (!canvas || !modelCanvas) return;

    // Defer ALL heavy Three.js init so the splash screen CSS animation
    // gets at least one clean composite frame before we block the main thread
    // with WebGL context creation, FBO allocation, and shader compilation.
    requestAnimationFrame(function() { setTimeout(hero3DInit, 0); });
    function hero3DInit() {

    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    // ── Renderer ──
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch(e) {
        console.error('[hero3d] renderer failed:', e);
        return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.autoClear = false;

    // ── WebGL context loss/restoration handling ──
    // When the browser reclaims GPU resources (e.g. another tab is refreshed),
    // the WebGL context is lost. preventDefault() signals the browser to restore it.
    let contextLost = false;

    canvas.addEventListener('webglcontextlost', function(event) {
        event.preventDefault();
        contextLost = true;
        console.warn('[hero3d] WebGL context lost');
    }, false);

    canvas.addEventListener('webglcontextrestored', function() {
        contextLost = false;
        console.log('[hero3d] WebGL context restored');

        // Force re-upload of background textures
        paperTex.needsUpdate = true;
        foilTex.needsUpdate = true;

        // Force re-upload of all model textures
        modelGroup.traverse(function(child) {
            if (child.isMesh && child.material) {
                if (child.material.uniforms) {
                    Object.keys(child.material.uniforms).forEach(function(key) {
                        var u = child.material.uniforms[key];
                        if (u.value && u.value.isTexture) {
                            u.value.needsUpdate = true;
                        }
                    });
                }
                if (child.material.map) child.material.map.needsUpdate = true;
            }
        });
    }, false);

    // Hide the overlay canvas — we now render everything to the main canvas
    modelCanvas.style.display = 'none';

    // ── 3D Scene (letters) ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 20);

    // Lighting
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.5));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(5, 8, 10);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x55d8ff, 0.4);
    fillLight.position.set(-8, 2, 6);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xff6b9d, 0.3);
    rimLight.position.set(0, -5, -8);
    scene.add(rimLight);

    // ── Mouse ──
    const mouse = { x: 0, y: 0, px: 0, py: 0, eased: { x: 0, y: 0 } };
    // Clip-space coords for fluid sim (-1..1, y-up)
    const fluidMouse = { x: 0, y: 0, prevX: 0, prevY: 0 };

    // ── Auto-trajectory state (idle cursor showcase) ──
    // Only drives the fluid trail — does NOT move the visible cursor or 3D model.
    const autoTraj = {
        lastRealMove: Date.now(),
        active: false,
        startTime: 0,
        idleMs: 3000,
        forceX: 0,
        forceY: 0,
    };

    function handlePointerMove(clientX, clientY) {
        autoTraj.lastRealMove = Date.now();
        if (autoTraj.active) {
            autoTraj.active = false;
        }
        mouse.px = mouse.x; mouse.py = mouse.y;
        mouse.x = (clientX / window.innerWidth - 0.5) * 2;
        mouse.y = (clientY / window.innerHeight - 0.5) * 2;
        fluidMouse.x = (clientX / window.innerWidth) * 2 - 1;
        fluidMouse.y = -(clientY / window.innerHeight) * 2 + 1;
    }

    document.addEventListener('mousemove', (e) => {
        handlePointerMove(e.clientX, e.clientY);
    });

    document.addEventListener('touchmove', (e) => {
        var t = e.touches[0];
        if (t) handlePointerMove(t.clientX, t.clientY);
    }, { passive: true });

    document.addEventListener('touchstart', (e) => {
        var t = e.touches[0];
        if (t) handlePointerMove(t.clientX, t.clientY);
    }, { passive: true });

    // ── Scroll ──
    let scrollProgress = 0;

    // ════════════════════════════════════════════
    //  GPU FLUID CURSOR (Stable Fluids simulation)
    // ════════════════════════════════════════════
    const FLUID = {
        resolution: 0.1,   // sim runs at 10% screen res
        dissipation: 0.96, // velocity decay per frame
        mouseForce: 50,    // force multiplier
        cursorSize: 18,    // cursor influence radius (in cells)
        dt: 0.014,         // simulation timestep
        poissonIter: 4,    // pressure solver iterations
    };

    let fluidW = Math.round(FLUID.resolution * window.innerWidth);
    let fluidH = Math.round(FLUID.resolution * window.innerHeight);
    const cellScale = new THREE.Vector2();
    function calcCellScale() {
        const base = fluidW / (1100 * FLUID.resolution);
        cellScale.set((1 / fluidW) * base, (1 / fluidH) * base);
    }
    calcCellScale();

    // Fluid FBOs (velocity, divergence, pressure)
    const isIOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
    const fboType = isIOS ? THREE.HalfFloatType : THREE.FloatType;
    const fboOpt = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: fboType };
    const vel0 = new THREE.WebGLRenderTarget(fluidW, fluidH, fboOpt);
    const vel1 = new THREE.WebGLRenderTarget(fluidW, fluidH, fboOpt);
    const divFbo = new THREE.WebGLRenderTarget(fluidW, fluidH, fboOpt);
    const pres0 = new THREE.WebGLRenderTarget(fluidW, fluidH, fboOpt);
    const pres1 = new THREE.WebGLRenderTarget(fluidW, fluidH, fboOpt);
    // Trail output (velocity magnitude → grayscale mask)
    const TRAIL_SIZE = 512;
    const trailOutput = new THREE.WebGLRenderTarget(TRAIL_SIZE, TRAIL_SIZE, {
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat,
    });

    // Shared fullscreen vertex shader
    const fluidVS = `
        varying vec2 vUv;
        void main() {
            vUv = vec2(0.5) + position.xy * 0.5;
            gl_Position = vec4(position, 1.0);
        }
    `;

    // Advection (BFECC — back-and-forth error correction)
    const advectionMat = new THREE.ShaderMaterial({
        vertexShader: fluidVS,
        fragmentShader: `
            precision highp float;
            uniform sampler2D velocity;
            uniform float dt;
            uniform float dissipation;
            uniform vec2 fboSize;
            varying vec2 vUv;
            void main() {
                vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
                vec2 spot_new = vUv;
                vec2 vel_old = texture2D(velocity, vUv).xy;
                // Forward trace
                vec2 spot_old = spot_new - vel_old * dt * ratio;
                vec2 vel_new1 = texture2D(velocity, spot_old).xy;
                // Back trace for error estimate
                vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
                vec2 error = spot_new2 - spot_new;
                // Corrected trace
                vec2 spot_new3 = spot_new - error / 2.0;
                vec2 vel_2 = texture2D(velocity, spot_new3).xy;
                vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
                vec2 newVel = dissipation * texture2D(velocity, spot_old2).xy;
                gl_FragColor = vec4(newVel, 0.0, 0.0);
            }
        `,
        uniforms: {
            velocity: { value: null },
            dt: { value: FLUID.dt },
            dissipation: { value: FLUID.dissipation },
            fboSize: { value: new THREE.Vector2(fluidW, fluidH) },
        },
        depthWrite: false, depthTest: false,
    });

    // External force — small quad at cursor, additive blending
    const forceMat = new THREE.ShaderMaterial({
        vertexShader: `
            uniform vec2 center;
            uniform vec2 scale;
            uniform vec2 px;
            varying vec2 vUv;
            void main() {
                vec2 pos = position.xy * scale * 2.0 * px + center;
                vUv = uv;
                gl_Position = vec4(pos, 0.0, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            uniform vec2 force;
            varying vec2 vUv;
            void main() {
                vec2 circle = (vUv - 0.5) * 2.0;
                float d = 1.0 - min(length(circle), 1.0);
                d *= d;
                gl_FragColor = vec4(force * d, 0.0, 1.0);
            }
        `,
        uniforms: {
            force: { value: new THREE.Vector2() },
            center: { value: new THREE.Vector2() },
            scale: { value: new THREE.Vector2(FLUID.cursorSize, FLUID.cursorSize) },
            px: { value: cellScale },
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false, depthTest: false,
    });

    // Divergence
    const divMat = new THREE.ShaderMaterial({
        vertexShader: fluidVS,
        fragmentShader: `
            precision highp float;
            uniform sampler2D velocity;
            uniform float dt;
            uniform vec2 px;
            varying vec2 vUv;
            void main() {
                float x0 = texture2D(velocity, vUv - vec2(px.x, 0.0)).x;
                float x1 = texture2D(velocity, vUv + vec2(px.x, 0.0)).x;
                float y0 = texture2D(velocity, vUv - vec2(0.0, px.y)).y;
                float y1 = texture2D(velocity, vUv + vec2(0.0, px.y)).y;
                float divergence = (x1 - x0 + y1 - y0) / 2.0;
                gl_FragColor = vec4(divergence / dt);
            }
        `,
        uniforms: {
            velocity: { value: null },
            dt: { value: FLUID.dt },
            px: { value: cellScale },
        },
        depthWrite: false, depthTest: false,
    });

    // Poisson pressure solver
    const poissonMat = new THREE.ShaderMaterial({
        vertexShader: fluidVS,
        fragmentShader: `
            precision highp float;
            uniform sampler2D pressure;
            uniform sampler2D divergence;
            uniform vec2 px;
            varying vec2 vUv;
            void main() {
                float p0 = texture2D(pressure, vUv + vec2(px.x * 2.0, 0.0)).r;
                float p1 = texture2D(pressure, vUv - vec2(px.x * 2.0, 0.0)).r;
                float p2 = texture2D(pressure, vUv + vec2(0.0, px.y * 2.0)).r;
                float p3 = texture2D(pressure, vUv - vec2(0.0, px.y * 2.0)).r;
                float div = texture2D(divergence, vUv).r;
                float newP = (p0 + p1 + p2 + p3) / 5.0 - div;
                gl_FragColor = vec4(newP);
            }
        `,
        uniforms: {
            pressure: { value: null },
            divergence: { value: null },
            px: { value: cellScale },
        },
        depthWrite: false, depthTest: false,
    });

    // Pressure gradient subtraction
    const pressureMat = new THREE.ShaderMaterial({
        vertexShader: fluidVS,
        fragmentShader: `
            precision highp float;
            uniform sampler2D pressure;
            uniform sampler2D velocity;
            uniform vec2 px;
            uniform float dt;
            varying vec2 vUv;
            void main() {
                float p0 = texture2D(pressure, vUv + vec2(px.x, 0.0)).r;
                float p1 = texture2D(pressure, vUv - vec2(px.x, 0.0)).r;
                float p2 = texture2D(pressure, vUv + vec2(0.0, px.y)).r;
                float p3 = texture2D(pressure, vUv - vec2(0.0, px.y)).r;
                vec2 v = texture2D(velocity, vUv).xy;
                vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
                v = v - gradP * dt;
                gl_FragColor = vec4(v, 0.0, 1.0);
            }
        `,
        uniforms: {
            pressure: { value: null },
            velocity: { value: null },
            px: { value: cellScale },
            dt: { value: FLUID.dt },
        },
        depthWrite: false, depthTest: false,
    });

    // Output — velocity magnitude → grayscale trail mask
    const outputMat = new THREE.ShaderMaterial({
        vertexShader: fluidVS,
        fragmentShader: `
            precision highp float;
            uniform sampler2D velocity;
            varying vec2 vUv;
            void main() {
                vec2 vel = texture2D(velocity, vUv).xy;
                float intensity = clamp(length(vel) * 5.0, 0.0, 1.0);
                gl_FragColor = vec4(vec3(intensity), 1.0);
            }
        `,
        uniforms: { velocity: { value: null } },
        depthWrite: false, depthTest: false,
    });

    // Scenes & meshes
    const fluidQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), advectionMat);
    fluidQuad.frustumCulled = false;
    const fluidScene = new THREE.Scene();
    fluidScene.add(fluidQuad);
    const fluidCam = new THREE.Camera();

    const forceMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), forceMat);
    forceMesh.frustumCulled = false;
    const forceScene = new THREE.Scene();
    forceScene.add(forceMesh);

    function updateTrail() {
        // Compute mouse velocity this frame
        const diffX = fluidMouse.x - fluidMouse.prevX;
        const diffY = fluidMouse.y - fluidMouse.prevY;
        fluidMouse.prevX = fluidMouse.x;
        fluidMouse.prevY = fluidMouse.y;

        // 1. Advection: vel0 → vel1
        fluidQuad.material = advectionMat;
        advectionMat.uniforms.velocity.value = vel0.texture;
        renderer.setRenderTarget(vel1);
        renderer.clear();
        renderer.render(fluidScene, fluidCam);

        // 2. External force: add mouse velocity into vel1 (additive, no clear)
        // When auto-trajectory is active, use its steady tangent force instead
        const forceX = autoTraj.active ? autoTraj.forceX : diffX / 2 * FLUID.mouseForce;
        const forceY = autoTraj.active ? autoTraj.forceY : diffY / 2 * FLUID.mouseForce;
        const cursorSz = autoTraj.active ? FLUID.cursorSize * 0.2 : FLUID.cursorSize;
        const csX = cursorSz * cellScale.x;
        const csY = cursorSz * cellScale.y;
        forceMat.uniforms.scale.value.set(cursorSz, cursorSz);
        forceMat.uniforms.force.value.set(forceX, forceY);
        forceMat.uniforms.center.value.set(
            Math.min(Math.max(fluidMouse.x, -1 + csX + cellScale.x * 2), 1 - csX - cellScale.x * 2),
            Math.min(Math.max(fluidMouse.y, -1 + csY + cellScale.y * 2), 1 - csY - cellScale.y * 2)
        );
        renderer.setRenderTarget(vel1);
        renderer.render(forceScene, fluidCam);

        // 3. Divergence: vel1 → div
        fluidQuad.material = divMat;
        divMat.uniforms.velocity.value = vel1.texture;
        renderer.setRenderTarget(divFbo);
        renderer.clear();
        renderer.render(fluidScene, fluidCam);

        // 4. Poisson pressure: iterate between pres0/pres1
        fluidQuad.material = poissonMat;
        poissonMat.uniforms.divergence.value = divFbo.texture;
        let pSrc, pDst;
        for (let i = 0; i < FLUID.poissonIter; i++) {
            pSrc = (i % 2 === 0) ? pres0 : pres1;
            pDst = (i % 2 === 0) ? pres1 : pres0;
            poissonMat.uniforms.pressure.value = pSrc.texture;
            renderer.setRenderTarget(pDst);
            renderer.clear();
            renderer.render(fluidScene, fluidCam);
        }

        // 5. Pressure correction: vel1 - grad(pressure) → vel0
        fluidQuad.material = pressureMat;
        pressureMat.uniforms.velocity.value = vel1.texture;
        pressureMat.uniforms.pressure.value = pDst.texture;
        renderer.setRenderTarget(vel0);
        renderer.clear();
        renderer.render(fluidScene, fluidCam);

        // 6. Output: velocity magnitude → trail mask
        fluidQuad.material = outputMat;
        outputMat.uniforms.velocity.value = vel0.texture;
        renderer.setRenderTarget(trailOutput);
        renderer.clear();
        renderer.render(fluidScene, fluidCam);

        renderer.setRenderTarget(null);
    }

    function getTrailTexture() {
        return trailOutput.texture;
    }

    // ════════════════════════════════════════════
    //  BACKGROUND NOISE PLANE (fullscreen shader)
    // ════════════════════════════════════════════
    const bgFragmentShader = `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uScroll;
        uniform vec2 uMouse;
        uniform float uDark;
        uniform vec2 uResolution;
        uniform sampler2D tTrail;
        uniform sampler2D tPaper;
        uniform sampler2D tFoil;

        // Simplex 3D noise
        vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
        vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v){
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod(i, 289.0);
            vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            float n_ = 1.0/7.0;
            vec3 ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            vec4 x = x_ * ns.x + ns.yyyy;
            vec4 y = y_ * ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
            p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
        }

        void main() {
            vec2 uv = vUv;
            float aspect = uResolution.x / uResolution.y;
            float t = uTime * 0.05;

            // ── Paper Texture (from image) ──
            // Tile the paper texture to fill the screen naturally
            vec2 paperUV = uv * vec2(aspect, 1.0);
            vec3 paperColor = texture2D(tPaper, paperUV).rgb;

            // Dark mode: invert the paper so fibers/grain show as light on dark
            if (uDark > 0.5) {
                paperColor = vec3(1.0) - paperColor;
                paperColor = paperColor * 0.7 + vec3(0.04);
            }

            // ── Foil Texture (from image) ──
            vec2 foilUV = uv * vec2(aspect, 1.0);
            vec3 foilColor = texture2D(tFoil, foilUV).rgb;

            // Add subtle shimmer animation on top of the image
            vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
            float shimmer = snoise(vec3(p * 15.0, t * 2.0)) * 0.5 + 0.5;
            shimmer = pow(shimmer, 5.0);
            foilColor += shimmer * 0.06;

            // ── Sample cursor trail & blend ──
            vec4 trail = texture2D(tTrail, vUv);
            float cursorEffect = smoothstep(0.02, 0.35, trail.r);

            vec3 color = mix(paperColor, foilColor, cursorEffect);

            // Scroll-driven desaturation
            float gray = dot(color, vec3(0.299, 0.587, 0.114));
            color = mix(color, vec3(gray), uScroll * 0.25);

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const texLoader = new THREE.TextureLoader();
    const cacheBust = '?v=9';
    const paperTex = texLoader.load('paper-texture.jpeg' + cacheBust, function() {
        console.log('[hero3d] paper texture loaded OK');
    }, undefined, function(err) {
        console.error('[hero3d] paper texture FAILED:', err);
    });
    paperTex.wrapS = paperTex.wrapT = THREE.MirroredRepeatWrapping;
    const foilTex = texLoader.load('foil-texture.jpeg' + cacheBust, function() {
        console.log('[hero3d] foil texture loaded OK');
    }, undefined, function(err) {
        console.error('[hero3d] foil texture FAILED:', err);
    });
    foilTex.wrapS = foilTex.wrapT = THREE.MirroredRepeatWrapping;

    const bgUniforms = {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uDark: { value: isDark() ? 1.0 : 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        tTrail: { value: null },
        tPaper: { value: paperTex },
        tFoil: { value: foilTex },
    };

    const bgMaterial = new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`,
        fragmentShader: bgFragmentShader,
        uniforms: bgUniforms,
        depthWrite: false, depthTest: false,
    });

    const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMaterial);
    bgMesh.frustumCulled = false;
    const bgScene = new THREE.Scene();
    bgScene.add(bgMesh);
    const bgCamera = new THREE.Camera();

    // ════════════════════════════════════════════
    //  3D MODEL (Macintosh — replaces text letters)
    // ════════════════════════════════════════════
    const modelGroup = new THREE.Group();
    modelGroup.visible = false;
    scene.add(modelGroup);
    let totalReady = false;
    let transitionDone = false;
    let entranceStarted = false;
    let entranceDone = false;
    let entranceProgress = 0;
    let modelOpacity = 1.0;
    let modelMaterials = [];

    const pr = renderer.getPixelRatio();
    const letterUniforms = {
        tTrail: { value: null },
        uResolution: { value: new THREE.Vector2(window.innerWidth * pr, window.innerHeight * pr) },
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
        uDark: { value: isDark() ? 1.0 : 0.0 },
    };

    // ── Blue texture map for cursor-reveal effect ──
    // Maps original diffuse texture filenames (from GLB) to blue-tinted versions
    var blueTextures = {};
    var texLoader2 = new THREE.TextureLoader();

    // Trail-blending vertex shader
    var trailModelVS = [
        'varying vec2 vUv;',
        'varying vec3 vNormal;',
        'varying vec3 vViewPos;',
        'void main() {',
        '    vUv = uv;',
        '    vNormal = normalize(normalMatrix * normal);',
        '    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);',
        '    vViewPos = -mvPos.xyz;',
        '    gl_Position = projectionMatrix * mvPos;',
        '}',
    ].join('\n');

    // Trail-blending fragment shader — blends original diffuse with blue version
    var trailModelFS = [
        'precision highp float;',
        'uniform sampler2D tDiffuse;',
        'uniform sampler2D tBlue;',
        'uniform sampler2D tTrail;',
        'uniform vec2 uResolution;',
        'uniform float uTime;',
        'varying vec2 vUv;',
        'varying vec3 vNormal;',
        'varying vec3 vViewPos;',
        'void main() {',
        '    vec3 N = normalize(vNormal);',
        '    vec3 V = normalize(vViewPos);',
        '    vec3 L = normalize(vec3(5.0, 8.0, 10.0));',
        '    float diff = max(dot(N, L), 0.0);',
        '    float ambient = 0.35;',
        '    float light = ambient + diff * 0.65;',
        '',
        '    vec3 origColor = texture2D(tDiffuse, vUv).rgb * light;',
        '    vec3 blueColor = texture2D(tBlue, vUv).rgb * light;',
        '',
        '    // Specular highlight on dark red material',
        '    vec3 H = normalize(L + V);',
        '    float spec = pow(max(dot(N, H), 0.0), 64.0);',
        '    blueColor += vec3(1.0, 0.7, 0.6) * spec * 0.8;',
        '',
        '    // Fresnel rim glow on dark red material',
        '    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);',
        '    blueColor += vec3(0.8, 0.2, 0.15) * fresnel * 0.3;',
        '',
        '    // Trail mask — screen-space',
        '    vec2 screenUV = gl_FragCoord.xy / uResolution;',
        '    float trailVal = texture2D(tTrail, screenUV).r;',
        '    float mask = smoothstep(0.02, 0.4, trailVal);',
        '',
        '    vec3 color = mix(origColor, blueColor, mask);',
        '    gl_FragColor = vec4(color, 1.0);',
        '}',
    ].join('\n');

    // Load Macintosh GLB model
    function loadModel() {
        if (typeof THREE.GLTFLoader === 'undefined') {
            console.warn('GLTFLoader not available');
            return;
        }

        // Pre-load hover textures (cursor-reveal layer) — replacing old red with new blue
        var blueTex6 = texLoader2.load('BlueKB.jpg' + cacheBust);
        blueTex6.flipY = false; // GLB textures have flipY=false
        var blueTex2 = texLoader2.load('BlueBody_with_AVP.jpg' + cacheBust);
        blueTex2.flipY = false;

        // Custom body texture with NameScreen2 composited into the screen area (white/default)
        var customBodyTex = texLoader2.load('3d66Model-4609395-files-2-custom.jpg' + cacheBust);
        customBodyTex.flipY = false;

        var loader = new THREE.GLTFLoader();
        loader.load('macintosh.glb', function (gltf) {
            var model = gltf.scene;

            // Center and scale the model
            var box = new THREE.Box3().setFromObject(model);
            var center = new THREE.Vector3();
            var size = new THREE.Vector3();
            box.getCenter(center);
            box.getSize(size);
            var maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim === 0) maxDim = 1;
            var s = 11 / maxDim;
            model.position.set(-center.x * s, -center.y * s, -center.z * s);
            model.scale.setScalar(s);
            model.rotation.set(-Math.PI / 2 + 0.1, 0, -0.25);

            // Replace each mesh's material with the trail-blending shader
            model.traverse(function (child) {
                if (child.isMesh && child.material) {
                    var origMat = child.material;
                    var origMap = origMat.map;
                    var verts = child.geometry && child.geometry.attributes.position ? child.geometry.attributes.position.count : 0;
                    // Log UV bounds for non-standard meshes to identify the screen
                    if (verts !== 324 && child.geometry && child.geometry.attributes.uv) {
                        var uvAttr = child.geometry.attributes.uv;
                        var minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
                        for (var j = 0; j < uvAttr.count; j++) {
                            var u = uvAttr.getX(j); var v = uvAttr.getY(j);
                            if (u < minU) minU = u; if (u > maxU) maxU = u;
                            if (v < minV) minV = v; if (v > maxV) maxV = v;
                        }
                        console.log('[hero3d] mesh:', child.name, '| mat:', origMat.name, '| verts:', verts,
                            '| UV: U[' + minU.toFixed(3) + ',' + maxU.toFixed(3) + '] V[' + minV.toFixed(3) + ',' + maxV.toFixed(3) + ']');
                    }

                    if (!origMap) {
                        modelMaterials.push(origMat);
                        return;
                    }

                    // Pick the matching blue texture based on material name
                    // Material #25 = body, others = keyboard/parts
                    var blueTex;
                    var diffuseTex = origMap;
                    if (origMat.name && origMat.name.indexOf('25') !== -1) {
                        blueTex = blueTex2;
                        diffuseTex = customBodyTex;
                    } else {
                        blueTex = blueTex6;
                    }

                    var customMat = new THREE.ShaderMaterial({
                        vertexShader: trailModelVS,
                        fragmentShader: trailModelFS,
                        uniforms: {
                            tDiffuse: { value: diffuseTex },
                            tBlue: { value: blueTex },
                            tTrail: letterUniforms.tTrail,
                            uResolution: letterUniforms.uResolution,
                            uTime: letterUniforms.uTime,
                        },
                    });
                    child.material = customMat;
                    modelMaterials.push(customMat);
                }
            });

            modelGroup.add(model);

            modelGroup.userData = {
                origX: 1, origY: -3.5, origZ: 0,
                phase: Math.random() * Math.PI * 2,
            };

            totalReady = true;
            if (entranceStarted) { entranceStarted = false; entranceProgress = 0; }
            console.log('Macintosh model loaded with trail-reveal shader');
            // Don't dispatch modelReady yet — let the render loop do a few
            // warm-up frames first to compile shaders behind the splash.
        }, undefined, function (err) {
            console.error('Failed to load macintosh.glb:', err);
        });
    }
    try { loadModel(); } catch (e) { console.error('GLTFLoader error:', e); }

    // ── Wait for page transition to finish before showing model ──
    window.addEventListener('pageTransitionDone', function() {
        transitionDone = true;
    });

    // ── Entrance ──
    function startEntrance() {
        if (entranceStarted) return;
        entranceStarted = true;

        // Target = the actual resting position from userData
        var ud = modelGroup.userData;
        var targetX = ud.origX || 0;
        var targetY = ud.origY || 0;
        var targetZ = ud.origZ || 0;

        // Make visible and start off-screen, small, and rotated
        modelGroup.visible = true;
        modelGroup.position.set(targetX, targetY + 12, targetZ - 4);
        modelGroup.rotation.set(0.5, -1.0, 0.3);
        modelGroup.scale.set(0.01, 0.01, 0.01);

        gsap.to(modelGroup.position, { x: targetX, y: targetY, z: targetZ, duration: 1.6, delay: 0.4, ease: 'elastic.out(1, 0.55)' });
        gsap.to(modelGroup.rotation, { x: 0, y: 0, z: 0, duration: 1.4, delay: 0.4, ease: 'elastic.out(1, 0.65)' });
        gsap.to(modelGroup.scale, { x: 1, y: 1, z: 1, duration: 1.1, delay: 0.4, ease: 'back.out(2)',
            onComplete: function() { entranceDone = true; } });

        gsap.to({ v: 0 }, { v: 1, duration: 2.5, delay: 0.4, ease: 'power2.out',
            onUpdate: function () { entranceProgress = this.targets()[0].v; } });
    }

    // ── Scroll ──
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
        trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true,
        onUpdate: (self) => { scrollProgress = self.progress; },
    });

    // ── Theme ──
    new MutationObserver(() => {
        bgUniforms.uDark.value = isDark() ? 1.0 : 0.0;
        letterUniforms.uDark.value = isDark() ? 1.0 : 0.0;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // ── Responsive model scale — shrinks gently on narrow screens ──
    // At 1200px+ → scale 1.0, at 375px → scale ~0.7, linearly clamped
    function getResponsiveScale() {
        var w = window.innerWidth;
        if (w >= 1200) return 1.0;
        if (w <= 375) return 0.7;
        return 0.7 + (w - 375) / (1200 - 375) * 0.3;
    }
    let responsiveScale = getResponsiveScale();

    // ── Resize ──
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        responsiveScale = getResponsiveScale();
        const dpr = renderer.getPixelRatio();
        bgUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        letterUniforms.uResolution.value.set(window.innerWidth * dpr, window.innerHeight * dpr);
        // Resize fluid simulation
        fluidW = Math.round(FLUID.resolution * window.innerWidth);
        fluidH = Math.round(FLUID.resolution * window.innerHeight);
        calcCellScale();
        advectionMat.uniforms.fboSize.value.set(fluidW, fluidH);
        vel0.setSize(fluidW, fluidH);
        vel1.setSize(fluidW, fluidH);
        divFbo.setSize(fluidW, fluidH);
        pres0.setSize(fluidW, fluidH);
        pres1.setSize(fluidW, fluidH);
    });

    // ── Render loop ──
    const clock = new THREE.Clock();
    let warmupFrames = 0;
    let modelReadyDispatched = false;

    function animate() {
        requestAnimationFrame(animate);
        if (contextLost) return;

        // ── Skip ALL GPU work while model is still loading ──
        // The splash CSS animation runs on the compositor; keeping the GPU
        // idle here prevents jank on the pulsing "YH" text.
        if (!totalReady) return;

        const elapsed = clock.getElapsedTime();

        // ── Auto-trajectory: idle fluid trail showcase ──
        // Only drives the fluid sim cursor — visible cursor & model stay put.
        var aNow = Date.now();
        if (!autoTraj.active && scrollProgress < 0.5 && aNow - autoTraj.lastRealMove > autoTraj.idleMs) {
            autoTraj.active = true;
            autoTraj.startTime = elapsed;
        }
        if (autoTraj.active && scrollProgress >= 0.5) {
            autoTraj.active = false;
        }
        if (autoTraj.active) {
            var at = (elapsed - autoTraj.startTime) * 1.8;
            // Ease-in blend over 1.5 seconds
            var blend = Math.min((elapsed - autoTraj.startTime) / 1.5, 1.0);
            blend = blend * blend;
            // Many overlapping sine waves with irrational frequency ratios
            // — produces a chaotic, non-repeating path like a finger swiping
            var trajX = Math.sin(at * 0.71) * 0.45
                      + Math.sin(at * 1.37) * 0.22
                      + Math.sin(at * 2.13) * 0.10
                      + Math.sin(at * 0.29) * 0.15;
            var trajY = Math.sin(at * 0.53) * 0.35
                      + Math.sin(at * 1.17) * 0.18
                      + Math.sin(at * 1.89) * 0.10
                      + Math.sin(at * 0.41) * 0.12;
            // Set fluid sim cursor position along trajectory
            fluidMouse.x = trajX;
            fluidMouse.y = -trajY;
            // Tangent = derivative of each sin term: cos(at*f) * A * f
            var tanX = Math.cos(at * 0.71) * 0.45 * 0.71
                     + Math.cos(at * 1.37) * 0.22 * 1.37
                     + Math.cos(at * 2.13) * 0.10 * 2.13
                     + Math.cos(at * 0.29) * 0.15 * 0.29;
            var tanY = -(Math.cos(at * 0.53) * 0.35 * 0.53
                       + Math.cos(at * 1.17) * 0.18 * 1.17
                       + Math.cos(at * 1.89) * 0.10 * 1.89
                       + Math.cos(at * 0.41) * 0.12 * 0.41);
            var tanLen = Math.sqrt(tanX * tanX + tanY * tanY) || 1;
            var forceScale = 1.2 * blend;
            autoTraj.forceX = (tanX / tanLen) * forceScale;
            autoTraj.forceY = (tanY / tanLen) * forceScale;
        }

        mouse.eased.x += (mouse.x - mouse.eased.x) * 0.04;
        mouse.eased.y += (mouse.y - mouse.eased.y) * 0.04;

        // 1. Update cursor trail FBO
        updateTrail();

        // 2. Update background uniforms
        bgUniforms.uTime.value = elapsed;
        bgUniforms.uScroll.value = scrollProgress;
        bgUniforms.uMouse.value.set(mouse.eased.x, mouse.eased.y);
        bgUniforms.tTrail.value = getTrailTexture();
        letterUniforms.tTrail.value = getTrailTexture();
        letterUniforms.uTime.value = elapsed;

        // ── Shader warm-up: render a few frames behind the splash to
        //    compile all WebGL programs before the reveal ──
        if (!modelReadyDispatched) {
            warmupFrames++;
            if (warmupFrames >= 3) {
                modelReadyDispatched = true;
                window.dispatchEvent(new Event('modelReady'));
            }
        }

        // 3. Kick entrance (wait for both model load AND page transition)
        if (totalReady && transitionDone && !entranceStarted) startEntrance();

        // 4. Animate model (only after GSAP entrance finishes, so they don't fight)
        if (entranceDone && modelGroup.userData.phase !== undefined) {
            {
                const blend = 1;
                const ud = modelGroup.userData;

                // No floating — keep stable
                const floatY = 0;
                const floatX = 0;

                // Mouse parallax (subtle, eased)
                const mx = mouse.eased.x * 0.1;
                const my = mouse.eased.y * -0.06;
                const mouseRotY = mouse.eased.x * 0.06;
                const mouseRotX = mouse.eased.y * -0.04;

                // Scroll effects — applied directly (scrollProgress is already smooth via scrub)
                const scrollZ = -scrollProgress * 6;
                const scrollRotX = scrollProgress * 0.6;

                // Position: scroll-driven values applied directly, mouse eased
                const rate = 0.08 * blend;
                const targetX = ud.origX + mx + floatX;
                const targetY = ud.origY + my + floatY;
                modelGroup.position.x += (targetX - modelGroup.position.x) * rate;
                modelGroup.position.y += (targetY - modelGroup.position.y) * rate;
                modelGroup.position.z = ud.origZ + scrollZ;

                // Rotation: scroll locked to scrollProgress, mouse eased
                modelGroup.rotation.x = scrollRotX + mouseRotX;
                modelGroup.rotation.y = mouseRotY;

                // Responsive scale — smoothly lerp toward viewport-based target
                const rs = responsiveScale;
                modelGroup.scale.x += (rs - modelGroup.scale.x) * rate;
                modelGroup.scale.y += (rs - modelGroup.scale.y) * rate;
                modelGroup.scale.z += (rs - modelGroup.scale.z) * rate;
            }
        }

        // 5. Camera
        camera.position.x += (mouse.eased.x * 0.5 - camera.position.x) * 0.02;
        camera.position.y += (mouse.eased.y * -0.3 + 0.3 - camera.position.y) * 0.02;
        camera.position.z = 20 + scrollProgress * 3;
        camera.lookAt(0, 0, 0);

        // 6. Render: background first, then model on top (single canvas, no drawImage)
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        renderer.render(bgScene, bgCamera);
        renderer.render(scene, camera);
    }

    animate();
    } // end hero3DInit
})();
