# Theme System — Common Documentation

## Overview
CSS-variable-based theme system with React context. Supports light, dark, and system (OS preference) modes.

## Files
- Context: `client/src/context/ThemeContext.jsx`
- UI Component: `client/src/components/AppearanceSettings.jsx`
- CSS Variables: `client/src/index.css`

## How It Works
1. `ThemeContext` reads saved preference from `localStorage`
2. On mount, applies class `theme-dark` or `theme-light` to `<html>`
3. CSS variables switch colors automatically
4. `AppearanceSettings.jsx` gives users a picker (light / dark / system)

## ✅ Implemented
- [x] Light / Dark / System theme modes
- [x] Persisted to localStorage
- [x] CSS custom properties for all colors, radii, shadows
- [x] `AppearanceSettings` component integrated in Provider, Household, Federation Settings pages
- [x] Smooth transition animations between themes

## ❌ Not Yet Implemented
- [ ] Per-portal custom accent color picker
- [ ] High-contrast accessibility mode
- [ ] Font size / density settings
- [ ] Theme synced to user profile in DB (cross-device persistence)

## CSS Variable Conventions
```css
--bg-primary      /* Main background */
--bg-secondary    /* Card / panel background */
--text-primary    /* Primary text */
--text-secondary  /* Muted / secondary text */
--accent          /* Brand accent color */
--border          /* Border color */
--shadow          /* Box shadow value */
```
