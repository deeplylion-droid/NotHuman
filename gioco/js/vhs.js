// La videocamera del medico: il VHS calcolato in tempo reale con WebGL.
// Sopra la sorgente (un'immagine o un canvas) mette zoom, messa a fuoco, visione notturna verde,
// infrarosso con la mappa di calore e i difetti del nastro. Lo shader viene dall'anteprima in
// art/prove-stile/09-vhs-animato, senza la banda di disturbo e con il VHS al 50%.

const VERT = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  uniform sampler2D u_tex;
  uniform sampler2D u_heat;
  uniform float u_time;
  uniform float u_amt;
  uniform float u_green;
  uniform float u_red;
  uniform float u_burst;
  uniform float u_zoom;
  uniform vec2 u_center;
  uniform float u_blur;
  uniform float u_heatTex;
  uniform float u_heatLevel;
  uniform float u_dark;
  uniform float u_snow;
  varying vec2 v_uv;

  const vec3 LUMA = vec3(0.299, 0.587, 0.114);

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(float x) {
    float i = floor(x); float f = fract(x);
    return mix(hash(vec2(i, 1.3)), hash(vec2(i + 1.0, 1.3)), f * f * (3.0 - 2.0 * f));
  }
  vec3 greenMap(float l) {
    float t = clamp(l, 0.0, 1.0) * 4.0;
    vec3 c = mix(vec3(2.0, 10.0, 8.0), vec3(8.0, 38.0, 30.0), clamp(t, 0.0, 1.0));
    c = mix(c, vec3(22.0, 96.0, 80.0), clamp(t - 1.0, 0.0, 1.0));
    c = mix(c, vec3(80.0, 178.0, 150.0), clamp(t - 2.0, 0.0, 1.0));
    return mix(c, vec3(196.0, 248.0, 224.0), clamp(t - 3.0, 0.0, 1.0)) / 255.0;
  }
  // infrarosso: rosso tendente al rosa; il calore forte arriva quasi al bianco
  vec3 irMap(float l) {
    float t = clamp(l, 0.0, 1.0) * 5.0;
    vec3 c = mix(vec3(6.0, 2.0, 4.0), vec3(34.0, 10.0, 17.0), clamp(t, 0.0, 1.0));
    c = mix(c, vec3(84.0, 30.0, 44.0), clamp(t - 1.0, 0.0, 1.0));
    c = mix(c, vec3(150.0, 80.0, 94.0), clamp(t - 2.0, 0.0, 1.0));
    c = mix(c, vec3(214.0, 162.0, 172.0), clamp(t - 3.0, 0.0, 1.0));
    return mix(c, vec3(255.0, 236.0, 232.0), clamp(t - 4.0, 0.0, 1.0)) / 255.0;
  }
  vec3 src(vec2 q) { return texture2D(u_tex, clamp(q, 0.0, 1.0)).rgb; }
  // messa a fuoco: un disco di campioni attorno al punto
  vec3 focus(vec2 q, float r) {
    if (r < 0.0002) return src(q);
    vec3 c = src(q) * 0.2;
    c += src(q + vec2(r, 0.0)) * 0.1;
    c += src(q - vec2(r, 0.0)) * 0.1;
    c += src(q + vec2(0.0, r * 1.7)) * 0.1;
    c += src(q - vec2(0.0, r * 1.7)) * 0.1;
    c += src(q + vec2(r, r * 1.7) * 0.7) * 0.1;
    c += src(q - vec2(r, r * 1.7) * 0.7) * 0.1;
    c += src(q + vec2(r, -r * 1.7) * 0.7) * 0.1;
    c += src(q - vec2(r, -r * 1.7) * 0.7) * 0.1;
    return c;
  }

  void main() {
    vec2 uv = v_uv;
    float a = u_amt;
    float frame = floor(u_time * 30.0);
    float line = floor((1.0 - uv.y) * 240.0);

    // righe che tremano
    float dx = (hash(vec2(line, frame)) - 0.5) * 0.0022 * a;
    // rumore della testina in fondo allo schermo
    float head = 1.0 - smoothstep(0.0, 0.035, uv.y);
    dx += head * (0.012 + 0.02 * hash(vec2(line, frame + 3.0))) * a;
    // ogni tanto uno strappo
    float slot = floor(u_time * 6.0);
    float tear = step(0.93, hash(vec2(slot, 11.0))) * (1.0 - smoothstep(0.0, 0.012, abs(uv.y - hash(vec2(slot, 17.0)))));
    dx += tear * 0.025 * a;
    // strappo forte quando cambia la modalita' o il nastro
    dx += (hash(vec2(line, frame + 5.0)) - 0.5) * 0.06 * u_burst;

    vec2 p = vec2(uv.x + dx, uv.y);
    // zoom della videocamera: dal punto dello schermo al punto della sorgente
    vec2 q = u_center + (p - 0.5) / u_zoom;

    // luminanza (messa a fuoco compresa), colore sbavato e spostato a destra
    vec3 base = focus(q, u_blur * 0.014);
    float Y = dot(base, LUMA);
    vec3 ch = vec3(0.0);
    for (int i = 0; i < 5; i++) {
      float o = ((float(i) - 2.0) * 0.0022 - 0.0035) * a / u_zoom;
      ch += src(q + vec2(o, 0.0));
    }
    ch /= 5.0;
    vec3 col = vec3(Y) + (ch - vec3(dot(ch, LUMA))) * (1.0 - u_blur * 0.5);

    // notte: viraggio verde
    col = mix(col, greenMap(clamp((Y - 0.5) * 1.15 + 0.5, 0.0, 1.0)), u_green);
    // infrarosso: la stanza fredda resta scura, il calore si accende
    float h = mix(u_heatLevel * smoothstep(0.1, 0.55, Y), texture2D(u_heat, clamp(q, 0.0, 1.0)).r, u_heatTex);
    col = mix(col, irMap(clamp(Y * 0.38 + h * 0.86, 0.0, 1.0)), u_red);
    // la sera la stanza e' piu' buia
    col *= 1.0 - 0.5 * u_dark;

    // neri sollevati, righe di scansione, sfarfallio
    col = mix(col, 0.05 + col * 0.9, a);
    col *= 1.0 - 0.08 * a * mod(line, 2.0);
    col *= 1.0 + (vnoise(u_time * 9.0) - 0.5) * 0.06 * a;

    // disturbi chiari su testina, strappi e nastro rovinato
    float n = hash(floor(uv * vec2(960.0, 540.0)) + frame);
    vec3 snow = vec3(n) * (vec3(1.0) + vec3(-0.4, 0.0, -0.15) * u_green + vec3(0.0, -0.3, -0.24) * u_red);
    col = mix(col, snow, clamp((head * 0.5 + tear * 0.4) * a + u_burst * 0.3 + u_snow * 0.88, 0.0, 1.0));

    // grana
    col += (n - 0.5) * 0.09 * a;

    // vignetta, piu' forte di notte, con l'infrarosso e la sera
    vec2 v = (uv - 0.5) * vec2(1.0, 0.9);
    col *= 1.0 - (0.3 + 0.3 * u_green + 0.4 * u_red + 0.25 * u_dark) * pow(clamp(length(v) * 1.41, 0.0, 1.0), 2.2);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class Vhs {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) throw new Error("webgl");
    this.gl = gl;
    const prog = gl.createProgram();
    for (const [type, code] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, code);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
      gl.attachShader(prog, s);
    }
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link");
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of ["u_tex", "u_heat", "u_time", "u_amt", "u_green", "u_red", "u_burst", "u_zoom", "u_center",
      "u_blur", "u_heatTex", "u_heatLevel", "u_dark", "u_snow"]) this.u[n] = gl.getUniformLocation(prog, n);
    this.texSrc = this.makeTexture(0);
    this.texHeat = this.makeTexture(1);
    gl.uniform1i(this.u.u_tex, 0);
    gl.uniform1i(this.u.u_heat, 1);
    // valori attuali; verde, rosso e buio inseguono i loro obiettivi
    this.p = { amt: 0.5, green: 0, red: 0, burst: 0, zoom: 1, cx: 0.5, cy: 0.5, blur: 0, heatTex: 0, heatLevel: 0,
      dark: 0, snow: 0 };
    this.goal = { green: 0, red: 0, dark: 0 };
    this.tweens = [];
    this.time = 0;
    this.last = null;
    this.paused = false;
  }

  makeTexture(unit) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }

  upload(tex, unit, source) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
  }

  // la sorgente: un'immagine o un canvas (per il canvas, refresh() dopo ogni modifica)
  setSource(source) {
    this.source = source;
    this.upload(this.texSrc, 0, source);
  }

  refresh() {
    if (this.source) this.upload(this.texSrc, 0, this.source);
  }

  // mappa di calore per l'infrarosso; senza mappa il calore segue la luce dell'immagine, a questo livello
  setHeat(image, level = 0) {
    if (image) this.upload(this.texHeat, 1, image);
    this.p.heatTex = image ? 1 : 0;
    this.p.heatLevel = level;
  }

  // "giorno", "notte" (verde) o "ir"; con lo strappo forte del cambio di nastro
  mode(m, burst = true) {
    this.goal.green = m === "notte" ? 1 : 0;
    this.goal.red = m === "ir" ? 1 : 0;
    if (burst) this.burst();
  }

  burst(v = 1) {
    this.p.burst = Math.max(this.p.burst, v);
  }

  setDark(v) {
    this.goal.dark = v;
  }

  // porta i parametri ai valori dati in "ms" millisecondi
  tween(values, ms) {
    return new Promise((resolve) => {
      const from = {};
      for (const k of Object.keys(values)) from[k] = this.p[k];
      this.tweens = this.tweens.filter((t) => !Object.keys(values).some((k) => k in t.to));
      this.tweens.push({ from, to: values, t0: null, ms: Math.max(1, ms), resolve });
    });
  }

  set(values) {
    this.tweens = this.tweens.filter((t) => !Object.keys(values).some((k) => k in t.to));
    Object.assign(this.p, values);
  }

  // la messa a fuoco che cerca il soggetto, come in una videocamera vera
  async hunt() {
    this.set({ blur: 1 });
    await this.tween({ blur: 0 }, 380);
    await this.tween({ blur: 0.4 }, 180);
    await this.tween({ blur: 0 }, 320);
  }

  fit() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = Math.max(2, Math.round(r.width * dpr));
    let h = Math.max(2, Math.round(r.height * dpr));
    if (w > 1600) { h = Math.round(h * 1600 / w); w = 1600; }
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.gl.viewport(0, 0, w, h);
  }

  step(now) {
    const dt = this.last == null ? 0 : Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused) this.time += dt;
    const k = Math.min(1, dt * 3);
    for (const g of ["green", "red", "dark"]) this.p[g] += (this.goal[g] - this.p[g]) * k;
    this.p.burst = Math.max(0, this.p.burst - dt * 3);
    for (const t of this.tweens) {
      if (t.t0 == null) t.t0 = now;
      const f = Math.min(1, (now - t.t0) / t.ms);
      for (const key of Object.keys(t.to)) this.p[key] = t.from[key] + (t.to[key] - t.from[key]) * ease(f);
      if (f >= 1) t.done = true;
    }
    for (const t of this.tweens.filter((x) => x.done)) t.resolve();
    this.tweens = this.tweens.filter((x) => !x.done);
    this.draw();
  }

  draw() {
    const gl = this.gl, u = this.u, p = this.p;
    gl.uniform1f(u.u_time, this.time);
    gl.uniform1f(u.u_amt, p.amt);
    gl.uniform1f(u.u_green, p.green);
    gl.uniform1f(u.u_red, p.red);
    gl.uniform1f(u.u_burst, p.burst);
    gl.uniform1f(u.u_zoom, p.zoom);
    gl.uniform2f(u.u_center, p.cx, 1 - p.cy);
    gl.uniform1f(u.u_blur, p.blur);
    gl.uniform1f(u.u_heatTex, p.heatTex);
    gl.uniform1f(u.u_heatLevel, p.heatLevel);
    gl.uniform1f(u.u_dark, p.dark);
    gl.uniform1f(u.u_snow, p.snow);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  start() {
    const loop = (now) => {
      this.step(now);
      requestAnimationFrame(loop);
    };
    this.fit();
    if (window.ResizeObserver) new ResizeObserver(() => this.fit()).observe(this.canvas);
    requestAnimationFrame(loop);
  }
}
