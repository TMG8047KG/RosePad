# Contributing to RosePad

First off, thank you for taking the time and interest to contribute to RosePad!  
Whether you want to file a bug report, suggest a feature, improve documentation or UI, or fix code, all contributions are welcome.  

---

## 📌 Table of Contents

- [How to Contribute](#how-to-contribute)  
- [Development Setup](#development-setup)  
- [Code Style & Standards](#code-style--standards)  
- [Commit Messages](#commit-messages)  
- [Pull Request Workflow](#pull-request-workflow)  
- [Testing & Quality Assurance](#testing--quality-assurance)  
- [Reporting Bugs and Suggesting Features](#reporting-bugs-and-suggesting-features)  
- [Code of Conduct & Community Guidelines](#code-of-conduct--community-guidelines)  
- [Thank You & Acknowledgements](#thank-you--acknowledgements)  

---

## How to Contribute

### ✅ Contribution types we welcome

- Bug reports or bug fixes  
- New features or enhancements (UI, UX, functionality)  
- Documentation improvements (README, docs, comments)  
- UI / design improvements (dark/light themes, styling, UX flows)  
- Testing, examples, demos  

If you want to contribute a larger change or feature, it's a good idea to open an issue first.  
This avoids duplicated work and helps maintainers discuss the best approach.

---

## Development Setup

RosePad is built with **Tauri v2**, **Vite + React + TypeScript**, and Rust for backend functionality.

To contribute, you will need:

- **NodeJS** (LTS recommended)  
- **Rust** (stable toolchain)  
- **pnpm**  

Install pnpm if you don’t have it:

```bash
npm install -g pnpm
````

Clone and set up the project:

```bash
git clone https://github.com/TMG8047KG/RosePad.git
cd RosePad
pnpm install
```

Start the development environment:

```bash
pnpm tauri dev
```

Build the application:

```bash
pnpm tauri build
```

If you encounter platform-specific issues, please open an issue and include your OS, version, and error output.

---

## Code Style & Standards

To keep the project consistent:

* Follow the existing TypeScript and React style patterns.
* Use proper naming, folder structure, and code organization as found in the project.
* Keep UI/UX changes consistent with RosePad’s design language (themes, spacing, color palette), but you can still feel free to change it and break it as much as you want.
* Rust code (if modified) should follow standard Rust formatting and safety practices.

Before pushing, make sure:

* Code is formatted and readable.
* No unused imports or obvious TypeScript errors (because builds might fail).
* UI changes should work in both light and dark themes.

---

## Commit Messages

Try to keep them short, descriptive, and consistent messages make version history easier to follow. Even when they are not perfectly worded.

---

## Pull Request Workflow

1. **Fork** the repository.
2. Create a new branch:

   ```bash
   git checkout -b feature/my-awesome-feature
   # or
   git checkout -b fix/issue-description
   ```
3. Make your changes.
4. Ensure everything builds and works:

   ```bash
   pnpm tauri build
   ```
5. Commit following the commit message rules (or not, but I might ignore it then).
6. Push your branch:

   ```bash
   git push origin your-branch-name
   ```
7. Open a **Pull Request** to the `main` branch with:

   * Clear description of what you changed and why
   * Screenshots or videos for UI/UX changes
   * Linked issues (e.g., “Closes #12”)
   * Notes on platform(s) tested

PRs may receive comments or change requests — this is normal.
Please respond politely and update your PR as needed.

---

## Testing & Quality Assurance

RosePad does not yet have a full automated test suite, so contributors are expected to:

* Test changes manually.
* Verify that editor functionality still works (typing, formatting, saving `.rpad`, reopening files, themes, etc.).
* Ensure UI changes look correct in both themes.
* Confirm that the build still works via Tauri.

If you add new functionality that could benefit from tests, feel free to create a test file or propose a test structure.

---

## Reporting Bugs and Suggesting Features

When opening an issue:

### For bugs:

* Describe the problem clearly
* Include steps to reproduce
* Add screenshots/videos if possible
* Mention OS, app version, and logs (if any)

### For feature requests:

* Describe the problem the feature solves
* Optional: Offer ideas or mockups
* Optional: Add examples from other editors or apps

---

## Code of Conduct & Community Guidelines

Please be respectful, patient, and constructive.
By participating in the project, you agree to follow our **[Code of Conduct](CODE_OF_CONDUCT.md)** and general open-source etiquette.

No harassment, discrimination, or hostility.
Friendly collaboration is essential — especially in creative tools like RosePad.

---

## Thank You & Acknowledgements

Thank you for contributing to RosePad! ❤️
Your time and effort directly help make the editor better for everyone.
Whether you fix a typo or implement a major feature, every contribution matters.

If you love the project, consider starring it ⭐ on GitHub and sharing it with others.

Happy coding!
