// ========================================
// TOOL USAGE EXAMPLES
// ========================================

export const TOOL_EXAMPLES = `**Examples:**

**Query:** "What is the radius of the blue circle?"
{"plan": [], "reasoning": "The blue circle has a radius of 100 pixels."}

**Update:** "Make it red" (shape_123)
{"plan": [{"step": 1, "tool": "batch_operations", "args": {"tool": "batch_operations", "operations": [{"type": "update", "shapeId": "shape_123", "updates": {"fill": "#EF4444"}}]}, "description": "Change shape color to red"}], "reasoning": "Done! I've changed it to red."}

**Create:** "Create 5 random shapes"
{"plan": [{"step": 1, "tool": "batch_operations", "args": {"tool": "batch_operations", "operations": [{"type": "create", "shape": {"type": "circle", "x": 500, "y": 500, "radius": 50, "fill": "#FF0000"}}, {"type": "create", "shape": {"type": "rectangle", "x": 800, "y": 500, "width": 100, "height": 80, "fill": "#00FF00"}}]}, "description": "Create 5 random shapes"}], "reasoning": "Created 5 colorful shapes!"}

**Transform:** "Rotate everything 45 degrees"
{"plan": [{"step": 1, "tool": "batch_update_shapes", "args": {"tool": "batch_update_shapes", "shapeIds": ["shape_1", "shape_2"], "deltaRotation": 45}, "description": "Rotate all shapes by 45 degrees"}], "reasoning": "Rotated all shapes!"}

**Move:** "Move everything right by 100 pixels"
{"plan": [{"step": 1, "tool": "batch_update_shapes", "args": {"tool": "batch_update_shapes", "shapeIds": ["shape_1", "shape_2"], "deltaX": 100}, "description": "Move all shapes right by 100px"}], "reasoning": "Moved all shapes!"}

**Creative Examples:**

**Tree:** "Draw a tree"
{"plan": [{"step": 1, "tool": "batch_operations", "args": {"tool": "batch_operations", "operations": [{"type": "create", "shape": {"type": "rectangle", "x": 2500, "y": 2400, "width": 40, "height": 200, "fill": "#8B4513"}}, {"type": "create", "shape": {"type": "circle", "x": 2500, "y": 2300, "radius": 80, "fill": "#228B22"}}, {"type": "create", "shape": {"type": "circle", "x": 2450, "y": 2250, "radius": 60, "fill": "#32CD32"}}, {"type": "create", "shape": {"type": "circle", "x": 2550, "y": 2250, "radius": 60, "fill": "#32CD32"}}]}, "description": "Create tree with brown trunk and layered green foliage"}], "reasoning": "Created a natural-looking tree with proper proportions!"}

**Face:** "Create a face"
{"plan": [{"step": 1, "tool": "batch_operations", "args": {"tool": "batch_operations", "operations": [{"type": "create", "shape": {"type": "circle", "x": 2500, "y": 2500, "radius": 100, "fill": "#FFDBB5"}}, {"type": "create", "shape": {"type": "circle", "x": 2450, "y": 2450, "radius": 15, "fill": "#000000"}}, {"type": "create", "shape": {"type": "circle", "x": 2550, "y": 2450, "radius": 15, "fill": "#000000"}}, {"type": "create", "shape": {"type": "circle", "x": 2500, "y": 2550, "radius": 8, "fill": "#FF69B4"}}]}, "description": "Create face with head, eyes, and mouth"}], "reasoning": "Created a friendly face with proper proportions!"}

**House:** "Make a house"
{"plan": [{"step": 1, "tool": "batch_operations", "args": {"tool": "batch_operations", "operations": [{"type": "create", "shape": {"type": "rectangle", "x": 2500, "y": 2600, "width": 200, "height": 150, "fill": "#F4A460"}}, {"type": "create", "shape": {"type": "rectangle", "x": 2500, "y": 2500, "width": 200, "height": 100, "fill": "#8B4513"}}, {"type": "create", "shape": {"type": "rectangle", "x": 2450, "y": 2550, "width": 30, "height": 50, "fill": "#654321"}}, {"type": "create", "shape": {"type": "rectangle", "x": 2550, "y": 2520, "width": 20, "height": 20, "fill": "#87CEEB"}}]}, "description": "Create house with base, roof, door, and window"}], "reasoning": "Built a cozy house with all the essential elements!"}

**Abstract Art:** "Create something beautiful"
{"plan": [{"step": 1, "tool": "batch_operations", "args": {"tool": "batch_operations", "operations": [{"type": "create", "shape": {"type": "circle", "x": 2000, "y": 2000, "radius": 80, "fill": "#FF6B6B"}}, {"type": "create", "shape": {"type": "circle", "x": 3000, "y": 2000, "radius": 80, "fill": "#4ECDC4"}}, {"type": "create", "shape": {"type": "circle", "x": 2500, "y": 3000, "radius": 100, "fill": "#45B7D1"}}, {"type": "create", "shape": {"type": "rectangle", "x": 2500, "y": 2500, "width": 200, "height": 20, "fill": "#FFD93D"}}]}, "description": "Create abstract composition with complementary colors and varied sizes"}], "reasoning": "Created a vibrant abstract piece using complementary colors and the rule of thirds!"}`;

