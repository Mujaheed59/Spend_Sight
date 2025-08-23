import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName?.toLowerCase() || '';
  if (name.includes('food') || name.includes('dining')) return '🍽️';
  if (name.includes('transport')) return '🚗';
  if (name.includes('shopping')) return '🛍️';
  if (name.includes('entertainment')) return '🎬';
  if (name.includes('bills') || name.includes('utilities')) return '📱';
  if (name.includes('healthcare')) return '🏥';
  if (name.includes('education')) return '📚';
  if (name.includes('travel')) return '✈️';
  return '💰';
};

const getCategoryColor = (categoryName: string) => {
  const name = categoryName?.toLowerCase() || '';
  if (name.includes('food') || name.includes('dining')) return 'bg-red-100 text-red-800';
  if (name.includes('transport')) return 'bg-blue-100 text-blue-800';
  if (name.includes('shopping')) return 'bg-green-100 text-green-800';
  if (name.includes('entertainment')) return 'bg-amber-100 text-amber-800';
  if (name.includes('bills') || name.includes('utilities')) return 'bg-purple-100 text-purple-800';
  if (name.includes('healthcare')) return 'bg-pink-100 text-pink-800';
  if (name.includes('education')) return 'bg-cyan-100 text-cyan-800';
  if (name.includes('travel')) return 'bg-lime-100 text-lime-800';
  return 'bg-gray-100 text-gray-800';
};

export function RecentExpenses() {
  const { toast } = useToast();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['/api/expenses', { limit: 10 }],
    retry: false,
  });

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Cash',
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      upi: 'UPI',
      bank_transfer: 'Bank Transfer',
    };
    return methods[method] || method;
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="py-4">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-medium text-gray-900">Recent Expenses</CardTitle>
        <Button variant="ghost" size="sm" data-testid="button-view-all-expenses">
          View All
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {(expenses as any) && (expenses as any).length > 0 ? (
          <div className="divide-y divide-gray-200" data-testid="expenses-list">
            {(expenses as any).map((expense: any) => (
              <div 
                key={expense.id} 
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                data-testid={`expense-item-${expense.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                    {getCategoryIcon(expense.category?.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900" data-testid={`expense-description-${expense.id}`}>
                      {expense.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant="secondary" 
                        className={getCategoryColor(expense.category?.name)}
                        data-testid={`expense-category-${expense.id}`}
                      >
                        {expense.category?.name || 'Uncategorized'}
                      </Badge>
                      <span className="text-xs text-gray-500" data-testid={`expense-payment-${expense.id}`}>
                        {formatPaymentMethod(expense.paymentMethod)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900" data-testid={`expense-amount-${expense.id}`}>
                    {formatCurrency(expense.amount)}
                  </p>
                  <p className="text-xs text-gray-500" data-testid={`expense-date-${expense.id}`}>
                    {formatDistanceToNow(new Date(expense.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 px-6">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses yet</h3>
            <p className="text-gray-600">
              Start tracking your expenses to see them here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
