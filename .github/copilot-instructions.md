# Open Domain Specification (ODS)

Open Domain Specification is a Domain-Driven Design (DDD) inspired specification and toolkit for describing business domains in a structured, discoverable, and reusable way. This is a TypeScript monorepo using Lerna for package management and npm workspaces.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Build
- Install dependencies: `npm install` -- takes 5 minutes. NEVER CANCEL. Set timeout to 10+ minutes.
- Build all packages: `npm run build` -- takes 50 seconds but has known issues (see workarounds below). NEVER CANCEL. Set timeout to 5+ minutes.
- Run all tests: `npm run test` -- takes 4 seconds. Fast and reliable.
- Format & Lint code: `npm run format` -- takes 5 seconds and flags issues in build files (expected). NEVER CANCEL. Set timeout to 2+ minutes.

### Development Servers
- Start documentation site: `cd apps/docs && npm run start` -- runs on http://localhost:3000
- Start ODS UI application: `cd apps/ods-ui && npm run start` -- runs on http://localhost:5173
- Start example workspace docs: `cd packages/ods-example-ws && npm run serve` -- runs on random port (displays in output)

### Known Build Issues and Workarounds
There are no currently known issues and the project is healthy.

## Validation Scenarios

### ALWAYS validate changes by running these complete scenarios:

1. **Full Development Workflow**:
   - `npm install` (wait 5+ minutes)
   - `npm run test` (verify all pass)
   - `cd apps/docs && npm run start` then verify http://localhost:3000 loads correctly
   - `cd apps/ods-ui && npm run start` then verify http://localhost:5173 loads correctly
   - Stop both servers before proceeding

2. **Package Build Validation**:
   - `npm run build` (note ods-example-ws failure is expected)
   - `cd packages/ods-example-ws && npx tsx src/index.ts` (workaround for build issue)
   - Verify all packages in `packages/*/dist/` have generated files

3. **Code Quality Checks**:
   - `npm run format` (review for new issues)
   - `npm run test` (ensure no new test failures)

4. **Manual User Scenario Testing**:
   - After starting both development servers, test key user workflows:
   - **Docs site**: Navigate to different documentation sections, verify all links work
   - **ODS UI**: Import the example workspace from URL (http://localhost:5173/petstore-workspace.json), explore the generated visualizations
   - **Example workspace docs**: If docsify server starts properly, verify generated markdown documentation loads

## Repository Structure

### Applications (`apps/`)
- **docs**: Docusaurus documentation site using Node.js, React, and Markdown
- **ods-ui**: React + Vite web application for interactive browsing of ODS workspaces

### Packages (`packages/`)
- **core**: Main TypeScript library providing domain model, visitor patterns, and schema conversion
- **graphviz**: Visualization library using Graphviz DOT format and SVG rendering  
- **doc**: Markdown documentation generation from ODS workspaces
- **ods-example-ws**: Example workspace demonstrating eCommerce domain modeling

### Configuration Files
- **lerna.json**: Lerna monorepo configuration
- **biome.json**: Code formatting and linting configuration (replaces ESLint/Prettier)
- **.nvmrc**: Node.js version 24 (though version 20 also works)
- **package.json**: Root workspace configuration with scripts for build, test, format

## Technology Stack
- **Node.js 24** (recommended, version 20 also works)
- **TypeScript** throughout all packages
- **Lerna** for monorepo management with npm workspaces
- **Biome** for formatting and linting (NOT ESLint/Prettier)
- **Vitest** for testing (NOT Jest)
- **Docusaurus** for documentation site
- **Vite + React** for UI application
- **Graphviz** for diagram generation

## Common Commands Reference

### Root Level (run from repository root)
```bash
npm install                    # Install all dependencies (5 min)
npm run build                  # Build all packages (50 sec, has known issues)
npm run test                   # Run all tests (4 sec)
npm run format                 # Format and lint code (5 sec)
lerna run [script] --stream    # Run script across all packages
```

### Package Level (run from packages/[name]/)
```bash
npm run build                  # Build individual package
npm test                       # Test individual package  
npm run start                    # Start development server (if applicable)
```

### Documentation
```bash
cd apps/docs
npm run start                  # Development server (port 3000)
npm run build                  # Production build
```

### ODS UI
```bash
cd apps/ods-ui  
npm run start                    # Development server (port 5173)
npm run build                  # Production build
```

## Important File Locations

### Core Domain Model
- `packages/core/src/workspace.ts` - Main workspace class
- `packages/core/src/index.ts` - Package exports
- `packages/core/src/schema/` - JSON schema definitions

### Documentation Generation
- `packages/doc/src/` - Markdown generation logic
- `packages/ods-example-ws/src/eshop/` - Example domain models
- `packages/ods-example-ws/docs/` - Generated documentation output

### Configuration
- Root `package.json` - Workspace and script definitions
- `biome.json` - Formatting and linting rules
- `lerna.json` - Monorepo configuration

## Timing Expectations (NEVER CANCEL - wait for completion)

- **npm install**: 5 minutes
- **npm run build**: 50 seconds (with expected ods-example-ws failure)
- **npm run test**: 4 seconds  
- **npm run format**: 5 seconds
- **Development server startup**: 10-15 seconds each
- **Docusaurus build**: 25-30 seconds

## Before Committing Changes

1. Run `npm run test` and ensure all tests pass
2. Run `npm run format` to format code
3. Manually test affected applications by starting their dev servers and exercising user workflows
4. For domain model changes, regenerate example docs with `npm run build`
5. **ALWAYS test a complete user workflow** - don't just start and stop servers, actually use the applications

## Troubleshooting

- **Port conflicts**: Development servers use ports 3000, 5173, and random ports - ensure they're available
- **Node version issues**: A Minimum version of Node 24 is mandatory