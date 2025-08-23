import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { insertCategorySchema, type InsertCategory } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Edit, Trash2, Tag, Palette } from "lucide-react";

interface CategoriesManagerProps {
  open: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", 
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#a855f7", "#d946ef", "#ec4899", "#f43f5e"
];

const PRESET_ICONS = [
  "🍽️", "🚗", "🛍️", "🎬", "📱", "🏥", "📚", "✈️",
  "💰", "🏠", "⚡", "🎮", "👕", "☕", "🎵", "💊"
];

export function CategoriesManager({ open, onClose }: CategoriesManagerProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const form = useForm<InsertCategory>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      color: PRESET_COLORS[0],
      icon: PRESET_ICONS[0],
    },
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ['/api/categories'],
    retry: false,
    enabled: open,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: InsertCategory) => {
      return await apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Category Created",
        description: "New category has been added successfully.",
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
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Category Deleted",
        description: "Category has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCategory) => {
    createCategoryMutation.mutate(data);
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      color: category.color,
      icon: category.icon,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    form.reset();
    setShowForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-categories-manager">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Tag className="h-5 w-5" />
            <span>Manage Categories</span>
          </DialogTitle>
          <DialogDescription>
            Create and organize expense categories to better track your spending.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Category Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Your Categories</h3>
            <Button 
              onClick={() => setShowForm(true)}
              data-testid="button-add-category"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>

          {/* Categories Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="categories-grid">
              {(categories as any)?.map((category: any) => (
                <Card key={category.id} className="relative group hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center space-y-2">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                        style={{ backgroundColor: `${category.color}20`, color: category.color }}
                      >
                        {category.icon}
                      </div>
                      <h4 className="font-medium text-center text-sm" data-testid={`category-name-${category.id}`}>
                        {category.name}
                      </h4>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: category.color, color: category.color }}
                      >
                        {category.color}
                      </Badge>
                    </div>
                    
                    {/* Action Buttons - Show on Hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(category)}
                        data-testid={`button-edit-category-${category.id}`}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDelete(category.id)}
                        data-testid={`button-delete-category-${category.id}`}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Category Form */}
          {showForm && (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Category Name */}
                  <div>
                    <Label htmlFor="name">Category Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Groceries, Entertainment"
                      {...form.register('name')}
                      data-testid="input-category-name"
                    />
                    {form.formState.errors.name && (
                      <p className="text-red-500 text-xs mt-1">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  {/* Icon Selection */}
                  <div>
                    <Label htmlFor="icon">Icon</Label>
                    <div className="grid grid-cols-8 gap-2 mt-2">
                      {PRESET_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          className={`p-2 text-xl border rounded hover:bg-gray-50 transition-colors ${
                            form.watch('icon') === icon ? 'border-primary bg-primary/10' : 'border-gray-200'
                          }`}
                          onClick={() => form.setValue('icon', icon)}
                          data-testid={`button-icon-${icon}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <div className="grid grid-cols-8 gap-2 mt-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded border-2 transition-all ${
                            form.watch('color') === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => form.setValue('color', color)}
                          data-testid={`button-color-${color}`}
                        />
                      ))}
                    </div>
                    <Input
                      type="color"
                      value={form.watch('color')}
                      onChange={(e) => form.setValue('color', e.target.value)}
                      className="w-20 h-8 mt-2"
                      data-testid="input-custom-color"
                    />
                  </div>

                  {/* Preview */}
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <Label className="text-sm font-medium text-gray-700">Preview</Label>
                    <div className="flex items-center space-x-3 mt-2">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                        style={{ 
                          backgroundColor: `${form.watch('color')}20`, 
                          color: form.watch('color') 
                        }}
                      >
                        {form.watch('icon')}
                      </div>
                      <span className="font-medium">{form.watch('name') || 'Category Name'}</span>
                    </div>
                  </div>

                  {/* Form Buttons */}
                  <div className="flex space-x-2 pt-4">
                    <Button 
                      type="submit" 
                      disabled={createCategoryMutation.isPending}
                      data-testid="button-submit-category"
                    >
                      {editingCategory ? 'Update Category' : 'Create Category'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetForm}
                      data-testid="button-cancel-category"
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