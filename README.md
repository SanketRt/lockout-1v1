# Lockout 1v1

## Prereqs
- Node.js >= 20, pnpm

## Install
pnpm i

# Backend
cd server
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev

# Frontend (new terminal)
cd web
pnpm dev

Open http://localhost:5173

### Configure
Backend listens on :5177, CORS allows http://localhost:5173. Adjust in `server/.env`.

### Flow
1) Create room with two handles, count, rating range, duration
2) Share links `?as=p1` and `?as=p2`
3) Click Start. Server polls Codeforces every ~10s and locks problems on first solver.
4) When time is up, room auto finishes.
