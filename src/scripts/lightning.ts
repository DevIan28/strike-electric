// Live electric arcs for the hero. The emblem's bolt acts as the electrode:
// arcs jump from it toward the pointer, a tap anywhere strikes that spot,
// and the page opens with one bolt hitting the emblem.

type Pt = { x: number; y: number };
type Bolt = { paths: { pts: Pt[]; w: number }[]; born: number; life: number; width: number };

// Bolt tips inside the emblem image, as fractions of its box
const TIP_TOP: Pt = { x: 0.81, y: 0.13 };
const TIP_BOTTOM: Pt = { x: 0.14, y: 0.98 };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function zigzag(a: Pt, b: Pt, rough: number, detail: number): Pt[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < detail) return [a, b];
  const nx = -dy / len;
  const ny = dx / len;
  const off = rand(-1, 1) * len * rough;
  const mid = { x: (a.x + b.x) / 2 + nx * off, y: (a.y + b.y) / 2 + ny * off };
  const left = zigzag(a, mid, rough, detail);
  return left.concat(zigzag(mid, b, rough, detail).slice(1));
}

function makeBolt(a: Pt, b: Pt, width: number, life: number, branches: number): Bolt {
  const main = zigzag(a, b, 0.2, 7);
  const paths = [{ pts: main, w: 1 }];
  for (let i = 0; i < branches; i++) {
    const idx = Math.floor(rand(0.15, 0.8) * main.length);
    const from = main[idx];
    const ang = Math.atan2(b.y - a.y, b.x - a.x) + rand(0.35, 0.9) * (Math.random() < 0.5 ? -1 : 1);
    const len = Math.hypot(b.x - a.x, b.y - a.y) * rand(0.15, 0.4);
    const to = { x: from.x + Math.cos(ang) * len, y: from.y + Math.sin(ang) * len };
    paths.push({ pts: zigzag(from, to, 0.25, 6), w: 0.45 });
  }
  return { paths, born: performance.now(), life, width };
}

export function initLightning(hero: HTMLElement, canvas: HTMLCanvasElement, emblem: HTMLElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { intro: () => {} };

  const img = emblem.querySelector('img') as HTMLImageElement;
  const bolts: Bolt[] = [];
  let pointer: Pt | null = null;
  let charge = 0;
  let running = false;
  let visible = true;
  let nextAmbient = performance.now() + 2500;
  let dpr = 1;
  let box = hero.getBoundingClientRect();

  const resize = () => {
    box = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  new ResizeObserver(resize).observe(hero);

  const electrode = () => {
    const r = img.getBoundingClientRect();
    const h = hero.getBoundingClientRect();
    const map = (p: Pt) => ({ x: r.left - h.left + p.x * r.width, y: r.top - h.top + p.y * r.height });
    return { a: map(TIP_TOP), b: map(TIP_BOTTOM), size: r.width };
  };

  const nearestOnBolt = (p: Pt) => {
    const { a, b } = electrode();
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy)));
    return { x: a.x + vx * t, y: a.y + vy * t };
  };

  const local = (e: PointerEvent): Pt => {
    const h = hero.getBoundingClientRect();
    return { x: e.clientX - h.left, y: e.clientY - h.top };
  };

  const draw = (now: number) => {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (let i = bolts.length - 1; i >= 0; i--) {
      const bolt = bolts[i];
      const t = (now - bolt.born) / bolt.life;
      if (t >= 1) {
        bolts.splice(i, 1);
        continue;
      }
      const flicker = Math.random() < 0.18 ? 0.35 : 1;
      const alpha = (1 - t) * (1 - t) * flicker;
      for (const path of bolt.paths) {
        const w = bolt.width * path.w;
        const passes: [number, string][] = [
          [14 * w, `rgba(10,166,212,${0.07 * alpha})`],
          [6 * w, `rgba(63,224,255,${0.28 * alpha})`],
          [2.2 * w, `rgba(170,240,255,${0.85 * alpha})`],
          [0.9 * w, `rgba(255,255,255,${alpha})`],
        ];
        for (const [lw, color] of passes) {
          ctx.beginPath();
          ctx.moveTo(path.pts[0].x, path.pts[0].y);
          for (let k = 1; k < path.pts.length; k++) ctx.lineTo(path.pts[k].x, path.pts[k].y);
          ctx.lineWidth = lw;
          ctx.strokeStyle = color;
          ctx.stroke();
        }
      }
    }

    // A small charge glow where the pointer is
    if (pointer) {
      const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 60);
      g.addColorStop(0, 'rgba(63,224,255,0.22)');
      g.addColorStop(1, 'rgba(63,224,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(pointer.x - 60, pointer.y - 60, 120, 120);
    }
  };

  const tick = (now: number) => {
    if (!visible) {
      running = false;
      return;
    }

    if (pointer) {
      const from = nearestOnBolt(pointer);
      const d = Math.hypot(pointer.x - from.x, pointer.y - from.y);
      const reach = Math.max(240, electrode().size * 0.85);
      if (d < reach) {
        const closeness = 1 - d / reach;
        charge = Math.max(charge, closeness * 0.8);
        if (Math.random() < 0.05 + closeness * 0.3) {
          const end = { x: pointer.x + rand(-6, 6), y: pointer.y + rand(-6, 6) };
          bolts.push(makeBolt(from, end, 0.6 + closeness * 0.7, rand(110, 220), Math.random() < 0.5 ? 1 : 0));
        }
      }
    }

    if (now > nextAmbient) {
      // Idle crackle along the bolt itself
      const { a, b } = electrode();
      const t1 = rand(0.1, 0.8);
      const t2 = Math.min(1, t1 + rand(0.08, 0.2));
      const p1 = { x: a.x + (b.x - a.x) * t1 + rand(-14, 14), y: a.y + (b.y - a.y) * t1 + rand(-14, 14) };
      const p2 = { x: a.x + (b.x - a.x) * t2 + rand(-30, 30), y: a.y + (b.y - a.y) * t2 + rand(-30, 30) };
      bolts.push(makeBolt(p1, p2, 0.5, rand(120, 200), 0));
      charge = Math.max(charge, 0.35);
      nextAmbient = now + rand(1800, 4200);
    }

    draw(now);
    charge *= 0.93;
    emblem.style.setProperty('--charge', charge.toFixed(3));
    requestAnimationFrame(tick);
  };

  const start = () => {
    if (running || !visible) return;
    running = true;
    requestAnimationFrame(tick);
  };

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }).observe(hero);

  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    pointer = local(e);
    start();
  });
  hero.addEventListener('pointerleave', () => {
    pointer = null;
  });

  hero.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('a, button, input, select, textarea')) return;
    const p = local(e);
    const from = nearestOnBolt(p);
    bolts.push(makeBolt(from, p, 1.3, 320, 3));
    charge = 1;
    start();
  });

  const intro = (onHit: () => void) => {
    const { a } = electrode();
    const sky = { x: a.x + rand(-120, 60), y: -20 };
    bolts.push(makeBolt(sky, a, 1.8, 460, 4));
    hero.style.setProperty('--fx', `${(a.x / box.width) * 100}%`);
    hero.style.setProperty('--fy', `${(a.y / box.height) * 100}%`);
    hero.classList.add('is-flash');
    charge = 1;
    start();
    setTimeout(onHit, 90);
  };

  return { intro };
}
