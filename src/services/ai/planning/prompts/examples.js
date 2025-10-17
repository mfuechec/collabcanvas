// ========================================
// TOOL USAGE EXAMPLES
// ========================================

export const TOOL_EXAMPLES = `**Example - Informational Query:**
User: "What is the radius of the blue circle?"
{
  "plan": [],
  "reasoning": "The blue circle has a radius of 100 pixels."
}

**Example - Action Request:**
User: "Double the size of the blue circle"
{
  "plan": [
    {
      "step": 1,
      "tool": "batch_operations",
      "args": { 
        "tool": "batch_operations",
        "operations": [
          {"type": "update", "shapeId": "shape_123", "updates": {"radius": 200}}
        ]
      },
      "description": "Update circle radius to 200"
    }
  ],
  "reasoning": "Done! I've doubled the radius of the circle."
}

**Example - Random Shapes (CRITICAL - Study This!):**
User: "Create 5 random shapes"
{
  "plan": [
    {
      "step": 1,
      "tool": "batch_operations",
      "args": {
        "tool": "batch_operations",
        "operations": [
          {"type": "create", "shape": {"type": "circle", "x": 500, "y": 500, "radius": 50, "fill": "#FF0000"}},
          {"type": "create", "shape": {"type": "rectangle", "x": 800, "y": 500, "width": 100, "height": 80, "fill": "#00FF00"}},
          {"type": "create", "shape": {"type": "circle", "x": 1200, "y": 500, "radius": 60, "fill": "#0000FF"}},
          {"type": "create", "shape": {"type": "rectangle", "x": 1500, "y": 500, "width": 120, "height": 90, "fill": "#FF00FF"}},
          {"type": "create", "shape": {"type": "circle", "x": 1900, "y": 500, "radius": 45, "fill": "#00FFFF"}}
        ]
      },
      "description": "Create 5 random shapes with varied types, sizes, and colors"
    }
  ],
  "reasoning": "Created 5 colorful shapes in a row!"
}

**Example - UI Layout (CRITICAL - batch ALL shapes!):**
User: "Create login screen"
{
  "plan": [{"step": 1, "tool": "batch_operations", "args": {"tool": "batch_operations", "operations": [
    {"type": "create", "shape": {"type": "rectangle", "x": 2100, "y": 2200, "width": 800, "height": 600, "fill": "#F5F5F5"}},
    {"type": "create", "shape": {"type": "rectangle", "x": 2140, "y": 2240, "width": 720, "height": 520, "fill": "#FFFFFF", "cornerRadius": 12}},
    {"type": "create", "shape": {"type": "text", "x": 2500, "y": 2330, "text": "Login", "fontSize": 48, "fill": "#1E1E1E"}},
    {"type": "create", "shape": {"type": "rectangle", "x": 2200, "y": 2420, "width": 640, "height": 52, "fill": "#F5F5F5", "cornerRadius": 6}},
    {"type": "create", "shape": {"type": "text", "x": 2250, "y": 2446, "text": "Email", "fontSize": 16, "fill": "#666666"}},
    {"type": "create", "shape": {"type": "rectangle", "x": 2200, "y": 2500, "width": 640, "height": 52, "fill": "#F5F5F5", "cornerRadius": 6}},
    {"type": "create", "shape": {"type": "text", "x": 2270, "y": 2526, "text": "Password", "fontSize": 16, "fill": "#666666"}},
    {"type": "create", "shape": {"type": "rectangle", "x": 2200, "y": 2580, "width": 640, "height": 52, "fill": "#0D99FF", "cornerRadius": 8}},
    {"type": "create", "shape": {"type": "text", "x": 2500, "y": 2606, "text": "Sign In", "fontSize": 20, "fill": "#FFFFFF"}}
  ]}, "description": "Login card with background, card, title, 2 inputs, and button"}],
  "reasoning": "Created professional login screen!"
}
NOTE: Batch ALL shapes (9 here). Never include opacity/stroke/strokeWidth in CREATE.

**Example - Rotate All Shapes:**
User: "Rotate everything 45 degrees"
{
  "plan": [
    {
      "step": 1,
      "tool": "batch_update_shapes",
      "args": { "tool": "batch_update_shapes", "shapeIds": ["shape_1", "shape_2", "shape_3"], "updates": null, "deltaX": null, "deltaY": null, "deltaRotation": 45, "scaleX": null, "scaleY": null },
      "description": "Rotate all shapes by 45 degrees"
    }
  ],
  "reasoning": "Rotated all shapes!"
}

**Example - Move All Shapes:**
User: "Move everything right by 100 pixels"
{
  "plan": [
    {
      "step": 1,
      "tool": "batch_update_shapes",
      "args": { "tool": "batch_update_shapes", "shapeIds": ["shape_1", "shape_2"], "updates": null, "deltaX": 100, "deltaY": null, "deltaRotation": null, "scaleX": null, "scaleY": null },
      "description": "Move all shapes right by 100px"
    }
  ],
  "reasoning": "Moved all shapes!"
}`;

