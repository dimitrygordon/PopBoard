// Energy palette from every_joule_art_specs.md section 0.3. light = light mode, dark = dark mode.
export const palette = Object.freeze({
  kinetic: { light: "#1FB5C9", dark: "#4FD8EA" },
  gravitational: { light: "#2F5FD0", dark: "#6C93F2" },
  elastic: { light: "#8A4FD6", dark: "#B184F0" },
  thermal: { light: "#F07A1E", dark: "#FF9D4D" },
  chemical: { light: "#3BA55C", dark: "#6BD48A" },
  sound: { light: "#E86AA6", dark: "#F59AC4" },
  light: { light: "#FFD66B", dark: "#FFE29A" },
  electrical: { light: "#8EC9F2", dark: "#B5DEFA" },
  magnetic: { light: "#6B2FA3", dark: "#9E66D1" },
  electrostatic: { light: "#E8C21A", dark: "#F5D84F" },
  nuclear: { light: "#C9971C", dark: "#E6B84A" },
});
export const ENERGY_KINDS = Object.freeze(Object.keys(palette));
