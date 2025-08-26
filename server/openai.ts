import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

export interface ExpenseCategorization {
  category: string;
  confidence: number;
  reasoning: string;
}

export interface AIInsight {
  type: 'alert' | 'goal' | 'warning' | 'recommendation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export async function categorizeExpense(description: string, amount: number): Promise<ExpenseCategorization> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expense categorization expert. Categorize expenses into one of these categories:
          - food: Food & Dining (restaurants, groceries, coffee, etc.)
          - transportation: Transportation (gas, uber, parking, public transport, etc.)
          - shopping: Shopping (clothes, electronics, general purchases, etc.)
          - entertainment: Entertainment (movies, games, subscriptions, etc.)
          - bills: Bills & Utilities (electricity, internet, phone, rent, etc.)
          - healthcare: Healthcare (doctor visits, medicine, insurance, etc.)
          - education: Education (courses, books, tuition, etc.)
          - travel: Travel (flights, hotels, vacation expenses, etc.)
          
          Respond with JSON in this format: { "category": "category_name", "confidence": 0.95, "reasoning": "brief explanation" }`
        },
        {
          role: "user",
          content: `Categorize this expense: "${description}" with amount ₹${amount}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      category: result.category || 'shopping',
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      reasoning: result.reasoning || 'AI categorization based on description'
    };
  } catch (error) {
    console.error('Error categorizing expense:', error);
    return {
      category: 'shopping',
      confidence: 0.1,
      reasoning: 'Default categorization due to AI service error'
    };
  }
}

export async function generateInsights(
  expenses: Array<{ amount: number; categoryName: string; date: string; description: string }>,
  previousMonthExpenses: Array<{ amount: number; categoryName: string; date: string; description: string }>,
  budgets: Array<{ categoryName: string; amount: number }>
): Promise<AIInsight[]> {
  try {
    const currentTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const previousTotal = previousMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Prepare expense summary for AI
    const expenseSummary = {
      currentMonth: {
        total: currentTotal,
        categoryBreakdown: expenses.reduce((acc, exp) => {
          acc[exp.categoryName] = (acc[exp.categoryName] || 0) + exp.amount;
          return acc;
        }, {} as Record<string, number>)
      },
      previousMonth: {
        total: previousTotal,
        categoryBreakdown: previousMonthExpenses.reduce((acc, exp) => {
          acc[exp.categoryName] = (acc[exp.categoryName] || 0) + exp.amount;
          return acc;
        }, {} as Record<string, number>)
      },
      budgets: budgets.reduce((acc, budget) => {
        acc[budget.categoryName] = budget.amount;
        return acc;
      }, {} as Record<string, number>)
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a personal financial advisor AI. Analyze spending patterns and provide actionable insights.
          
          Generate 2-4 insights based on the data. Each insight should have:
          - type: "alert" (urgent overspending), "goal" (positive achievements), "warning" (approaching limits), or "recommendation" (improvement suggestions)
          - title: Compelling, specific title (max 40 chars)
          - description: Actionable advice with specific amounts or percentages when possible
          - priority: "low", "medium", or "high"
          
          Focus on:
          - Budget violations or achievements
          - Spending trends (increases/decreases)
          - Category-specific patterns
          - Practical saving opportunities
          - Realistic, achievable recommendations
          
          Be encouraging for positive behaviors and constructive for areas of improvement.
          Use ₹ currency symbol and include specific numbers when relevant.
          
          Respond with JSON: {"insights": [{"type": "alert", "title": "...", "description": "...", "priority": "high"}]}`
        },
        {
          role: "user",
          content: `Analyze this spending data and provide insights: ${JSON.stringify(expenseSummary)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"insights": []}');
    
    return (result.insights || []).map((insight: any) => ({
      type: ['alert', 'goal', 'warning', 'recommendation'].includes(insight.type) ? insight.type : 'recommendation',
      title: insight.title || 'Financial Insight',
      description: insight.description || 'Review your spending patterns for better financial health.',
      priority: ['low', 'medium', 'high'].includes(insight.priority) ? insight.priority : 'medium'
    }));
  } catch (error) {
    console.error('Error generating insights:', error);
    return [
      {
        type: 'recommendation',
        title: 'Track Your Expenses',
        description: 'Continue logging your expenses to get personalized AI insights and recommendations.',
        priority: 'medium'
      }
    ];
  }
}

export async function generateBudgetRecommendations(
  expenses: Array<{ amount: number; categoryName: string; date: string }>,
  income?: number
): Promise<Record<string, number>> {
  try {
    const categoryTotals = expenses.reduce((acc, exp) => {
      acc[exp.categoryName] = (acc[exp.categoryName] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a financial planning expert. Based on spending history, recommend monthly budgets for each category.
          Consider the 50/30/20 rule and reasonable spending patterns.
          Respond with JSON: {"categoryName": recommendedAmount, ...}`
        },
        {
          role: "user",
          content: `Recommend monthly budgets based on this spending: ${JSON.stringify(categoryTotals)}${income ? ` with monthly income: ₹${income}` : ''}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result;
  } catch (error) {
    console.error('Error generating budget recommendations:', error);
    return {};
  }
}
