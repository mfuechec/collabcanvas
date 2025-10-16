import { useState, useRef, useEffect } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { executeAICommand } from '../../services/aiAgent';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, BORDER_RADIUS, LAYOUT } from '../../utils/designSystem';
import { Send, Sparkles, X, Minimize2, Maximize2 } from 'lucide-react';
import { clearAllShapes } from '../../utils/clearCanvas';

const AIChat = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I can help you create and manipulate shapes on the canvas. Try saying:\n\n• "Create a red circle"\n• "Make a 3x3 grid"\n• "Build a login form"\n• "Move the circle to the center"',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true); // Default collapsed
  const messagesEndRef = useRef(null);
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  const { shapes, addShape, batchAddShapes, updateShape, batchUpdateShapes, deleteShape, batchDeleteShapes } = useCanvas();
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Find shape by description
  const findShapeByDescription = (description) => {
    const lowerDesc = description.toLowerCase();
    
    // Try to find by exact text match first (for text shapes)
    let match = shapes.find(s => 
      s.type === 'text' && s.text && s.text.toLowerCase().includes(lowerDesc)
    );
    
    if (match) return match;
    
    // Try to find by color
    const colorMap = {
      red: '#ff0000', '#ff0000': true, '#ef4444': true,
      blue: '#0000ff', '#0000ff': true, '#3b82f6': true,
      green: '#00ff00', '#00ff00': true, '#22c55e': true,
      yellow: '#ffff00', '#ffff00': true,
      purple: '#800080', '#800080': true,
      black: '#000000', '#000000': true,
      white: '#ffffff', '#ffffff': true,
    };
    
    for (const [colorName, colorValue] of Object.entries(colorMap)) {
      if (lowerDesc.includes(colorName)) {
        match = shapes.find(s => 
          s.fill && (
            s.fill.toLowerCase() === (typeof colorValue === 'string' ? colorValue : colorName) ||
            s.fill.toLowerCase().includes(colorName)
          )
        );
        if (match) return match;
      }
    }
    
    // Try to find by type
    if (lowerDesc.includes('circle')) {
      match = shapes.find(s => s.type === 'circle');
    } else if (lowerDesc.includes('rectangle') || lowerDesc.includes('square') || lowerDesc.includes('box')) {
      match = shapes.find(s => s.type === 'rectangle');
    } else if (lowerDesc.includes('text') || lowerDesc.includes('label')) {
      match = shapes.find(s => s.type === 'text');
    } else if (lowerDesc.includes('line')) {
      match = shapes.find(s => s.type === 'line' || s.type === 'pen');
    }
    
    return match || shapes[shapes.length - 1]; // Fallback to last created shape
  };
  
  // Execute canvas actions from AI
  const executeActions = async (actions) => {
    for (const { action, data } of actions) {
      console.log('🎨 [AI] Executing action:', action, data);
      
      try {
        switch (action) {
          case 'create_rectangle':
          case 'create_circle':
          case 'create_text':
          case 'create_line':
            await addShape(data);
            break;
            
          case 'update_shape': {
            // New tool for updating shape properties directly by ID
            if (data.shapeId && data.updates) {
              await updateShape(data.shapeId, data.updates);
            }
            break;
          }
          
          case 'move_shape': {
            // Use shapeId directly if provided, fallback to description
            const shapeId = data.shapeId || findShapeByDescription(data.description)?.id;
            if (shapeId) {
              const updates = {};
              if (data.x !== undefined) updates.x = data.x;
              if (data.y !== undefined) updates.y = data.y;
              await updateShape(shapeId, updates);
            }
            break;
          }
          
          case 'resize_shape': {
            // Use shapeId directly if provided, fallback to description
            const shapeId = data.shapeId || findShapeByDescription(data.description)?.id;
            if (shapeId) {
              const updates = {};
              if (data.width !== undefined) updates.width = data.width;
              if (data.height !== undefined) updates.height = data.height;
              await updateShape(shapeId, updates);
            }
            break;
          }
          
          case 'rotate_shape': {
            // Use shapeId directly if provided, fallback to description
            const shapeId = data.shapeId || findShapeByDescription(data.description)?.id;
            if (shapeId) {
              await updateShape(shapeId, { rotation: data.rotation });
            }
            break;
          }
          
          case 'delete_shape': {
            // Use shapeId directly if provided, fallback to description
            const shapeId = data.shapeId || findShapeByDescription(data.description)?.id;
            if (shapeId) {
              await deleteShape(shapeId);
            }
            break;
          }
          
          case 'batch_update_shapes': {
            // Update multiple shapes with the same properties in a SINGLE Firebase operation
            if (data.shapeIds && data.updates && Array.isArray(data.shapeIds)) {
              await batchUpdateShapes(data.shapeIds, data.updates);
            }
            break;
          }
          
          case 'batch_move_shapes': {
            // Move multiple shapes to the same position in a SINGLE Firebase operation
            if (data.shapeIds && Array.isArray(data.shapeIds)) {
              const updates = {};
              if (data.x !== undefined) updates.x = data.x;
              if (data.y !== undefined) updates.y = data.y;
              await batchUpdateShapes(data.shapeIds, updates);
            }
            break;
          }
          
          case 'batch_delete_shapes': {
            // Delete multiple shapes at once in a SINGLE Firebase operation
            if (data.shapeIds && Array.isArray(data.shapeIds)) {
              await batchDeleteShapes(data.shapeIds);
            }
            break;
          }
          
          case 'batch_create_shapes': {
            // Create multiple shapes with different properties in a SINGLE Firebase operation
            if (data.shapes && Array.isArray(data.shapes)) {
              await batchAddShapes(data.shapes);
            }
            break;
          }
          
          case 'create_grid': {
            const { startX, startY, rows, cols, cellWidth, cellHeight, spacing, fill } = data;
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                const x = startX + col * (cellWidth + spacing);
                const y = startY + row * (cellHeight + spacing);
                await addShape({
                  type: 'rectangle',
                  x,
                  y,
                  width: cellWidth,
                  height: cellHeight,
                  fill,
                  stroke: fill,
                  strokeWidth: 2,
                });
                // Small delay to avoid overwhelming Firebase
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            }
            break;
          }
          
          case 'create_row': {
            const { startX, startY, count, width, height, spacing, fill } = data;
            for (let i = 0; i < count; i++) {
              const x = startX + i * (width + spacing);
              await addShape({
                type: 'rectangle',
                x,
                y: startY,
                width,
                height,
                fill,
                stroke: fill,
                strokeWidth: 2,
              });
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            break;
          }
          
          case 'create_circle_row': {
            const { startX, startY, count, radius, spacing, fill } = data;
            for (let i = 0; i < count; i++) {
              // For circles, x and y are centers, so we space them by diameter + spacing
              const x = startX + i * (radius * 2 + spacing);
              await addShape({
                type: 'circle',
                x,
                y: startY,
                radius,
                fill,
                stroke: fill,
                strokeWidth: 2,
              });
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            break;
          }
          
          case 'clear_canvas': {
            await clearAllShapes();
            break;
          }
          
          case 'calculated_coordinates': {
            // This action is for the AI to receive coordinates - no action needed in frontend
            // The AI will use these coordinates in subsequent batch_create_shapes calls
            console.log('📍 Coordinates calculated:', data.coordinates?.length, 'positions');
            break;
          }
          
          default:
            console.warn('Unknown action:', action);
        }
      } catch (error) {
        console.error('Error executing action:', action, error);
        throw error;
      }
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    
    try {
      // Get AI response
      const chatHistory = messages.map(m => ({
        role: m.role === 'user' ? 'human' : 'assistant',
        content: m.content,
      }));
      
      console.log('🎨 [AIChat] Sending message to AI:', userMessage);
      console.log('🎨 [AIChat] Current canvas shapes:', shapes.length);
      const { response, actions } = await executeAICommand(userMessage, chatHistory, shapes);
      console.log('🎨 [AIChat] Received response:', response);
      console.log('🎨 [AIChat] Received actions:', actions);
      
      // Execute canvas actions
      if (actions && actions.length > 0) {
        console.log('🎨 [AIChat] Executing', actions.length, 'actions');
        await executeActions(actions);
        console.log('🎨 [AIChat] Actions executed successfully');
      } else {
        console.warn('🎨 [AIChat] No actions to execute');
      }
      
      // Add AI response
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('AI error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Sorry, I encountered an error: ${error.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Styles
  const containerStyle = {
    position: 'fixed',
    bottom: 0,
    right: 0,
    width: LAYOUT.rightSidebar.width, // Same width as Properties Panel (280px)
    height: isMinimized ? 'auto' : '40vh', // 40% of viewport height when opened
    backgroundColor: colors.sidebar, // Same as Properties Panel
    borderTop: `1px solid ${colors.border}`,
    borderLeft: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 11, // Above properties panel (which is z-index 10)
    transition: 'all 0.3s ease',
    opacity: 1, // Always 100% opaque
  };
  
  const headerStyle = {
    padding: SPACING.md,
    backgroundColor: colors.bgSecondary,
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  };
  
  const titleStyle = {
    fontFamily: TYPOGRAPHY.fontFamily.body,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  };
  
  const messagesContainerStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: SPACING.md,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  };
  
  const messageStyle = (isUser) => ({
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: isUser ? colors.accent : colors.bgSecondary,
    color: isUser ? '#FFFFFF' : colors.textPrimary,
    maxWidth: '85%',
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    fontFamily: TYPOGRAPHY.fontFamily.body,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  });
  
  const inputContainerStyle = {
    padding: SPACING.md,
    borderTop: `1px solid ${colors.border}`,
    display: 'flex',
    gap: SPACING.sm,
  };
  
  const inputStyle = {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: colors.bgSecondary,
    border: `1px solid ${colors.border}`,
    borderRadius: BORDER_RADIUS.md,
    color: colors.textPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.body,
    fontSize: TYPOGRAPHY.fontSize.sm,
    outline: 'none',
  };
  
  const buttonStyle = {
    padding: SPACING.sm,
    backgroundColor: colors.accent,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    color: '#FFFFFF',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s',
    opacity: isLoading ? 0.5 : 1,
  };
  
  const iconButtonStyle = {
    padding: SPACING.xs,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    color: colors.textSecondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  };
  
  return (
    <div style={containerStyle}>
      <div style={headerStyle} onClick={() => setIsMinimized(!isMinimized)}>
        <div style={titleStyle}>
          <Sparkles size={20} />
          AI Assistant
        </div>
        <div style={{ display: 'flex', gap: SPACING.xs }}>
          <button
            style={iconButtonStyle}
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = colors.bgHover}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          <div style={messagesContainerStyle}>
            {messages.map((message, index) => (
              <div key={index} style={messageStyle(message.role === 'user')}>
                {message.content}
              </div>
            ))}
            {isLoading && (
              <div style={messageStyle(false)}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>●</span>
                  <span style={{ animation: 'pulse 1.5s ease-in-out 0.2s infinite' }}>●</span>
                  <span style={{ animation: 'pulse 1.5s ease-in-out 0.4s infinite' }}>●</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSubmit} style={inputContainerStyle}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Try: Create a red circle..."
              style={inputStyle}
              disabled={isLoading}
            />
            <button
              type="submit"
              style={buttonStyle}
              disabled={isLoading || !input.trim()}
              onMouseEnter={(e) => !isLoading && (e.target.style.opacity = 0.9)}
              onMouseLeave={(e) => !isLoading && (e.target.style.opacity = 1)}
            >
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default AIChat;

