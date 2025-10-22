# Bulk GPT - AI-Powered Bulk Content Generation

Transform CSV data into AI-generated content at scale using GPT models.

## 🚨 Project Status

**⚠️ See [CURRENT_STATUS.md](./CURRENT_STATUS.md) for critical information before proceeding.**

This project is undergoing major refactoring and has known issues that must be fixed before deployment.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
# Login: test@example.com / password
```

## 📁 Project Structure

```
bulk-gpt-app/
├── app/              # Next.js 14 app directory
├── components/       # React components
│   └── bulk/        # Main BulkProcessor component
├── hooks/           # Custom React hooks (V2 architecture)
├── services/        # API service layer
├── lib/             # Utilities and helpers
├── public/          # Static assets
└── archive/         # Old documentation (historical reference)
```

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State:** React Hooks (migrating to Zustand)
- **Testing:** Vitest + React Testing Library
- **Deployment:** Vercel

## 📖 Documentation

- **[CURRENT_STATUS.md](./CURRENT_STATUS.md)** - Comprehensive project assessment and roadmap
- **[QUICK_START.md](./QUICK_START.md)** - Developer setup guide
- **archive/old-docs/** - Historical documentation (86 files)

## ⚡ Key Features

- CSV file upload and parsing
- Bulk AI content generation
- Real-time streaming results
- Export to CSV
- Rate limiting (Beta)
- YC-grade UI design

## 🔧 Development

```bash
# Type checking
npm run type-check

# Run tests (currently broken - see CURRENT_STATUS.md)
npm test

# Build for production
npm run build

# Run linting
npm run lint
```

## ⚠️ Known Issues

See [CURRENT_STATUS.md](./CURRENT_STATUS.md) for critical issues that must be fixed:
- Broken test infrastructure
- Duplicate service implementations
- Memory leaks in event listeners

## 🤝 Contributing

1. Read [CURRENT_STATUS.md](./CURRENT_STATUS.md) first
2. Fix critical issues before adding features
3. Follow existing patterns (hooks, services, components)
4. Write tests (once infrastructure is fixed)
5. Update documentation

## 📄 License

Private repository - All rights reserved

---

**For AI Agents:** Start with [CURRENT_STATUS.md](./CURRENT_STATUS.md) for complete context.

