/**
 * The motorcycle that cuts across the screen when the theme changes. It is
 * hidden until `html[data-theme-sweep]` is set (lib/theme.ts) and has its own
 * view-transition name so it rides above the page while the new theme is
 * revealed behind it. See the "Theme change" block in styles/global.css.
 */
export default function ThemeBike() {
  return (
    <div className="theme-bike" aria-hidden="true">
      <svg viewBox="0 0 220 120" width="220" height="120">
        <g stroke="#E6E8EC" strokeWidth="3" strokeLinecap="round" opacity="0.9">
          <line x1="2" y1="52" x2="40" y2="52" stroke="#EB2830" />
          <line x1="0" y1="68" x2="34" y2="68" />
          <line x1="8" y1="84" x2="30" y2="84" stroke="#EB2830" />
        </g>
        <g fill="none" stroke="#E6E8EC" strokeWidth="6">
          <circle cx="62" cy="88" r="24" />
          <circle cx="178" cy="88" r="24" />
        </g>
        <g fill="#E6E8EC"><circle cx="62" cy="88" r="5" /><circle cx="178" cy="88" r="5" /></g>
        <g stroke="#E6E8EC" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M62 88 L96 62 L132 60 L178 88" />
          <path d="M132 60 L146 40 L158 40" />
        </g>
        <path d="M92 62 Q112 46 138 54 L130 66 L96 68 Z" fill="#B9BDC6" />
        <path d="M136 54 L164 52 L178 68 L150 72 L138 66 Z" fill="#EB2830" />
        <g stroke="#E6E8EC" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M98 60 L116 36 L142 46" />
          <path d="M104 62 L122 78 L112 92" />
        </g>
        <circle cx="124" cy="24" r="11" fill="#E6E8EC" />
        <path d="M118 22 L138 22 L136 28 L120 28 Z" fill="#EB2830" />
      </svg>
    </div>
  )
}
