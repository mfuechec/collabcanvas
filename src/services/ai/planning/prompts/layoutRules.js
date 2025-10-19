// ========================================
// COMPONENT CONSTRUCTION & LAYOUT RULES
// ========================================

export const LAYOUT_RULES = `**Component Construction:**

**Forms/Inputs:**
- Container: rectangle (height: 44-52px, cornerRadius: 6-8px, background: #F5F5F5)
- Label: above input, 8px gap, fontSize 12-14, color #666666
- Stack vertically: input + 24px gap + next input

**Buttons:**
- Primary: #0D99FF fill, white text, cornerRadius 8px, height 44-52px
- Secondary: #F5F5F5 fill, dark text, cornerRadius 6px
- Position: below last input + 32px gap

**Cards:**
- Background: #FFFFFF, cornerRadius 12-16px, padding 24-32px
- Content: title + 24px + body + button at bottom

**Layout Math:**
- Center: x = containerCenterX - (width/2), y = containerCenterY - (height/2)
- Vertical stack: y = previousY + previousHeight + gap
- Horizontal: x = previousX + previousWidth + gap
- Grid: cellX = startX + (col × (cellWidth + gap)), cellY = startY + (row × (cellHeight + gap))

**UI Process:**
1. Analyze: form/dashboard/card? Desktop(800×600) or Mobile(375×812)?
2. Calculate: title(48-64) + inputs(48×count) + buttons(48×count) + gaps(24-32)
3. Position: center on canvas (x=2500-width/2, y=2500-height/2)
4. Build: background → card → title → inputs → button
5. Validate: content fits, consistent gaps, proper alignment

**Creative Composition Guidelines:**

**Organic Shapes (faces, trees, animals):**
- Use circles for heads, eyes, sun, flowers
- Use rectangles for trunks, bodies, buildings
- Layer shapes for depth (background → midground → foreground)
- Vary sizes for visual interest (large focal point, smaller details)

**Abstract Art:**
- Use bold, contrasting colors from creative themes
- Create patterns with repetition and variation
- Balance positive and negative space
- Use geometric shapes for structure, organic for flow

**Visual Hierarchy:**
- Largest elements = most important (faces, main objects)
- Brightest colors = focal points (eyes, buttons, key features)
- Group related elements together (eyes near each other, windows on same wall)
- Leave breathing room around key elements

**Creative Positioning:**
- Rule of Thirds: Place focal points at 1/3 intersections (1667, 3333)
- Golden Ratio: Use 1.618 proportions for pleasing shapes
- Symmetry: Mirror elements for balance (eyes, windows, doors)
- Asymmetry: Offset elements for energy (abstract compositions)

**Artistic Layering:**
- Background: Large, muted shapes (sky, ground, walls)
- Midground: Medium shapes (trees, furniture, secondary objects)
- Foreground: Small, bright details (eyes, buttons, highlights)`;

