---
name: High-Velocity Intelligence
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
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#831ada'
  on-secondary: '#ffffff'
  secondary-container: '#9e41f5'
  on-secondary-container: '#fffbff'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb8ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6800b4'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system embodies a "High-Velocity Intelligence" aesthetic—a fusion of **Minimalism** and **Corporate Modern** styles. It is designed for a premium AI SaaS environment where precision, speed, and creative power are paramount. 

The visual language draws inspiration from industry leaders like Linear and Figma, utilizing generous whitespace, a restricted but purposeful color palette, and subtle depth. The goal is to reduce cognitive load in data-heavy environments while maintaining a sophisticated, high-end feel. The emotional response should be one of total control, professional reliability, and cutting-edge capability.

## Colors

The palette is anchored by **Deep Indigo** (#4F46E5) for primary actions and **Vibrant Purple** (#9333EA) for AI-augmented features and accents. 

- **Primary & Secondary:** Used sparingly to draw attention to key interactions and "magic" AI moments.
- **Neutrals:** A sophisticated range of Slate and Zinc grays is used for typography, borders, and subtle backgrounds to ensure the interface feels grounded.
- **Functional Colors:** High-contrast tokens for Success (Emerald), Warning (Amber), and Error (Rose) are required for status indicators.
- **Adaptive Modes:** In Dark Mode, backgrounds shift to a deep navy-black (#0B0A1A) rather than pure black to maintain a premium, softened contrast that reduces eye strain during long sessions.

## Typography

The system utilizes **Inter** as its primary typeface due to its exceptional legibility in SaaS interfaces and its neutral, systematic character. 

- **Hierarchy:** We use tight tracking (letter-spacing) on larger headlines to create a "compact" premium look. 
- **Monospace Accent:** **JetBrains Mono** is introduced for labels, metadata, and AI-generated code or IDs to signal precision and technical "under-the-hood" intelligence.
- **Responsive Scaling:** Headlines scale down significantly for mobile to ensure high-velocity information scanning without excessive scrolling.

## Layout & Spacing

The design system employs a **Fluid Grid** with fixed-width constraints for content-heavy views. 

- **The 4px Rule:** All spacing and sizing must be multiples of 4px to maintain a strict mathematical rhythm.
- **Desktop:** 12-column grid with a 1200px or 1440px max-width container for core application views.
- **Mobile:** 4-column grid with 16px side margins.
- **Information Density:** For "Canvas" or "Editor" views, the system switches to a "No Grid" layout, utilizing dynamic padding and side panels that can be collapsed to maximize the workspace.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Ambient Shadows**.

- **Surfaces:** Use a 3-tier elevation system. Level 0 is the base canvas. Level 1 (Cards/Panels) uses a subtle 1px border (#E2E8F0 in light, #1E293B in dark). Level 2 (Modals/Popovers) uses a soft, extra-diffused shadow with a 10% opacity primary-color tint to simulate depth.
- **Borders:** "Ghost borders" (low-contrast outlines) are preferred over heavy shadows for a cleaner, more modern look.
- **Glassmorphism:** Use sparingly for top navigation bars or floating toolbars (20px backdrop blur, 80% surface opacity) to maintain context of the content underneath.

## Shapes

The shape language is consistently **Rounded**, using 8px (0.5rem) as the base radius for standard components like buttons and inputs. Larger containers and cards use 12px or 16px to evoke a friendly yet professional "app-like" feel. Pill-shapes are reserved strictly for status badges and tags.

## Components

- **Buttons:** Primary buttons use a subtle top-to-bottom gradient of Deep Indigo to Vibrant Purple. Secondary buttons are "Ghost" style with a light gray border and no fill.
- **Input Fields:** 12px corner radius, 1px border. On focus, the border transitions to Primary Indigo with a 2px outer "glow" (shadow) of the same color at 15% opacity.
- **Cards:** White or Deep Navy background, 1px subtle border, and 16px corner radius. Grouped content should use "Section Headers" with the Monospace label font.
- **AI Magic Elements:** Any component that is AI-powered should feature a subtle "shimmer" border effect or a secondary purple glow to distinguish it from manual inputs.
- **Chips/Badges:** High-contrast text on low-opacity backgrounds (e.g., Green text on 10% Green background) for status indicators.
- **Navigation:** Vertical sidebar for desktop (collapsible), Bottom-tab bar for mobile to ensure thumb-reachability.