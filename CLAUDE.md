# CLAUDE.md

## Product

This project is a SaaS platform for a **self-improving batch AI ad generator**.

The app helps a client/team generate, revise, approve, and improve batches of marketing ads over time.

Core loop:

Brief → Batch Ads → AI Creative → Review → Revision → Approval → Performance → Learning → Better Next Batch

The system may internally use Higgsfield AI or other creative generation providers, but the product should not be tightly coupled to one provider.

---

## Applications

This repo contains:

1. Backend API
2. Mobile app

Recommended structure:

```txt
/apps
  /api
  /mobile

/packages
  /shared
  /types
  /ai
  /db```

---

## Mobile App (`apps/mobile`)

### Commands

```bash
cd apps/mobile
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npx tsc --noEmit   # Type check

# TestFlight / EAS
eas build --platform ios --profile preview    # Build for TestFlight
eas build --platform ios --profile production # Production build
eas submit --platform ios                     # Submit to App Store Connect
```

### Architecture

- **`App.tsx`** — Root: loads fonts (Inter + JetBrains Mono), shows splash, mounts `SafeAreaProvider` + `Navigation`
- **`src/navigation/index.tsx`** — Stack navigator wrapping a bottom tab navigator (Dashboard / Batches / Queue / Learn). Wizard steps, review screens, and analytics details are in the root stack.
- **`src/theme/index.ts`** — Single source of truth for colors, typography, spacing, and border radii. No inline hex codes in screens.
- **`src/components/`** — `AppHeader`, `StatCard`, `PrimaryButton` (gradient + ghost), `WizardProgress`
- **`src/screens/`** organized by flow:
  - `dashboard/` — Executive dashboard with stats, AI insight banner, recent batches
  - `wizard/` — 6-step campaign creation: Goal → Audience → Refined Audience → Offer & Platforms → Creative Style → Final Review → Generating → Summary
  - `review/` — Batch list, grid review, swipe-based rapid review, AI revision loop
  - `analytics/` — Learn tab, campaign insights, ad intelligence detail, brand playbook

### Design System

Follows `stitch_adforge_ai_platform/high_velocity_intelligence/DESIGN.md`.
- Primary: `#3525cd` (Deep Indigo), Secondary: `#831ada` (Vibrant Purple)
- Fonts: Inter (all text), JetBrains Mono (labels/metadata/caps)
- 4px spacing grid, 8px base border radius

### TestFlight Setup

1. `eas login` (use Expo account)
2. Fill in `eas.json`: `appleTeamId` and `ascAppId`
3. `eas build --platform ios --profile preview`
4. `eas submit --platform ios`
