# Icons

Every icon in the homepage is an inline SVG in `index.html` (no icon-font dependency,
no extra network requests). They share one visual system: 24×24 viewBox, 1.7px stroke,
round caps and joins, and `currentColor` so they inherit the surrounding text colour.

The set covers: phone, arrow, shield-check, level/measures, clock, chat, and the
IFD house mark. To reuse one elsewhere, copy the `<svg>` block and keep the class
`ico` (or drop the class for the logo mark).
