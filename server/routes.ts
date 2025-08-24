import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertExpenseSchema, insertCategorySchema, insertBudgetSchema, insertUserSchema } from "@shared/schema";
import { categorizeExpense, generateInsights } from "./openai";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Initialize default categories
  await initializeDefaultCategories();

  // Auth routes are handled by setupAuth in auth.ts

  // Category routes
  app.get('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Expense routes
  app.get('/api/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const expenses = await storage.getExpensesByUser(userId, limit);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertExpenseSchema.parse(req.body);
      
      // AI categorization if no category provided
      let categoryId = validatedData.categoryId;
      if (!categoryId && validatedData.description) {
        const categorization = await categorizeExpense(validatedData.description, parseFloat(validatedData.amount));
        const categories = await storage.getCategories();
        const matchedCategory = categories.find(cat => cat.name.toLowerCase().includes(categorization.category));
        if (matchedCategory) {
          categoryId = matchedCategory.id;
        }
      }

      const expense = await storage.createExpense({
        ...validatedData,
        categoryId,
        userId,
      });

      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Error creating expense:", error);
        res.status(500).json({ message: "Failed to create expense" });
      }
    }
  });

  app.put('/api/expenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertExpenseSchema.partial().parse(req.body);
      
      const expense = await storage.updateExpense(id, validatedData);
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Error updating expense:", error);
        res.status(500).json({ message: "Failed to update expense" });
      }
    }
  });

  app.delete('/api/expenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteExpense(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const stats = await storage.getExpenseStats(userId, startDate as string, endDate as string);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // AI Insights routes
  app.get('/api/insights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const insights = await storage.getInsightsByUser(userId);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching insights:", error);
      res.status(500).json({ message: "Failed to fetch insights" });
    }
  });

  app.post('/api/insights/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get current month expenses
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      // Get previous month expenses
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      
      const currentExpenses = await storage.getExpensesByUserAndDateRange(userId, startOfMonth, endOfMonth);
      const previousExpenses = await storage.getExpensesByUserAndDateRange(userId, startOfPrevMonth, endOfPrevMonth);
      const budgets = await storage.getBudgetsByUser(userId);
      
      // Format data for AI
      const formattedCurrent = currentExpenses.map(exp => ({
        amount: parseFloat(exp.amount),
        categoryName: exp.category?.name || 'Uncategorized',
        date: exp.date,
        description: exp.description
      }));
      
      const formattedPrevious = previousExpenses.map(exp => ({
        amount: parseFloat(exp.amount),
        categoryName: exp.category?.name || 'Uncategorized',
        date: exp.date,
        description: exp.description
      }));
      
      const formattedBudgets = budgets.map(budget => ({
        categoryName: budget.categoryId || 'General',
        amount: parseFloat(budget.amount)
      }));

      const aiInsights = await generateInsights(formattedCurrent, formattedPrevious, formattedBudgets);
      
      // Save insights to database
      const savedInsights = await Promise.all(
        aiInsights.map(insight => 
          storage.createInsight({
            ...insight,
            userId,
            isRead: "false"
          })
        )
      );

      res.json(savedInsights);
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  app.put('/api/insights/:id/read', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markInsightAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking insight as read:", error);
      res.status(500).json({ message: "Failed to mark insight as read" });
    }
  });

  // Budget routes
  app.get('/api/budgets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const budgets = await storage.getBudgetsByUser(userId);
      res.json(budgets);
    } catch (error) {
      console.error("Error fetching budgets:", error);
      res.status(500).json({ message: "Failed to fetch budgets" });
    }
  });

  app.post('/api/budgets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertBudgetSchema.parse(req.body);
      
      const budget = await storage.createBudget({
        ...validatedData,
        userId,
      });

      res.json(budget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Error creating budget:", error);
        res.status(500).json({ message: "Failed to create budget" });
      }
    }
  });

  app.delete('/api/budgets/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBudget(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting budget:", error);
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });

  // Enhanced category routes
  app.post('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Error creating category:", error);
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });

  app.delete('/api/categories/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCategory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // AI categorization route
  app.post('/api/ai/categorize', isAuthenticated, async (req, res) => {
    try {
      const { description, amount } = req.body;
      
      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }

      const categorization = await categorizeExpense(description, amount || 0);
      const categories = await storage.getCategories();
      const matchedCategory = categories.find(cat => cat.name.toLowerCase().includes(categorization.category));
      
      res.json({
        ...categorization,
        suggestedCategoryId: matchedCategory?.id || null,
        suggestedCategoryName: matchedCategory?.name || 'Unknown'
      });
    } catch (error) {
      console.error("Error categorizing expense:", error);
      res.status(500).json({ message: "Failed to categorize expense" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function initializeDefaultCategories() {
  try {
    const existingCategories = await storage.getCategories();
    
    if (existingCategories.length === 0) {
      const defaultCategories = [
        { name: "Food & Dining", color: "#ef4444", icon: "🍽️" },
        { name: "Transportation", color: "#3b82f6", icon: "🚗" },
        { name: "Shopping", color: "#10b981", icon: "🛍️" },
        { name: "Entertainment", color: "#f59e0b", icon: "🎬" },
        { name: "Bills & Utilities", color: "#8b5cf6", icon: "📱" },
        { name: "Healthcare", color: "#ec4899", icon: "🏥" },
        { name: "Education", color: "#06b6d4", icon: "📚" },
        { name: "Travel", color: "#84cc16", icon: "✈️" },
      ];

      for (const category of defaultCategories) {
        await storage.createCategory(category);
      }
      
      console.log("Default categories initialized");
    }
  } catch (error) {
    console.error("Error initializing default categories:", error);
  }
}
