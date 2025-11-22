import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AddExpense from '../AddExpense';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  version: '3.11.174',
  GlobalWorkerOptions: {
    workerSrc: '',
  },
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({
          items: [],
        }),
      }),
    }),
  }),
}));

// Mock the components
vi.mock('../components/ReceiptScanner', () => ({
  __esModule: true,
  default: () => <div data-testid="receipt-scanner">Mock Scanner</div>
}));

vi.mock('../components/ExpenseForm', () => ({
  __esModule: true,
  default: ({ onSuccess }) => (
    <button onClick={onSuccess} data-testid="expense-form-submit">
      Submit Form
    </button>
  )
}));

// Setup mock data
const mockUser = { id: 'test-user-id' };
const mockCategories = [
  {
    id: 'cat1',
    name: 'Food',
    type: 'expense',
    user_id: 'test-user-id',
    created_at: '2024-04-14T00:00:00Z'
  }
];

// Mock Supabase with manual promise control
const getUser = vi.fn();
const from = vi.fn();
const select = vi.fn();
const eq = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser
    },
    from
  }
}));

describe('AddExpense', () => {
  // Helper function to setup synchronous resolution of promises
  const setupSuccessfulMocks = () => {
    // Auth user setup
    getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null
    });
    
    // Categories query setup
    from.mockReturnValueOnce({ select });
    select.mockReturnValueOnce({ eq });
    eq.mockResolvedValueOnce({
      data: mockCategories,
      error: null
    });
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows expense form after loading completes', async () => {
    // Setup mocks for immediate resolution
    setupSuccessfulMocks();
    
    // Use fake timers to control async flow
    vi.useFakeTimers();
    
    // Render the component
    render(
      <BrowserRouter>
        <AddExpense />
      </BrowserRouter>
    );
    
    // Fast-forward all timers to complete all promises
    await vi.runAllTimersAsync();
    
    // Form should be visible now
    expect(screen.getByTestId('expense-form-submit')).toBeInTheDocument();
    
    // Restore real timers
    vi.useRealTimers();
  });

  it('dispatches event when transaction is added', async () => {
    // Setup mocks
    setupSuccessfulMocks();
    
    // Mock the event listener
    const mockEventListener = vi.fn();
    window.addEventListener('transactionUpdated', mockEventListener);
    
    // Use fake timers
    vi.useFakeTimers();
    
    // Render
    render(
      <BrowserRouter>
        <AddExpense />
      </BrowserRouter>
    );
    
    // Fast-forward to complete loading
    await vi.runAllTimersAsync();
    
    // Get and click the submit button
    const submitButton = screen.getByTestId('expense-form-submit');
    submitButton.click();
    
    // Check event was dispatched
    expect(mockEventListener).toHaveBeenCalledTimes(1);
    
    // Cleanup
    window.removeEventListener('transactionUpdated', mockEventListener);
    vi.useRealTimers();
  });

  it('shows loading state initially', () => {
    // Setup mocks but don't resolve them yet
    getUser.mockReturnValueOnce(new Promise(() => {})); // Never resolves during test
    
    // Render component
    render(
      <BrowserRouter>
        <AddExpense />
      </BrowserRouter>
    );
    
    // Should show loading state
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });
});