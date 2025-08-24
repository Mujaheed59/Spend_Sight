import { z } from "zod";

// User interface
export interface User {
  _id?: string;
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  profileImageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Category interface
export interface Category {
  _id?: string;
  id?: string;
  name: string;
  color: string;
  icon?: string;
  createdAt?: Date;
}

// Expense interface
export interface Expense {
  _id?: string;
  id?: string;
  userId: string;
  categoryId?: string;
  amount: number;
  description: string;
  paymentMethod: string;
  date: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Expense with category populated
export interface ExpenseWithCategory extends Expense {
  category?: Category | null;
}

// Insight interface
export interface Insight {
  _id?: string;
  id?: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  priority?: string;
  isRead?: string;
  createdAt?: Date;
}

// Budget interface
export interface Budget {
  _id?: string;
  id?: string;
  userId: string;
  categoryId?: string;
  amount: number;
  period: string;
  startDate: string;
  endDate: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Zod schemas for validation
export const insertExpenseSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().min(1, "Description is required").max(500),
  paymentMethod: z.enum(["cash", "credit_card", "debit_card", "upi", "bank_transfer"]),
  date: z.string().min(1, "Date is required"),
});

export const insertCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  color: z.string().length(7, "Color must be a valid hex color"),
  icon: z.string().max(50).optional(),
});

export const insertInsightSchema = z.object({
  type: z.string().min(1, "Type is required").max(50),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required"),
  priority: z.string().max(20).default("medium"),
  isRead: z.string().max(10).default("false"),
});

export const insertBudgetSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  period: z.string().default("monthly"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email").optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  profileImageUrl: z.string().optional(),
});

// TypeScript types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = Partial<User>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;