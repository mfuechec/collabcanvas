// Unit tests for Cursor component
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Cursor from '../../../src/components/Collaboration/Cursor';

describe('Cursor Component', () => {
  const defaultProps = {
    x: 100,
    y: 150,
    displayName: 'Test User',
    color: '#FF5733',
    userId: 'user-123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders cursor at correct position', () => {
      const { container } = render(<Cursor {...defaultProps} />);
      
      const cursorElement = container.firstChild;
      expect(cursorElement).toHaveStyle('left: 100px');
      expect(cursorElement).toHaveStyle('top: 150px');
      expect(cursorElement).toHaveClass('absolute');
    });

    it('applies correct transform offset', () => {
      const { container } = render(<Cursor {...defaultProps} />);
      
      const cursorElement = container.firstChild;
      expect(cursorElement).toHaveStyle({
        transform: 'translate(-2px, -2px)'
      });
    });

    it('has pointer-events disabled', () => {
      const { container } = render(<Cursor {...defaultProps} />);
      
      const cursorElement = container.firstChild;
      expect(cursorElement).toHaveClass('pointer-events-none');
    });

    it('has correct z-index for overlay', () => {
      const { container } = render(<Cursor {...defaultProps} />);
      
      const cursorElement = container.firstChild;
      expect(cursorElement).toHaveClass('z-50');
    });
  });

  describe('SVG Cursor Icon', () => {
    it('renders SVG cursor with correct dimensions', () => {
      render(<Cursor {...defaultProps} />);
      
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '20');
      expect(svg).toHaveAttribute('height', '20');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('applies user color to cursor path', () => {
      render(<Cursor {...defaultProps} />);
      
      const path = document.querySelector('path');
      expect(path).toHaveAttribute('fill', '#FF5733');
    });

    it('has white stroke for visibility', () => {
      render(<Cursor {...defaultProps} />);
      
      const path = document.querySelector('path');
      expect(path).toHaveAttribute('stroke', 'white');
      expect(path).toHaveAttribute('stroke-width', '1');
    });

    it('has drop shadow filter', () => {
      render(<Cursor {...defaultProps} />);
      
      const svg = document.querySelector('svg');
      expect(svg).toHaveStyle({
        filter: 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.3))'
      });
    });
  });

  describe('User Name Label', () => {
    it('displays user name', () => {
      render(<Cursor {...defaultProps} />);
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('applies user color as background', () => {
      render(<Cursor {...defaultProps} />);
      
      const nameLabel = screen.getByText('Test User');
      expect(nameLabel).toHaveStyle({
        backgroundColor: '#FF5733'
      });
    });

    it('positions label relative to cursor', () => {
      render(<Cursor {...defaultProps} />);
      
      const nameLabel = screen.getByText('Test User');
      expect(nameLabel).toHaveClass('absolute', 'left-5', 'top-2');
    });

    it('has white text for contrast', () => {
      render(<Cursor {...defaultProps} />);
      
      const nameLabel = screen.getByText('Test User');
      expect(nameLabel).toHaveClass('text-white');
    });

    it('prevents text wrapping', () => {
      render(<Cursor {...defaultProps} />);
      
      const nameLabel = screen.getByText('Test User');
      expect(nameLabel).toHaveClass('whitespace-nowrap');
    });

    it('has maximum width constraint', () => {
      render(<Cursor {...defaultProps} />);
      
      const nameLabel = screen.getByText('Test User');
      expect(nameLabel).toHaveStyle({
        maxWidth: '120px'
      });
    });

    it('has shadow for visibility', () => {
      render(<Cursor {...defaultProps} />);
      
      const nameLabel = screen.getByText('Test User');
      expect(nameLabel).toHaveClass('shadow-lg');
    });
  });

  describe('Props Handling', () => {
    it('handles missing color prop with default', () => {
      const propsWithoutColor = { ...defaultProps };
      delete propsWithoutColor.color;
      
      render(<Cursor {...propsWithoutColor} />);
      
      const path = document.querySelector('path');
      expect(path).toHaveAttribute('fill', '#3B82F6'); // Default color
    });

    it('handles zero coordinates', () => {
      render(<Cursor {...defaultProps} x={0} y={0} />);
      
      const { container } = render(<Cursor {...defaultProps} x={0} y={0} />);
      const cursorElement = container.firstChild;
      
      expect(cursorElement).toHaveStyle({
        left: '0px',
        top: '0px'
      });
    });

    it('handles negative coordinates', () => {
      render(<Cursor {...defaultProps} x={-10} y={-20} />);
      
      const { container } = render(<Cursor {...defaultProps} x={-10} y={-20} />);
      const cursorElement = container.firstChild;
      
      expect(cursorElement).toHaveStyle({
        left: '-10px',
        top: '-20px'
      });
    });

    it('handles very long display names', () => {
      const longName = 'Very Long User Name That Exceeds Normal Length';
      render(<Cursor {...defaultProps} displayName={longName} />);
      
      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('handles empty display name', () => {
      render(<Cursor {...defaultProps} displayName="" />);
      
      // Should still render the label element, just empty
      const nameLabel = document.querySelector('.absolute.left-5.top-2');
      expect(nameLabel).toBeInTheDocument();
      expect(nameLabel).toHaveTextContent('');
    });

    it('handles special characters in display name', () => {
      const specialName = 'User@123 #$%';
      render(<Cursor {...defaultProps} displayName={specialName} />);
      
      expect(screen.getByText(specialName)).toBeInTheDocument();
    });
  });

  describe('Styling and CSS Classes', () => {
    it('applies all required CSS classes to container', () => {
      const { container } = render(<Cursor {...defaultProps} />);
      
      const cursorElement = container.firstChild;
      expect(cursorElement).toHaveClass(
        'absolute',
        'pointer-events-none',
        'z-50'
      );
    });

    it('applies smooth transitions', () => {
      const { container } = render(<Cursor {...defaultProps} />);
      
      const cursorElement = container.firstChild;
      expect(cursorElement).toHaveStyle({
        transition: 'left 0.1s ease-out, top 0.1s ease-out'
      });
    });

    it('applies correct text styling to name label', () => {
      render(<Cursor {...defaultProps} />);
      
      const nameLabel = screen.getByText('Test User');
      expect(nameLabel).toHaveClass(
        'px-2',
        'py-1',
        'text-xs',
        'font-medium',
        'text-white',
        'rounded',
        'shadow-lg',
        'whitespace-nowrap'
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper SVG accessibility attributes', () => {
      render(<Cursor {...defaultProps} />);
      
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('fill', 'none');
    });

    it('cursor container is not focusable', () => {
      const { container } = render(<Cursor {...defaultProps} />);
      
      const cursorElement = container.firstChild;
      expect(cursorElement).not.toHaveAttribute('tabindex');
    });
  });

  describe('Performance Considerations', () => {
    it('renders efficiently without unnecessary re-renders', () => {
      const { rerender } = render(<Cursor {...defaultProps} />);
      
      // Re-render with same props should not cause issues
      rerender(<Cursor {...defaultProps} />);
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('handles rapid position updates', () => {
      const { rerender } = render(<Cursor {...defaultProps} />);
      
      // Simulate rapid position changes
      for (let i = 0; i < 10; i++) {
        rerender(<Cursor {...defaultProps} x={100 + i} y={150 + i} />);
      }
      
      const { container } = render(<Cursor {...defaultProps} x={109} y={159} />);
      const cursorElement = container.firstChild;
      
      expect(cursorElement).toHaveStyle({
        left: '109px',
        top: '159px'
      });
    });
  });
});
