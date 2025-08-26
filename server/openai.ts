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
          content: `You are an advanced expense categorization AI. Analyze expense descriptions and amounts to categorize them accurately.
          
          Available categories:
          - food: Food & Dining (restaurants, groceries, coffee shops, food delivery, snacks, beverages)
          - transportation: Transportation (fuel, uber/ola, metro/bus, parking, auto-rickshaw, vehicle maintenance)
          - shopping: Shopping (clothes, electronics, household items, online purchases, general retail)
          - entertainment: Entertainment (movies, games, subscriptions, concerts, sports events, hobbies)
          - bills: Bills & Utilities (electricity, internet, phone, rent, insurance, loan payments)
          - healthcare: Healthcare (doctor visits, medicines, hospital bills, dental, health insurance)
          - education: Education (courses, books, tuition, online learning, certifications)
          - travel: Travel (flights, hotels, vacation expenses, travel bookings, sightseeing)
          
          CATEGORIZATION RULES:
          - Consider both description keywords AND amount patterns
          - Food delivery apps (Zomato, Swiggy) = food
          - Transport apps (Uber, Ola) = transportation
          - Shopping apps/websites (Amazon, Flipkart) = shopping unless food items
          - Subscription services (Netflix, Spotify) = entertainment
          - ATM withdrawals or "Cash" = shopping (general)
          - Brand names: Starbucks=food, McDonald's=food, Shell=transportation
          
          Confidence scoring:
          - 0.9-1.0: Very clear keywords (e.g., "Starbucks Coffee", "Uber ride")
          - 0.7-0.89: Good context clues (e.g., "Movie tickets", "Grocery shopping")
          - 0.5-0.69: Reasonable inference (e.g., "Mall purchase", "Online payment")
          - 0.3-0.49: Uncertain, default to shopping
          
          Respond with JSON: { "category": "category_name", "confidence": 0.95, "reasoning": "brief explanation why this category fits" }`
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
    
    // Calculate detailed category breakdowns
    const currentCategories = expenses.reduce((acc, exp) => {
      acc[exp.categoryName] = (acc[exp.categoryName] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const previousCategories = previousMonthExpenses.reduce((acc, exp) => {
      acc[exp.categoryName] = (acc[exp.categoryName] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate spending trends and patterns
    const categoryTrends = Object.keys(currentCategories).map(category => {
      const current = currentCategories[category] || 0;
      const previous = previousCategories[category] || 0;
      const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      return { category, current, previous, change };
    });
    
    // Budget analysis
    const budgetAnalysis = budgets.map(budget => {
      const spent = currentCategories[budget.categoryName] || 0;
      const remaining = budget.amount - spent;
      const utilization = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      return { 
        category: budget.categoryName, 
        budget: budget.amount, 
        spent, 
        remaining, 
        utilization,
        isOverBudget: spent > budget.amount
      };
    });
    
    // Prepare comprehensive expense summary for AI
    const expenseSummary = {
      currentMonth: {
        total: currentTotal,
        categoryBreakdown: currentCategories,
        expenseCount: expenses.length,
        averageExpense: expenses.length > 0 ? currentTotal / expenses.length : 0
      },
      previousMonth: {
        total: previousTotal,
        categoryBreakdown: previousCategories,
        expenseCount: previousMonthExpenses.length
      },
      trends: categoryTrends,
      budgetAnalysis,
      totalBudget: budgets.reduce((sum, b) => sum + b.amount, 0),
      savingsOpportunities: categoryTrends.filter(t => t.change > 20).map(t => ({
        category: t.category,
        increase: t.change,
        currentSpend: t.current,
        potentialSaving: t.current * 0.15 // Suggest 15% reduction
      }))
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert personal financial advisor AI. Analyze real-time spending data and provide specific, actionable insights.
          
          Generate 3-5 insights based on the comprehensive data provided. Each insight must have:
          - type: "alert" (urgent overspending/budget violations), "goal" (achievements worth celebrating), "warning" (approaching budget limits), or "recommendation" (specific improvement suggestions)
          - title: Compelling, specific title (max 45 chars)
          - description: Detailed, actionable advice with exact amounts, percentages, and timeframes
          - priority: "low", "medium", or "high" based on financial impact
          
          PRIORITY ANALYSIS AREAS:
          1. Budget violations (over 100% utilization) - HIGH priority alerts
          2. Significant spending increases (>30% vs previous month) - HIGH priority warnings
          3. Categories approaching budget limits (80-100%) - MEDIUM priority warnings
          4. Savings opportunities from high-spend categories - MEDIUM priority recommendations
          5. Positive spending behaviors - LOW priority goals
          
          INSIGHT REQUIREMENTS:
          - Include specific ₹ amounts and percentages
          - Compare current vs previous month spending
          - Mention exact savings amounts possible
          - Provide realistic timelines (weekly/monthly targets)
          - Use encouraging tone for achievements, constructive for improvements
          - Be specific: "You spent ₹X more on Y" rather than "You spent more"
          
          EXAMPLES OF GOOD INSIGHTS:
          - "You spent 35% more on Food this month (₹4,200 vs ₹3,100). If you reduce dining out by 2 meals per week, you could save ₹800/month."
          - "Great job! You stayed 15% under budget in Transportation (₹1,700 vs ₹2,000 budget). Keep using public transport!"
          
          Respond with JSON: {"insights": [{"type": "alert", "title": "Food Budget Exceeded", "description": "You spent ₹4,200 on Food this month, 40% over your ₹3,000 budget. Consider meal planning to save ₹400/month.", "priority": "high"}]}`
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
