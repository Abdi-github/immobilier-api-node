# Immobilier API

REST API for a Swiss real-estate platform, loosely inspired by [immobilier.ch](https://www.immobilier.ch/en/).
Built with Express + TypeScript + MongoDB.

## Tech Stack

| Area | Technology |
|------|------------|
| Runtime | Node.js 20 LTS |
| Framework | Express |
| Language | TypeScript (strict) |
| Database | MongoDB 7.0 (Mongoose) |
| Cache | Redis 7 |
| Auth | JWT (access + refresh) |
| RBAC | Roles + Permissions |
| i18n | i18next (EN, FR, DE, IT) |
| Translation | LibreTranslate (self-hosted) |
| Images | Cloudinary |
| Testing | Jest + Supertest |
| Containers | Docker + Docker Compose |

## Architecture

Feature-based / domain-oriented modular architecture:

```
src/
├── api/v1/           # Route registration (public + admin)
├── modules/          # Feature modules (property, agency, user, etc.)
├── shared/           # Auth, cache, i18n, logger, middlewares, errors, utils
├── scripts/          # Seed, migration scripts
├── app.ts            # Express app setup
└── server.ts         # Server entry point
```

Each module contains: routes, controller, service, repository, model, validator, tests, and docs.

## Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| API | 4003 | REST API |
| MongoDB | 27020 | Database |
| Redis | 6381 | Cache & sessions |
| LibreTranslate | 5050 | Translation service |
| Mongo Express | 8084 | Database UI (dev only) |
| Redis Commander | 8085 | Redis UI (dev only) |
| Mailpit | 8026 | Email testing UI (dev only) |

## Quick Start

### Prerequisites

- Docker & Docker Compose

### Development

```bash
# Start all services (creates the shared network)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

# Or use the npm script
npm run docker:dev

# Seed the database
docker compose exec api npm run seed

# View logs
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api

# Stop services
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/public/properties` | List properties (paginated, filterable) |
| GET | `/api/v1/public/properties/:id` | Property details |
| GET | `/api/v1/public/search` | Advanced search |
| GET | `/api/v1/public/categories` | Property categories |
| GET | `/api/v1/public/cantons` | Swiss cantons |
| GET | `/api/v1/public/cities` | Cities |
| GET | `/api/v1/public/amenities` | Amenities |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/register` | Register |

Full API documentation available in `postman/`.

## Testing

```bash
# Run tests inside Docker
docker compose exec api npm test

# Run with coverage
docker compose exec api npm run test:coverage
```

## Networking

This repo creates the `immobilier_network` Docker network that the Admin Panel and Frontend repos join as external.

```
┌─────────────────────────────────────────────────────────┐
│                  immobilier_network                       │
│                                                           │
│  ┌─────────┐  ┌─────────┐  ┌───────┐  ┌──────────────┐ │
│  │   API   │  │ MongoDB │  │ Redis │  │LibreTranslate│ │
│  │  :4003  │  │ :27020  │  │ :6381 │  │    :5050     │ │
│  └─────────┘  └─────────┘  └───────┘  └──────────────┘ │
│       ▲              ▲                                    │
│       │              │                                    │
│  ┌─────────┐  ┌─────────────┐                            │
│  │ Admin   │  │  Frontend   │                            │
│  │  :5174  │  │    :5173    │                            │
│  └─────────┘  └─────────────┘                            │
└─────────────────────────────────────────────────────────┘
```

## Related Repos

| Repo | Description |
|------|-------------|
| `immobilier-admin-react` | Admin Dashboard (React + Bootstrap) |
| `immobilier-frontend-react` | Public Frontend (React + Tailwind + shadcn/ui) |

## Environment Variables

Copy `.env.example` for reference. In Docker dev mode, all env vars are set via `docker-compose.dev.yml`.

## License

MIT
