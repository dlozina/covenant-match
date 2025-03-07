# Migration from Radix UI to shadcn/ui

This project has been migrated from using Radix UI directly to using shadcn/ui. Here's an overview of the changes:

## What is shadcn/ui?

shadcn/ui is a collection of reusable components built using Radix UI and Tailwind CSS. Unlike Radix UI which is a headless component library, shadcn/ui provides both the functionality and styling.

## Key differences

1. **Component ownership**: shadcn/ui components are copied into your project rather than being installed as dependencies.
2. **Styling**: shadcn/ui comes with a beautiful design system out of the box using Tailwind CSS.
3. **Theme support**: Built-in dark mode and theme customization.

## Components migrated

- Button
- Card
- Avatar
- Badge
- Input
- Label
- Dropdown Menu
- Theme Toggle

## Using shadcn/ui CLI

To add new components, you can use the shadcn/ui CLI:

```bash
npx shadcn-ui@latest add [component-name]
```

For example, to add a dialog component:

```bash
npx shadcn-ui@latest add dialog
```

## Customizing themes

The theme is configured in `app/globals.css` using CSS variables. You can modify these variables to match your brand colors.

## Further documentation

For more information about shadcn/ui, visit [https://ui.shadcn.com](https://ui.shadcn.com).
