# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Commands
- `yarn dev` - Start development server with LangGraph CLI (runs all three graph agents)
- `yarn build` - Build all applications using Turbo
- `yarn test` - Run all tests across the monorepo
- `yarn lint` - Run linting across all packages
- `yarn lint:fix` - Run linting with auto-fix across all packages
- `yarn format` - Format code using Prettier across all packages
- `yarn clean` - Clean build artifacts and turbo cache

### Agent-Specific Commands (in `apps/open-swe/`)
- `yarn dev` - Start LangGraph development server for the agent graphs
- `yarn test` - Run Jest tests (excludes integration tests)
- `yarn test:int` - Run integration tests only
- `yarn test:single` - Run a single test with extended timeout
- `yarn eval:single` - Run evaluation tests with Vitest

### Web Application Commands (in `apps/web/`)
- `yarn dev` - Start Next.js development server
- `yarn build` - Build Next.js application

## Architecture Overview

Open SWE is an asynchronous coding agent built with LangGraph that operates through three main graph workflows:

### Core Agent Graphs
1. **Manager Graph** (`apps/open-swe/src/graphs/manager/`) - Entry point that routes requests and initializes workflows
2. **Planner Graph** (`apps/open-swe/src/graphs/planner/`) - Generates and validates execution plans for tasks
3. **Programmer Graph** (`apps/open-swe/src/graphs/programmer/`) - Executes code changes and manages pull requests

### Key Components

#### Graph State Management
- Uses LangGraph's StateGraph for workflow orchestration
- State is shared between graph nodes and persists across operations
- Each graph has specialized state types defined in `packages/shared/`

#### Sandbox Environment
- Utilizes Daytona SDK for cloud-based sandboxes (`src/utils/sandbox.ts`)
- Supports both cloud and local development modes
- Automatic sandbox creation, management, and cleanup

#### LLM Integration
- Multi-provider LLM support via `src/utils/llms/`
- Fallback mechanisms for model reliability
- Configurable models per task type (planning vs programming)
- Support for custom/local models through model manager

#### Tools System
- Comprehensive toolset in `src/tools/` including:
  - Shell command execution
  - File system operations (text editor, grep, patch application)
  - GitHub integration
  - Dependency installation
  - Document search

#### Authentication & Security
- GitHub App integration with installation-based auth
- JWT-based session management
- Configurable authentication providers

### Application Structure

#### Monorepo Layout
- `apps/open-swe/` - Core LangGraph agent implementation
- `apps/web/` - Next.js web interface
- `apps/cli/` - Command-line interface (Terminal-based UI)
- `apps/docs/` - Documentation site
- `packages/shared/` - Shared types, utilities, and configurations

#### Graph Workflow Patterns
- Each graph follows a node-based execution model
- Conditional edges route between nodes based on state
- Interrupt points allow human-in-the-loop interaction
- Error handling with diagnostic nodes

### Configuration Files
- `langgraph.json` - Defines the three main graphs and their entry points
- `turbo.json` - Monorepo build orchestration
- Individual `package.json` files for each application with specific scripts

### Testing Strategy
- Unit tests with Jest (`jest.config.js`)
- Integration tests for end-to-end workflows
- Evaluation framework with LangBench integration
- Test isolation using sandbox environments

### GitHub Integration
- Webhook handling for issue-based task initiation
- Automatic PR creation and management
- Label-based workflow triggering (`open-swe`, `open-swe-auto`, `open-swe-max`)
- Repository cloning and branch management

### Development Notes
- Uses ESM modules throughout
- TypeScript with strict type checking
- Yarn 3.5.1 as package manager
- Turbo for monorepo build orchestration
- Environment-based configuration via `.env` files