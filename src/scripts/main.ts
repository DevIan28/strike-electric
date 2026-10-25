import { site } from '../data/site';
import { initLightning } from './lightning';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

/* Hero */
const hero = $('[data-hero]');
const canvas = $<HTMLCanvasElement>('[data-arc]');
const emblem = $('[data-emblem]');
if (hero) {
  const live = () => hero.classList.add('is-live');
  if (!reduced && canvas && emblem) {
    const arcs = initLightning(hero, canvas, emblem);
    const img = emblem.querySelector('img');
    const go = () => setTimeout(() => arcs.intro(live), 150);
    if (img && !img.complete) img.addEventListener('load', go, { once: true });
    else go();
  } else {
    live();
  }
}

/* Open / closed, in New York time */
function nyNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: site.timezone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, hour: Number(get('hour')) + Number(get('minute')) / 60 };
}

function fmtHour(h: number, lang: string) {
  return lang === 'es' ? `${h}:00` : `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
}

for (const el of $$('[data-status]')) {
  const lang = el.dataset.lang ?? 'en';
  const s = JSON.parse(el.dataset.i18n ?? '{}');
  const { day, hour } = nyNow();
  const today = site.hours[day];
  const label = $('.status__label', el)!;
  if (today && hour >= today[0] && hour < today[1]) {
    el.dataset.open = 'true';
    label.textContent = `${s.open}, ${s.closesAt} ${fmtHour(today[1], lang)}`;
  } else {
    let text = s.closed;
    for (let i = 0; i < 7; i++) {
      const d = (day + i) % 7;
      const h = site.hours[d];
      if (!h || (i === 0 && hour >= h[0])) continue;
      const when = i === 0 ? s.today : i === 1 ? s.tomorrow : new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(new Date(2024, 0, 7 + d));
      text = `${s.closed}, ${s.opensAt} ${when} ${fmtHour(h[0], lang)}`;
      break;
    }
    el.dataset.open = 'false';
    label.textContent = text;
  }
  el.hidden = false;
}

/* Header: background on scroll and the traveling current */
const bar = $('[data-bar]');
const navList = $('[data-nav]');
const current = $('.nav__current');
const sectionLinks = $$<HTMLAnchorElement>('a[data-section]');

function moveCurrent(id: string | null) {
  for (const a of sectionLinks) a.setAttribute('aria-current', String(a.dataset.section === id));
  if (!navList || !current) return;
  const link = id ? $<HTMLAnchorElement>(`a[data-section="${id}"]`, navList) : null;
  if (!link) {
    current.style.setProperty('--o', '0');
    return;
  }
  const navBox = navList.getBoundingClientRect();
  const box = link.getBoundingClientRect();
  current.style.setProperty('--x', `${box.left - navBox.left + 12}px`);
  current.style.setProperty('--w', `${box.width - 24}px`);
  current.style.setProperty('--o', '1');
}

const watched = $$('main section[id]');
const visibleSections = new Map<string, number>();
const sectionObserver = new IntersectionObserver(
  (entries) => {
    for (const e of entries) visibleSections.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
    let best: string | null = null;
    let max = 0;
    for (const [id, ratio] of visibleSections) {
      if (ratio > max) {
        max = ratio;
        best = id;
      }
    }
    moveCurrent(best);
  },
  { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.01, 0.25, 0.5, 1] },
);
watched.forEach((s) => sectionObserver.observe(s));

/* Scroll-driven bits, batched into one frame */
const process = $('[data-process]');
const steps = process ? $('.steps', process) : null;
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    bar?.classList.toggle('is-scrolled', window.scrollY > 24);
    if (process && steps && !reduced) {
      const r = steps.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      process.style.setProperty('--p', p.toFixed(3));
    }
  });
}
if (reduced) process?.style.setProperty('--p', '1');
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

/* Mobile menu */
const menu = $<HTMLDialogElement>('[data-menu]');
$('[data-menu-open]')?.addEventListener('click', () => menu?.showModal());
$('[data-menu-close]')?.addEventListener('click', () => menu?.close());
menu?.addEventListener('click', (e) => {
  if (e.target === menu) menu.close();
});
for (const link of $$('[data-menu-link]', menu ?? document)) {
  link.addEventListener('click', () => menu?.close());
}

/* Services rocker tabs */
const rocker = $('[data-rocker]');
if (rocker) {
  const tabs = $$<HTMLButtonElement>('[role="tab"]', rocker);
  const select = (index: number, focus = false) => {
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls')!)!;
      if (on && panel.hidden) {
        panel.hidden = false;
        const breakers = $$('.breaker', panel);
        if (!reduced) {
          breakers.forEach((b) => b.style.setProperty('--on', '0'));
          breakers.forEach((b, k) => setTimeout(() => b.style.setProperty('--on', '1'), 180 + k * 85));
        }
      } else if (!on) {
        panel.hidden = true;
      }
    });
    rocker.dataset.index = String(index);
    if (focus) tabs[index].focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        select((i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length, true);
      }
    });
  });
}

/* Magnetic primary buttons */
if (finePointer && !reduced) {
  for (const btn of $$('[data-magnet]')) {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.18;
      const y = (e.clientY - r.top - r.height / 2) * 0.3;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.transform = '';
    });
  }
}

/* Footer: pointer-lit wordmark and the main switch */
const foot = $('[data-foot]');
const word = $('[data-word]');
if (foot && word) {
  if (finePointer) {
    foot.addEventListener('pointermove', (e) => {
      const span = word.firstElementChild!.getBoundingClientRect();
      word.style.setProperty('--mx', `${e.clientX - span.left}px`);
      word.style.setProperty('--my', `${e.clientY - span.top}px`);
      word.style.setProperty('--glow', '1');
    });
    foot.addEventListener('pointerleave', () => word.style.setProperty('--glow', '0'));
  } else {
    word.style.setProperty('--glow', '0.7');
  }

  const main = $<HTMLAnchorElement>('[data-main-switch]', foot);
  main?.addEventListener('click', (e) => {
    if (reduced) return;
    e.preventDefault();
    foot.classList.add('is-live');
    setTimeout(() => (window.location.href = main.href), 600);
    setTimeout(() => foot.classList.remove('is-live'), 4000);
  });
}

/* Estimate form */
const form = $<HTMLFormElement>('[data-estimate]');
if (form) {
  const note = $('[data-form-note]', form)!;
  const sendLabel = $('[data-send-label]', form)!;
  const sendButton = $<HTMLButtonElement>('button[type="submit"]', form)!;
  const msgs = JSON.parse(form.dataset.msgs ?? '{}');
  const idle = sendLabel.textContent;

  const say = (text: string, tone: 'ok' | 'bad' | '' = '') => {
    note.textContent = text;
    note.dataset.tone = tone;
  };

  form.addEventListener('input', (e) => (e.target as HTMLElement).removeAttribute('aria-invalid'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    if (data.get('botcheck')) return;

    const required = $$<HTMLInputElement | HTMLTextAreaElement>('[required]', form);
    const missing = required.filter((f) => !f.value.trim());
    required.forEach((f) => f.removeAttribute('aria-invalid'));
    missing.forEach((f) => f.setAttribute('aria-invalid', 'true'));
    if (missing.length) {
      say(msgs.required, 'bad');
      missing[0].focus();
      return;
    }

    const fields = {
      Name: String(data.get('name')),
      Phone: String(data.get('phone')),
      Email: String(data.get('email') || '-'),
      Property: String(data.get('property')),
      Service: String(data.get('service') || '-'),
      'Preferred contact': String(data.get('contact')),
      Message: String(data.get('message')),
    };
    const subject = `Estimate request: ${fields.Name}`;

    if (!form.dataset.key) {
      const body = Object.entries(fields)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      window.location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      say(msgs.mailOpened, 'ok');
      return;
    }

    sendButton.disabled = true;
    sendLabel.textContent = msgs.sending;
    say('');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: form.dataset.key, subject, from_name: 'Strike Electric website', ...fields }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
      form.reset();
      say(msgs.sent, 'ok');
    } catch {
      note.dataset.tone = 'bad';
      note.innerHTML = '';
      note.append(`${msgs.error} `);
      const a = document.createElement('a');
      a.href = site.phone.href;
      a.textContent = msgs.phone;
      note.append(a, '.');
    } finally {
      sendButton.disabled = false;
      sendLabel.textContent = idle;
    }
  });
}
