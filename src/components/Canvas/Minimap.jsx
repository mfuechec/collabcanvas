import { useEffect, useRef, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TRANSITIONS } from '../../utils/designSystem';
import { getShapeBounds } from '../../utils/shapes';

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;
const CANVAS_WIDTH = 5000;
const CANVAS_HEIGHT = 5000;
const PADDING = 10; // Padding around canvas in minimap

const Minimap = () => {
  const { shapes, stageRef, canvasPosition, zoom, updateCanvasPosition } = useCanvas();
  const { theme } = useTheme();
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const colors = COLORS[theme];

  // Calculate scale factor to fit 5000x5000 canvas into minimap with padding
  const availableWidth = MINIMAP_WIDTH - (PADDING * 2);
  const availableHeight = MINIMAP_HEIGHT - (PADDING * 2);
  const scaleX = availableWidth / CANVAS_WIDTH;
  const scaleY = availableHeight / CANVAS_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  
  // Calculate actual canvas size in minimap
  const canvasDisplayWidth = CANVAS_WIDTH * scale;
  const canvasDisplayHeight = CANVAS_HEIGHT * scale;
  
  // Calculate offset to center canvas in minimap
  const offsetX = PADDING + (availableWidth - canvasDisplayWidth) / 2;
  const offsetY = PADDING + (availableHeight - canvasDisplayHeight) / 2;

  // Draw minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Draw minimap background (darker area around canvas)
    ctx.fillStyle = theme === 'dark' ? '#0a0a0a' : '#f5f5f5';
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Draw canvas background (actual canvas area)
    ctx.fillStyle = theme === 'dark' ? '#1E1E1E' : '#FFFFFF';
    ctx.fillRect(offsetX, offsetY, canvasDisplayWidth, canvasDisplayHeight);
    
    // Draw border around canvas
    ctx.strokeStyle = theme === 'dark' ? '#3C3C3C' : '#E5E5E5';
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, canvasDisplayWidth, canvasDisplayHeight);

    // Draw shapes
    shapes.forEach(shape => {
      ctx.save();
      
      // Get shape bounds using consolidated utility (handles all types including text)
      const bounds = getShapeBounds(shape);
      
      // Scale shape coordinates and add offset
      const x = (bounds.x * scale) + offsetX;
      const y = (bounds.y * scale) + offsetY;
      const width = bounds.width * scale;
      const height = bounds.height * scale;

      // Set fill color
      ctx.fillStyle = shape.fill || '#cccccc';
      ctx.globalAlpha = shape.opacity || 1.0;

      // Apply rotation if present - EXCEPT for circles (they're rotationally symmetric)
      if (shape.type !== 'circle' && shape.rotation && shape.rotation !== 0) {
        // Translate to shape center, rotate, then draw offset by half dimensions
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate((shape.rotation * Math.PI) / 180);
      }

      // Draw based on shape type
      if (shape.type === 'circle') {
        // Circles never rotate, always draw at bounding box center
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2;
        ctx.beginPath();
        ctx.arc(x + centerX, y + centerY, radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape.type === 'line' && shape.points && shape.points.length >= 4) {
        ctx.strokeStyle = shape.stroke || shape.fill || '#cccccc';
        ctx.lineWidth = (shape.strokeWidth || 2) * scale;
        ctx.beginPath();
        for (let i = 0; i < shape.points.length; i += 2) {
          const px = (shape.points[i] * scale) + offsetX;
          const py = (shape.points[i + 1] * scale) + offsetY;
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      } else if (shape.type === 'pen' && shape.points && shape.points.length >= 4) {
        ctx.strokeStyle = shape.stroke || shape.fill || '#cccccc';
        ctx.lineWidth = (shape.strokeWidth || 2) * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < shape.points.length; i += 2) {
          const px = (shape.points[i] * scale) + offsetX;
          const py = (shape.points[i + 1] * scale) + offsetY;
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      } else if (shape.type === 'text') {
        // ✅ Render actual text using Canvas 2D API (matches Konva Text behavior)
        ctx.fillStyle = shape.fill || '#000000';
        ctx.globalAlpha = shape.opacity || 1.0;
        
        // Scale font size for minimap
        const fontSize = (shape.fontSize || 48) * scale;
        ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Render actual text content
        const textContent = shape.text || 'Text';
        
        // Text rotates from centerpoint now (like other shapes)
        // If rotated, we're already at center, so offset by half dimensions
        // If not rotated, position at top-left
        const textX = shape.rotation ? -width / 2 : x;
        const textY = shape.rotation ? -height / 2 : y;
        
        ctx.fillText(textContent, textX, textY);
      } else {
        // Rectangle (draw as rectangle) - rotate around center
        const rectX = shape.rotation ? -width / 2 : x;
        const rectY = shape.rotation ? -height / 2 : y;
        const cornerRadius = (shape.cornerRadius || 0) * scale;
        
        if (cornerRadius > 0) {
          // Draw rounded rectangle using path
          ctx.beginPath();
          ctx.moveTo(rectX + cornerRadius, rectY);
          ctx.lineTo(rectX + width - cornerRadius, rectY);
          ctx.arcTo(rectX + width, rectY, rectX + width, rectY + cornerRadius, cornerRadius);
          ctx.lineTo(rectX + width, rectY + height - cornerRadius);
          ctx.arcTo(rectX + width, rectY + height, rectX + width - cornerRadius, rectY + height, cornerRadius);
          ctx.lineTo(rectX + cornerRadius, rectY + height);
          ctx.arcTo(rectX, rectY + height, rectX, rectY + height - cornerRadius, cornerRadius);
          ctx.lineTo(rectX, rectY + cornerRadius);
          ctx.arcTo(rectX, rectY, rectX + cornerRadius, rectY, cornerRadius);
          ctx.closePath();
          ctx.fill();
        } else {
          // Simple rectangle (no rounded corners)
          ctx.fillRect(rectX, rectY, width, height);
        }
      }

      ctx.restore();
    });

    // Draw viewport indicator
    if (stageRef.current) {
      const stage = stageRef.current;
      const stageWidth = stage.width();
      const stageHeight = stage.height();

      // Calculate viewport position and size in canvas coordinates
      const viewportX = -canvasPosition.x / zoom;
      const viewportY = -canvasPosition.y / zoom;
      const viewportWidth = stageWidth / zoom;
      const viewportHeight = stageHeight / zoom;

      // Scale to minimap coordinates and add offset
      const minimapViewportX = (viewportX * scale) + offsetX;
      const minimapViewportY = (viewportY * scale) + offsetY;
      const minimapViewportWidth = viewportWidth * scale;
      const minimapViewportHeight = viewportHeight * scale;

      // Draw viewport rectangle
      ctx.strokeStyle = '#0D99FF';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1.0;
      ctx.strokeRect(
        minimapViewportX,
        minimapViewportY,
        minimapViewportWidth,
        minimapViewportHeight
      );

      // Draw semi-transparent fill
      ctx.fillStyle = 'rgba(13, 153, 255, 0.1)';
      ctx.fillRect(
        minimapViewportX,
        minimapViewportY,
        minimapViewportWidth,
        minimapViewportHeight
      );
    }
  }, [shapes, canvasPosition, zoom, theme, stageRef, scale, offsetX, offsetY, canvasDisplayWidth, canvasDisplayHeight]);

  // Handle click/drag to navigate
  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleNavigate(e);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handleNavigate(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleNavigate = (e) => {
    if (!stageRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert minimap click to canvas coordinates (accounting for offset)
    const canvasX = (clickX - offsetX) / scale;
    const canvasY = (clickY - offsetY) / scale;

    // Calculate new stage position to center viewport on click
    const stage = stageRef.current;
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    const viewportWidth = stageWidth / zoom;
    const viewportHeight = stageHeight / zoom;

    const newX = -(canvasX - viewportWidth / 2) * zoom;
    const newY = -(canvasY - viewportHeight / 2) * zoom;

    // Update Konva stage position
    stage.position({ x: newX, y: newY });
    stage.batchDraw();
    
    // Update React state so minimap viewport indicator updates
    updateCanvasPosition({ x: newX, y: newY });
  };

  const containerStyle = {
    position: 'fixed',
    bottom: '75px', // Above the AI Assistant
    right: '38px', // Centered in ~400px properties panel (200px center - 100px half-width)
    width: `${MINIMAP_WIDTH}px`,
    height: `${MINIMAP_HEIGHT}px`,
    backgroundColor: colors.sidebar,
    border: `1px solid ${colors.border}`,
    borderRadius: BORDER_RADIUS.lg,
    boxShadow: SHADOWS.lg,
    overflow: 'hidden',
    zIndex: 30,
    cursor: isDragging ? 'grabbing' : 'pointer',
    backdropFilter: 'blur(8px)',
    opacity: 0.95,
    transition: TRANSITIONS.allNormal,
  };

  return (
    <div
      style={containerStyle}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default Minimap;

