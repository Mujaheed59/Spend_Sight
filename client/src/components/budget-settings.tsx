import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { insertBudgetSchema, type InsertBudget } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Edit, Trash2, Target, Calendar } from "lucide-react";

interface BudgetSettingsProps {
  open: boolean;
  onClose: () => void;
}

export function BudgetSettings({ open, onClose }: BudgetSettingsProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);

  const form = useForm<InsertBudget>({
    resolver: zodResolver(insertBudgetSchema),
    defaultValues: {
      categoryId: "",
      amount: "",
      period: "monthly",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    },
  });

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['/api/budgets'],
    retry: false,
    enabled: open,
  });

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    retry: false,
    enabled: open,
  });

  const createBudgetMutation = useMutation({
    mutationFn: async (data: InsertBudget) => {
      return await apiRequest("POST", "/api/budgets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats'] });
      toast({
        title: "Budget Created",
        description: "Your budget has been successfully set.",
      });
      form.reset();
      setShowForm(false);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to create budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      toast({
        title: "Budget Deleted",
        description: "Budget has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const getCategoryName = (categoryId: string) => {
    const category = (categories as any)?.find((cat: any) => cat.id === categoryId);
    return category?.name || 'All Categories';
  };

  const onSubmit = (data: InsertBudget) => {
    createBudgetMutation.mutate(data);
  };

  const handleEdit = (budget: any) => {
    setEditingBudget(budget);
    form.reset({
      categoryId: budget.categoryId || "",
      amount: budget.amount,
      period: budget.period,
      startDate: budget.startDate,
      endDate: budget.endDate,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      deleteBudgetMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setEditingBudget(null);
    form.reset();
    setShowForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-budget-settings">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Budget Settings</span>
          </DialogTitle>
          <DialogDescription>
            Set spending limits for different categories to track your financial goals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Budget Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Your Budgets</h3>
            <Button 
              onClick={() => setShowForm(true)}
              data-testid="button-add-budget"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Budget
            </Button>
          </div>

          {/* Budget List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="budgets-list">
              {(budgets as any) && (budgets as any).length > 0 ? (
                (budgets as any).map((budget: any) => (
                  <Card key={budget.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base" data-testid={`budget-category-${budget.id}`}>
                            {getCategoryName(budget.categoryId)}
                          </CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {budget.period}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(budget)}
                            data-testid={`button-edit-budget-${budget.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(budget.id)}
                            data-testid={`button-delete-budget-${budget.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Budget</span>
                          <span className="font-medium" data-testid={`budget-amount-${budget.id}`}>
                            {formatCurrency(budget.amount)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {budget.startDate} to {budget.endDate}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 text-center py-8">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No budgets set</h3>
                  <p className="text-gray-600 mb-4">
                    Start by creating your first budget to track spending.
                  </p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Budget
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Budget Form */}
          {showForm && (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingBudget ? 'Edit Budget' : 'Create New Budget'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category */}
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select 
                        value={form.watch('categoryId') || ''} 
                        onValueChange={(value) => form.setValue('categoryId', value)}
                      >
                        <SelectTrigger data-testid="select-budget-category">
                          <SelectValue placeholder="Select category (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {(categories as any)?.map((category: any) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">{category.icon}</span>
                                <span>{category.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount */}
                    <div>
                      <Label htmlFor="amount">Budget Amount *</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">₹</span>
                        </div>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="5000.00"
                          className="pl-7"
                          {...form.register('amount')}
                          data-testid="input-budget-amount"
                        />
                      </div>
                      {form.formState.errors.amount && (
                        <p className="text-red-500 text-xs mt-1">{form.formState.errors.amount.message}</p>
                      )}
                    </div>

                    {/* Period */}
                    <div>
                      <Label htmlFor="period">Period *</Label>
                      <Select 
                        value={form.watch('period')} 
                        onValueChange={(value) => form.setValue('period', value as any)}
                      >
                        <SelectTrigger data-testid="select-budget-period">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.period && (
                        <p className="text-red-500 text-xs mt-1">{form.formState.errors.period.message}</p>
                      )}
                    </div>

                    {/* Start Date */}
                    <div>
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        {...form.register('startDate')}
                        data-testid="input-budget-start-date"
                      />
                      {form.formState.errors.startDate && (
                        <p className="text-red-500 text-xs mt-1">{form.formState.errors.startDate.message}</p>
                      )}
                    </div>

                    {/* End Date */}
                    <div>
                      <Label htmlFor="endDate">End Date *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        {...form.register('endDate')}
                        data-testid="input-budget-end-date"
                      />
                      {form.formState.errors.endDate && (
                        <p className="text-red-500 text-xs mt-1">{form.formState.errors.endDate.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Form Buttons */}
                  <div className="flex space-x-2 pt-4">
                    <Button 
                      type="submit" 
                      disabled={createBudgetMutation.isPending}
                      data-testid="button-submit-budget"
                    >
                      {editingBudget ? 'Update Budget' : 'Create Budget'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetForm}
                      data-testid="button-cancel-budget"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}