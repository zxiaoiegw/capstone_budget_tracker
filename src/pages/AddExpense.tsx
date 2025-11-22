import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import ExpenseForm from '../components/ExpenseForm';
import ReceiptScanner from '../components/ReceiptScanner';
import type { Category } from '../lib/supabase';

export default function AddExpense() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState<{
    amount?: string;
    date?: string;
    description?: string;
  } | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleTransactionAdded = () => {
    // Dispatch the transactionUpdated event to refresh the dashboard data
    window.dispatchEvent(new CustomEvent('transactionUpdated'));
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="loading-skeleton">
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
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-8">Add Transaction</h1>
        <div className="bg-card dark:bg-card-dark shadow rounded-lg p-6">
          <div className="mb-6">
            <button
              onClick={() => setShowScanner(!showScanner)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
            >
              {showScanner ? 'Hide Scanner' : 'Scan Receipt'}
            </button>
          </div>

          {showScanner && (
            <div className="mb-8">
              <ReceiptScanner onScanComplete={setScannedData} />
            </div>
          )}

          <ExpenseForm 
            categories={categories} 
            initialData={scannedData || undefined}
            onSuccess={handleTransactionAdded}
          />
        </div>
      </div>
    </div>
  );
}