"use client";
import { useEffect, useRef, useState } from "react";
import { wsUrl } from "@/lib/ws";

export interface WsPosition {
  ticket: number;
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  open_price: number;
  current_price: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  open_time: string;
  comment: string;
}

export interface WsAccount {
  login: number;
  name: string;
  balance: number;
  equity: number;
  profit: number;
  margin: number;
  margin_free: number;
  currency: string;
  leverage: number;
  server: string;
}

export interface AccountWsState {
  ready: boolean;
  connected: boolean;
  error?: string;
  account: WsAccount | null;
  positions: WsPosition[];
}

export function useAccountWs(): AccountWsState {
  const [state, setState] = useState<AccountWsState>({
    ready: false,
    connected: false,
    account: null,
    positions: [],
  });
  const ws = useRef<WebSocket | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    function connect() {
      if (!alive.current) return;
      const socket = new WebSocket(wsUrl("/api/mt5/ws/account"));
      ws.current = socket;

      socket.onmessage = (e) => {
        const data = JSON.parse(e.data as string);
        setState({
          ready: true,
          connected: data.connected,
          error: data.error,
          account: data.account ?? null,
          positions: data.positions ?? [],
        });
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
  }, []);

  return state;
}
