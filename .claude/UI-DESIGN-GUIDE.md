# UI/UX Design Guide - Spaceship Control Panel Theme

**Theme:** Industrial Sci-Fi Spacecraft Interface
**Inspiration:** Star Trek (LCARS), Firefly (Serenity controls), Alien (Nostromo)
**Philosophy:** Form follows function - every UI element should feel like a real spacecraft control

---

## Design Principles

### 1. **Control Panel Metaphor**
Every screen should feel like a station on a starship:
- **Main Menu** = Ship's computer terminal
- **Combat HUD** = Tactical operations console
- **Ship Customizer** = Engineering workstation
- **Ship Library** = Database access terminal

### 2. **Functional Aesthetics**
- **No unnecessary decoration** - every element serves a purpose
- **Clear information hierarchy** - critical data is immediately visible
- **Tactile controls** - buttons and sliders feel clickable/physical
- **Status indicators** - use color coding (green=good, amber=warning, red=critical)

### 3. **Immersion First**
- **In-universe language** - "Target Lock" not "Click to Attack"
- **Diegetic UI** - controls exist in the game world
- **Realistic feedback** - buttons press, systems hum, panels light up
- **No breaking the fourth wall** - avoid meta game terms when possible

---

## Color Palette

### Primary Colors
```css
--bg-dark: #0a0e1a;           /* Deep space black */
--bg-panel: #1a1f2e;          /* Panel background */
--border-primary: #3a4a6a;    /* Panel borders */
--text-primary: #e0e6f0;      /* Main text */
--text-secondary: #8a9ab0;    /* Secondary text */
```

### Accent Colors (System Status)
```css
--accent-blue: #4a9eff;       /* Navigation, info */
--accent-cyan: #00d4ff;       /* Sensors, scanning */
--accent-green: #4caf50;      /* Operational, good */
--accent-amber: #ffa726;      /* Warning, caution */
--accent-red: #f44336;        /* Critical, danger */
--accent-purple: #9c27b0;     /* Special systems */
```

### Usage
- **Blue/Cyan**: Navigation, movement, non-combat systems
- **Green**: Operational status, successful actions
- **Amber**: Warnings, moderate damage, attention needed
- **Red**: Critical damage, emergency, failed actions
- **Purple**: Special abilities, advanced tech

---

## Typography

### Font Families
```css
--font-display: 'Orbitron', 'Rajdhani', sans-serif;  /* Headers, labels */
--font-mono: 'Share Tech Mono', 'Courier New', monospace;  /* Data, numbers */
--font-body: 'Exo 2', 'Inter', sans-serif;  /* Body text, descriptions */
```

### Usage
- **Display Font**: Section headers, ship names, big labels
- **Monospace**: Stats, coordinates, damage numbers, technical data
- **Body Font**: Descriptions, instructions, narrative text

### Sizes
- **Large (24px+)**: Screen titles, ship names
- **Medium (16-18px)**: Section headers, button labels
- **Small (14px)**: Data fields, status text
- **Tiny (12px)**: Footnotes, secondary info

---

## Component Guidelines

### Panels
```css
.control-panel {
  background: var(--bg-panel);
  border: 2px solid var(--border-primary);
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  /* Optional: scan line effect */
  background-image: repeating-linear-gradient(
    0deg, transparent, transparent 2px,
    rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px
  );
}
```

**Features:**
- Subtle inner glow on hover
- Corner brackets or notches (optional)
- Slight parallax on scroll (for depth)

### Buttons
```css
.btn-primary {
  background: linear-gradient(180deg, #4a9eff, #2a7ed5);
  border: 1px solid #6aafff;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: var(--font-display);
  transition: all 0.2s;
}

.btn-primary:hover {
  box-shadow: 0 0 20px rgba(74, 158, 255, 0.6);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.3);
}
```

**States:**
- **Normal**: Subtle gradient, slight glow
- **Hover**: Brighter glow, lift effect
- **Active**: Pressed inset shadow
- **Disabled**: Desaturated, 50% opacity

### Data Displays
```css
.stat-display {
  font-family: var(--font-mono);
  color: var(--accent-cyan);
  text-shadow: 0 0 10px currentColor;
  background: rgba(0, 212, 255, 0.1);
  border-left: 3px solid var(--accent-cyan);
  padding: 8px 12px;
}
```

**Types:**
- **Numeric**: Monospace, glowing
- **Status**: Color-coded background
- **Labels**: Uppercase, smaller size
- **Values**: Larger, brighter

### Sliders & Controls
```css
input[type="range"] {
  background: transparent;
}

input[type="range"]::-webkit-slider-track {
  background: linear-gradient(to right,
    var(--accent-blue) 0%,
    var(--accent-cyan) 100%);
  height: 4px;
  border-radius: 2px;
}

input[type="range"]::-webkit-slider-thumb {
  background: var(--accent-cyan);
  box-shadow: 0 0 10px var(--accent-cyan);
  width: 16px;
  height: 16px;
  border-radius: 50%;
}
```

**Features:**
- Gradient tracks showing value range
- Glowing thumbs
- Value displays update in real-time
- Tick marks for important values

---

## Layout Patterns

### Three-Column Layout (Current Ship Customizer)
```
┌─────────────┬──────────────────┬─────────────┐
│  Ship List  │   Main Display   │  Component  │
│  (Sidebar)  │   (SVG/Canvas)   │    Panel    │
│             │                  │             │
│  - Scout    │   [Ship Image]   │  Turret 1   │
│  - Trader   │                  │  Type: [▼]  │
│  - Corvette │   Clickable      │  Weapons    │
│             │   Components     │  [ Apply ]  │
└─────────────┴──────────────────┴─────────────┘
```

### Combat HUD Layout
```
┌─────────────────────────────────────────────────┐
│  Ship Status     Range: 1500m     Enemy Status  │
├──────────────────┬────────────────┬──────────────┤
│                  │                │              │
│  Crew Panel      │   Tactical     │  Actions     │
│                  │   Display      │              │
│  Pilot: [OK]     │                │  [Fire]      │
│  Gunner: [OK]    │   Combat Map   │  [Move]      │
│  Engineer: [OK]  │                │  [Dodge]     │
│                  │                │              │
└──────────────────┴────────────────┴──────────────┘
```

---

## Animation & Feedback

### Transitions
- **Panel open/close**: 200ms ease-out
- **Button press**: 100ms ease-in-out
- **Hover effects**: 150ms ease
- **Page transitions**: 300ms ease-in-out

### Feedback Types
1. **Visual**: Color change, glow, border highlight
2. **Motion**: Slide, fade, scale
3. **Sound** (future): Beeps, hums, clicks (optional)

### Examples
```css
/* Panel slide-in */
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Status pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Scan line effect */
@keyframes scan {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
```

---

## Icons & Symbols

### Use Cases
- **Weapons**: 🎯 ⚡ 🚀 (or custom SVG icons)
- **Systems**: ⚙️ 🔋 📡 🛡️
- **Status**: ✓ ⚠ ❌ 🔴
- **Actions**: ▶️ ⏸️ 🔄 ✖️

### Style
- **Simple geometric shapes**
- **High contrast** against backgrounds
- **Consistent stroke width** (2-3px)
- **Recognizable at small sizes** (16x16px minimum)

---

## Current Implementation Status

### ✅ Already Implemented
- Dark space-themed backgrounds
- Panel-based layouts
- Monospace fonts for data
- Color-coded status displays
- Clickable component SVGs

### 🚧 Needs Enhancement
- Add scan line effects to panels
- Implement button hover glows
- Add corner brackets to panels
- More dramatic lighting/shadows
- Animated transitions

### 📋 Future Additions
- Custom icon set
- Sound effects (optional)
- Holographic effects (CSS filters)
- More dramatic status indicators
- Loading animations (hyperspace jump?)

---

## Examples from Existing Code

### Ship Customizer Panel (Current)
```css
.component-panel {
  background: #1a1f2e;
  border: 2px solid #3a4a6a;
  border-radius: 8px;
  /* Good foundation, could add scan lines and glow */
}
```

### Status Display (Current)
```css
.component-cost {
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  /* Good start, could add left border accent */
}
```

---

## Implementation Checklist

When building new UI features, ensure:
- [ ] Dark backgrounds with appropriate contrast
- [ ] Color-coded status indicators
- [ ] Monospace fonts for technical data
- [ ] Buttons have hover/active states
- [ ] Panels have borders and shadows
- [ ] Labels use uppercase/letter-spacing
- [ ] Smooth transitions (150-300ms)
- [ ] Responsive to window resize
- [ ] Accessible (keyboard nav, screen readers)
- [ ] Themed consistently with existing UI

---

**Note:** This theme should evolve as we build. When creating new screens, always ask: "What kind of control panel would this be on a real starship?"
