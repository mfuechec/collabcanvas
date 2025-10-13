import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import Canvas from '../../../src/components/Canvas/Canvas';
import { CanvasProvider } from '../../../src/contexts/CanvasContext';
import { AuthProvider } from '../../../src/contexts/AuthContext';

// Mock Konva components to avoid complex rendering issues in tests
vi.mock('react-konva', () => ({
  Stage: ({ children, width, height, ...props }) => (
    <div data-testid="konva-stage" data-width={width} data-height={height} {...props}>
      {children}
    </div>
  ),
  Layer: ({ children }) => (
    <div data-testid="konva-layer">
      {children}
    </div>
  ),
  Rect: (props) => (
    <div 
      data-testid="konva-rect" 
      data-x={props.x} 
      data-y={props.y}
      data-width={props.width}
      data-height={props.height}
    />
  ),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
  <AuthProvider>
    <CanvasProvider>
      {children}
    </CanvasProvider>
  </AuthProvider>
);

describe('Canvas Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders canvas container with correct classes', () => {
    const { container } = render(
      <TestWrapper>
        <Canvas />
      </TestWrapper>
    );

    const canvasContainer = container.querySelector('.w-full.h-full.bg-gray-100.overflow-hidden');
    expect(canvasContainer).toBeInTheDocument();
    
    const innerContainer = container.querySelector('.w-full.h-full');
    expect(innerContainer).toBeInTheDocument();
  });

  it('initializes ResizeObserver correctly', () => {
    render(
      <TestWrapper>
        <Canvas />
      </TestWrapper>
    );

    // ResizeObserver should be called during component mount
    expect(global.ResizeObserver).toHaveBeenCalled();
  });

  it('renders without crashing', () => {
    expect(() => {
      render(
        <TestWrapper>
          <Canvas />
        </TestWrapper>
      );
    }).not.toThrow();
  });
});
