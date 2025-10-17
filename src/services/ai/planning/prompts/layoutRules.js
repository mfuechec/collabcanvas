// ========================================
// COMPONENT CONSTRUCTION & LAYOUT RULES
// ========================================

export const LAYOUT_RULES = `**Component Construction Algorithms:**

**Forms/Input Fields:**
- Container: rectangle (width: content-based, height: 44-52px, cornerRadius: 6-8px)
- Background: #F5F5F5 or #FFFFFF
- Border: overlay with #E5E5E5, opacity 0.3
- Label: above input, 8px gap, fontSize 12-14, color #666666
- Input text: inside container, 16px left padding, fontSize 15-16
- Vertical stacking: input + 24px gap + next input

**Buttons:**
- Primary action: fill #0D99FF, white text (#FFFFFF), cornerRadius 8px
- Secondary: fill #F5F5F5, dark text (#1E1E1E), cornerRadius 6px
- Dimensions: height 44-52px, width auto (text + 32px horizontal padding)
- Position: typically below last input + 32px gap

**Cards:**
- Background: #FFFFFF, cornerRadius 12-16px
- Border: overlay #E5E5E5, opacity 0.2-0.3
- Shadow: 2-4 darker layers below, offset 2-4px, opacity 0.04-0.08 each
- Internal padding: 24-32px from edges
- Content: title at top + 24px, body below, button at bottom - 32px

**Lists/Rows:**
- Item height: 60-80px (mobile) or 80-120px (desktop)
- Separator: 1px line, #E5E5E5, opacity 0.5
- Avatar/icon: left side, 40-48px circle
- Text: to right of avatar, 16px gap, vertically centered
- Metadata: right side or below primary text

**Layout Math (Apply These Formulas):**

**Centering elements:**
- Horizontal: x = containerCenterX - (elementWidth / 2)
- Vertical: y = containerCenterY - (elementHeight / 2)
- Text centering: estimate textWidth ≈ text.length × fontSize × 0.6

**Vertical stacking (forms, lists):**
- First element: y = containerTop + topPadding
- Each subsequent: y = previousY + previousHeight + gap
- Last element check: y + height ≤ containerBottom - bottomPadding

**Horizontal arrangement (buttons, cards):**
- First element: x = startX
- Each subsequent: x = previousX + previousWidth + gap
- Total width: (elementWidth × count) + (gap × (count - 1))

**Grid layouts:**
- Cell X: startX + (col × (cellWidth + gap))
- Cell Y: startY + (row × (cellHeight + gap))
- Total dimensions: check fits within container

**Multi-screen layouts:**
- Second screen X: firstScreenCenterX + firstScreenWidth/2 + gap + secondScreenWidth/2
- Same Y coordinate (keep aligned)
- Recommended gap between screens: 100-200px

**UI Generation Process:**

1. **Analyze Request**
   - Type: form/dashboard/list/card? 
   - Screen: Desktop (800×600) or Mobile (375×812)?
   - Components: title, inputs, buttons, etc.

2. **Calculate Space**
   - Heights: title(48-64) + inputs(48×count) + buttons(48×count) + gaps(24-32 each)
   - Total must fit in container
   - All spacing = multiples of 8

3. **Position Container**
   - Center on canvas: x = 2500 - (width/2), y = 2500 - (height/2)
   - Multiple screens: offset horizontally, same Y

4. **Build Hierarchy (CRITICAL ORDER)**
   - Background layer (full size, #F5F5F5)
   - Card layer (40px padding from edges, #FFFFFF, cornerRadius 12)
   - Title (top of card + 32px padding, fontSize 48)
   - Inputs (stack vertically, 24px gaps, cornerRadius 6-8)
   - Button (bottom - 32px from edge, cornerRadius 8, #0D99FF)

5. **Validate**
   - All content fits? (x + width ≤ container right, y + height ≤ container bottom)
   - Consistent gaps? (same spacing = same pixels)
   - Proper alignment? (inputs same width, centered or left-aligned)`;

