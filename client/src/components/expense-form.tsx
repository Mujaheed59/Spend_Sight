import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertExpenseSchema, type InsertExpense } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Loader2, Sparkles } from "lucide-react";

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
}

export function ExpenseForm({ open, onClose }: ExpenseFormProps) {
  const { toast } = useToast();
  const [isAICategorizing, setIsAICategorizing] = useState(false);

  const form = useForm<InsertExpense>({
    resolver: zodResolver(insertExpenseSchema),
    defaultValues: {
      amount: "",
      description: "",
      categoryId: "",
      paymentMethod: "cash",
      date: new Date().toISOString().split('T')[0],
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    retry: false,
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: InsertExpense) => {
      return await apiRequest("POST", "/api/expenses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
      toast({
        title: "Expense Added",
        description: "Your expense has been successfully recorded. AI will analyze your spending patterns.",
      });
      form.reset();
      onClose();
      
      // Auto-generate insights after adding expense (with slight delay to allow DB update)
      setTimeout(() => {
        fetch('/api/insights/generate', { 
          method: 'POST',
          credentials: 'include'
        }).catch(err => console.log('Auto-insight generation failed:', err));
      }, 1000);
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
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const categorizeMutation = useMutation({
    mutationFn: async ({ description, amount }: { description: string; amount: number }) => {
      return await apiRequest("POST", "/api/ai/categorize", { description, amount });
    },
    onSuccess: (data: any) => {
      if (data.suggestedCategoryId) {
        form.setValue('categoryId', data.suggestedCategoryId);
        toast({
          title: "AI Suggestion",
          description: `Suggested category: ${data.suggestedCategoryName} (${Math.round(data.confidence * 100)}% confidence)`,
        });
      }
      setIsAICategorizing(false);
    },
    onError: (error: Error) => {
      console.error('AI categorization failed:', error);
      setIsAICategorizing(false);
    },
  });

  const handleAICategorization = async () => {
    const description = form.getValues('description');
    const amount = parseFloat(form.getValues('amount'));
    
    if (!description.trim()) {
      toast({
        title: "Description Required",
        description: "Please enter a description to use AI categorization.",
        variant: "destructive",
      });
      return;
    }

    if (!amount || amount <= 0) {
      toast({
        title: "Amount Required",
        description: "Please enter a valid amount for better AI categorization.",
        variant: "destructive",
      });
      return;
    }

    setIsAICategorizing(true);
    categorizeMutation.mutate({ description, amount });
  };

  // Auto-trigger AI categorization when both description and amount are present
  const watchDescription = form.watch('description');
  const watchAmount = form.watch('amount');
  
  React.useEffect(() => {
    const description = watchDescription?.trim();
    const amount = parseFloat(watchAmount || '0');
    
    // Auto-categorize if we have good description and amount, but no category selected yet
    if (description && description.length > 3 && amount > 0 && !form.getValues('categoryId') && !isAICategorizing) {
      const timeoutId = setTimeout(() => {
        setIsAICategorizing(true);
        categorizeMutation.mutate({ description, amount });
      }, 1500); // Delay to avoid too many API calls while typing
      
      return () => clearTimeout(timeoutId);
    }
  }, [watchDescription, watchAmount, isAICategorizing, form, categorizeMutation]);

  const onSubmit = (data: InsertExpense) => {
    createExpenseMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-add-expense">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Amount */}
          <div>
            <Label htmlFor="amount">Amount *</Label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm">₹</span>
              </div>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-7"
                {...form.register('amount')}
                data-testid="input-amount"
              />
            </div>
            {form.formState.errors.amount && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.amount.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description *</Label>
            <div className="mt-1 flex space-x-2">
              <Input
                id="description"
                placeholder="e.g., Starbucks Coffee"
                {...form.register('description')}
                data-testid="input-description"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAICategorization}
                disabled={isAICategorizing || categorizeMutation.isPending}
                data-testid="button-ai-categorize"
              >
                {isAICategorizing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">AI will automatically suggest a category</p>
            {form.formState.errors.description && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={form.watch('categoryId') || ''} onValueChange={(value) => form.setValue('categoryId', value)}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select or let AI suggest..." />
              </SelectTrigger>
              <SelectContent>
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

          {/* Payment Method */}
          <div>
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select value={form.watch('paymentMethod')} onValueChange={(value) => form.setValue('paymentMethod', value as any)}>
              <SelectTrigger data-testid="select-payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="debit_card">Debit Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.paymentMethod && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.paymentMethod.message}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              {...form.register('date')}
              data-testid="input-date"
            />
            {form.formState.errors.date && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.date.message}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button 
              type="submit" 
              disabled={createExpenseMutation.isPending}
              className="flex-1"
              data-testid="button-submit-expense"
            >
              {createExpenseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Add Expense
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              data-testid="button-cancel-expense"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
