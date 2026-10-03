import { useEffect, useRef } from "react";

const R = Math.random;

// Pre-rendered satellite-style cyclone swirl (drawn once, rotated every frame).
function makeSwirl() {
  const S = 720, m = S / 2;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  const blob = (px, py, r, a) => {
    const gr = g.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, `rgba(165,185,215,${a})`);
    gr.addColorStop(1, "rgba(165,185,215,0)");
    g.fillStyle = gr;
    g.fillRect(px - r, py - r, r * 2, r * 2);
  };
  for (let arm = 0; arm < 5; arm++)
    for (let i = 0; i < 110; i++) {
      const t = i / 110, a = arm * 1.2566 + t * 5.2, r = 46 + t * (m - 70);
      blob(m + Math.cos(a) * r, m + Math.sin(a) * r, 10 + t * 34, 0.07 * (1 - t * 0.6));
    }
  for (let i = 0; i < 260; i++) {
    const a = R() * 6.283, r = 60 + R() * (m - 90);
    blob(m + Math.cos(a) * r, m + Math.sin(a) * r, 16 + R() * 26, 0.035);
  }
  g.globalCompositeOperation = "destination-out"; // punch the eye
  blob(m, m, 46, 0.95);
  return c;
}

// Bolt geometry via midpoint displacement
function seg(a, b, d, out) {
  if (d < 6) return out.push([a, b]);
  const m = [(a[0] + b[0]) / 2 + (R() - 0.5) * d, (a[1] + b[1]) / 2 + (R() - 0.5) * d * 0.3];
  seg(a, m, d / 2, out);
  seg(m, b, d / 2, out);
}

function flash(t) {
  if (t < 0 || t > 1.3) return 0;
  return [[0, 1], [0.11, 0.5], [0.26, 0.85], [0.5, 0.3]].reduce(
    (f, [at, a]) => (t >= at ? Math.max(f, a * Math.exp(-(t - at) * 8)) : f), 0);
}

export default function StormScene({ className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current, x = canvas.getContext("2d");
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches; // no flashing, static frame
    const swirl = makeSwirl();
    let W, H, HZ, drops = [], blobs = [], raf = 0, last = 0, next = 1.2, start = -9, strike = null;

    const size = () => {
      const D = Math.min(devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * D; canvas.height = H * D;
      x.setTransform(D, 0, 0, D, 0, 0);
      HZ = H * 0.15;
      drops = Array.from({ length: Math.round((W * H) / 4200) }, () => ({
        x: R() * (W + 200), y: R() * H, l: 12 + R() * 22, v: 900 + R() * 700 }));
      blobs = Array.from({ length: 16 }, () => ({
        x: R() * W, y: -20 + R() * HZ * 1.1, r: 150 + R() * 220, sp: 6 + R() * 14, a: 0.55 + R() * 0.4 }));
      if (calm) draw(0, 0);
    };

    const makeBolt = () => {
      const x0 = W * (0.12 + R() * 0.76);
      const b = [x0 + (R() - 0.5) * 240, HZ + (H - HZ) * (0.05 + R() * 0.3)];
      const main = [], br = [];
      seg([x0, -10], b, 150, main);
      for (let i = 0; i < 3; i++) {
        const s = main[(R() * main.length * 0.8) | 0][1];
        seg(s, [s[0] + (R() - 0.5) * 360, s[1] + 80 + R() * 160], 60, br);
      }
      return { x: x0, main, br, bolt: R() < 0.78 };
    };

    const trace = (list) => {
      x.beginPath();
      list.forEach(([p, q]) => { x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]); });
    };

    function draw(s, dt) {
      if (!calm && s >= next) { strike = makeBolt(); start = s; next = s + 3 + R() * 4.5; }
      const f = calm ? 0 : flash(s - start);

      // sky + clouds
      let g = x.createLinearGradient(0, 0, 0, HZ + 30);
      g.addColorStop(0, "#0c121b"); g.addColorStop(1, "#3a4558");
      x.fillStyle = g; x.fillRect(0, 0, W, HZ + 30);
      for (const b of blobs) {
        const px = ((b.x + s * b.sp) % (W + 2 * b.r)) - b.r;
        const gr = x.createRadialGradient(px, b.y, 0, px, b.y, b.r);
        gr.addColorStop(0, `rgba(18,24,34,${b.a})`); gr.addColorStop(1, "rgba(18,24,34,0)");
        x.fillStyle = gr; x.fillRect(px - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }

      // sea
      g = x.createLinearGradient(0, HZ, 0, H);
      g.addColorStop(0, "#183349"); g.addColorStop(0.35, "#0b2132"); g.addColorStop(1, "#050d16");
      x.fillStyle = g; x.fillRect(0, HZ, W, H - HZ);
      for (let i = 1; i <= 34; i++) {
        const p = i / 34, y0 = HZ + Math.pow(p, 1.7) * (H - HZ), amp = 1 + p * 8, wl = 40 + p * 170;
        x.beginPath();
        for (let X = 0; X <= W + 14; X += 14) {
          const y = y0 + Math.sin(X / wl + s * (0.5 + p) + i * 1.7) * amp + Math.sin(X / (wl * 0.37) - s * 1.3 + i) * amp * 0.4;
          X ? x.lineTo(X, y) : x.moveTo(X, y);
        }
        x.strokeStyle = `rgba(140,185,215,${0.05 + p * 0.12 + f * 0.3 * (1 - p * 0.4)})`;
        x.lineWidth = 0.6 + p * 1.6; x.stroke();
      }

      // cyclone swirl
      const d = Math.min(H * 0.95, W * 0.7), cx = W > 760 ? W * 0.72 : W * 0.5, cy = H * 0.36;
      x.save();
      x.globalCompositeOperation = "lighter";
      x.translate(cx, cy); x.rotate(s * 0.045);
      x.drawImage(swirl, -d / 2, -d / 2, d, d);
      x.restore();

      // lightning flash: cloud glow + sea sheen + bolt
      if (f > 0.01) {
        x.globalCompositeOperation = "lighter";
        const bx = strike ? strike.x : W / 2;
        const gl = x.createRadialGradient(bx, HZ * 0.4, 0, bx, HZ * 0.4, W * 0.5);
        gl.addColorStop(0, `rgba(170,185,255,${f * 0.55})`); gl.addColorStop(1, "rgba(170,185,255,0)");
        x.fillStyle = gl; x.fillRect(0, 0, W, H);
        x.fillStyle = `rgba(110,140,210,${f * 0.16})`; x.fillRect(0, 0, W, H);
        x.globalCompositeOperation = "source-over";
      }
      if (strike?.bolt && f > 0.05) {
        x.save();
        x.globalAlpha = Math.min(1, f * 1.4); x.lineCap = "round";
        x.shadowColor = "#9bb4ff"; x.shadowBlur = 26; x.strokeStyle = "#fff";
        x.lineWidth = 2.4; trace(strike.main); x.stroke();
        x.lineWidth = 1.1; trace(strike.br); x.stroke();
        x.restore();
      }

      // rain
      x.beginPath();
      for (const r of drops) {
        x.moveTo(r.x, r.y); x.lineTo(r.x - r.l * 0.22, r.y + r.l);
        r.y += r.v * dt; r.x -= r.v * dt * 0.22;
        if (r.y > H) { r.y = -r.l; r.x = R() * (W + 200); }
      }
      x.strokeStyle = `rgba(195,210,235,${0.26 + f * 0.3})`; x.lineWidth = 1; x.stroke();
    }

    const loop = (ms) => {
      const s = ms / 1000, dt = Math.min(s - last, 0.05);
      last = s;
      draw(s, dt);
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(size);
    ro.observe(canvas);
    size();
    if (!calm) raf = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
