# Leadership Hub

A personal leadership assistant application with gamification, built to help leaders manage their teams, track actions, and develop their leadership skills.

## Features

- **Employee Hub**: Manage team members with rich profiles, 1:1 history, and development plans
- **Action Tracking**: Central hub for all actions with filtering, priorities, and XP rewards
- **Events & Meetings**: Track workshops, 1:1s, and team meetings with AI note extraction
- **Responsibilities Dashboard**: Track your duties across Team Lead, Competence Leader, and Department Manager roles
- **Gamification**: XP system, skill tree (constellation style), achievements, and streaks
- **AI Integration**: Extract actions from notes, get focus suggestions, and meeting prep
- **Beautiful UI**: Ori + Hades inspired aesthetic with warm, ethereal colors

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **State**: Zustand + TanStack Query
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **AI**: OpenAI GPT-4 / Ollama (switchable)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or use Docker)
- (Optional) OpenAI API key for AI features
- (Optional) Ollama for local AI

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd AITeamlead
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL and API keys
```

4. Start PostgreSQL (using Docker):
```bash
docker-compose up -d postgres
```

5. Run database migrations:
```bash
npm run db:push
```

6. Seed the database:
```bash
npm run db:seed
```

7. Start the development servers:
```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Demo Account

After seeding, you can log in with:
- Email: demo@example.com
- Password: demo123

## Project Structure

```
AITeamlead/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── features/       # Feature modules
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities, API client
│   │   └── stores/         # Zustand stores
│   └── index.html
├── server/                 # Node.js + Express backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── middleware/     # Auth, validation
│   └── prisma/
│       ├── schema.prisma   # Database schema
│       └── seed.ts         # Seed data
├── shared/                 # Shared types
└── docker-compose.yml      # PostgreSQL + Ollama
```

## AI Configuration

### OpenAI (Default)
Set your API key in the environment:
```
OPENAI_API_KEY=your-api-key
```

### Ollama (Local/Self-hosted)
1. Start Ollama:
```bash
docker-compose up -d ollama
# or install Ollama locally
```

2. Pull a model:
```bash
ollama pull llama2
```

3. Change AI provider in Settings or set:
```
AI_PROVIDER=ollama
```

## Visual Design

The app uses an **Ori + Hades** inspired aesthetic:
- Light theme with warm, ethereal colors
- Soft glows and particle effects
- Constellation-style skill tree
- Bold, confident UI elements

Color palette:
- Primary: #D4A574 (Warm Gold/Amber)
- Secondary: #7BA087 (Sage Green)
- Accent: #E8B86D (Bright Gold)

## License

MIT

