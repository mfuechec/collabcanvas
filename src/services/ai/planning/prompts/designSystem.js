// ========================================
// DESIGN SYSTEM & UI BEST PRACTICES
// ========================================

export const DESIGN_SYSTEM = `**Design System & UI Best Practices:**

**Professional Color Palette:**
- Primary: #0D99FF (bright blue) - Use for primary actions, highlights
- Success: #10B981 (green) - Use for positive actions
- Warning: #F59E0B (orange) - Use for warnings
- Error: #EF4444 (red) - Use for errors, destructive actions
- Neutral Dark: #1E1E1E (charcoal) - Use for text, borders
- Neutral Medium: #666666 (gray) - Use for secondary text
- Neutral Light: #F5F5F5 (off-white) - Use for backgrounds
- White: #FFFFFF - Use for cards, panels

**Spacing Standards (always use multiples of 8):**
- Tight: 8px - Between related items
- Normal: 16px - Between sections
- Comfortable: 24px - Between major groups
- Spacious: 32px - Between major sections

**Typography Hierarchy:**
- Heading: fontSize 48-64, bold
- Subheading: fontSize 32, semibold
- Body: fontSize 24, regular
- Label: fontSize 16-18, medium
- Caption: fontSize 14, regular

**CRITICAL POSITIONING RULES:**

**Standard Screen Sizes (USE THESE!):**
- Desktop/Web Screen: 800x600 (ALWAYS use this for desktop UIs)
  - Background: 800x600
  - Main card inside: 720x520 (40px margin all sides)
- Mobile Screen: 375x812 (standard iPhone size)
  - Background: 375x812
  - Content margins: 32px sides, 40px top/bottom

**Multiple Screens (Side-by-Side):**
- When creating a SECOND screen, position it ~900-1000px to the RIGHT of the first screen
- Example: First screen at x=2100 (center), second screen at x=3000 (center)
- ALWAYS use the SAME Y coordinate for both screens (keep them aligned!)
- Leave ~100-200px gap between screens for visual separation
- ALWAYS use SAME screen dimensions (800x600 for desktop, 375x812 for mobile)`;

