# Kimi vs USDFG – Hero section: effects, animation, motion

Reference: `client/src/_kimi/HeroSection.kimi.tsx`, `_kimi/assets/index-ayMPO7tf.css`, and USDFG `hero-section.tsx` + `index.css`.

---

## 1. Kimi hero (reference)

**Markup (HeroSection.kimi.tsx):**
- **Section:** `relative min-h-screen overflow-hidden` – no animation classes.
- **Background:** Static. One layer: `radial-gradient(circle, #333 1px, transparent 1px)` 50px, `opacity-30`. Background image: `hero-bg.jpg`, `absolute inset-0 object-cover -z-10` – no reveal, no parallax.
- **Content wrapper:** `willChange: "transform"` – no animation classes on badge, h1, or p.
- **Floating orbs / decorative motion:** None in the reference file.
- **Bottom gradient / strip:** None.

So in the **reference**, the Kimi hero is **static**: no entrance animations, no orbs, no scroll effects.

**Kimi design system (index-ayMPO7tf.css) – available but not used on hero in reference:**
| Class | Effect |
|-------|--------|
| `.animate-in` | `animation: enter .15s` (CSS variables for opacity, scale, translate, rotate) |
| `.fade-in-0` | `--tw-enter-opacity: 0` |
| `.zoom-in-95` | `--tw-enter-scale: .95` |
| `@keyframes enter` | From opacity/translate/scale/rotate vars → to 1/0/1/0 |
| `.animate-pulse-glow` | `pulse-glow` 2s, box-shadow 20px → 40px #7e43ff |
| `.animate-float` | `float` 3s, translateY 0 → -10px |
| `.animate-live-pulse` | scale 1→1.2, opacity 1→0.8 |

---

## 2. USDFG hero (current)

| Area | USDFG | Same as Kimi? |
|------|--------|----------------|
| **Background** | Static (no reveal animation). Purple tint uses `bg-kimi-purple-tint-10`. | **Yes** – matches Kimi reference behavior (static bg). |
| **Grid overlay** | Linear purple grid `rgba(126,67,255,0.1)` 50px, `opacity-20` | Different – Kimi uses radial dot grid `#333`, opacity-30. |
| **Content entrance** | `opacity-0` + `animate-in fade-in-0 zoom-in-95` (0.15s, Kimi system) + `kimi-delay-0..4` stagger | **Yes** – same enter animation system as Kimi. |
| **Floating orbs** | Two blobs, `animate-pulse-glow-kimi` (2s box-shadow), Kimi purple/orange | **Yes** – same motion as Kimi’s `.animate-pulse-glow` (we added `-kimi` variant). |
| **Bottom strip** | `h-32` gradient `from-black/80 via-black/40 to-transparent` | No – Kimi reference has none. |
| **Button hover** | `transition-all`, arrow `group-hover:translate-x-1`, shine `translate-x` | Same kind of hover motion (CSS transitions). |

---

## 3. Summary

- **Kimi reference hero:** Static layout and background.
- **Kimi design system:** Short enter (0.15s, fade + zoom), pulse-glow, float, etc.
- **USDFG hero:** Uses **Kimi’s** enter animation system (`animate-in` + `fade-in-0` + `zoom-in-95`) with stagger, **static** background like the reference, and **Kimi-style** orb pulse-glow. Remaining diffs are mostly stylistic (grid type, bottom strip).

So the hero is now using the **same motion primitives as Kimi** (enter + pulse-glow). The main mismatch vs the Kimi reference is the **grid style** (linear vs dot) and extra decorative layers (bottom strip).

---

## 4. Aligning with Kimi

USDFG is now aligned to Kimi’s motion system for the hero:

1. **Content entrance** – Uses Kimi’s enter: `.animate-in`, `.fade-in-0`, `.zoom-in-95` (0.15s) with stagger via `animation-delay`.
2. **Background** – Static (no reveal), matching the Kimi reference’s behavior.
3. **Orbs** – Uses `animate-pulse-glow-kimi`, matching Kimi’s `pulse-glow` timing and feel.

Optional remaining alignment (purely visual/style): switch the grid overlay to Kimi’s dot grid and remove the bottom strip if you want the reference hero to match 1:1.
