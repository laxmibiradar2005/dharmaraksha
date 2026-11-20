import type { CSSProperties } from 'react'

const paths = {
  scales: ['M12 3v17M5 21h14M4 7l8-3 8 3M4 7l-3 7h6L4 7Zm16 0-3 7h6l-3-7Z', 'M1 14a3 3 0 0 0 6 0m10 0a3 3 0 0 0 6 0'],
  grid: ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
  spark: ['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4'],
  folder: ['M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z', 'M14 2v6h6M8 13h8m-8 4h5'],
  court: ['m3 8 9-5 9 5H3Zm-1 13h20M5 10v8m7-8v8m7-8v8M3 18h18'],
  people: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8m6 10v-2a4 4 0 0 0-3-3.87', 'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'],
  arrow: ['M4 12h16m-6-6 6 6-6 6'],
  diagonal: ['M6 18 18 6M6 6h12v12'],
  plus: ['M12 5v14M5 12h14'],
  search: ['M21 21l-4.4-4.4', 'M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z'],
  chevron: ['m9 5 7 7-7 7'],
  down: ['m6 9 6 6 6-6'],
  shield: ['M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7l-9-4Z', 'm8 12 3 3 5-6'],
  check: ['m5 12 4 4L19 6'],
  clock: ['M12 8v4l3 2', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'],
  close: ['m6 6 12 12M6 18 18 6'],
  menu: ['M4 6h16M4 12h16M4 18h16'],
  help: ['M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3m.1 4h.01', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'],
  mic: ['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm-7 8v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8'],
  upload: ['M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4'],
  send: ['m22 2-7 20-4-9-9-4L22 2ZM22 2 11 13'],
  attach: ['m21 11-8 8a6 6 0 0 1-8.5-8.5L13 2a4 4 0 0 1 5.5 5.5L10 16a2 2 0 0 1-2.8-2.8L15 5.5'],
  refresh: ['M20 7v5h-5M4 17v-5h5', 'M5 7a8 8 0 0 1 13-2l2 2M4 17l2 2a8 8 0 0 0 13-2'],
  globe: ['M2 12h20M12 2a20 20 0 0 1 0 20 20 20 0 0 1 0-20Z', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'],
  expand: ['M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5'],
  play: ['m8 4 12 8-12 8V4Z'],
  book: ['M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15'],
  download: ['M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4'],
} as const

export type IconName = keyof typeof paths
export default function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name].map((d, i) => <path key={i} d={d} />)}</svg>
}
