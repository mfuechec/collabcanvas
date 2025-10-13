import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CanvasProvider } from '../../../src/contexts/CanvasContext';
import { useCanvas } from '../../../src/hooks/useCanvas';

// Mock constants
vi.mock('../../../src/utils/constants', () => ({
  CANVAS_WIDTH: 5000,
  CANVAS_HEIGHT: 5000,
  DEFAULT_CANVAS_X: 0,
  DEFAULT_CANVAS_Y: 0,
  DEFAULT_ZOOM: 1,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 3,
  MAX_SHAPES_LIMIT: 1000,
  DEFAULT_SHAPE_FILL: '#cccccc',
}));

const wrapper = ({ children }) => (
  <CanvasProvider>
    {children}
  </CanvasProvider>
);

describe('CanvasContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides initial canvas state', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    expect(result.current.canvasPosition).toEqual({ x: 0, y: 0 });
    expect(result.current.zoom).toBe(1);
    expect(result.current.shapes).toEqual([]);
    expect(result.current.selectedShapeId).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('updates zoom level', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    act(() => {
      result.current.updateZoom(1.5);
    });

    expect(result.current.zoom).toBe(1.5);
  });

  it('clamps zoom to valid range', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    act(() => {
      result.current.updateZoom(5); // Above max
    });

    expect(result.current.zoom).toBe(3); // Should be clamped to MAX_ZOOM

    act(() => {
      result.current.updateZoom(0.05); // Below min
    });

    expect(result.current.zoom).toBe(0.1); // Should be clamped to MIN_ZOOM
  });

  it('updates canvas position', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    act(() => {
      result.current.updateCanvasPosition({ x: 100, y: 200 });
    });

    expect(result.current.canvasPosition).toEqual({ x: 100, y: 200 });
  });

  it('resets view to default', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    // Change zoom and position first
    act(() => {
      result.current.updateZoom(2);
      result.current.updateCanvasPosition({ x: 500, y: 300 });
    });

    // Reset view
    act(() => {
      result.current.resetView();
    });

    expect(result.current.zoom).toBe(1);
    expect(result.current.canvasPosition).toEqual({ x: 0, y: 0 });
  });

  it('adds shapes correctly', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    act(() => {
      result.current.addShape({
        x: 100,
        y: 100,
        width: 150,
        height: 100
      });
    });

    expect(result.current.shapes).toHaveLength(1);
    expect(result.current.shapes[0]).toMatchObject({
      x: 100,
      y: 100,
      width: 150,
      height: 100,
      fill: '#cccccc',
      type: 'rectangle'
    });
    expect(result.current.shapes[0].id).toBeDefined();
  });

  it('selects shapes', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    let shape;
    act(() => {
      shape = result.current.addShape({
        x: 100,
        y: 100,
        width: 150,
        height: 100
      });
    });

    act(() => {
      result.current.selectShape(shape.id);
    });

    expect(result.current.selectedShapeId).toBe(shape.id);
  });

  it('deselects shapes', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    let shape;
    act(() => {
      shape = result.current.addShape({
        x: 100,
        y: 100,
        width: 150,
        height: 100
      });
      result.current.selectShape(shape.id);
    });

    act(() => {
      result.current.deselectAll();
    });

    expect(result.current.selectedShapeId).toBeNull();
  });

  it('deletes shapes', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    let shape;
    act(() => {
      shape = result.current.addShape({
        x: 100,
        y: 100,
        width: 150,
        height: 100
      });
    });

    act(() => {
      result.current.deleteShape(shape.id);
    });

    expect(result.current.shapes).toHaveLength(0);
  });

  it('updates shape position', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    let shape;
    act(() => {
      shape = result.current.addShape({
        x: 100,
        y: 100,
        width: 150,
        height: 100
      });
    });

    act(() => {
      result.current.updateShape(shape.id, { x: 200, y: 250 });
    });

    const updatedShape = result.current.shapes.find(s => s.id === shape.id);
    expect(updatedShape.x).toBe(200);
    expect(updatedShape.y).toBe(250);
  });

  it('validates shape boundaries', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    // Test within bounds
    expect(result.current.isWithinBounds(100, 100, 150, 100)).toBe(true);
    
    // Test outside bounds
    expect(result.current.isWithinBounds(-10, 100, 150, 100)).toBe(false);
    expect(result.current.isWithinBounds(4900, 100, 150, 100)).toBe(false);
  });

  it('constrains shapes to bounds', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    // Test constraining negative position
    const constrained1 = result.current.constrainToBounds(-10, -20, 150, 100);
    expect(constrained1).toEqual({ x: 0, y: 0 });

    // Test constraining position beyond canvas
    const constrained2 = result.current.constrainToBounds(4950, 4950, 150, 100);
    expect(constrained2).toEqual({ x: 4850, y: 4900 });
  });
});
