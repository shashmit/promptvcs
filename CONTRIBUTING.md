# Contributing to PromptVCS

We're excited that you want to contribute to PromptVCS! This guide outlines the process for getting involved.

## 🛠 Development Workflow

1. **Fork/Clone**: Get the repository onto your machine.
2. **Setup**: Follow the **Getting Started** guide in the [README.md](README.md).
3. **Branch**: Create a new branch for your feature or fix.
   ```bash
   git checkout -b feature/your-awesome-feature
   ```
4. **Develop**: Build your feature! 
   - Make sure to keep the monorepo structure in mind.
   - Run `bun dev` to see your changes in real-time.
5. **Types**: Ensure your code is fully typed with TypeScript.
6. **Commit**: Use descriptive commit messages.
   - `feat: add workspace export functionality`
   - `fix: resolve hydration error on analytics page`
7. **Test**: If you add logic to the SDK or API, consider adding a test case.

## 🎨 Coding Standards

- **Svelte 5**: Use runes (`$state`, `$derived`, `$effect`) for reactivity.
- **Hono**: Follow the existing pattern for routes and Zod validation.
- **ORM**: Use Drizzle for all database interactions.
- **Styling**: Use Tailwind CSS classes. Avoid custom CSS unless absolutely necessary.
- **SDK**: Keep the client SDK lightweight and isomorphic (works in Node and Browser).

## 🚀 Pull Request Process

1. Ensure the project builds successfully: `bun build`.
2. Update the documentation (like this guide or the README) if your change introduces new configuration or features.
3. Submit your PR and provide a clear description of the changes.

## 💬 Community & Communication

If you have questions or need help, please reach out to the project maintainers or open an issue for discussion.

---

Thank you for helping make PromptVCS better!
