# UI/UX Audit: Mayhem Sequence

## Overview
Mayhem Sequence leverages a **Neobrutalist** design system characterized by bold borders, sharp shadows, vibrant primary colors, and high-contrast typography (Syne & IBM Plex Mono). This audit evaluates the current implementation against Neobrutalist standards, accessibility (WCAG 2.1), and general UX best practices.

---

## 🟢 The Good (Strengths)
1.  **Bold Identity**: The application has a strong, memorable "indie-game dev" aesthetic that fits the target audience.
2.  **Information Density**: The Dashboard and Issues pages manage complex data without feeling overwhelming.
3.  **Recent Improvements**:
    *   **Changelog Page**: Now features "Terminal-style" AI banners and neobrutalist inputs.
    *   **Keyboard UX**: Added `Shift+Enter` support for rapid list editing.
4.  **Responsiveness**: The `AppShell` handles sidebar collapsing and mobile overlays effectively.

---

## 🔴 The Bad (Weaknesses)

### 1. Inconsistent Border Language
*   **Issue**: Some components use `border-2`, others `border-[2.5px]`, and some use `border-black` instead of `var(--black)`.
*   **Impact**: Subtle visual dissonance that makes the app feel slightly "assembled" rather than "designed."
*   **Suggestion**: Standardize on `2.5px` (or `3px` for extra bold) using the CSS variable `var(--border)`.

### 2. Hardcoded Color Values
*   **Issue**: Many components use `bg-white` or `bg-[#0d0d0d]` instead of `var(--cream)` or `var(--black)`.
*   **Impact**: Breaks the newly implemented **Dark Mode**. Elements with hardcoded white backgrounds will stay bright in dark mode.
*   **Suggestion**: Audit all `src/app` files for hardcoded hex/Tailwind colors and replace with `var(--*)`.

### 3. Subtle Hover/Active States
*   **Issue**: Neobrutalism demands aggressive feedback. Currently, many buttons just have a simple `hover:bg-opacity`.
*   **Impact**: Feels "flat" despite the bold borders.
*   **Suggestion**: Implement the "Brutalist Shift": `hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_var(--black)]` and `active:translate-x-[0px] active:translate-y-[0px] active:shadow-none`.

### 4. Accessibility Gaps
*   **Issue**: Interactive icons (Bell, Search, Toggle) lack `aria-label`. 
*   **Impact**: Poor experience for screen reader users.
*   **Suggestion**: Add descriptive `aria-label` to all icon-only buttons.

### 5. Form Element Styling
*   **Issue**: "Status" and "Priority" dropdowns on the Issues page use standard browser selects.
*   **Impact**: Breaks the immersion of the neobrutalist theme.
*   **Suggestion**: Implement custom Neobrutalist select components with bold borders and sharp dropdown shadows.

---

## 💡 Top 5 Suggested Improvements

1.  **Unify the Border System**: Create a global utility `.ms-border` and `.ms-shadow` that strictly follows the master variables.
2.  **Custom Brutalist Selects**: Replace all native selects in the Issues and Feedback pages with custom components.
3.  **Enhanced Status Pills**: Use the "Sticker" aesthetic for status pills (thicker borders, slight rotation or offset).
4.  **Dark Mode Audit**: Systematically go through the `Issues` Kanban and `Analytics` charts to ensure they support the theme flip.
5.  **Micro-Animations**: Add a slight "jitter" or "pop" animation to neobrutalist buttons on hover using Framer Motion or simple CSS keyframes.

---

## 🏗️ Audit Checklist for Next Turn
- [ ] Refactor `Issues` Kanban board to use `var(--cream)` and `var(--black)`.
- [ ] Replace `bg-white` in `Dashboard` cards with `bg-[var(--cream)]` (or secondary cream).
- [ ] Add `aria-label` to all header buttons.
- [ ] Standardize all shadows to `var(--shadow)`.
