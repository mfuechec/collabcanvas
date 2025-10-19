// ========================================
// TOOL DEFINITIONS FOR AI PROMPT
// ========================================

export const TOOL_DEFINITIONS = `**Available Tools:**

**TEMPLATE TOOLS (FASTEST - Use for UI patterns!)**
1. **use_login_template** - Login forms (300x faster!)
   Args: { primaryColor: string, size: 'small'|'normal'|'large', style: 'modern'|'minimal'|'bold', fields: ['email', 'password', 'username', 'phone', 'name'], socialProviders: ['google', 'facebook', 'twitter', 'github'], titleText: string, subtitleText: string }
   Examples: "create login" → {primaryColor: null}, "purple login with email/phone" → {primaryColor: '#8B5CF6', fields: ['email', 'phone']}

2. **use_navbar_template** - Navigation bars
   Args: { primaryColor: string, backgroundColor: string, items: ['Home', 'About', ...], itemCount: number, height: number, style: 'modern'|'minimal'|'bold' }
   Examples: "create navbar" → {primaryColor: null}, "red navbar with 5 items" → {primaryColor: '#EF4444', itemCount: 5}

3. **use_card_template** - Card layouts
   Args: { primaryColor: string, style: 'modern'|'minimal'|'bold', hasImage: boolean, hasTitle: boolean, hasDescription: boolean, hasButton: boolean }
   Examples: "create card" → {primaryColor: null}, "blue card with image/button" → {primaryColor: '#3B82F6', hasImage: true, hasButton: true}

**GENERAL TOOLS**
4. **batch_operations** - Create/update/delete shapes in one call
   Args: { operations: [{type: 'create', shape: {...}}, {type: 'update', shapeId: 'shape_...', updates: {...}}, {type: 'delete', shapeId: 'shape_...'}] }
   CRITICAL: 
   - Use for ALL create/update/delete operations
   - Create ALL shapes in ONE batch (7x faster!)
   - UPDATE format: {type: 'update', shapeId: 'shape_123', updates: {fill: '#FF0000'}} (ONLY changed fields!)
   - CREATE shapes: Circles use 'radius', rectangles use 'width'/'height', text uses 'text'/'fontSize', lines use 'x1,y1,x2,y2'
   - Include 'type' field, exclude 'opacity'/'stroke'/'strokeWidth' for new shapes

5. **batch_update_shapes** - Transform multiple shapes
   Args: { shapeIds: array, updates: {fill/fontSize/opacity}, deltaX: number, deltaY: number, deltaRotation: number, scaleX: number, scaleY: number }
   Examples: Move right: {deltaX: 100}, Double size: {scaleX: 2, scaleY: 2}, Rotate: {deltaRotation: 45}

6. **create_grid** - Grid of rectangles
   Args: { startX: number(0-5000), startY: number(0-5000), rows: number(1-20), cols: number(1-20), cellWidth: number(20-200), cellHeight: number(20-200), spacing: number(0-50), fill: string }

7. **create_row** - Horizontal row of rectangles
   Args: { startX: number(0-5000), startY: number(0-5000), count: number(1-50), width: number(20-200), height: number(20-200), spacing: number(0-50), fill: string }

8. **create_circle_row** - Horizontal row of circles
   Args: { startX: number(0-5000), startY: number(0-5000), count: number(1-50), radius: number(10-100), spacing: number(0-50), fill: string }

9. **clear_canvas** - Clear all shapes
   Args: {} (no arguments)

10. **add_random_shapes** - Generate random shapes
   Args: { count: number(1-1000), types: array or null, balanced: boolean or null }
   Examples: {count: 100} → 100 random shapes, {count: 50, types: ["circle", "rectangle"]} → 50 circles/rectangles

**PRIORITY: Templates for UI patterns, batch_operations for everything else!**`;

