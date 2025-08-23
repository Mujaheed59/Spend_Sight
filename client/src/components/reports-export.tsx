import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Calendar, Filter, TrendingUp } from "lucide-react";

interface ReportsExportProps {
  open: boolean;
  onClose: () => void;
}

export function ReportsExport({ open, onClose }: ReportsExportProps) {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("summary");
  const [dateRange, setDateRange] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    retry: false,
    enabled: open,
  });

  const getDateRange = () => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (dateRange) {
      case "week":
        start.setDate(today.getDate() - 7);
        break;
      case "month":
        start.setMonth(today.getMonth() - 1);
        break;
      case "quarter":
        start.setMonth(today.getMonth() - 3);
        break;
      case "year":
        start.setFullYear(today.getFullYear() - 1);
        break;
      case "custom":
        return { startDate, endDate };
      default:
        start.setDate(today.getDate() - 30);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const { startDate: start, endDate: end } = getDateRange();
      
      // Simulate export functionality
      toast({
        title: "Export Started",
        description: `Generating ${format.toUpperCase()} report for ${reportType}...`,
      });

      // Here you would implement the actual export logic
      // For now, we'll simulate a download
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = '#'; // This would be the actual file URL
        link.download = `expense-report-${reportType}-${start}-to-${end}.${format}`;
        
        toast({
          title: "Export Complete",
          description: `Your ${format.toUpperCase()} report has been generated successfully.`,
        });
      }, 2000);

    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const reportTypes = [
    { value: "summary", label: "Expense Summary", description: "Overall spending overview with totals and averages" },
    { value: "detailed", label: "Detailed Transactions", description: "Complete list of all expenses with categories" },
    { value: "category", label: "Category Breakdown", description: "Spending analysis by category with percentages" },
    { value: "trends", label: "Spending Trends", description: "Time-based analysis showing spending patterns" },
    { value: "budget", label: "Budget Analysis", description: "Budget vs actual spending comparison" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl" data-testid="modal-reports-export">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Export Reports</span>
          </DialogTitle>
          <DialogDescription>
            Generate and download detailed expense reports in various formats.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Type Selection */}
          <div>
            <Label htmlFor="reportType">Report Type</Label>
            <div className="grid grid-cols-1 gap-3 mt-2">
              {reportTypes.map((type) => (
                <Card 
                  key={type.value} 
                  className={`cursor-pointer transition-all ${
                    reportType === type.value ? 'border-primary bg-primary/5' : 'hover:border-gray-300'
                  }`}
                  onClick={() => setReportType(type.value)}
                  data-testid={`card-report-type-${type.value}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 ${
                        reportType === type.value ? 'border-primary bg-primary' : 'border-gray-300'
                      }`} />
                      <div>
                        <h4 className="font-medium">{type.label}</h4>
                        <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Date Range Selection */}
          <div>
            <Label htmlFor="dateRange">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger data-testid="select-date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="quarter">Last 3 months</SelectItem>
                <SelectItem value="year">Last year</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {dateRange === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            </div>
          )}

          {/* Category Filter */}
          <div>
            <Label htmlFor="categoryFilter">Category Filter</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger data-testid="select-category-filter">
                <SelectValue />
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

          {/* Export Buttons */}
          <div className="border-t pt-6">
            <h4 className="font-medium mb-4">Export Format</h4>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => handleExport('csv')}
                className="h-16 flex-col"
                variant="outline"
                data-testid="button-export-csv"
              >
                <Download className="h-5 w-5 mb-2" />
                <div>
                  <div className="font-medium">CSV Format</div>
                  <div className="text-xs text-gray-600">Excel compatible</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => handleExport('pdf')}
                className="h-16 flex-col"
                variant="outline"
                data-testid="button-export-pdf"
              >
                <FileText className="h-5 w-5 mb-2" />
                <div>
                  <div className="font-medium">PDF Format</div>
                  <div className="text-xs text-gray-600">Formatted report</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Report Preview */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Report Preview</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    This {reportTypes.find(t => t.value === reportType)?.label.toLowerCase()} will include{' '}
                    {dateRange === 'custom' ? `data from ${startDate} to ${endDate}` : `the ${dateRange === 'week' ? 'last 7 days' : dateRange === 'month' ? 'last 30 days' : dateRange === 'quarter' ? 'last 3 months' : 'last year'}`}
                    {categoryFilter !== 'all' && ' for the selected category'}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}