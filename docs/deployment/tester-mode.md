# Tester Mode

This document explains how to use the Tester Mode feature for Covenant Match, which limits access to the application during development and testing phases.

## Overview

Tester Mode creates a "coming soon" gateway that requires a password before users can access the full application. This is useful for:

- Testing your application on production infrastructure without exposing it to the public
- Creating a soft launch where only authorized users can access the application
- Deploying early versions for specific testers or stakeholders

## How It Works

When Tester Mode is enabled:

1. All visitors are redirected to a "Coming Soon" page
2. Only users who enter the correct tester password can access the application
3. Access is granted via a cookie that persists for 7 days

## Configuration

### Environment Variables

Tester Mode is controlled by two environment variables:

- `NEXT_PUBLIC_TESTER_MODE`: Set to "true" to enable Tester Mode
- `NEXT_PUBLIC_TESTER_PASSWORD`: The password users need to enter

### Enabling Tester Mode

#### In Development

1. Add the following to your `.env.local` file:

```
NEXT_PUBLIC_TESTER_MODE=true
NEXT_PUBLIC_TESTER_PASSWORD=your-secure-password
```

2. Restart your development server

#### In Production (Docker)

Update the `docker-compose.yml` file to include the environment variables:

```yaml
services:
  frontend:
    # ...
    environment:
      # ...
      - NEXT_PUBLIC_TESTER_MODE=true
      - NEXT_PUBLIC_TESTER_PASSWORD=your-secure-password
```

Or pass them at runtime with Docker Compose:

```bash
NEXT_PUBLIC_TESTER_MODE=true NEXT_PUBLIC_TESTER_PASSWORD=your-password docker-compose up
```

### Disabling Tester Mode

To disable Tester Mode:

1. Set `NEXT_PUBLIC_TESTER_MODE` to "false" or remove it entirely
2. Redeploy your application

## Security Considerations

- The tester password is included in client-side code. It's not meant for high-security applications but rather as a simple gateway.
- For higher security needs, consider implementing server-side authentication.
- Change the default password (`covenant-test`) to something unique for your deployment.

## Troubleshooting

If you're having issues with Tester Mode:

1. Ensure your environment variables are correctly set
2. Check that the middleware is working (you should be redirected to `/coming-soon`)
3. Clear your cookies if you're stuck in a redirect loop
4. Check browser console for any errors

## Implementation Details

Tester Mode is implemented using:

- Next.js Middleware for route protection
- Cookies for persistence
- Client-side form validation

The code is located in:
- `/middleware.ts` - Handles redirects and password validation