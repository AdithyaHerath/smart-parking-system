import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/ui/button'; 

describe('UI Component Testing: Button', () => {
  
  it('should render the button successfully', () => {
    render(<Button>Book Parking</Button>);
    
    // Check if a button with the text "Book Parking" appears on the screen
    const buttonElement = screen.getByText('Book Parking');
    expect(buttonElement).toBeInTheDocument();
  });

  it('should apply the correct CSS classes for styling', () => {
    render(<Button className="bg-blue-500">Submit</Button>);
    
    const buttonElement = screen.getByText('Submit');
    expect(buttonElement).toHaveClass('bg-blue-500');
  });

});