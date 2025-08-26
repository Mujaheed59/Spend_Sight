import {
  type User,
  type InsertUser,
  type UpsertUser,
  type Expense,
  type ExpenseWithCategory,
  type InsertExpense,
  type Category,
  type InsertCategory,
  type Insight,
  type InsertInsight,
  type Budget,
  type InsertBudget,
} from "@shared/schema";
import { UserModel, CategoryModel, ExpenseModel, InsightModel, BudgetModel } from "./models";
import session from "express-session";
import MongoStore from "connect-mongo";
import MemoryStore from "memorystore";
import mongoose from "./db";

export interface IStorage {
  // User operations for local authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Session store for authentication
  sessionStore: session.Store;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Expense operations
  getExpensesByUser(userId: string, limit?: number): Promise<ExpenseWithCategory[]>;
  getExpensesByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<ExpenseWithCategory[]>;
  createExpense(expense: InsertExpense & { userId: string }): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
  
  // Insight operations
  getInsightsByUser(userId: string): Promise<Insight[]>;
  createInsight(insight: InsertInsight & { userId: string }): Promise<Insight>;
  markInsightAsRead(id: string): Promise<void>;
  clearUserInsights(userId: string): Promise<void>;
  
  // Budget operations
  getBudgetsByUser(userId: string): Promise<Budget[]>;
  createBudget(budget: InsertBudget & { userId: string }): Promise<Budget>;
  deleteBudget(id: string): Promise<void>;
  
  // Enhanced category operations
  deleteCategory(id: string): Promise<void>;
  
  // Analytics
  getExpenseStats(userId: string, startDate: string, endDate: string): Promise<{
    totalSpent: number;
    categoryBreakdown: Array<{ categoryName: string; amount: number; color: string }>;
    dailyTrend: Array<{ date: string; amount: number }>;
  }>;
}

const MemoryStoreSession = MemoryStore(session);

// In-memory storage implementation as fallback
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private categories: Map<string, Category> = new Map();
  private expenses: Map<string, Expense> = new Map();
  private insights: Map<string, Insight> = new Map();
  private budgets: Map<string, Budget> = new Map();
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Initialize default categories
    this.initializeDefaultCategories();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private initializeDefaultCategories() {
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

    defaultCategories.forEach(cat => {
      const id = this.generateId();
      this.categories.set(id, {
        id,
        ...cat,
        createdAt: new Date()
      });
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const usersArray = Array.from(this.users.values());
    return usersArray.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.generateId();
    const user: User = {
      id,
      ...insertUser,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const id = userData.id || this.generateId();
    const existingUser = this.users.get(id);
    const user: User = {
      ...existingUser,
      ...userData,
      id,
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.generateId();
    const newCategory: Category = {
      id,
      ...category,
      createdAt: new Date()
    };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    this.categories.delete(id);
  }

  async getExpensesByUser(userId: string, limit = 50): Promise<ExpenseWithCategory[]> {
    const userExpenses = Array.from(this.expenses.values())
      .filter(expense => expense.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    return userExpenses.map(expense => ({
      ...expense,
      category: expense.categoryId ? this.categories.get(expense.categoryId) || null : null
    }));
  }

  async getExpensesByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<ExpenseWithCategory[]> {
    const userExpenses = Array.from(this.expenses.values())
      .filter(expense => expense.userId === userId && expense.date >= startDate && expense.date <= endDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return userExpenses.map(expense => ({
      ...expense,
      category: expense.categoryId ? this.categories.get(expense.categoryId) || null : null
    }));
  }

  async createExpense(expense: InsertExpense & { userId: string }): Promise<Expense> {
    const id = this.generateId();
    const newExpense: Expense = {
      id,
      ...expense,
      amount: typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount,
      paymentMethod: expense.paymentMethod,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.expenses.set(id, newExpense);
    return newExpense;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense> {
    const existing = this.expenses.get(id);
    if (!existing) {
      throw new Error('Expense not found');
    }
    const updated: Expense = {
      ...existing,
      ...expense,
      amount: expense.amount ? (typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount) : existing.amount,
      updatedAt: new Date()
    };
    this.expenses.set(id, updated);
    return updated;
  }

  async deleteExpense(id: string): Promise<void> {
    this.expenses.delete(id);
  }

  async getInsightsByUser(userId: string): Promise<Insight[]> {
    return Array.from(this.insights.values())
      .filter(insight => insight.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createInsight(insight: InsertInsight & { userId: string }): Promise<Insight> {
    const id = this.generateId();
    const newInsight: Insight = {
      id,
      ...insight,
      createdAt: new Date()
    };
    this.insights.set(id, newInsight);
    return newInsight;
  }

  async markInsightAsRead(id: string): Promise<void> {
    const insight = this.insights.get(id);
    if (insight) {
      insight.isRead = "true";
      this.insights.set(id, insight);
    }
  }

  async clearUserInsights(userId: string): Promise<void> {
    for (const [id, insight] of this.insights.entries()) {
      if (insight.userId === userId) {
        this.insights.delete(id);
      }
    }
  }

  async getBudgetsByUser(userId: string): Promise<Budget[]> {
    return Array.from(this.budgets.values())
      .filter(budget => budget.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createBudget(budget: InsertBudget & { userId: string }): Promise<Budget> {
    const id = this.generateId();
    const newBudget: Budget = {
      id,
      ...budget,
      amount: typeof budget.amount === 'string' ? parseFloat(budget.amount) : budget.amount,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.budgets.set(id, newBudget);
    return newBudget;
  }

  async deleteBudget(id: string): Promise<void> {
    this.budgets.delete(id);
  }

  async getExpenseStats(userId: string, startDate: string, endDate: string): Promise<{
    totalSpent: number;
    categoryBreakdown: Array<{ categoryName: string; amount: number; color: string }>;
    dailyTrend: Array<{ date: string; amount: number }>;
  }> {
    const expenses = await this.getExpensesByUserAndDateRange(userId, startDate, endDate);
    
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    const categoryMap = new Map<string, { amount: number; name: string; color: string }>();
    const dailyMap = new Map<string, number>();
    
    expenses.forEach(expense => {
      // Category breakdown
      const categoryName = expense.category?.name || 'Uncategorized';
      const categoryColor = expense.category?.color || '#6b7280';
      const categoryKey = expense.categoryId || 'uncategorized';
      
      if (categoryMap.has(categoryKey)) {
        categoryMap.get(categoryKey)!.amount += expense.amount;
      } else {
        categoryMap.set(categoryKey, {
          amount: expense.amount,
          name: categoryName,
          color: categoryColor
        });
      }
      
      // Daily trend
      if (dailyMap.has(expense.date)) {
        dailyMap.set(expense.date, dailyMap.get(expense.date)! + expense.amount);
      } else {
        dailyMap.set(expense.date, expense.amount);
      }
    });
    
    const categoryBreakdown = Array.from(categoryMap.values())
      .map(cat => ({ categoryName: cat.name, amount: cat.amount, color: cat.color }))
      .sort((a, b) => b.amount - a.amount);
      
    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return {
      totalSpent,
      categoryBreakdown,
      dailyTrend
    };
  }
}

export class MongoStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Use memory store for sessions with fallback to MongoDB when available
    try {
      if (mongoose.connection.readyState === 1) {
        this.sessionStore = MongoStore.create({
          client: mongoose.connection.getClient(),
          collectionName: 'sessions'
        });
      } else {
        this.sessionStore = new MemoryStoreSession({
          checkPeriod: 86400000 // prune expired entries every 24h
        });
      }
    } catch (error) {
      console.log('Using memory store for sessions');
      this.sessionStore = new MemoryStoreSession({
        checkPeriod: 86400000 // prune expired entries every 24h
      });
    }
  }

  // User operations for local authentication
  async getUser(id: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findById(id).lean();
      return user ? this.transformUser(user) : undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  private transformUser(user: any): User {
    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: user.password,
      profileImageUrl: user.profileImageUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ username }).lean();
      return user ? this.transformUser(user) : undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user = new UserModel(insertUser);
    const savedUser = await user.save();
    return this.transformUser(savedUser.toObject());
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user = await UserModel.findOneAndUpdate(
      { _id: userData.id || userData._id },
      { ...userData, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    return this.transformUser(user!.toObject());
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    try {
      const categories = await CategoryModel.find().sort({ name: 1 }).lean();
      return categories.map(cat => this.transformCategory(cat));
    } catch (error) {
      console.log('Categories not available, returning empty array');
      return [];
    }
  }

  private transformCategory(cat: any): Category {
    return {
      id: cat._id.toString(),
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      createdAt: cat.createdAt
    };
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const newCategory = new CategoryModel(category);
    const savedCategory = await newCategory.save();
    return this.transformCategory(savedCategory.toObject());
  }

  // Expense operations
  async getExpensesByUser(userId: string, limit = 50): Promise<ExpenseWithCategory[]> {
    const expenses = await ExpenseModel.find({ userId })
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const result: ExpenseWithCategory[] = [];
    
    for (const expense of expenses) {
      let category = null;
      if (expense.categoryId) {
        const cat = await CategoryModel.findById(expense.categoryId).lean();
        category = cat ? { ...cat, id: cat._id.toString() } : null;
      }
      
      result.push({
        ...expense,
        id: expense._id.toString(),
        category
      });
    }
    
    return result;
  }

  async getExpensesByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<ExpenseWithCategory[]> {
    const expenses = await ExpenseModel.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1, createdAt: -1 }).lean();

    const result: ExpenseWithCategory[] = [];
    
    for (const expense of expenses) {
      let category = null;
      if (expense.categoryId) {
        const cat = await CategoryModel.findById(expense.categoryId).lean();
        category = cat ? { ...cat, id: cat._id.toString() } : null;
      }
      
      result.push({
        ...expense,
        id: expense._id.toString(),
        category
      });
    }
    
    return result;
  }

  async createExpense(expense: InsertExpense & { userId: string }): Promise<Expense> {
    const newExpense = new ExpenseModel({
      ...expense,
      amount: parseFloat(expense.amount)
    });
    const savedExpense = await newExpense.save();
    return { ...savedExpense.toObject(), id: savedExpense._id.toString() };
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense> {
    const updateData: any = { ...expense };
    if (expense.amount) {
      updateData.amount = parseFloat(expense.amount);
    }
    updateData.updatedAt = new Date();

    const updatedExpense = await ExpenseModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!updatedExpense) {
      throw new Error('Expense not found');
    }
    
    return { ...updatedExpense.toObject(), id: updatedExpense._id.toString() };
  }

  async deleteExpense(id: string): Promise<void> {
    await ExpenseModel.findByIdAndDelete(id);
  }

  // Insight operations
  async getInsightsByUser(userId: string): Promise<Insight[]> {
    const insights = await InsightModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return insights.map(insight => ({ ...insight, id: insight._id.toString() }));
  }

  async createInsight(insight: InsertInsight & { userId: string }): Promise<Insight> {
    const newInsight = new InsightModel(insight);
    const savedInsight = await newInsight.save();
    return { ...savedInsight.toObject(), id: savedInsight._id.toString() };
  }

  async markInsightAsRead(id: string): Promise<void> {
    await InsightModel.findByIdAndUpdate(id, { isRead: "true" });
  }

  async clearUserInsights(userId: string): Promise<void> {
    await InsightModel.deleteMany({ userId });
  }

  // Budget operations
  async getBudgetsByUser(userId: string): Promise<Budget[]> {
    const budgets = await BudgetModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return budgets.map(budget => ({ ...budget, id: budget._id.toString() }));
  }

  async createBudget(budget: InsertBudget & { userId: string }): Promise<Budget> {
    const newBudget = new BudgetModel({
      ...budget,
      amount: parseFloat(budget.amount)
    });
    const savedBudget = await newBudget.save();
    return { ...savedBudget.toObject(), id: savedBudget._id.toString() };
  }

  async deleteBudget(id: string): Promise<void> {
    await BudgetModel.findByIdAndDelete(id);
  }

  // Enhanced category operations
  async deleteCategory(id: string): Promise<void> {
    await CategoryModel.findByIdAndDelete(id);
  }

  // Analytics
  async getExpenseStats(userId: string, startDate: string, endDate: string): Promise<{
    totalSpent: number;
    categoryBreakdown: Array<{ categoryName: string; amount: number; color: string }>;
    dailyTrend: Array<{ date: string; amount: number }>;
  }> {
    // Get total spent
    const totalResult = await ExpenseModel.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);

    const totalSpent = totalResult[0]?.total || 0;

    // Get category breakdown
    const categoryResult = await ExpenseModel.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$categoryId",
          amount: { $sum: "$amount" }
        }
      },
      {
        $sort: { amount: -1 }
      }
    ]);

    const categoryBreakdown = [];
    for (const item of categoryResult) {
      let categoryName = 'Uncategorized';
      let color = '#6b7280';
      
      if (item._id) {
        const category = await CategoryModel.findById(item._id).lean();
        if (category) {
          categoryName = category.name;
          color = category.color;
        }
      }
      
      categoryBreakdown.push({
        categoryName,
        amount: item.amount,
        color
      });
    }

    // Get daily trend
    const dailyResult = await ExpenseModel.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$date",
          amount: { $sum: "$amount" }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const dailyTrend = dailyResult.map(item => ({
      date: item._id,
      amount: item.amount
    }));

    return {
      totalSpent,
      categoryBreakdown,
      dailyTrend,
    };
  }
}

// Initialize storage based on database availability
let storage: IStorage;

// Initialize storage immediately with memory storage
storage = new MemStorage();
console.log('🚀 Using enhanced in-memory storage with real-time features');

// Try to upgrade to MongoDB when available
const tryMongoUpgrade = () => {
  try {
    if (mongoose.connection.readyState === 1) {
      storage = new MongoStorage();
      console.log('✅ Upgraded to MongoDB storage');
    }
  } catch (error) {
    console.log('❌ MongoDB upgrade failed, staying with memory storage');
  }
};

// Listen for database connection events
mongoose.connection.on('connected', () => {
  tryMongoUpgrade();
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected, using memory storage');
  storage = new MemStorage();
});

// Try upgrade after a short delay
setTimeout(tryMongoUpgrade, 2000);

export { storage };