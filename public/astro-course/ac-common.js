// Astronomy Course shared bits: theme (one key for the library and every storybook), sketched icons.
export const THEME_KEY = "popboard.astronomy-course.theme";
const root = document.documentElement;
export const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
export function theme() { return root.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
export function bindThemeButton(btn, onChange) {
  const sync = () => {
    const dark = theme() === "dark";
    btn.setAttribute("aria-label", dark ? "Dark paper is on. Switch to light paper" : "Light paper is on. Switch to dark paper");
    btn.setAttribute("aria-pressed", "false");
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute("content", dark ? "#1e2433" : "#f4efe4");
  };
  btn.innerHTML = SUN_MOON;
  btn.addEventListener("click", () => {
    const t = theme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", t); store.set(THEME_KEY, t); sync(); onChange && onChange(t);
  });
  sync();
}
export const SUN_MOON = `<svg class="sun" viewBox="0 0 32 32" fill="none" stroke="#c9862a" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="16" cy="16" r="6.2" fill="#f2c45a" stroke="#c9862a"/><path d="M16 3.5v4M16 24.6v4M3.5 16h4M24.6 16h4M7.2 7.1l2.7 2.9M22.2 22.1l2.6 2.8M7.1 24.9l2.9-2.7M22.1 9.8l2.8-2.6"/><path d="M13 14.5c1-1.4 3-1.8 4.5-.8" stroke="#fbe6a8" stroke-width="1.2"/></svg><svg class="moon" viewBox="0 0 32 32" fill="none" stroke="#e2b654" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.5 22.8A9.6 9.6 0 0 1 12.3 6.1a10 10 0 1 0 13.4 13.4 9.4 9.4 0 0 1-4.2 3.3Z" fill="#f3ead7"/><path d="M14.6 15.2l.6 1.1 1.1.6-1.1.6-.6 1.1-.6-1.1-1.1-.6 1.1-.6Z" stroke-width="1.2"/></svg>`;
export const BACK_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>`;
export const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
