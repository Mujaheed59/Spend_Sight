# Overview

ExpenseAI is a full-stack AI-powered expense tracking application that helps users manage their finances with intelligent categorization and insights. Built as a modern web application, it combines React frontend with Express backend, featuring AI-driven expense categorization, real-time data visualization, and personalized budgeting recommendations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives for consistent, accessible design
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack React Query for server state management and data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth integration with OpenID Connect for user management
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful endpoints with consistent error handling and response formatting

## Data Storage
- **Primary Database**: PostgreSQL via Neon serverless database
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Session Storage**: PostgreSQL table for user session persistence
- **Data Models**: Users, expenses, categories, insights, and budgets with proper relationships

## Authentication & Authorization
- **Provider**: Replit Auth using OpenID Connect protocol
- **Session Management**: Server-side sessions with HTTP-only cookies
- **User Model**: Required for Replit Auth integration with profile information storage
- **Authorization**: Route-level protection with middleware for authenticated endpoints

## AI Integration
- **Provider**: OpenAI GPT-4o for intelligent features
- **Expense Categorization**: Automatic classification of expenses into predefined categories
- **Smart Insights**: Personalized budgeting recommendations and spending analysis
- **Natural Language Processing**: Context-aware expense description analysis for better categorization

# External Dependencies

## Core Services
- **Database**: Neon PostgreSQL serverless database for data persistence
- **AI Service**: OpenAI API for expense categorization and insights generation
- **Authentication**: Replit Auth service for user authentication and profile management

## Development Tools
- **Build System**: Vite for fast development and optimized production builds
- **Database Migrations**: Drizzle Kit for schema management and migrations
- **Type Safety**: TypeScript across the entire stack with shared types

## UI/UX Libraries
- **Component Library**: Radix UI primitives for accessible, unstyled components
- **Design System**: shadcn/ui for pre-styled, customizable components
- **Charts**: Recharts for data visualization and expense analytics
- **Icons**: Lucide React for consistent iconography
- **Styling**: Tailwind CSS with PostCSS for utility-first styling

## Runtime Dependencies
- **HTTP Client**: Native fetch API with custom wrapper for type-safe requests
- **Form Validation**: Zod for runtime type validation and schema definition
- **Date Handling**: date-fns for date manipulation and formatting
- **WebSocket Support**: Configured for potential real-time features