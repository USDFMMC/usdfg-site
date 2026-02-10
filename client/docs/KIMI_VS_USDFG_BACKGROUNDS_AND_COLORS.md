# Kimi vs USDFG – UI background effects and colors

Reference: `client/src/_kimi/assets/index-ayMPO7tf.css` (Kimi) vs USDFG `index.css` and home/hero usage.

---

## 1. Background base colors

| Role | Kimi | USDFG |
|------|------|--------|
| **Page / void** | `#0a0215` (void), `:root --background: 270 85% 4%` (hsl) | `#0a0215` on home fixed layer ✓ |
| **Void dark** | `#05010a` (rgb(5 1 10)) | Not used |
| **Void light (glass base)** | `#140521` (rgb(20 5 33)) | Used in `.kimi-glass` as rgba(20,5,33,0.7) ✓ |
| **Body default** | `body` uses `hsl(var(--background))` | `body` uses `#121421` (different: blue-grey, not purple-void) |

**Summary:** Base void `#0a0215` and glass `#140521` match. USDFG body is a different neutral; home overrides with a fixed `#0a0215` layer.

---

## 2. Primary / accent palette

| Token | Kimi | USDFG |
|-------|------|--------|
| **Primary purple** | `#7e43ff` (262 100% 63%) | Tailwind `purple-500` #a855f7 / `purple-600` #9333ea in components; some shadows use rgba(147,51,234) |
| **Secondary orange** | `#ff7e3e` | Tailwind `amber-500` / `orange-500` (different hue) |
| **Purple tints** | `#7e43ff1a` (purple/10), `#7e43ff33` (purple/20), `#7e43ff0d` (purple/5), etc. | `purple-600/5`, `purple-600/10`, `purple-500/20`, `purple-500/30` (Tailwind scales) |
| **Orange tints** | `#ff7e3e1a`, `#ff7e3e33` | Not used as a system; amber/orange used for buttons and accents |

**Summary:** Kimi uses a single purple `#7e43ff` and orange `#ff7e3e`. USDFG uses Tailwind purple/amber; shadows often use `rgba(147,51,234)` (closer to purple-600). For full Kimi look, use `#7e43ff` and `#ff7e3e` (or CSS vars).

---

## 3. Glass / backdrop

| Effect | Kimi | USDFG |
|--------|------|--------|
| **Glass panel** | `.glass`: `background:#140521b3`, `backdrop-filter:blur(20px)` | `.kimi-glass`: `rgba(20,5,33,0.7)` + `blur(20px)` ✓ |
| **Backdrop blur** | `backdrop-blur-sm` (4px), `backdrop-blur-xl` (24px) | Same Tailwind + navbar `backdrop-blur-md` |

**Summary:** Glass and blur match.

---

## 4. Background effects (gradients, grid, orbs)

| Effect | Kimi | USDFG |
|--------|------|--------|
| **Linear grid** | Purple lines `rgba(126,67,255,0.1)` 50px (in bundle) | Same: `rgba(126, 67, 255, 0.1)` 50px on home + hero ✓ |
| **Radial gradient (center glow)** | `.bg-gradient-radial`: `radial-gradient(ellipse at center, rgba(126,67,255,.1) 0%, transparent 70%)` | Not used on page background |
| **Void gradients** | `from-void` #0a0215, `via-void-light` #140521, `via-void/50`, `to-void` | Home: `from-[#0a0215] via-[#0a0215]/95 to-[#0a0215]` (no void-light in middle) |
| **Purple overlay on hero** | — | Hero: `bg-purple-600/10` (Tailwind); Kimi would use `#7e43ff` at ~10% |
| **Floating orbs** | — | Hero: `bg-purple-600/20`, `blur-[100px]`, `animate-pulse-glow` |
| **Pulse-glow (orbs)** | `@keyframes pulseGlow`: box-shadow `0 0 20px #7e43ff66` → `0 0 40px #7e43ffcc`, 2s | USDFG `pulseGlow`: opacity + scale, 4s (different effect) |

**Summary:** Grid matches. Kimi adds a subtle radial purple glow from center; USDFG doesn’t. Orb tint and pulse-glow differ (Kimi = box-shadow only, 2s).

---

## 5. Text gradients

| Use | Kimi | USDFG |
|-----|------|--------|
| **Primary gradient** | `.text-gradient`: `linear-gradient(135deg, #7e43ff, #ff7e3e)` | `.text-gradient-kimi`: `linear-gradient(135deg, #7e43ff, #f472b6)` (pink instead of orange) |

**Summary:** Angle and purple match; USDFG uses pink for the second stop, Kimi uses orange.

---

## 6. Borders and shadows

| Use | Kimi | USDFG |
|-----|------|--------|
| **Border purple** | `border-purple/10` #7e43ff1a, `/20`, `/30`, `/50` | `border-purple-500/20`, `border-purple-500/30`, etc. |
| **Shadow purple** | `0 0 20px #7e43ff66`, `0 0 40px #7e43ffcc` (pulse-glow) | Many `rgba(147,51,234,...)` (purple-600); some `rgba(126,67,255,0.3)` in leaderboard/cards |
| **Selection** | `::selection` background `#7e43ff66`, color #fff | Not overridden (browser default) |

**Summary:** Kimi standardises on #7e43ff for borders and glow; USDFG mixes Tailwind purple and rgba(147,51,234).

---

## 7. Scrollbar and neon

| Use | Kimi | USDFG |
|-----|------|--------|
| **Scrollbar track** | `#0a0215` | Not set globally |
| **Scrollbar thumb** | `linear-gradient(180deg, #7e43ff, #ff7e3e)` | Not set globally |
| **Bottom neon (cards)** | — | `.kimi-bottom-neon` with `rgba(168,85,247,...)` (Tailwind purple-500); Kimi would use #7e43ff |

**Summary:** USDFG has card neon; Kimi defines scrollbar. Neon color could be aligned to #7e43ff.

---

## Recommendations to align USDFG with Kimi

1. **CSS variables**  
   Add `--kimi-void: #0a0215`, `--kimi-void-light: #140521`, `--kimi-purple: #7e43ff`, `--kimi-orange: #ff7e3e` and use them for overlays, borders, and glows where you want Kimi parity.

2. **Page background**  
   Add a subtle radial gradient overlay (Kimi-style) on the home fixed background: e.g. `.bg-gradient-radial-kimi` with `rgba(126,67,255,.1)` → transparent.

3. **Purple tint**  
   Replace hero/page `bg-purple-600/5` and `bg-purple-600/10` with `#7e43ff` at 5% and 10% (e.g. `bg-[#7e43ff]/5`, `bg-[#7e43ff]/10`) for Kimi’s primary purple.

4. **Pulse-glow orbs**  
   Optionally add a second keyframes set for orbs that only animates box-shadow (20px → 40px, #7e43ff66 → #7e43ffcc, 2s) and use it on hero orbs.

5. **Text gradient**  
   For Kimi-style text gradient, use `#ff7e3e` instead of `#f472b6` in `.text-gradient-kimi` (or add a separate class).

6. **Body background**  
   For a full Kimi feel on the marketing site, set `body` to `#0a0215` when the main content is the home layout (or leave as-is for other pages that use `#121421`).

---

## Quick reference – Kimi hex values

- **Void:** `#0a0215`
- **Void light (glass):** `#140521`
- **Purple primary:** `#7e43ff`
- **Orange secondary:** `#ff7e3e`
- **Purple with alpha:** `#7e43ff66` (40%), `#7e43ffcc` (80%), `#7e43ff1a` (10%), `#7e43ff0d` (5%)
