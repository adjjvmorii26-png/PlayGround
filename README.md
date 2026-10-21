# PlayGround

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://omgithub.com).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://omgithub.com/adjjvmorii26-png/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/adjjvmorii26-png/PlayGround)

- 🎮 [Open the project](https://omgithub.com/adjjvmorii26-png/PlayGround).
- ✨ [Remix this project](https://omgithub.com/?remix=adjjvmorii26-png%2FPlayGround).
- 💻 [Explore the source](https://github.com/adjjvmorii26-png/PlayGround).
- 🛠️ [Check build runs](https://github.com/adjjvmorii26-png/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/adjjvmorii26-png/PlayGround/issues).
- 👤 [Explore the creator's projects](https://omgithub.com/adjjvmorii26-png).
- 🌍 [Create with OMGithub](https://omgithub.com).
<!-- omgithub:readme:end -->

## Atelier

Atelier is a shared code space where humans and AI agents edit, run, and review the same workspace in real time. It ships with **Orbital Lab**, a small Hohmann-transfer project, so there is something to poke at immediately.

### Run it

```bash
npm install
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3001
- Health: http://localhost:3001/api/health

The first boot seeds `data/workspaces.json`. Delete that file and restart to reseed.

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | API / production web port |
| `ATELIER_DATA_FILE` | `data/workspaces.json` | File-backed workspace store |
| `REDIS_URL` | unset | Enables the Redis workspace store **and** Socket.IO Redis adapter |
| `SANDBOX_MODE` | `local` | `local` or `docker` |
| `RUN_TIMEOUT_MS` | `6000` | Execution time limit |
| `SANDBOX_MEMORY_MB` | `256` | Memory limit for Docker runs |
| `OPENAI_API_KEY` | unset | Enables LLM-backed agents |
| `OPENAI_BASE_URL` | OpenAI | OpenAI-compatible endpoint |
| `ATELIER_MODEL` | `gpt-4o-mini` | Agent model |

### Scaling

With `REDIS_URL` set, workspace state lives in Redis and realtime events fan out across API replicas through the Socket.IO Redis adapter. Presence is derived from the adapter's cross-replica socket list, so every replica sees the same room. Clients connect over WebSocket directly, which avoids sticky-session requirements for long-polling. Run as many API processes as you need behind a WebSocket-capable load balancer; all of them must point at the same Redis instance.

Without Redis, the app uses a single JSON file and an in-memory Socket.IO adapter, which is fine for local use but not for multiple replicas.

### Sandbox

`local` executes code in an ephemeral temp directory with a timeout and output cap. `docker` adds `--network none`, a read-only mount, and memory/CPU/PID limits:

```bash
SANDBOX_MODE=docker npm run dev
```

The Docker image used for runs must already be present locally (`node:22-alpine` by default). This is a demo sandbox, not a hardened multi-tenant security boundary. There is no authentication; share links use `?space=<workspaceId>`.

### Agents

`@Atlas` plans, `@Nova` builds, `@Sage` reviews, and `@Echo` runs tests. Without an API key the agents use deterministic local reasoning, so the demo works offline.

### Checks

```bash
npm run typecheck
npm test
npm run build
NODE_ENV=production npm start
```
