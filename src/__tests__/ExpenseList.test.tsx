import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { within } from '@testing-library/dom';

import ExpenseList from '../components/ExpenseList';
import type { Expense } from '../lib/supabase'; 

// Mock data 
const mockExpenses: Expense[] = [
    // ... (Groceries object)
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
        categories: { id: 'cat1', name: 'Food', type: 'expense', user_id: 'user1', created_at: '2024-04-14T00:00:00Z' }
    },
    // ... (Salary object)
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
        categories: { id: 'cat2', name: 'Salary', type: 'income', user_id: 'user1', created_at: '2024-04-13T00:00:00Z' }
    }
];


// Helper function 
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
        renderWithRouter(<ExpenseList expenses={mockExpenses} onDelete={onDelete} selectedExpenses={[]} onSelectExpense={onSelectExpense} />);
        expect(screen.getByText('Groceries')).toBeInTheDocument();
        const salaryElements = screen.getAllByText('Salary');
        expect(salaryElements).toHaveLength(2);
        expect(screen.getByText('$50.00')).toBeInTheDocument();
        expect(screen.getByText('$3000.00')).toBeInTheDocument();
        expect(screen.getByText('Food')).toBeInTheDocument();
    });

    it('handles expense selection', () => {
        const onDelete = vi.fn();
        const onSelectExpense = vi.fn();
        renderWithRouter(<ExpenseList expenses={mockExpenses} onDelete={onDelete} selectedExpenses={[]} onSelectExpense={onSelectExpense} />);
        const checkbox = screen.getAllByRole('checkbox')[0];
        
        fireEvent.click(checkbox);
        expect(onSelectExpense).toHaveBeenCalledWith('1');
    });

    it('handles expense deletion (using specific targeting)', () => {
        const onDelete = vi.fn();
        const onSelectExpense = vi.fn();
        renderWithRouter(<ExpenseList expenses={mockExpenses} onDelete={onDelete} selectedExpenses={[]} onSelectExpense={onSelectExpense} />);

        // Example: Target delete button in the first row (Groceries)
        const groceriesRow = screen.getByText('Groceries').closest('tr');
        if (!groceriesRow) throw new Error('Could not find the table row for Groceries');
        const deleteButtonInFirstRow = within(groceriesRow).getByRole('button');
        
        fireEvent.click(deleteButtonInFirstRow);
        expect(onDelete).toHaveBeenCalledWith('1');

        // Example: Target delete button in the second row (Salary)
        
        // const salaryRow = screen.getAllByText('Salary')[0].closest('tr'); 
        const salaryRow = screen.getByText('$3000.00').closest('tr');
        if (!salaryRow) throw new Error('Could not find the table row for Salary');
        const deleteButtonInSecondRow = within(salaryRow).getByRole('button');

        fireEvent.click(deleteButtonInSecondRow);
        expect(onDelete).toHaveBeenCalledWith('2'); 
    });

    it('displays selected expenses correctly', () => {
        const onDelete = vi.fn();
        const onSelectExpense = vi.fn();
        renderWithRouter(<ExpenseList expenses={mockExpenses} onDelete={onDelete} selectedExpenses={['1']} onSelectExpense={onSelectExpense} />);
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes[0]).toBeChecked();
        expect(checkboxes[1]).not.toBeChecked();
    });
});