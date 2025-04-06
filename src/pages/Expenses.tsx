import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Plus, FileSpreadsheet, File as FilePdf, Receipt, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ExpenseList from '../components/ExpenseList';
import ExpenseForm from '../components/ExpenseForm';
import ReceiptScanner from '../components/ReceiptScanner';
import type { Expense, Category, Account } from '../lib/supabase';


export default function Expenses() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [showAddReceipt, setShowAddReceipt] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scannedData, setScannedData] = useState<{
    amount?: string;
    date?: string;
    description?: string;
    account_id?: string;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          categories (
            name,
            type
          )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (expensesError) throw expensesError;
      setExpenses(expensesData || []);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // First get the expense to handle account balance adjustment
      const { data: expense, error: fetchError } = await supabase
        .from('expenses')
        .select(`
          *,
          categories (
            id, 
            name,
            type
          )
        `)
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      
      // If the expense has an account_id, adjust the account balance
      if (expense && expense.account_id) {
        // Get the account
        const { data: account, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', expense.account_id)
          .single();
          
        if (accountError) throw accountError;
        
        // Adjust the account balance (add back expense or remove income)
        const adjustment = expense.categories?.type === 'income'
          ? -expense.amount // Remove income
          : expense.amount;  // Add back expense
        
        // Update the account balance
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ balance: account.balance + adjustment })
          .eq('id', expense.account_id);
          
        if (updateError) throw updateError;
      }
      
      // Now delete the expense
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update the UI
      setExpenses(expenses.filter(expense => expense.id !== id));
      setSelectedExpenses(selectedExpenses.filter(expenseId => expenseId !== id));
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleSelectExpense = (id: string) => {
    setSelectedExpenses(prev => 
      prev.includes(id) 
        ? prev.filter(expenseId => expenseId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedExpenses(
      selectedExpenses.length === expenses.length
        ? []
        : expenses.map(expense => expense.id)
    );
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.text('Expense Report', 20, 20);
    
    const selectedExpenseData = expenses
      .filter(
        (expense) =>
          selectedExpenses.length === 0 || selectedExpenses.includes(expense.id)
      )
      .map((expense) => [
        format(new Date(expense.date), "MMM d, yyyy"),
        expense.description,
        expense.categories?.name || "Uncategorized",
        expense.categories?.type === "income"
          ? `+$${expense.amount.toFixed(2)}`
          : `-$${expense.amount.toFixed(2)}`,
      ]);

    autoTable(doc, {
      head: [['Date', 'Description', 'Category', 'Amount']],
      body: selectedExpenseData,
      startY: 30,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [3, 59, 74] },
    });

    const totalAmount = expenses
      .filter(expense => selectedExpenses.length === 0 || selectedExpenses.includes(expense.id))
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    const finalY = (doc as any).lastAutoTable.finalY || 30;
    doc.text(`Total: $${totalAmount.toFixed(2)}`, 20, finalY + 10);

    doc.save('expense-report.pdf');
  };

  const exportToExcel = () => {
    const selectedExpenseData = expenses
      .filter(
        (expense) =>
          selectedExpenses.length === 0 || selectedExpenses.includes(expense.id)
      )
      .map((expense) => ({
        Date: format(new Date(expense.date), "MMM d, yyyy"),
        Description: expense.description,
        Category: expense.categories?.name || "Uncategorized",
        Type: expense.categories?.type || "expense",
        Amount:
          expense.categories?.type === "income"
            ? `+$${expense.amount.toFixed(2)}`
            : `-$${expense.amount.toFixed(2)}`,
      }));

    const ws = XLSX.utils.json_to_sheet(selectedExpenseData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, 'expense-report.xlsx');
  };

  const handleExpenseAdded = () => {
    // Dispatch the expenseUpdated event to refresh the dashboard data
    window.dispatchEvent(new CustomEvent('expenseUpdated'));
    // Close the form and refresh expenses
    setShowAddExpense(false);
    setShowAddReceipt(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-text-primary-dark">Transactions</h1>
          <p className="mt-2 text-sm text-text-secondary dark:text-text-secondary-dark">
            A list of all your transactions
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={exportToPDF}
            className="inline-flex items-center px-4 py-2 border border-input-border dark:border-input-border-dark rounded-md shadow-sm text-sm font-medium text-text-primary dark:text-text-primary-dark bg-card dark:bg-card-dark hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary dark:focus:ring-secondary-dark"
          >
            <FilePdf className="h-5 w-5 mr-2 text-text-secondary dark:text-text-secondary-dark" />
            Export PDF
          </button>
          <button
            onClick={exportToExcel}
            className="inline-flex items-center px-4 py-2 border border-input-border dark:border-input-border-dark rounded-md shadow-sm text-sm font-medium text-text-primary dark:text-text-primary-dark bg-card dark:bg-card-dark hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary dark:focus:ring-secondary-dark"
          >
            <FileSpreadsheet className="h-5 w-5 mr-2 text-text-secondary dark:text-text-secondary-dark" />
            Export Excel
          </button>
          <button
            onClick={() => {
              setShowAddExpense(true);
              setShowAddReceipt(false);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary dark:bg-secondary-dark hover:bg-secondary/90 dark:hover:bg-secondary-dark/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary dark:focus:ring-secondary-dark"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Transaction
          </button>
          <button
            onClick={() => {
              setShowAddReceipt(true);
              setShowAddExpense(false);
            }}
            className="inline-flex items-center px-4 py-2 border border-input-border dark:border-input-border-dark rounded-md shadow-sm text-sm font-medium text-text-primary dark:text-text-primary-dark bg-card dark:bg-card-dark hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary dark:focus:ring-secondary-dark"
          >
            <Receipt className="h-5 w-5 mr-2 text-text-secondary dark:text-text-secondary-dark" />
            Scan Receipt
          </button>
        </div>
      </div>

      {showAddExpense && (
        <div className="mb-8 bg-card dark:bg-card-dark shadow rounded-lg p-6">
          <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-6">Add New Transaction</h2>
          <ExpenseForm 
            categories={categories}
            onSuccess={handleExpenseAdded}
          />
        </div>
      )}

      {showAddReceipt && (
        <div className="mb-8 bg-card dark:bg-card-dark shadow rounded-lg p-6">
          <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-6">Scan Receipt</h2>
          <ReceiptScanner onScanComplete={setScannedData} />
          {scannedData && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Create Expense from Receipt</h3>
              <ExpenseForm 
                categories={categories} 
                initialData={scannedData}
                onSuccess={handleExpenseAdded}
              />
            </div>
          )}
        </div>
      )}

      <div className="bg-card dark:bg-card-dark shadow-card dark:shadow-card-dark rounded-lg">
        {expenses.length > 0 ? (
          <>
            <div className="px-6 py-4 border-b border-input-border dark:border-input-border-dark">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedExpenses.length === expenses.length}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-secondary dark:text-secondary-dark focus:ring-secondary dark:focus:ring-secondary-dark border-input-border dark:border-input-border-dark rounded"
                />
                <span className="ml-2 text-sm text-text-secondary dark:text-text-secondary-dark">
                  {selectedExpenses.length === 0
                    ? 'Select all'
                    : `Selected ${selectedExpenses.length} of ${expenses.length}`}
                </span>
              </div>
            </div>
            <ExpenseList 
              expenses={expenses} 
              onDelete={handleDelete}
              selectedExpenses={selectedExpenses}
              onSelectExpense={handleSelectExpense}
            />
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark">No expenses found</p>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={() => setShowAddExpense(true)}
                className="inline-flex items-center text-sm font-medium text-secondary dark:text-secondary-dark hover:text-secondary/80 dark:hover:text-secondary-dark/80"
              >
                <Plus className="h-5 w-5 mr-1" />
                Add expense manually
              </button>
              <button
                onClick={() => setShowAddReceipt(true)}
                className="inline-flex items-center text-sm font-medium text-secondary dark:text-secondary-dark hover:text-secondary/80 dark:hover:text-secondary-dark/80"
              >
                <Receipt className="h-5 w-5 mr-1" />
                Scan a receipt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}