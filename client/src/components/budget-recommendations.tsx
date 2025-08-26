import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Brain, TrendingUp, DollarSign, Target, Lightbulb } from "lucide-react";

interface BudgetRecommendation {
  category: string;
  currentSpend: number;
  recommendedBudget: number;
  reason: string;
  potentialSavings: number;
}

export function BudgetRecommendations() {
  const { toast } = useToast();

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['/api/ai/budget-recommendations'],
    retry: false,
  });

  const generateRecommendationsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/ai/budget-recommendations");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/budget-recommendations'] });
      toast({
        title: "Budget Recommendations Generated",
        description: "AI has analyzed your spending and created personalized budget suggestions.",
      });
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
        description: "Failed to generate budget recommendations. Please try again.",
        variant: "destructive",
      });
    },
  });

  const applyBudgetMutation = useMutation({
    mutationFn: async (recommendation: BudgetRecommendation) => {
      return await apiRequest("POST", "/api/budgets", {
        categoryName: recommendation.category,
        amount: recommendation.recommendedBudget,
        period: "monthly",
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
      });
    },
    onSuccess: (_, recommendation) => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      toast({
        title: "Budget Applied",
        description: `Set ₹${recommendation.recommendedBudget} monthly budget for ${recommendation.category}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to apply budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateRecommendations = () => {
    generateRecommendationsMutation.mutate();
  };

  const handleApplyBudget = (recommendation: BudgetRecommendation) => {
    applyBudgetMutation.mutate(recommendation);
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow" data-testid="card-budget-recommendations">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <span>AI Budget Recommendations</span>
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateRecommendations}
            disabled={generateRecommendationsMutation.isPending}
            data-testid="button-generate-recommendations"
          >
            <TrendingUp className={`h-4 w-4 mr-2 ${generateRecommendationsMutation.isPending ? 'animate-spin' : ''}`} />
            {generateRecommendationsMutation.isPending ? 'Analyzing...' : 'Generate'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {(recommendations as any) && (recommendations as any).length > 0 ? (
          <div className="space-y-4" data-testid="recommendations-list">
            {(recommendations as any).map((recommendation: BudgetRecommendation, index: number) => (
              <div 
                key={index}
                className="p-4 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors"
                data-testid={`recommendation-${index}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-sm font-semibold text-purple-900">
                        {recommendation.category}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        AI Suggested
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-gray-600">Current Spend:</span>
                        <div className="font-medium text-gray-900">₹{recommendation.currentSpend}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Recommended:</span>
                        <div className="font-medium text-purple-700">₹{recommendation.recommendedBudget}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Potential Savings:</span>
                        <div className="font-medium text-green-600">₹{recommendation.potentialSavings}</div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3">
                      <Lightbulb className="h-4 w-4 inline mr-1 text-amber-500" />
                      {recommendation.reason}
                    </p>
                    
                    <Button
                      size="sm"
                      onClick={() => handleApplyBudget(recommendation)}
                      disabled={applyBudgetMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid={`button-apply-budget-${index}`}
                    >
                      <Target className="h-4 w-4 mr-1" />
                      Apply Budget
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No recommendations yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add expenses across different categories to get AI-powered budget recommendations.
            </p>
            <div className="mt-6">
              <Button 
                onClick={handleGenerateRecommendations}
                disabled={generateRecommendationsMutation.isPending}
                data-testid="button-generate-first-recommendations"
              >
                <TrendingUp className={`h-4 w-4 mr-2 ${generateRecommendationsMutation.isPending ? 'animate-spin' : ''}`} />
                Generate Recommendations
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}