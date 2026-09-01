import { el } from "./ui.js";

// Docker whale mark (simplified), in Docker blue.
export function whale(size = 24) {
  const wrap = el("span", { style: `display:inline-flex;width:${size}px;height:${size}px` });
  wrap.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">
    <g fill="#2496ED">
      <rect x="3.2" y="9.4" width="2.4" height="2.2" rx=".3"/>
      <rect x="6.0" y="9.4" width="2.4" height="2.2" rx=".3"/>
      <rect x="8.8" y="9.4" width="2.4" height="2.2" rx=".3"/>
      <rect x="11.6" y="9.4" width="2.4" height="2.2" rx=".3"/>
      <rect x="6.0" y="6.8" width="2.4" height="2.2" rx=".3"/>
      <rect x="8.8" y="6.8" width="2.4" height="2.2" rx=".3"/>
      <rect x="11.6" y="6.8" width="2.4" height="2.2" rx=".3"/>
      <rect x="8.8" y="4.2" width="2.4" height="2.2" rx=".3"/>
      <path d="M22.5 10.4c-.5-.35-1.7-.5-2.6-.32-.12-.86-.6-1.6-1.45-2.27l-.5-.33-.33.5c-.42.64-.6 1.53-.53 2.38.03.3.15.83.46 1.3-.3.18-.9.42-1.7.4H1.3l-.05.32c-.2 1.65.23 3.4 1.2 4.6C3.5 18.1 5.35 18.8 7.9 18.8c5.5 0 9.6-2.53 11.5-7.14.76.01 2.4.01 3.24-1.6.05-.08.17-.32.5-1.0l.14-.28-.28-.18z"/>
    </g>
  </svg>`;
  return wrap;
}
