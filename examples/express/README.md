# Ultraenv Express Middleware Example

This example demonstrates how to integrate ultraenv with an Express server using the built-in middleware.

## Setup

```bash
npm install express ultraenv
```

## Running

```bash
npx tsx server.ts
```

Or with `tsx` watch mode:

```bash
npx tsx watch server.ts
```

## What it does

1. Loads and validates environment variables using ultraenv
2. Exposes a `/health` endpoint via ultraenv's health middleware
3. Automatically masks sensitive values in logs
4. Validates env vars on every request in development mode
