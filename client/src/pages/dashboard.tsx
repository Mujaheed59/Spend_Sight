import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/sidebar";
import { StatsCards } from "@/components/stats-cards";
import { ExpenseChart } from "@/components/expense-chart";
import { AIInsights } from "@/components/ai-insights";
import { BudgetRecommendations } from "@/components/budget-recommendations";
import { RecentExpenses } from "@/components/recent-expenses";
import { ExpenseForm } from "@/components/expense-form";
import { BudgetSettings } from "@/components/budget-settings";
import { CategoriesManager } from "@/components/categories-manager";
import { ReportsExport } from "@/components/reports-export";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Plus, Download, Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showBudgetSettings, setShowBudgetSettings] = useState(false);
  const [showCategoriesManager, setShowCategoriesManager] = useState(false);
  const [showReportsExport, setShowReportsExport] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleExport = () => {
    setShowReportsExport(true);
  };

  const handleSidebarNavigate = (action: string) => {
    switch (action) {
      case 'add-expense':
        setShowExpenseForm(true);
        break;
      case 'manage-categories':
        setShowCategoriesManager(true);
        break;
      case 'budget-settings':
        setShowBudgetSettings(true);
        break;
      case 'export-reports':
        setShowReportsExport(true);
        break;
      case 'generate-insights':
        // This will be handled by the AIInsights component
        break;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <Sidebar onNavigate={handleSidebarNavigate} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar onNavigate={handleSidebarNavigate} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-background border-b">
          <div className="flex items-center justify-between p-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <Sidebar onNavigate={handleSidebarNavigate} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="text-lg font-semibold">ExpenseAI</span>
            </div>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Page Header */}
              <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                    Dashboard
                  </h2>
                  <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4M8 7l4 10 4-10M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2"></path>
                      </svg>
                      <span data-testid="text-current-period">
                        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={handleExport}
                    data-testid="button-export"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button 
                    onClick={() => setShowExpenseForm(true)}
                    data-testid="button-add-expense"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="mt-8">
                <StatsCards />
              </div>

              {/* Charts Section */}
              <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
                <ExpenseChart />
              </div>

              {/* AI Insights and Budget Recommendations Section */}
              <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
                <AIInsights />
                <BudgetRecommendations />
              </div>

              {/* Recent Expenses Section */}
              <div className="mt-8">
                <RecentExpenses />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      {showExpenseForm && (
        <ExpenseForm 
          open={showExpenseForm} 
          onClose={() => setShowExpenseForm(false)} 
        />
      )}
      
      {showBudgetSettings && (
        <BudgetSettings 
          open={showBudgetSettings} 
          onClose={() => setShowBudgetSettings(false)} 
        />
      )}
      
      {showCategoriesManager && (
        <CategoriesManager 
          open={showCategoriesManager} 
          onClose={() => setShowCategoriesManager(false)} 
        />
      )}
      
      {showReportsExport && (
        <ReportsExport 
          open={showReportsExport} 
          onClose={() => setShowReportsExport(false)} 
        />
      )}
    </div>
  );
}
