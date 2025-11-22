import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ExpenseList from '../ExpenseList';

// Mock data
const mockExpenses = [
  {
    id: '1',
    date: '2024-04-14',
    description: 'Groceries',
    amount: 50.00,
    category_id: 'cat1',
    payment_method: 'cash',
    tags: [],
    user_id: 'user1',
    created_at: '2024-04-14T00:00:00Z',
    categories: {
      id: 'cat1',
      name: 'Food',
      type: 'expense',
      user_id: 'user1',
      created_at: '2024-04-14T00:00:00Z'
    }
  },
  {
    id: '2',
    date: '2024-04-13',
    description: 'Salary',
    amount: 3000.00,
    category_id: 'cat2',
    payment_method: 'bank_transfer',
    tags: [],
    user_id: 'user1',
    created_at: '2024-04-13T00:00:00Z',
    categories: {
      id: 'cat2',
      name: 'Salary',
      type: 'income',
      user_id: 'user1',
      created_at: '2024-04-13T00:00:00Z'
    }
  }
];

// Helper function to render component with router
const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  );
};

describe('ExpenseList', () => {
  it('renders expense list with correct data', () => {
    const onDelete = vi.fn();
    const onSelectExpense = vi.fn();
    
    renderWithRouter(
      <ExpenseList
        expenses={mockExpenses}
        onDelete={onDelete}
        selectedExpenses={[]}
        onSelectExpense={onSelectExpense}
      />
    );

    // Check if expense items are rendered
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    // expect(screen.getByText('Salary')).toBeInTheDocument();
    
    // Check if amounts are rendered correctly
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    // expect(screen.getByText('$3000.00')).toBeInTheDocument();
  });

  it('handles expense selection', () => {
    const onDelete = vi.fn();
    const onSelectExpense = vi.fn();
    
    renderWithRouter(
      <ExpenseList
        expenses={mockExpenses}
        onDelete={onDelete}
        selectedExpenses={[]}
        onSelectExpense={onSelectExpense}
      />
    );

    // Find and click the checkbox for the first expense
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);

    // Check if onSelectExpense was called with correct id
    expect(onSelectExpense).toHaveBeenCalledWith('1');
  });

  it('handles expense deletion', () => {
    const onDelete = vi.fn();
    const onSelectExpense = vi.fn();
    
    renderWithRouter(
      <ExpenseList
        expenses={mockExpenses}
        onDelete={onDelete}
        selectedExpenses={[]}
        onSelectExpense={onSelectExpense}
      />
    );

    // Find and click the delete button for the first expense
    const deleteButtons = screen.getAllByRole('button');
    fireEvent.click(deleteButtons[0]);

    // Check if onDelete was called with correct id
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('displays selected expenses correctly', () => {
    const onDelete = vi.fn();
    const onSelectExpense = vi.fn();
    
    renderWithRouter(
      <ExpenseList
        expenses={mockExpenses}
        onDelete={onDelete}
        selectedExpenses={['1']}
        onSelectExpense={onSelectExpense}
      />
    );

    // Check if the first expense's checkbox is checked
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });
}); 