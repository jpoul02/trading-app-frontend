"use client";
import { useEffect, useRef, useState } from "react";
import { wsUrl } from "@/lib/ws";

export interface TickPrice {
  bid: number;
  ask: number;
  spread: number;
  digits: number;
  time: number;
}

export interface PricesWsState {
  ready: boolean;
  prices: Record<string, TickPrice>;
}

export function usePricesWs(symbols: string[]): PricesWsState {
  const [state, setState] = useState<PricesWsState>({ ready: false, prices: {} });
  const ws = useRef<WebSocket | null>(null);
  const alive = useRef(true);
  const key = symbols.join(",");

  useEffect(() => {
    if (!key) return;
    alive.current = true;
    setState({ ready: false, prices: {} });

    function connect() {
      if (!alive.current) return;
      const socket = new WebSocket(wsUrl(`/api/mt5/ws/prices?symbols=${key}`));
      ws.current = socket;

      socket.onmessage = (e) => {
        setState({ ready: true, prices: JSON.parse(e.data as string) });
      };

      socket.onclose = () => {
        if (alive.current) setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      alive.current = false;
      ws.current?.close();
      ws.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
