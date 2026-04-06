# Smart Parking Finder

## Overview

A full-stack Smart Parking Finder web application built with React + Vite frontend and Express backend in a pnpm monorepo.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/smart-parking), dark tech-forward UI
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT tokens stored in localStorage as "parking_token"
- **State management**: Zustand (for auth token state)
- **UI**: Tailwind CSS, Radix UI, Framer Motion, Lucide icons
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle for API)

## Features

- User login/signup system
- Interactive parking slot grid (green = available, red = booked with car icon)
- Booking and cancel booking system
- Admin dashboard with tabs (Overview, Slots, Bookings, Users)
- OpenStreetMap integration for parking locations
- 3D parking lot visualization using CSS perspective transforms
- Car animation when parking is booked
- Mobile responsive design

## Demo Accounts

- **Admin**: admin@parkingfinder.com / admin123
- **User**: john@example.com / user123

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/smart-parking run dev` — run frontend locally

## API Routes

- POST /api/auth/register — Register new user
- POST /api/auth/login — Login (returns JWT token)
- POST /api/auth/logout — Logout
- GET /api/auth/me — Get current user
- GET /api/locations — List parking locations
- GET /api/slots — List all parking slots (optional ?locationId=X)
- GET /api/slots/:id — Get specific slot
- GET /api/bookings — User's bookings
- POST /api/bookings — Create booking
- DELETE /api/bookings/:id — Cancel booking
- GET /api/dashboard/summary — Dashboard stats
- POST /api/admin/slots — Admin: create slot
- PATCH /api/admin/slots/:id — Admin: update slot
- DELETE /api/admin/slots/:id — Admin: delete slot
- GET /api/admin/bookings — Admin: all bookings
- GET /api/admin/users — Admin: all users

## Database Schema

- `users` — id, email, password (bcrypt), name, role (user|admin)
- `parking_locations` — id, name, address, lat, lng, totalSlots, availableSlots
- `parking_slots` — id, locationId, slotNumber, floor, type, status, pricePerHour, bookedBy, bookedUntil
- `bookings` — id, userId, slotId, vehiclePlate, startTime, endTime, hours, totalCost, status

## Frontend Pages

- `/login` — Login page
- `/register` — Registration page
- `/dashboard` — Main parking slot grid with 3D visualization
- `/map` — Map view with OpenStreetMap
- `/booking/:slotId` — Book a specific slot
- `/my-bookings` — User's booking history
- `/admin` — Admin dashboard (requires admin role)
