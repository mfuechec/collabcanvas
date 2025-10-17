import { formatCanvasState } from './formatters.js';

// ========================================
// SMART CONTEXT BUILDING
// ========================================

/**
 * Build smart context based on query type (OPTIMIZED FOR TOKEN EFFICIENCY)
 * Analyzes the user query and returns only the necessary canvas information
 * 
 * Token Savings Examples:
 * - "Create 50 shapes" → ~5 tokens instead of ~2000 tokens
 * - "Delete blue circles" → ~50 tokens (only matching shapes)
 * - "Move rectangle left" → ~30 tokens (only position data)
 * 
 * @param {string} userQuery - The user's natural language query
 * @param {Array} canvasShapes - Current shapes on the canvas
 * @param {boolean} includeHeader - Include "Current Canvas Objects:" header
 * @returns {string} Optimized context string
 */
export function buildSmartContext(userQuery, canvasShapes, includeHeader = true) {
  const lowerQuery = userQuery.toLowerCase();
  const shapeCount = canvasShapes.length;
  
  // ========================================
  // CATEGORY 1: CREATE OPERATIONS (Minimal Context)
  // ========================================
  // Pattern: "create", "add", "draw", "make" + numbers/shapes
  // Only need: shape count
  const isCreateOperation = /^(create|add|draw|make|generate|build)\s+(a\s+|an\s+|the\s+)?\d*\s*(random\s+)?(shape|circle|rectangle|square|line|text|grid|row)/i.test(lowerQuery);
  
  if (isCreateOperation) {
    console.log('🎯 [SMART-CONTEXT] CREATE operation detected → Minimal context (shape count only)');
    const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
    return `${header}${shapeCount} existing shape${shapeCount !== 1 ? 's' : ''}\n`;
  }
  
  // ========================================
  // CATEGORY 2: CLEAR OPERATIONS (No Context)
  // ========================================
  const isClearOperation = /^(clear|reset|delete\s+all|remove\s+all|start\s+fresh)/i.test(lowerQuery);
  
  if (isClearOperation) {
    console.log('🎯 [SMART-CONTEXT] CLEAR operation detected → No context needed');
    const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
    return `${header}${shapeCount} shape${shapeCount !== 1 ? 's' : ''} will be cleared\n`;
  }
  
  // ========================================
  // CATEGORY 3: DELETE/FILTER OPERATIONS (Filtered Context)
  // ========================================
  // Pattern: "delete", "remove" + descriptors
  // Need: IDs + relevant properties of matching shapes only
  const isDeleteOperation = /^(delete|remove|erase)\s+/i.test(lowerQuery);
  
  if (isDeleteOperation) {
    console.log('🎯 [SMART-CONTEXT] DELETE operation detected → Filtered context (matching shapes only)');
    
    // Extract filter criteria
    const colorMatch = lowerQuery.match(/(red|blue|green|yellow|orange|purple|pink|black|white)/i);
    const typeMatch = lowerQuery.match(/(circle|rectangle|square|text|line)/i);
    
    const filtered = canvasShapes.filter(shape => {
      if (colorMatch) {
        const colorMap = {
          red: '#ff0000', blue: '#0000ff', green: '#00ff00', 
          yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
          pink: '#ffc0cb', black: '#000000', white: '#ffffff'
        };
        const targetColor = colorMap[colorMatch[1].toLowerCase()];
        if (!shape.fill?.toLowerCase().includes(targetColor?.toLowerCase().slice(1))) return false;
      }
      if (typeMatch && shape.type !== typeMatch[1].toLowerCase()) return false;
      return true;
    });
    
    if (filtered.length === 0) {
      const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
      return `${header}No matching shapes found (total: ${shapeCount})\n`;
    }
    
    const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
    let context = `${header}Matching shapes (${filtered.length} of ${shapeCount}):\n`;
    
    filtered.forEach((shape, idx) => {
      context += `${idx + 1}. ${shape.type} (ID: ${shape.id}, fill: ${shape.fill || 'none'})\n`;
    });
    
    return context;
  }
  
  // ========================================
  // CATEGORY 4: MOVE/POSITION OPERATIONS (Position Context)
  // ========================================
  // Pattern: "move", "reposition", "shift"
  // Need: IDs + positions only
  const isMoveOperation = /^(move|reposition|shift|drag|place)\s+/i.test(lowerQuery);
  
  if (isMoveOperation) {
    console.log('🎯 [SMART-CONTEXT] MOVE operation detected → Position context only');
    
    // If query mentions "all", include all shapes
    const moveAll = /^(move|shift)\s+(all|every|everything)/i.test(lowerQuery);
    
    if (moveAll) {
      const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
      let context = `${header}All shapes (${shapeCount}):\n`;
      
      canvasShapes.slice(0, 20).forEach((shape, idx) => {
        context += `${idx + 1}. ${shape.type} (ID: ${shape.id}) at (${Math.round(shape.x)}, ${Math.round(shape.y)})\n`;
      });
      
      if (shapeCount > 20) {
        context += `... and ${shapeCount - 20} more\n`;
      }
      
      return context;
    }
    
    // Otherwise, look for specific shape reference
    const typeMatch = lowerQuery.match(/(circle|rectangle|square|text|line)/i);
    const colorMatch = lowerQuery.match(/(red|blue|green|yellow|orange|purple|pink|black|white)/i);
    
    const filtered = canvasShapes.filter(shape => {
      if (typeMatch && shape.type !== typeMatch[1].toLowerCase()) return false;
      if (colorMatch) {
        const colorMap = {
          red: '#ff0000', blue: '#0000ff', green: '#00ff00', 
          yellow: '#ffff00', orange: '#ffa500', purple: '#800080'
        };
        const targetColor = colorMap[colorMatch[1].toLowerCase()];
        if (!shape.fill?.toLowerCase().includes(targetColor?.toLowerCase().slice(1))) return false;
      }
      return true;
    });
    
    const shapesToShow = filtered.length > 0 ? filtered : canvasShapes.slice(0, 5);
    const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
    let context = `${header}${filtered.length > 0 ? 'Matching' : 'Recent'} shapes:\n`;
    
    shapesToShow.slice(0, 5).forEach((shape, idx) => {
      context += `${idx + 1}. ${shape.type} (ID: ${shape.id}) at (${Math.round(shape.x)}, ${Math.round(shape.y)})\n`;
    });
    
    return context;
  }
  
  // ========================================
  // CATEGORY 5: UPDATE/MODIFY OPERATIONS (Property Context)
  // ========================================
  // Pattern: "change", "update", "make bigger/smaller", "resize"
  // Need: IDs + relevant properties only
  const isUpdateOperation = /^(change|update|modify|make|set|resize|rotate|scale|enlarge|shrink)\s+/i.test(lowerQuery);
  
  if (isUpdateOperation) {
    console.log('🎯 [SMART-CONTEXT] UPDATE operation detected → Property context');
    
    // Determine what property is being updated
    const isColorChange = /color|fill|to\s+(red|blue|green|yellow)/i.test(lowerQuery);
    const isSizeChange = /(bigger|smaller|larger|resize|size|width|height|radius)/i.test(lowerQuery);
    const isRotation = /rotate|turn|spin/i.test(lowerQuery);
    
    const updateAll = /(all|every|everything)/i.test(lowerQuery);
    
    if (updateAll) {
      // ✅ OPTIMIZATION: For pure batch transformations (rotate all, scale all, etc.),
      // only send IDs in a compact format - no need for current property values
      const isPureBatchTransform = (isRotation || /scale|enlarge|shrink/i.test(lowerQuery)) && 
                                   !/(by\s+\d+\s*%|based\s+on|depending)/i.test(lowerQuery);
      
      if (isPureBatchTransform && shapeCount > 3) {
        console.log('   └─ Pure batch transform: ultra-minimal context (IDs only)');
        const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
        const ids = canvasShapes.map(s => s.id).join(', ');
        return `${header}${shapeCount} shapes: [${ids}]\n`;
      }
      
      // Standard update-all context (needs current property values)
      const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
      let context = `${header}All shapes (${shapeCount}):\n`;
      
      canvasShapes.slice(0, 15).forEach((shape, idx) => {
        let details = `${idx + 1}. ${shape.type} (ID: ${shape.id}`;
        
        if (isColorChange) details += `, fill: ${shape.fill || 'none'}`;
        if (isSizeChange) {
          if (shape.type === 'circle' && shape.width && shape.height) {
            const radius = Math.min(shape.width, shape.height) / 2;
            details += `, radius: ${radius}`;
          } else if (shape.width && shape.height) {
            details += `, size: ${shape.width}x${shape.height}`;
          }
        }
        if (isRotation && shape.rotation !== undefined) {
          details += `, rotation: ${shape.rotation}°`;
        }
        
        details += ')';
        context += `${details}\n`;
      });
      
      if (shapeCount > 15) {
        context += `... and ${shapeCount - 15} more\n`;
      }
      
      return context;
    }
    
    // Filter for specific shapes
    const typeMatch = lowerQuery.match(/(circle|rectangle|square|text|line)/i);
    const colorMatch = lowerQuery.match(/the\s+(red|blue|green|yellow|orange|purple)/i);
    
    const filtered = canvasShapes.filter(shape => {
      if (typeMatch && shape.type !== typeMatch[1].toLowerCase()) return false;
      if (colorMatch) {
        const colorMap = {
          red: '#ff0000', blue: '#0000ff', green: '#00ff00', 
          yellow: '#ffff00', orange: '#ffa500', purple: '#800080'
        };
        const targetColor = colorMap[colorMatch[1].toLowerCase()];
        if (!shape.fill?.toLowerCase().includes(targetColor?.toLowerCase().slice(1))) return false;
      }
      return true;
    });
    
    const shapesToShow = filtered.length > 0 ? filtered : canvasShapes.slice(0, 5);
    const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
    let context = `${header}${filtered.length > 0 ? 'Matching' : 'Recent'} shapes:\n`;
    
    shapesToShow.slice(0, 10).forEach((shape, idx) => {
      let details = `${idx + 1}. ${shape.type} (ID: ${shape.id}`;
      
      if (isColorChange) details += `, fill: ${shape.fill || 'none'}`;
      if (isSizeChange) {
        if (shape.type === 'circle' && shape.width && shape.height) {
          const radius = Math.min(shape.width, shape.height) / 2;
          details += `, radius: ${radius}`;
        } else if (shape.width && shape.height) {
          details += `, size: ${shape.width}x${shape.height}`;
        }
      }
      if (isRotation && shape.rotation !== undefined) {
        details += `, rotation: ${shape.rotation}°`;
      }
      
      details += ')';
      context += `${details}\n`;
    });
    
    return context;
  }
  
  // ========================================
  // CATEGORY 6: INFORMATIONAL QUERIES (Targeted Context)
  // ========================================
  // Pattern: "what", "how many", "show me", "tell me"
  const isInformationalQuery = /^(what|how\s+many|which|where|tell\s+me|show\s+me|list|count)/i.test(lowerQuery);
  
  if (isInformationalQuery) {
    console.log('🎯 [SMART-CONTEXT] INFORMATIONAL query detected → Targeted context');
    
    // "How many" queries just need counts
    if (/^how\s+many/i.test(lowerQuery)) {
      const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
      
      const typeCounts = canvasShapes.reduce((acc, shape) => {
        acc[shape.type] = (acc[shape.type] || 0) + 1;
        return acc;
      }, {});
      
      let context = `${header}Total: ${shapeCount} shape${shapeCount !== 1 ? 's' : ''}\n`;
      Object.entries(typeCounts).forEach(([type, count]) => {
        context += `- ${count} ${type}${count !== 1 ? 's' : ''}\n`;
      });
      
      return context;
    }
    
    // Fall through to full context for other informational queries
  }
  
  // ========================================
  // DEFAULT: FULL CONTEXT (Complex/Ambiguous Queries)
  // ========================================
  console.log('🎯 [SMART-CONTEXT] Complex/ambiguous query → Full context');
  return formatCanvasState(canvasShapes, 10, includeHeader);
}

