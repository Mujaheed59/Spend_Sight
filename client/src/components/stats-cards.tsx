import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, CheckCircle, Tag, Lightbulb } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

export function StatsCards() {
  const { toast } = useToast();
  
  // Get current month date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/analytics/stats', { startDate: startOfMonth, endDate: endOfMonth }],
    retry: false,
  });

  const { data: insights } = useQuery({
    queryKey: ['/api/insights'],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalSpent = (stats as any)?.totalSpent || 0;
  const categoriesUsed = (stats as any)?.categoryBreakdown?.length || 0;
  const topCategory = (stats as any)?.categoryBreakdown?.[0];
  const unreadInsights = (insights as any)?.filter((insight: any) => insight.isRead === "false")?.length || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Spent Card */}
      <Card className="bg-white overflow-hidden shadow">
        <CardContent className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Spent</dt>
                <dd className="text-lg font-medium text-gray-900" data-testid="text-total-spent">
                  {formatCurrency(totalSpent)}
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <span className="font-medium text-gray-600">This month</span>
          </div>
        </div>
      </Card>

      {/* Budget Remaining Card */}
      <Card className="bg-white overflow-hidden shadow">
        <CardContent className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Budget Status</dt>
                <dd className="text-lg font-medium text-gray-900" data-testid="text-budget-status">
                  On Track
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <span className="font-medium text-green-600">Staying within limits</span>
          </div>
        </div>
      </Card>

      {/* Categories Used Card */}
      <Card className="bg-white overflow-hidden shadow">
        <CardContent className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Categories Used</dt>
                <dd className="text-lg font-medium text-gray-900" data-testid="text-categories-count">
                  {categoriesUsed}
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <span className="font-medium text-gray-600" data-testid="text-top-category">
              {topCategory ? `${topCategory.categoryName} (${((topCategory.amount / totalSpent) * 100).toFixed(0)}%)` : 'No expenses yet'}
            </span>
          </div>
        </div>
      </Card>

      {/* AI Insights Card */}
      <Card className="bg-white overflow-hidden shadow">
        <CardContent className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">AI Insights</dt>
                <dd className="text-lg font-medium text-gray-900" data-testid="text-insights-count">
                  {unreadInsights} New
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <span className="font-medium text-purple-600">
              {unreadInsights > 0 ? 'New recommendations available' : 'All insights reviewed'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
