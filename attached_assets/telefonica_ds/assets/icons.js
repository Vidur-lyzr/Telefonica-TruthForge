/* ============================================================
   Telefónica DS — placeholder UI icon set (window.TFIcons)
   Lucide-style line glyphs (24px, 2px stroke, round caps) built with
   React.createElement so they load via a plain <script> (no Babel) and
   do NOT register as design-system components.

   ⚠ SUBSTITUTE: Telefónica's real icons live in the open-source
   `Telefonica/mistica-icons` library. Swap these for the licensed set
   for production. Each icon accepts standard svg props (style, width…).
   ============================================================ */
window.TFIcons = (function () {
  const h = React.createElement;
  const make = (children) => (props) =>
    h('svg', Object.assign({
      viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
      width: '1em', height: '1em', 'aria-hidden': 'true',
    }, props), children.map((c, i) =>
      typeof c === 'string'
        ? h('path', { key: i, d: c })
        : h(c.t, Object.assign({ key: i }, c.a))));

  return {
    Menu:        make(['M3 6h18', 'M3 12h18', 'M3 18h18']),
    Close:       make(['M18 6 6 18', 'm6 6 12 12']),
    Search:      make([{ t: 'circle', a: { cx: 11, cy: 11, r: 7 } }, 'm21 21-4.35-4.35']),
    ChevronDown: make(['m6 9 6 6 6-6']),
    ChevronRight:make(['m9 6 6 6-6 6']),
    ArrowRight:  make(['M5 12h14', 'm13 6 6 6-6 6']),
    ArrowUpRight:make(['M7 17 17 7', 'M7 7h10v10']),
    Globe:       make([{ t: 'circle', a: { cx: 12, cy: 12, r: 9 } }, 'M3 12h18', 'M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18']),
    Play:        make([{ t: 'path', a: { d: 'M6 4.5 19 12 6 19.5z', fill: 'currentColor', stroke: 'none' } }]),
    Plus:        make(['M12 5v14', 'M5 12h14']),
    Check:       make(['M20 6 9 17l-5-5']),
    Bolt:        make([{ t: 'path', a: { d: 'M13 2 4 14h7l-1 8 9-12h-7z' } }]),
    Shield:      make(['M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z']),
    Leaf:        make(['M11 20A7 7 0 0 1 4 13C4 7 9 3 20 3c0 11-4 16-9 16z', 'M11 20c0-4 2-7 6-9']),
    Users:       make([{ t: 'circle', a: { cx: 9, cy: 8, r: 3.2 } }, 'M3.5 20a5.5 5.5 0 0 1 11 0', 'M16 5.2a3.2 3.2 0 0 1 0 6', 'M17.5 20a5.5 5.5 0 0 0-2-4.3']),
    Wifi:        make(['M5 12.5a10 10 0 0 1 14 0', 'M8.5 16a5 5 0 0 1 7 0', { t: 'circle', a: { cx: 12, cy: 19, r: 1, fill: 'currentColor', stroke: 'none' } }]),
    Phone:       make(['M5 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L19 16l2 5v-3a2 2 0 0 1 0 0', 'M5 3a16 16 0 0 0 16 16']),
    Building:    make([{ t: 'rect', a: { x: 4, y: 3, width: 16, height: 18, rx: 1 } }, 'M9 8h.01', 'M15 8h.01', 'M9 12h.01', 'M15 12h.01', 'M9 16h6']),
    Chart:       make(['M4 20V10', 'M10 20V4', 'M16 20v-8', 'M22 20H2']),
    Globe2:      make([{ t: 'circle', a: { cx: 12, cy: 12, r: 9 } }, 'M12 3v18', 'M3 12h18']),
  };
})();
