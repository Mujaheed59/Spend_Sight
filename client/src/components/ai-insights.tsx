import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, CheckCircle, AlertTriangle, Lightbulb, RefreshCw } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'alert':
      return <Info className="w-5 h-5 text-blue-600" />;
    case 'goal':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    case 'recommendation':
      return <Lightbulb className="w-5 h-5 text-purple-600" />;
    default:
      return <Info className="w-5 h-5 text-blue-600" />;
  }
};

const getInsightColor = (type: string) => {
  switch (type) {
    case 'alert':
      return 'bg-blue-50 border-blue-200 text-blue-900';
    case 'goal':
      return 'bg-green-50 border-green-200 text-green-900';
    case 'warning':
      return 'bg-amber-50 border-amber-200 text-amber-900';
    case 'recommendation':
      return 'bg-purple-50 border-purple-200 text-purple-900';
    default:
      return 'bg-blue-50 border-blue-200 text-blue-900';
  }
};

export function AIInsights() {
  const { toast } = useToast();

  const { data: insights, isLoading } = useQuery({
    queryKey: ['/api/insights'],
    retry: false,
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/insights/generate");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
      toast({
        title: "Insights Generated",
        description: "New AI insights have been generated based on your recent expenses.",
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
        description: "Failed to generate insights. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateInsights = () => {
    generateInsightsMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <CardTitle className="text-lg font-medium text-gray-900">AI Insights & Recommendations</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleGenerateInsights}
          disabled={generateInsightsMutation.isPending}
          data-testid="button-generate-insights"
        >
          {generateInsightsMutation.isPending ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Generate New
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" data-testid="insights-list">
          {(insights as any) && (insights as any).length > 0 ? (
            (insights as any).map((insight: any) => (
              <div 
                key={insight.id} 
                className={`flex items-start space-x-3 p-4 rounded-lg border ${getInsightColor(insight.type)}`}
                data-testid={`insight-${insight.type}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getInsightIcon(insight.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" data-testid={`insight-title-${insight.id}`}>
                    {insight.title}
                  </p>
                  <p className="text-sm mt-1" data-testid={`insight-description-${insight.id}`}>
                    {insight.description}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No insights yet</h3>
              <p className="text-gray-600 mb-4">
                Add some expenses to get personalized AI insights and recommendations.
              </p>
              <Button 
                onClick={handleGenerateInsights}
                disabled={generateInsightsMutation.isPending}
                data-testid="button-generate-first-insights"
              >
                {generateInsightsMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="w-4 h-4 mr-2" />
                )}
                Generate Insights
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
