from typing import Dict, List, Optional
import json
import time
from datetime import datetime
from pbc_client import PbcClient, Market, Position

class MarketIndexer:
    def __init__(self, client: PbcClient):
        self.client = client
        self.markets: Dict[str, Market] = {}
        self.positions: Dict[str, Dict[str, Position]] = {}

    async def start_indexing(self):
        """Start indexing market data from the blockchain."""
        while True:
            try:
                await self.update_markets()
                await self.update_positions()
                time.sleep(5)  # Update every 5 seconds
            except Exception as e:
                print(f"Error indexing data: {e}")
                time.sleep(5)  # Wait before retrying

    async def update_markets(self):
        """Update market data from the blockchain."""
        markets = await self.client.get_markets()
        for market in markets:
            self.markets[market.id] = market

    async def update_positions(self):
        """Update position data from the blockchain."""
        for market_id in self.markets:
            positions = await self.client.get_positions(market_id)
            self.positions[market_id] = {
                position.trader: position for position in positions
            }

    def get_market(self, market_id: str) -> Optional[Market]:
        """Get market data by ID."""
        return self.markets.get(market_id)

    def get_markets(self) -> List[Market]:
        """Get all markets."""
        return list(self.markets.values())

    def get_position(self, market_id: str, trader: str) -> Optional[Position]:
        """Get position data for a specific market and trader."""
        return self.positions.get(market_id, {}).get(trader)

    def get_positions(self, market_id: str) -> List[Position]:
        """Get all positions for a specific market."""
        return list(self.positions.get(market_id, {}).values())

    def get_active_markets(self) -> List[Market]:
        """Get all active markets."""
        return [
            market for market in self.markets.values()
            if market.status == "ACTIVE"
        ]

    def get_resolved_markets(self) -> List[Market]:
        """Get all resolved markets."""
        return [
            market for market in self.markets.values()
            if market.status == "RESOLVED"
        ]

    def get_market_stats(self, market_id: str) -> Dict:
        """Get statistics for a specific market."""
        market = self.get_market(market_id)
        if not market:
            return {}

        positions = self.get_positions(market_id)
        total_yes = sum(p.yes_amount for p in positions)
        total_no = sum(p.no_amount for p in positions)

        return {
            "market_id": market_id,
            "title": market.title,
            "description": market.description,
            "end_date": datetime.fromtimestamp(market.end_date).isoformat(),
            "total_liquidity": market.total_liquidity,
            "yes_price": market.yes_price,
            "no_price": market.no_price,
            "status": market.status,
            "resolution": market.resolution,
            "total_yes_positions": total_yes,
            "total_no_positions": total_no,
            "number_of_traders": len(positions),
        }

async def main():
    # Initialize the Partisia client
    client = PbcClient()
    
    # Create and start the indexer
    indexer = MarketIndexer(client)
    await indexer.start_indexing()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main()) 