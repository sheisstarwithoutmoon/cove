/**
 * Clean SVG icon set — replaces all emojis with professional monoline icons.
 * Each icon accepts `size` (default 18) and `color` (default "currentColor").
 */

const d = (size = 18, color = "currentColor") => ({ width: size, height: size, fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg" });

export const IconSearch = ({ size, color }) => (
  <svg {...d(size, color)}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

export const IconPlus = ({ size, color }) => (
  <svg {...d(size, color)}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

export const IconBrain = ({ size, color }) => (
  <svg {...d(size, color)}><path d="M12 2a6 6 0 0 1 6 6c0 2.22-1.21 4.16-3 5.2V15a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1.8C7.21 12.16 6 10.22 6 8a6 6 0 0 1 6-6z"/><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="21" x2="14" y2="21"/></svg>
);

export const IconGlobe = ({ size, color }) => (
  <svg {...d(size, color)}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>
);

export const IconFileText = ({ size, color }) => (
  <svg {...d(size, color)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);

export const IconShield = ({ size, color }) => (
  <svg {...d(size, color)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
);

export const IconEdit = ({ size, color }) => (
  <svg {...d(size, color)}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);

export const IconPaperclip = ({ size, color }) => (
  <svg {...d(size, color)}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
);

export const IconArrowRight = ({ size, color }) => (
  <svg {...d(size, color)}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);

export const IconArrowLeft = ({ size, color }) => (
  <svg {...d(size, color)}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
);

export const IconLogOut = ({ size, color }) => (
  <svg {...d(size, color)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);

export const IconTarget = ({ size, color }) => (
  <svg {...d(size, color)}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);

export const IconCheck = ({ size, color }) => (
  <svg {...d(size, color)}><polyline points="20 6 9 17 4 12"/></svg>
);

export const IconX = ({ size, color }) => (
  <svg {...d(size, color)}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

export const IconAlertTriangle = ({ size, color }) => (
  <svg {...d(size, color || "#f87171")}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);

export const IconClock = ({ size, color }) => (
  <svg {...d(size, color)}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

export const IconExternalLink = ({ size, color }) => (
  <svg {...d(size, color)}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
);

export const IconTrendingUp = ({ size, color }) => (
  <svg {...d(size, color)}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
);

export const IconMenu = ({ size, color }) => (
  <svg {...d(size, color)}><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
);

export const IconChevronLeft = ({ size, color }) => (
  <svg {...d(size, color)}><polyline points="15 18 9 12 15 6"/></svg>
);

export const IconLoader = ({ size, color }) => (
  <svg {...d(size, color)} style={{ animation: "spin 1s linear infinite", width: size || 18, height: size || 18 }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
);

export const IconSun = ({ size, color }) => (
  <svg {...d(size, color)}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
);

export const IconMoon = ({ size, color }) => (
  <svg {...d(size, color)}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
);
