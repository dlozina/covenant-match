# Backend Configuration System

## Overview

The Covenant Match backend uses a layered configuration system that provides flexibility for different environments while maintaining sensible defaults.

## Configuration Loading Process

Configuration is loaded in the following order, with later sources overriding earlier ones:

1. **Base Configuration**: `default.toml` is always loaded first as the foundation
2. **Environment-Specific Configuration**: Based on the `RUST_ENV` environment variable:
   - If `RUST_ENV=docker`, loads `docker.toml`
   - If `RUST_ENV=production`, loads `production.toml` 
   - If `RUST_ENV` is not set, defaults to "development"
3. **Local Overrides**: `local.toml` (optional, for developer-specific settings)
4. **Environment Variables**: Variables with `CONFIG__` prefix take highest precedence

## Configuration Cascade

```
default.toml → environment-specific config → local.toml → environment variables
```

## Examples

Settings in later sources override those in earlier ones:

- `default.toml` defines `server.workers = 1`
- `production.toml` overrides it with `server.workers = 4`
- When running with `RUST_ENV=production`, the application will use 4 workers
- Setting `CONFIG_SERVER__WORKERS=8` would override both configuration files

## Environment Variable Format

Environment variables use double underscores to represent nested properties:

- `CONFIG_DATABASE__URL` sets `database.url`
- `CONFIG_SERVER__WORKERS` sets `server.workers`
- `CONFIG_JWT__SECRET` sets `jwt.secret`

## Benefits

This approach provides:
- Sensible defaults for all environments
- Environment-specific optimizations
- Local development flexibility
- Runtime configuration in Docker without rebuilding