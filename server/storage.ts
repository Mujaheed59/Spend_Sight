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

export const storage = new MongoStorage();