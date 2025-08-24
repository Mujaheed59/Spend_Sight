import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, DollarSign, Brain, TrendingUp, Shield } from "lucide-react";
import { useLocation } from "wouter";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  email: z.string().email("Invalid email address").optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      firstName: "",
      lastName: "",
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  const onLoginSubmit = (data: LoginData) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        // Delayed navigation to ensure state updates
        setTimeout(() => navigate("/"), 100);
      }
    });
  };

  const onRegisterSubmit = (data: RegisterData) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData, {
      onSuccess: () => {
        // Delayed navigation to ensure state updates
        setTimeout(() => navigate("/"), 100);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" data-testid="page-auth">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Hero Section */}
        <div className="lg:flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto max-w-sm lg:max-w-none">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start space-x-3 mb-8">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">ExpenseAI</h1>
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-6">
                Smart Expense Tracking with AI
              </h2>
              
              <p className="text-lg text-gray-600 mb-8">
                Take control of your finances with AI-powered insights, automated categorization, 
                and personalized budget recommendations.
              </p>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 mb-8">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Brain className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-medium text-gray-900">AI-Powered Insights</h3>
                    <p className="text-gray-600">Get personalized spending recommendations and financial advice.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-medium text-gray-900">Smart Analytics</h3>
                    <p className="text-gray-600">Visual charts and reports to track your spending patterns.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-medium text-gray-900">Secure & Private</h3>
                    <p className="text-gray-600">Your financial data is encrypted and protected.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Form Section */}
        <div className="lg:flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto max-w-sm w-full">
            <Card className="shadow-xl border-0">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  {isLogin 
                    ? 'Sign in to continue to your dashboard' 
                    : 'Start your journey to better financial health'
                  }
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Toggle Buttons */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                  <Button
                    variant={isLogin ? "default" : "ghost"}
                    onClick={() => setIsLogin(true)}
                    className="rounded-md"
                    data-testid="button-switch-login"
                  >
                    Sign In
                  </Button>
                  <Button
                    variant={!isLogin ? "default" : "ghost"}
                    onClick={() => setIsLogin(false)}
                    className="rounded-md"
                    data-testid="button-switch-register"
                  >
                    Sign Up
                  </Button>
                </div>

                {isLogin ? (
                  /* Login Form */
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <div>
                      <Label htmlFor="login-username">Username</Label>
                      <Input
                        id="login-username"
                        type="text"
                        placeholder="Enter your username"
                        {...loginForm.register('username')}
                        data-testid="input-login-username"
                      />
                      {loginForm.formState.errors.username && (
                        <p className="text-red-500 text-sm mt-1">
                          {loginForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          {...loginForm.register('password')}
                          data-testid="input-login-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-red-500 text-sm mt-1">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                      data-testid="button-login-submit"
                    >
                      {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
                    </Button>
                  </form>
                ) : (
                  /* Register Form */
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="register-firstName">First Name</Label>
                        <Input
                          id="register-firstName"
                          type="text"
                          placeholder="John"
                          {...registerForm.register('firstName')}
                          data-testid="input-register-firstName"
                        />
                      </div>
                      <div>
                        <Label htmlFor="register-lastName">Last Name</Label>
                        <Input
                          id="register-lastName"
                          type="text"
                          placeholder="Doe"
                          {...registerForm.register('lastName')}
                          data-testid="input-register-lastName"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="register-username">Username *</Label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="Choose a username"
                        {...registerForm.register('username')}
                        data-testid="input-register-username"
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-red-500 text-sm mt-1">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@email.com"
                        {...registerForm.register('email')}
                        data-testid="input-register-email"
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-red-500 text-sm mt-1">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="register-password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a strong password"
                          {...registerForm.register('password')}
                          data-testid="input-register-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {registerForm.formState.errors.password && (
                        <p className="text-red-500 text-sm mt-1">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="register-confirmPassword">Confirm Password *</Label>
                      <Input
                        id="register-confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        {...registerForm.register('confirmPassword')}
                        data-testid="input-register-confirm-password"
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-red-500 text-sm mt-1">
                          {registerForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                      data-testid="button-register-submit"
                    >
                      {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </form>
                )}

                <div className="text-center text-sm text-gray-600">
                  <p>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <Button
                      variant="link"
                      className="p-0 h-auto font-medium text-primary"
                      onClick={() => setIsLogin(!isLogin)}
                      data-testid="button-switch-mode"
                    >
                      {isLogin ? 'Sign Up' : 'Sign In'}
                    </Button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}