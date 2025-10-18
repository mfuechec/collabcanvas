// ========================================
// TOOL DEFINITIONS FOR AI PROMPT
// ========================================

export const TOOL_DEFINITIONS = `**Available Tools with Parameters:**

**TEMPLATE TOOLS (FASTEST - Always prefer these for common UI patterns!)**

1. **use_login_template** - Instantly generate professional login forms (100-300x faster than batch_operations!)
   Args: { primaryColor: string (hex, e.g. '#8B5CF6'), size: 'small'|'normal'|'large', style: 'modern'|'minimal'|'bold', fields: ['email', 'password', 'username', 'phone', 'name'], socialProviders: ['google', 'facebook', 'twitter', 'github'], titleText: string, subtitleText: string }
   Use for: Login screens, signin forms, authentication UI
   Examples:
   - "create a login form" → {primaryColor: null, size: null, style: null, fields: null, socialProviders: null}
   - "create a purple login form with email and phone" → {primaryColor: '#8B5CF6', fields: ['email', 'phone']}
   - "create a minimal login with google signin" → {style: 'minimal', socialProviders: ['google']}
   Performance: ~10-15ms vs ~3-5s for batch_operations (300x faster!)
   **RESPONSE FORMAT**: Describe what was created: "I've created a [style] login form with [fields] fields!" (e.g., "I've created a modern login form with email, password fields!")

2. **use_navbar_template** - Instantly generate professional navigation bars
   Args: { primaryColor: string (hex), backgroundColor: string (hex), items: ['Home', 'About', ...], itemCount: number, height: number, style: 'modern'|'minimal'|'bold' }
   Use for: Navigation bars, top menus, headers
   Examples:
   - "create a navbar" → {primaryColor: null, items: null}
   - "create a red navbar with 5 items" → {primaryColor: '#EF4444', itemCount: 5}
   Performance: ~10-15ms vs ~2-3s for batch_operations (200x faster!)
   **RESPONSE FORMAT**: Describe what was created: "I've created a [style] navigation bar with [N] items!" (e.g., "I've created a modern navigation bar with 5 items!")

3. **use_card_template** - Instantly generate professional card layouts
   Args: { primaryColor: string (hex), style: 'modern'|'minimal'|'bold', hasImage: boolean, hasTitle: boolean, hasDescription: boolean, hasButton: boolean }
   Use for: Cards, panels, content blocks
   Examples:
   - "create a card" → {primaryColor: null, style: null}
   - "create a blue card with image and button" → {primaryColor: '#3B82F6', hasImage: true, hasButton: true}
   Performance: ~10-15ms vs ~2-3s for batch_operations (200x faster!)
   **RESPONSE FORMAT**: Describe what was created: "I've created a [style] card with [components]!" (e.g., "I've created a modern card with image, title, description, and button!")

**GENERAL TOOLS (Use when templates don't fit)**

4. **batch_operations** - Execute mixed operations (create/update/delete) in a single call
   Args: { operations: [{type: 'create', shape: {...}}, {type: 'update', shapeId: 'shape_...', updates: {...}}, {type: 'delete', shapeId: 'shape_...'}] }
   CRITICAL: 
   - **USE THIS FOR ALL create/update/delete operations!**
   - **ALWAYS use this for UI layouts (login, dashboard, forms, etc.)** - Create ALL shapes in ONE batch!
   - ONLY valid types: 'create', 'update', 'delete' (NO 'rotate', 'move', 'resize', etc.!)
   - For rotating/moving ALL shapes → Use batch_update_shapes instead (MUCH FASTER!)
   - **UPDATE FORMAT (CRITICAL - READ CAREFULLY):**
     * ✅ CORRECT: {type: 'update', shapeId: 'shape_123', updates: {fill: '#EF4444'}}
     * ❌ WRONG: {type: 'update', shape: {type:'text', x:0, y:0, fill:'#EF4444', ...}} - DO NOT USE 'shape' FIELD!
     * ❌ WRONG: {type: 'update', shapeId: 'shape_123', updates: {x:0, y:0, width:0, ...}} - ONLY include changed fields!
     * The 'updates' object should ONLY contain fields you want to change (e.g., just {fill: '#FF0000'} to change color)
     * NEVER send x:0, y:0, width:0, fontSize:0, etc. for fields you don't want to change!
   - For CREATE operations, specify shape properties:
     * Circles: use 'radius' parameter (e.g., {type:'circle', x:100, y:100, radius:50, fill:'#FF0000'})
     * Rectangles: use 'width' and 'height' (e.g., {type:'rectangle', x:100, y:100, width:100, height:80, fill:'#FF0000'})
     * Text: use 'text' and 'fontSize' (e.g., {type:'text', x:100, y:100, text:'Hello', fontSize:24, fill:'#000000'})
     * Lines: use 'x1,y1,x2,y2' (e.g., {type:'line', x1:100, y1:100, x2:200, y2:200, stroke:'#000000', strokeWidth:2})
     * Include 'type' field to ensure correct shape creation
     * DO NOT include 'opacity', 'stroke', or 'strokeWidth' for new shapes (use defaults)
   - Performance: 10 shapes in 1 batch = ~200ms vs. 10 individual calls = ~1500ms (7x faster!)
   Use for: Creating ANY shapes (1+), custom UI layouts (NOT login/navbar/card - use templates!), deleting shapes, updating shapes, mixed operations (create+delete, etc.)

5. **batch_update_shapes** - Update multiple shapes with same properties OR apply relative transforms
   Args: { shapeIds: array of strings, updates: object with fill/fontSize/opacity (optional), deltaX: number (optional), deltaY: number (optional), deltaRotation: number (optional), scaleX: number (optional), scaleY: number (optional) }
   Examples: Move all 100px right: {deltaX: 100}, Double all sizes: {scaleX: 2, scaleY: 2}, Rotate all 45°: {deltaRotation: 45}, Make all 50% transparent: {updates: {opacity: 0.5}}

6. **create_grid** - Create a grid of rectangles
   Args: { startX: number(0-5000, default 500), startY: number(0-5000, default 500), rows: number(1-20), cols: number(1-20), cellWidth: number(20-200, default 80), cellHeight: number(20-200, default 80), spacing: number(0-50, default 10), fill: string (hex color, default #3B82F6) }

7. **create_row** - Create a horizontal row of rectangles
   Args: { startX: number(0-5000, default 500), startY: number(0-5000, default 500), count: number(1-50), width: number(20-200, default 80), height: number(20-200, default 80), spacing: number(0-50, default 10), fill: string (hex color, default #3B82F6) }

8. **create_circle_row** - Create a horizontal row of circles
   Args: { startX: number(0-5000, default 500), startY: number(0-5000, default 500), count: number(1-50), radius: number(10-100, default 40), spacing: number(0-50, default 10), fill: string (hex color, default #3B82F6) }

9. **clear_canvas** - Clear all shapes from canvas
    Args: {} (no arguments needed)

10. **add_random_shapes** - Generate random shapes for testing and quick population
   Args: { count: number (1-1000), types: array of shape types or null (default: all types), balanced: boolean or null (default: true) }
   Use for: Performance testing, stress testing, quickly filling canvas, demonstrations
   Examples: 
   - { count: 100, types: null, balanced: true } → 100 evenly distributed random shapes
   - { count: 50, types: ["circle", "rectangle"], balanced: false } → 50 random circles/rectangles
   - { count: 500, types: null, balanced: true } → 500 random shapes for stress testing

**REMEMBER: For login/navbar/card use templates! For other operations use batch_operations!**`;

