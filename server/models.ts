import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  firstName: String,
  lastName: String,
  password: String,
  profileImageUrl: String,
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc: any, ret: any) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Category Schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  color: { type: String, required: true, maxlength: 7 },
  icon: { type: String, maxlength: 50 },
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc: any, ret: any) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Expense Schema
const expenseSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  categoryId: { type: String, index: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true, maxlength: 500 },
  paymentMethod: { 
    type: String, 
    required: true,
    enum: ["cash", "credit_card", "debit_card", "upi", "bank_transfer"]
  },
  date: { type: String, required: true },
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc: any, ret: any) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Insight Schema
const insightSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true, maxlength: 50 },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true },
  priority: { type: String, default: "medium", maxlength: 20 },
  isRead: { type: String, default: "false", maxlength: 10 },
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc: any, ret: any) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Budget Schema
const budgetSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  categoryId: String,
  amount: { type: Number, required: true },
  period: { type: String, required: true, default: "monthly" },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc: any, ret: any) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Export models
export const UserModel = mongoose.model('User', userSchema);
export const CategoryModel = mongoose.model('Category', categorySchema);
export const ExpenseModel = mongoose.model('Expense', expenseSchema);
export const InsightModel = mongoose.model('Insight', insightSchema);
export const BudgetModel = mongoose.model('Budget', budgetSchema);