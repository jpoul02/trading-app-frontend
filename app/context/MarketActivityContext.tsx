"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface StockBar { change: number; }
type Maybe<T> = T | null | undefined;

interface MarketActivityCtx {
  stockBars:    Maybe<StockBar[]>;
  cryptoChange: Maybe<number>;
  setStockBars:    (v: StockBar[] | null) => void;
  setCryptoChange: (v: number    | null) => void;
}

const Ctx = createContext<MarketActivityCtx>({
  stockBars:    undefined,
  cryptoChange: undefined,
  setStockBars:    () => {},
  setCryptoChange: () => {},
});

export function MarketActivityProvider({ children }: { children: ReactNode }) {
  const [stockBars,    setStockBars]    = useState<Maybe<StockBar[]>>(undefined);
  const [cryptoChange, setCryptoChange] = useState<Maybe<number>>(undefined);
  return (
    <Ctx.Provider value={{ stockBars, cryptoChange, setStockBars, setCryptoChange }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMarketActivity() {
  return useContext(Ctx);
}
