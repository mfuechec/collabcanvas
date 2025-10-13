import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Shape from '../../../src/components/Canvas/Shape';
import { CanvasProvider } from '../../../src/contexts/CanvasContext';
import { AuthProvider } from '../../../src/contexts/AuthContext';

// Mock Konva Rect component with Konva-like methods
vi.mock('react-konva', () => ({
  Rect: ({ onClick, onDragStart, onDragEnd, onDragMove, onMouseEnter, onMouseLeave, ...props }) => {
    // Create a mock target object that mimics Konva's shape API
    const mockTarget = {
      position: vi.fn(() => ({ x: props.x || 0, y: props.y || 0 })),
      getStage: vi.fn(() => ({
        container: vi.fn(() => ({ style: {} }))
      })),
      stopDrag: vi.fn()
    };

    // Create mock event object
    const createMockEvent = (target) => ({
      target,
      cancelBubble: false
    });

    return (
      <div
        data-testid="shape-rect"
        data-x={props.x}
        data-y={props.y}
        data-width={props.width}
        data-height={props.height}
        data-fill={props.fill}
        data-stroke={props.stroke}
        data-draggable={props.draggable}
        data-opacity={props.opacity}
        onClick={() => onClick && onClick(createMockEvent(mockTarget))}
        onMouseDown={() => onDragStart && onDragStart(createMockEvent(mockTarget))}
        onMouseMove={() => onDragMove && onDragMove(createMockEvent(mockTarget))}
        onMouseUp={() => onDragEnd && onDragEnd(createMockEvent(mockTarget))}
        onMouseEnter={() => onMouseEnter && onMouseEnter(createMockEvent(mockTarget))}
        onMouseLeave={() => onMouseLeave && onMouseLeave(createMockEvent(mockTarget))}
        style={{ cursor: 'pointer' }}
      />
    );
  },
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
  <AuthProvider>
    <CanvasProvider>
      {children}
    </CanvasProvider>
  </AuthProvider>
);

describe('Shape Component', () => {
  const mockShape = {
    id: 'test-shape-1',
    x: 100,
    y: 150,
    width: 200,
    height: 100,
    fill: '#cccccc',
    isSelected: false,
    isLocked: false,
    lockedBy: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shape with correct properties', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Shape {...mockShape} />
      </TestWrapper>
    );

    const shapeElement = getByTestId('shape-rect');
    expect(shapeElement).toHaveAttribute('data-x', '100');
    expect(shapeElement).toHaveAttribute('data-y', '150');
    expect(shapeElement).toHaveAttribute('data-width', '200');
    expect(shapeElement).toHaveAttribute('data-height', '100');
    expect(shapeElement).toHaveAttribute('data-fill', '#cccccc');
  });

  it('shows selection border when selected', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Shape {...mockShape} isSelected={true} />
      </TestWrapper>
    );

    const shapeElement = getByTestId('shape-rect');
    expect(shapeElement).toHaveAttribute('data-stroke', '#3b82f6');
  });

  it('shows locked state with reduced opacity', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Shape {...mockShape} isLocked={true} lockedBy="other-user" />
      </TestWrapper>
    );

    const shapeElement = getByTestId('shape-rect');
    expect(shapeElement).toHaveAttribute('data-opacity', '0.6');
    expect(shapeElement).toHaveAttribute('data-stroke', '#ef4444');
    expect(shapeElement).toHaveAttribute('data-draggable', 'false');
  });

  it('is draggable when not locked', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Shape {...mockShape} />
      </TestWrapper>
    );

    const shapeElement = getByTestId('shape-rect');
    expect(shapeElement).toHaveAttribute('data-draggable', 'true');
  });

  it('is not draggable when locked by another user', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Shape {...mockShape} isLocked={true} lockedBy="other-user" />
      </TestWrapper>
    );

    const shapeElement = getByTestId('shape-rect');
    expect(shapeElement).toHaveAttribute('data-draggable', 'false');
  });

  it('handles click events', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Shape {...mockShape} />
      </TestWrapper>
    );

    const shapeElement = getByTestId('shape-rect');
    
    // Should not throw error when clicked
    expect(() => {
      fireEvent.click(shapeElement);
    }).not.toThrow();
  });

  it('handles drag events', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Shape {...mockShape} />
      </TestWrapper>
    );

    const shapeElement = getByTestId('shape-rect');
    
    // Should not throw error when drag events are triggered
    expect(() => {
      fireEvent.mouseDown(shapeElement);
      fireEvent.mouseMove(shapeElement);
      fireEvent.mouseUp(shapeElement);
    }).not.toThrow();
  });

  it('shows transparent stroke when not selected or locked', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Shape {...mockShape} />
      </TestWrapper>
    );

    const shapeElement = getByTestId('shape-rect');
    expect(shapeElement).toHaveAttribute('data-stroke', 'transparent');
  });

  it('has full opacity when not locked', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Shape {...mockShape} />
      </TestWrapper>
    );

    const shapeElement = getByTestId('shape-rect');
    expect(shapeElement).toHaveAttribute('data-opacity', '1');
  });
});
