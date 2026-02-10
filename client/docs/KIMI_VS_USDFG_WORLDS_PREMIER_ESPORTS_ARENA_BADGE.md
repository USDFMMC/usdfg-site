# Kimi vs USDFG – "World's Premier Esports Arena" badge

Comparison for the hero badge that sits above the main headline.

---

## Kimi (reference)

**Source:** `client/src/_kimi/HeroSection.kimi.tsx` and bundled `src/sections/Hero.tsx` (index-CiHexlOG.js).

**Markup (Kimi):**
```jsx
<div className="inline-flex items-center gap-2 px-4 py-2 mb-6 glass rounded-full border border-purple/30">
  <span className="w-4 h-4 text-orange" />
  <span className="font-body text-sm text-white/80">World's Premier Esports Arena</span>
</div>
```

**Kimi CSS (from index-ayMPO7tf.css):**
| Class | Kimi value |
|-------|------------|
| `.glass` | `background:#140521b3` (≈ rgba(20,5,33,0.7)), `backdrop-filter:blur(20px)` |
| `.border-purple/30` | `border-color:#7e43ff4d` (purple at 30% opacity) |
| `.font-body` | `font-family:Rajdhani,sans-serif` |
| `.text-orange` | Kimi orange (e.g. #ff7e3e) |
| Icon | In bundle: component `Ay` with `className="w-4 h-4 text-orange"` (likely SVG/image) |

**Copy:** `World's Premier Esports Arena` (apostrophe as `World&apos;s` in reference).

---

## USDFG (current)

**Source:** `client/src/components/home/hero-section.tsx`.

**Markup (USDFG):**
```jsx
<div className="inline-flex items-center gap-2 px-4 py-2 mb-6 kimi-glass rounded-full border border-kimi-purple-30 opacity-0 animate-kimi-in kimi-delay-0">
  <span className="w-4 h-4 shrink-0 rounded-full bg-[var(--kimi-orange)]" aria-hidden />
  <span className="kimi-font-body text-sm text-white/80">World's Premier Esports Arena</span>
</div>
```

**USDFG CSS / tokens:**
| Class / token | USDFG value |
|---------------|-------------|
| `.kimi-glass` | Same as Kimi: `rgba(20,5,33,0.7)`, `blur(20px)` |
| `.border-kimi-purple-30` | `border-color:#7e43ff4d` (matches Kimi) |
| `.kimi-font-body` | `font-family:'Rajdhani',sans-serif` (matches Kimi) |
| Icon | `w-4 h-4` + `bg-[var(--kimi-orange)]` (#ff7e3e) as visible dot (Kimi’s `Ay` is w-4 h-4 text-orange; we have no Ay, so use orange dot) |

**Copy:** Same: `World's Premier Esports Arena`.

---

## Side-by-side

| Item | Kimi | USDFG | Match? |
|------|------|--------|--------|
| Container layout | `inline-flex items-center gap-2 px-4 py-2 mb-6` | Same | Yes |
| Glass | `glass` | `kimi-glass` (same styles) | Yes |
| Border | `border border-purple/30` → #7e43ff4d | `border border-kimi-purple-30` → #7e43ff4d | Yes |
| Shape | `rounded-full` | `rounded-full` | Yes |
| Icon size | `w-4 h-4` | `w-4 h-4 shrink-0` | Yes |
| Icon visual | `Ay` component, `text-orange` | Orange dot `bg-[var(--kimi-orange)]` | Same color; we use dot instead of Ay |
| Text font | `font-body` (Rajdhani) | `kimi-font-body` (Rajdhani) | Yes |
| Text size/color | `text-sm text-white/80` | Same | Yes |
| Label text | World's Premier Esports Arena | Same | Yes |
| Extra | — | `opacity-0 animate-kimi-in kimi-delay-0` (entrance) | USDFG-only |

---

## Summary

- **Structure and layout:** Same (inline-flex, gap, padding, margin, rounded-full).
- **Glass and border:** Matched via `kimi-glass` and `border-kimi-purple-30` (#7e43ff4d).
- **Typography and copy:** Same font (Rajdhani), size, opacity, and text.
- **Icon:** Kimi uses component `Ay` (w-4 h-4, text-orange); USDFG uses a 16×16 orange dot with `--kimi-orange` (#ff7e3e) so the badge has a visible icon without Kimi’s asset. If you add Kimi’s badge image/SVG, you can replace the `<span>` with an `<img>` or SVG that uses `w-4 h-4` and keep the same container and text.
