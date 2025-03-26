"use client"

import { createContext, useContext, useReducer, ReactNode } from "react"
import { Market } from "@/types/market"

type MarketState = {
  markets: Market[]
  loading: boolean
  error: string | null
}

type MarketAction =
  | { type: "SET_MARKETS"; payload: Market[] }
  | { type: "ADD_MARKET"; payload: Market }
  | { type: "UPDATE_MARKET"; payload: Market }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }

const initialState: MarketState = {
  markets: [],
  loading: false,
  error: null
}

const MarketContext = createContext<{
  state: MarketState
  dispatch: React.Dispatch<MarketAction>
} | null>(null)

function marketReducer(state: MarketState, action: MarketAction): MarketState {
  switch (action.type) {
    case "SET_MARKETS":
      return { ...state, markets: action.payload, loading: false, error: null }
    case "ADD_MARKET":
      return {
        ...state,
        markets: [...state.markets, action.payload],
        loading: false,
        error: null
      }
    case "UPDATE_MARKET":
      return {
        ...state,
        markets: state.markets.map(market =>
          market.id === action.payload.id ? action.payload : market
        ),
        loading: false,
        error: null
      }
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false }
    default:
      return state
  }
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(marketReducer, initialState)

  return (
    <MarketContext.Provider value={{ state, dispatch }}>
      {children}
    </MarketContext.Provider>
  )
}

export function useMarket() {
  const context = useContext(MarketContext)
  if (!context) {
    throw new Error("useMarket must be used within a MarketProvider")
  }
  return context
}
