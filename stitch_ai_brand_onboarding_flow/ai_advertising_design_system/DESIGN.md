---
name: AI Advertising Design System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464554'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777586'
  outline-variant: '#c7c4d7'
  surface-tint: '#5148d7'
  primary: '#2a14b4'
  on-primary: '#ffffff'
  primary-container: '#4338ca'
  on-primary-container: '#c1beff'
  inverse-primary: '#c3c0ff'
  secondary: '#6b38d4'
  on-secondary: '#ffffff'
  secondary-container: '#8455ef'
  on-secondary-container: '#fffbff'
  tertiary: '#00414d'
  on-tertiary: '#ffffff'
  tertiary-container: '#005a6a'
  on-tertiary-container: '#4ad5f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#100069'
  on-primary-fixed-variant: '#372abf'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Sora
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is engineered for an AI-powered advertising ecosystem, prioritizing clarity, technical sophistication, and high-performance aesthetics. The brand personality is **Professional**, **Innovative**, and **Trustworthy**. 

The visual style leans into **Modern Corporate** with subtle **Glassmorphism** accents to signify "intelligence" and "transparency." It employs a high-ratio of white space to ensure data density doesn't lead to cognitive overload. Elements should feel precise and calculated, using thin borders and soft gradients to suggest a digital-first, futuristic environment. The "AI-forward" feel is achieved through the intersection of deep atmospheric indigos and vibrant kinetic purples.

## Colors

The palette is anchored by deep indigos to establish institutional trust, contrasted by vibrant purples that represent the creative spark of AI generation.

- **Primary (Indigo-700):** Used for core branding, primary actions, and active states.
- **Secondary (Violet-500):** Used for highlighting AI-generated insights, trends, and growth indicators.
- **Tertiary (Cyan-500):** Reserved for success states and secondary data points.
- **Neutral (Slate):** A scale of grays used for typography (Slate-900), borders (Slate-200), and backgrounds (Slate-50).

The background should remain predominantly white (#FFFFFF) to maintain a clean, airy feel, using Slate-50 for subtle section nesting.

## Typography

This design system uses two distinct sans-serifs to balance technical precision with readability:

1.  **Sora (Headlines):** A geometric sans-serif with a futuristic edge. It is used for all display and heading levels to command attention and reinforce the high-tech narrative.
2.  **Hanken Grotesk (Body & Labels):** A sharp, contemporary grotesque that provides exceptional legibility for data-heavy dashboards and brand profile settings.

Keep line lengths for body text between 60-80 characters for optimal readability. Use a semi-bold weight for labels to ensure they stand out against the clean background.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** model for desktop and a **Fluid** model for mobile.

- **Desktop (1280px+):** 12-column grid with 24px gutters and 32px side margins. Max container width is fixed at 1280px to prevent visual fatigue on ultra-wide monitors.
- **Tablet (768px - 1279px):** 8-column fluid grid with 16px gutters and 24px margins.
- **Mobile (< 767px):** 4-column fluid grid with 12px gutters and 16px margins.

Spacing follows an 8px rhythm. Use `lg` (40px) for section vertical spacing and `md` (24px) for spacing between related cards or dashboard widgets.

## Elevation & Depth

Visual hierarchy is established using **Tonal Layers** and **Subtle Glassmorphism**.

- **Level 0 (Surface):** The main background (Slate-50).
- **Level 1 (Card/Container):** White (#FFFFFF) with a 1px border in Slate-200. No shadow.
- **Level 2 (Active/Floating):** White with a soft, diffused shadow: `0 8px 24px rgba(67, 56, 202, 0.08)`. Note the indigo tint in the shadow to maintain color harmony.
- **Level 3 (Modals/Overlays):** Backdrop blur of 12px with a semi-transparent white fill (90% opacity). 

Avoid heavy drop shadows; depth should feel atmospheric rather than physical.

## Shapes

The design system utilizes a **Rounded (Level 2)** approach. 

- Standard components (buttons, inputs) use a **0.5rem (8px)** radius.
- Large containers and brand profile cards use a **1rem (16px)** radius.
- Interactive chips or status badges use a **pill-shaped** radius for maximum distinction.

This roundedness softens the technical nature of AI, making the platform feel approachable and modern rather than cold and industrial.

## Components

### Buttons
- **Primary:** Solid Primary Indigo with white text.
- **Secondary:** Transparent with Primary Indigo border and text.
- **AI-Action:** A subtle gradient from Primary Indigo to Secondary Purple to denote an AI-powered feature.

### Progress Indicators & Loading
- **Progress Bars:** Thin 4px tracks in Slate-200 with Primary Indigo fills.
- **Shimmer Effect:** For loading states, use a linear gradient shimmer (`#F1F5F9` to `#E2E8F0` to `#F1F5F9`) moving left to right at a 2-second interval.

### File Upload Zones
- Dashed border in Slate-300. 
- Background: Slate-50.
- State: When a file is dragged over, the border transitions to Primary Indigo with a soft blue tint background.

### Brand Profiles (Editable)
- Use "Ghost" inputs that reveal a border and Slate-50 background only on hover/focus.
- Profile images and brand logos should be contained in circular frames with a 2px Slate-100 stroke.

### Input Fields
- Heights should be 40px (md) or 48px (lg).
- Labels are placed above the field in `label-md`.
- Focus state: 1px Primary Indigo border with a 2px outer glow in Secondary Purple at 20% opacity.