# Trading App — Frontend

Next.js 15 · TypeScript · Tailwind · desplegado en Railway.

## Variables de entorno

Crear `frontend/.env.local` para desarrollo local:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Para producción (Railway), poner esa misma variable con la URL de ngrok:

```
NEXT_PUBLIC_API_URL=https://abc123.ngrok-free.app
```

Una sola variable cubre tanto las llamadas REST como los WebSockets — el frontend convierte `https://` → `wss://` automáticamente.

## Desarrollo local

```bash
npm install
npm run dev
```

El backend debe estar corriendo en `localhost:8000` (ver `backend/START.bat`).

---

## WebSockets — datos en tiempo real

El frontend mantiene conexiones WebSocket persistentes al backend local (vía ngrok en producción). No hay polling pesado — los datos llegan solos.

### Cómo funciona la URL

`lib/ws.ts` convierte `NEXT_PUBLIC_API_URL` al protocolo WebSocket:

```
https://abc123.ngrok-free.app  →  wss://abc123.ngrok-free.app
http://localhost:8000           →  ws://localhost:8000
```

### Hooks

**`useAccountWs()`** — `app/hooks/use-account-ws.ts`

Pushea cuenta MT5 + posiciones abiertas cada **1 segundo**.

```typescript
const { ready, connected, error, account, positions } = useAccountWs();

// account → { login, name, balance, equity, profit, margin, margin_free, currency, leverage, server }
// positions → [{ ticket, symbol, type, volume, open_price, current_price, profit, ... }]
// ready → false hasta que llega el primer mensaje (muestra skeleton mientras tanto)
```

**`usePricesWs(symbols)`** — `app/hooks/use-prices-ws.ts`

Pushea precios tick cada **500 ms**. Reconnecta si cambia el array de símbolos.

```typescript
const { ready, prices } = usePricesWs(["EURUSD", "XAUUSD"]);

// prices["EURUSD"] → { bid, ask, spread, digits, time }
```

### Reconexión automática

Ambos hooks reconectan solos si el WS cae (backend reiniciado, ngrok desconectado, etc.). Reintentan cada 2 segundos.

### Qué reemplazó al polling anterior

| Antes | Ahora | Frecuencia |
|-------|-------|-----------|
| `setInterval(fetchStatus, 10s)` | `useAccountWs()` | 1s |
| `setInterval(fetchPositions, 5s)` | `useAccountWs()` | 1s |
| `fetchOrderPrice()` manual | `usePricesWs([orderSymbol])` | 500ms live |
| `setInterval(fetchHistory, 30s)` | sigue en REST | 30s (no necesita más) |

### Endpoints WebSocket del backend

| URL | Frecuencia | Payload |
|-----|-----------|---------|
| `GET /api/mt5/ws/account` | 1 s | `{ connected, account, positions }` |
| `GET /api/mt5/ws/prices?symbols=X,Y` | 500 ms | `{ EURUSD: { bid, ask, spread, digits, time }, ... }` |
