import {
  users,
  expenses,
  categories,
  insights,
  budgets,
  type User,
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
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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
  
  // Analytics
  getExpenseStats(userId: string, startDate: string, endDate: string): Promise<{
    totalSpent: number;
    categoryBreakdown: Array<{ categoryName: string; amount: number; color: string }>;
    dailyTrend: Array<{ date: string; amount: number }>;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  // Expense operations
  async getExpensesByUser(userId: string, limit = 50): Promise<ExpenseWithCategory[]> {
    const result = await db
      .select({
        id: expenses.id,
        userId: expenses.userId,
        categoryId: expenses.categoryId,
        amount: expenses.amount,
        description: expenses.description,
        paymentMethod: expenses.paymentMethod,
        date: expenses.date,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
        category: categories,
      })
      .from(expenses)
      .leftJoin(categories, eq(expenses.categoryId, categories.id))
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.date), desc(expenses.createdAt))
      .limit(limit);

    return result.map(row => ({
      ...row,
      category: row.category,
    }));
  }

  async getExpensesByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<ExpenseWithCategory[]> {
    const result = await db
      .select({
        id: expenses.id,
        userId: expenses.userId,
        categoryId: expenses.categoryId,
        amount: expenses.amount,
        description: expenses.description,
        paymentMethod: expenses.paymentMethod,
        date: expenses.date,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
        category: categories,
      })
      .from(expenses)
      .leftJoin(categories, eq(expenses.categoryId, categories.id))
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, startDate),
          lte(expenses.date, endDate)
        )
      )
      .orderBy(desc(expenses.date), desc(expenses.createdAt));

    return result.map(row => ({
      ...row,
      category: row.category,
    }));
  }

  async createExpense(expense: InsertExpense & { userId: string }): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values({
      ...expense,
      amount: expense.amount.toString(),
    }).returning();
    return newExpense;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense> {
    const updateData: any = { ...expense };
    if (expense.amount) {
      updateData.amount = expense.amount.toString();
    }
    updateData.updatedAt = new Date();

    const [updatedExpense] = await db
      .update(expenses)
      .set(updateData)
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  async deleteExpense(id: string): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  // Insight operations
  async getInsightsByUser(userId: string): Promise<Insight[]> {
    return await db
      .select()
      .from(insights)
      .where(eq(insights.userId, userId))
      .orderBy(desc(insights.createdAt));
  }

  async createInsight(insight: InsertInsight & { userId: string }): Promise<Insight> {
    const [newInsight] = await db.insert(insights).values(insight).returning();
    return newInsight;
  }

  async markInsightAsRead(id: string): Promise<void> {
    await db.update(insights).set({ isRead: "true" }).where(eq(insights.id, id));
  }

  // Budget operations
  async getBudgetsByUser(userId: string): Promise<Budget[]> {
    return await db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId))
      .orderBy(desc(budgets.createdAt));
  }

  async createBudget(budget: InsertBudget & { userId: string }): Promise<Budget> {
    const [newBudget] = await db.insert(budgets).values({
      ...budget,
      amount: budget.amount.toString(),
    }).returning();
    return newBudget;
  }

  // Analytics
  async getExpenseStats(userId: string, startDate: string, endDate: string): Promise<{
    totalSpent: number;
    categoryBreakdown: Array<{ categoryName: string; amount: number; color: string }>;
    dailyTrend: Array<{ date: string; amount: number }>;
  }> {
    // Get total spent
    const totalResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, startDate),
          lte(expenses.date, endDate)
        )
      );

    const totalSpent = Number(totalResult[0]?.total || 0);

    // Get category breakdown
    const categoryResult = await db
      .select({
        categoryName: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
        amount: sql<number>`SUM(CAST(${expenses.amount} AS DECIMAL))`,
        color: sql<string>`COALESCE(${categories.color}, '#6b7280')`,
      })
      .from(expenses)
      .leftJoin(categories, eq(expenses.categoryId, categories.id))
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, startDate),
          lte(expenses.date, endDate)
        )
      )
      .groupBy(categories.name, categories.color)
      .orderBy(sql`SUM(CAST(${expenses.amount} AS DECIMAL)) DESC`);

    const categoryBreakdown = categoryResult.map(row => ({
      categoryName: row.categoryName,
      amount: Number(row.amount),
      color: row.color,
    }));

    // Get daily trend
    const dailyResult = await db
      .select({
        date: expenses.date,
        amount: sql<number>`SUM(CAST(${expenses.amount} AS DECIMAL))`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, startDate),
          lte(expenses.date, endDate)
        )
      )
      .groupBy(expenses.date)
      .orderBy(asc(expenses.date));

    const dailyTrend = dailyResult.map(row => ({
      date: row.date,
      amount: Number(row.amount),
    }));

    return {
      totalSpent,
      categoryBreakdown,
      dailyTrend,
    };
  }
}

export const storage = new DatabaseStorage();
