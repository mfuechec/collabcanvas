import { useState, useMemo } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../utils/designSystem';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Layer Item Component
const SortableLayerItem = ({ shape, isSelected, colors, selectShape, getShapeIcon, getShapeName }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: shape.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const layerItemStyle = {
    padding: `${SPACING.sm} ${SPACING.md}`,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    cursor: isDragging ? 'grabbing' : 'grab',
    backgroundColor: isSelected ? colors.accent + '20' : 'transparent',
    borderLeft: isSelected ? `2px solid ${colors.accent}` : '2px solid transparent',
    transition: isDragging ? 'none' : 'background-color 150ms ease',
    fontSize: '13px',
    color: colors.textPrimary,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...layerItemStyle, ...style }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Only select if not dragging
        if (!isDragging) {
          selectShape(shape.id);
        }
      }}
    >
      {/* Shape Icon */}
      <div style={{ flexShrink: 0, display: 'flex', opacity: 0.7 }}>
        {getShapeIcon()}
      </div>
      
      {/* Shape Name */}
      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {getShapeName(shape)}
      </div>
      
      {/* Lock Indicator */}
      {shape.isLocked && (
        <div style={{ flexShrink: 0, opacity: 0.5 }} title="Locked">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
      )}
      
      {/* Visibility Toggle - Coming Soon */}
      <div style={{ flexShrink: 0, opacity: 0.3 }} title="Visibility (Coming Soon)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
    </div>
  );
};

const LayersPanel = ({ isOpen, onToggle }) => {
  const { shapes, selectedShapeId, selectShape, deleteShape, batchUpdateShapes } = useCanvas();
  const { theme } = useTheme();
  const colors = COLORS[theme];
  const [searchQuery, setSearchQuery] = useState('');

  // Set up drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Filter shapes based on search
  const filteredShapes = useMemo(() => {
    if (!searchQuery) return shapes;
    return shapes.filter(shape => 
      shape.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [shapes, searchQuery]);
  
  // Sort shapes by z-index or creation time (newest first for display, which is top layer)
  const sortedShapes = useMemo(() => {
    // Reverse to show top layers first in the panel
    return [...filteredShapes].reverse();
  }, [filteredShapes]);

  // Handle drag end - reorder shapes
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = sortedShapes.findIndex(s => s.id === active.id);
    const newIndex = sortedShapes.findIndex(s => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the array
    const newOrder = arrayMove(sortedShapes, oldIndex, newIndex);
    
    // Reverse back to get actual z-index order (bottom to top)
    const actualOrder = [...newOrder].reverse();
    
    // Update z-index for all shapes based on new order
    // Lower index = lower z-index (rendered first/bottom)
    const updates = {};
    actualOrder.forEach((shape, index) => {
      updates[shape.id] = { zIndex: index };
    });

    // Batch update all shapes with new z-index
    try {
      const shapeIds = Object.keys(updates);
      await batchUpdateShapes(shapeIds, (shapeId) => updates[shapeId]);
      console.log('✅ [LAYERS] Reordered shapes');
    } catch (error) {
      console.error('❌ [LAYERS] Failed to reorder:', error);
    }
  };
  
  if (!isOpen) return null;
  
  const panelStyle = {
    width: '320px',
    height: '100vh',
    backgroundColor: colors.sidebar,
    borderRight: `1px solid ${colors.border}`,
    position: 'fixed',
    left: '60px', // After left sidebar
    top: 0,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
  };
  
  const headerStyle = {
    padding: SPACING.lg,
    borderBottom: `1px solid ${colors.border}`,
    fontFamily: TYPOGRAPHY.fontFamily.base,
    fontSize: TYPOGRAPHY.fontSize.sidebarLabel,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.label,
    color: colors.textSecondary,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };
  
  const searchStyle = {
    width: '100%',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: BORDER_RADIUS.button,
    color: colors.textPrimary,
    fontSize: '12px',
    outline: 'none',
    marginBottom: SPACING.sm,
  };
  
  const layerItemStyle = (isSelected) => ({
    padding: `${SPACING.sm} ${SPACING.md}`,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    cursor: 'pointer',
    backgroundColor: isSelected ? colors.accent + '20' : 'transparent',
    borderLeft: isSelected ? `2px solid ${colors.accent}` : '2px solid transparent',
    transition: 'background-color 150ms ease',
    fontSize: '13px',
    color: colors.textPrimary,
  });
  
  const getShapeIcon = () => {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
    );
  };
  
  const getShapeName = (shape) => {
    // Extract a simple name from the ID
    const parts = shape.id.split('_');
    return `Rectangle ${parts[parts.length - 1].slice(0, 4)}`;
  };
  
  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span>Layers ({sortedShapes.length})</span>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.textSecondary,
            padding: SPACING.xs,
          }}
          title="Close (Cmd+\)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      {/* Search */}
      <div style={{ padding: SPACING.lg, paddingBottom: 0 }}>
        <input
          type="text"
          placeholder="Search layers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchStyle}
        />
      </div>
      
      {/* Layers List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${SPACING.sm} 0` }}>
        {sortedShapes.length === 0 ? (
          <div style={{
            padding: SPACING.xxl,
            textAlign: 'center',
            color: colors.textSecondary,
            fontSize: '13px',
          }}>
            {searchQuery ? 'No layers match your search' : 'No layers yet'}
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={sortedShapes.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedShapes.map((shape) => (
                <SortableLayerItem
                  key={shape.id}
                  shape={shape}
                  isSelected={shape.id === selectedShapeId}
                  colors={colors}
                  selectShape={selectShape}
                  getShapeIcon={getShapeIcon}
                  getShapeName={getShapeName}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
      
      {/* Footer Info */}
      <div style={{
        padding: SPACING.md,
        borderTop: `1px solid ${colors.border}`,
        fontSize: '11px',
        color: colors.textSecondary,
        textAlign: 'center',
      }}>
        Click to select • Drag to reorder layers
      </div>
    </div>
  );
};

export default LayersPanel;

