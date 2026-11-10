/**
 * Inline SVG icon set (no icon font, no external asset; keeps client.js a single
 * file and inherits `currentColor` for theme-aware tinting).
 */
import { createElement as h } from 'react'

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const ICONS = {
  library: [
    h('path', { key: 'a', d: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v13A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5z', ...STROKE }),
    h('path', { key: 'b', d: 'M13 6.5A1.5 1.5 0 0 1 14.5 5h4A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-4a1.5 1.5 0 0 1-1.5-1.5z', ...STROKE }),
    h('path', { key: 'c', d: 'M7.5 8.5v3M16.5 8.5v3', ...STROKE }),
  ],
  bean: [
    h('rect', { key: 'a', x: 4, y: 7, width: 16, height: 11, rx: 5, ...STROKE }),
    h('circle', { key: 'b', cx: 9.5, cy: 12.5, r: 1.6, ...STROKE }),
    h('circle', { key: 'c', cx: 14.5, cy: 12.5, r: 1.6, ...STROKE }),
    h('path', { key: 'd', d: 'M12 7V4.5M9.5 4.5h5', ...STROKE }),
  ],
  watch: [
    h('rect', { key: 'a', x: 7, y: 6, width: 10, height: 12, rx: 2.5, ...STROKE }),
    h('path', { key: 'b', d: 'M9.5 6V3.5h5V6M9.5 18v2.5h5V18M12 10v2.4l1.6 1', ...STROKE }),
  ],
  settings: [
    h('circle', { key: 'a', cx: 12, cy: 12, r: 3, ...STROKE }),
    h('path', { key: 'b', d: 'M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18', ...STROKE }),
  ],
  refresh: [
    h('path', { key: 'a', d: 'M20 11a8 8 0 1 0-2.3 5.7', ...STROKE }),
    h('path', { key: 'b', d: 'M20 4.5V11h-6.3', ...STROKE }),
  ],
  play: [h('path', { key: 'a', d: 'M8 5.5v13l11-6.5z', ...STROKE })],
  pause: [h('path', { key: 'a', d: 'M9 5.5v13M15 5.5v13', ...STROKE })],
  mic: [
    h('rect', { key: 'a', x: 9, y: 3.5, width: 6, height: 11, rx: 3, ...STROKE }),
    h('path', { key: 'b', d: 'M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6', ...STROKE }),
  ],
  copy: [
    h('rect', { key: 'a', x: 8.5, y: 8.5, width: 11.5, height: 11.5, rx: 2, ...STROKE }),
    h('path', { key: 'b', d: 'M15.5 8.5V6A2 2 0 0 0 13.5 4h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2H8.5', ...STROKE }),
  ],
  trash: [
    h('path', { key: 'a', d: 'M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5 7.5 20h9l1-13.5M10.5 10v6M13.5 10v6', ...STROKE }),
  ],
  edit: [
    h('path', { key: 'a', d: 'm14.5 5.5 4 4L9 19H5v-4z', ...STROKE }),
    h('path', { key: 'b', d: 'm12.5 7.5 4 4', ...STROKE }),
  ],
  check: [h('path', { key: 'a', d: 'm5 12.5 4.5 4.5L19 7', ...STROKE })],
  alert: [
    h('path', { key: 'a', d: 'M12 4 2.8 20h18.4z', ...STROKE }),
    h('path', { key: 'b', d: 'M12 9.5v4.5M12 17.3v.2', ...STROKE }),
  ],
  info: [
    h('circle', { key: 'a', cx: 12, cy: 12, r: 8.5, ...STROKE }),
    h('path', { key: 'b', d: 'M12 11v5.5M12 7.8v.2', ...STROKE }),
  ],
  search: [
    h('circle', { key: 'a', cx: 11, cy: 11, r: 6.5, ...STROKE }),
    h('path', { key: 'b', d: 'm16 16 4 4', ...STROKE }),
  ],
  download: [
    h('path', { key: 'a', d: 'M12 4v10.5M7.5 10.5 12 15l4.5-4.5M5 19.5h14', ...STROKE }),
  ],
  upload: [
    h('path', { key: 'a', d: 'M12 15V4.5M7.5 9 12 4.5 16.5 9M5 19.5h14', ...STROKE }),
  ],
  bluetooth: [
    h('path', { key: 'a', d: 'M8 7.5 16 16.5 12 20V4l4 3.5L8 16.5', ...STROKE }),
  ],
  x: [h('path', { key: 'a', d: 'M6 6l12 12M18 6 6 18', ...STROKE })],
  file: [
    h('path', { key: 'a', d: 'M6 4h7l5 5v11H6z', ...STROKE }),
    h('path', { key: 'b', d: 'M13 4v5h5', ...STROKE }),
  ],
  link: [
    h('path', { key: 'a', d: 'M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.5 6.3', ...STROKE }),
    h('path', { key: 'b', d: 'M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.3-1.3', ...STROKE }),
  ],
  plug: [
    h('path', { key: 'a', d: 'M9 3.5v5M15 3.5v5M6 8.5h12v2a6 6 0 0 1-12 0zM12 16.5V21', ...STROKE }),
  ],
  wave: [
    h('path', { key: 'a', d: 'M3 12h2M7 8.5v7M11 5.5v13M15 8.5v7M19 11h2', ...STROKE }),
  ],
}

export function Icon(props) {
  const { name, size = 18 } = props || {}
  const shapes = ICONS[name] || ICONS.info
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      'aria-hidden': true,
      focusable: 'false',
      style: { display: 'block' },
    },
    shapes,
  )
}
