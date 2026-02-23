import asyncio
import logging
import yfinance as yf
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict
import json

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[WebSocket, set] = {}
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            # Default indices for everyone
            self.active_connections[websocket] = set()
        logger.info(f"New connection. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            del self.active_connections[websocket]
            logger.info(f"Connection closed. Total: {len(self.active_connections)}")

    async def subscribe(self, websocket: WebSocket, tickers: List[str]):
        async with self.lock:
            if websocket in self.active_connections:
                for ticker in tickers:
                    self.active_connections[websocket].add(ticker)
                logger.info(f"Socket subscribed to: {tickers}")

    async def unsubscribe(self, websocket: WebSocket, tickers: List[str]):
        async with self.lock:
            if websocket in self.active_connections:
                for ticker in tickers:
                    self.active_connections[websocket].discard(ticker)
                logger.info(f"Socket unsubscribed from: {tickers}")

    def get_all_tickers(self) -> set:
        all_tickers = {"^NSEI", "^BSESN", "^NSEBANK", "^INDIAVIX"}
        for tickers in self.active_connections.values():
            all_tickers.update(tickers)
        return all_tickers

    async def broadcast(self, updates: List[dict]):
        async with self.lock:
            for websocket, subs in self.active_connections.items():
                # Filter updates based on what this socket is interested in
                # Everyone gets the broad indices + their specific subs
                broad_indices = {"^NSEI", "^BSESN", "^NSEBANK", "^INDIAVIX"}
                socket_tickers = broad_indices.union(subs)
                filtered_updates = [u for u in updates if u["ticker"] in socket_tickers]
                
                if filtered_updates:
                    try:
                        await websocket.send_text(json.dumps({
                            "type": "PRICE_UPDATE",
                            "data": filtered_updates
                        }))
                    except Exception as e:
                        logger.error(f"Broadcast error: {e}")
                        # We'll handle cleanup in the disconnect logic called by the loop if it fails

manager = ConnectionManager()

# Background task state
streaming_task = None

async def stream_prices():
    """
    Background loop to fetch prices and broadcast to all connected clients.
    """
    logger.info("Starting price stream background task")
    while True:
        if not manager.active_connections:
            await asyncio.sleep(5)
            continue

        try:
            all_tickers = manager.get_all_tickers()
            updates = []
            
            # Fetch for all unique tickers currently requested
            for ticker_symbol in all_tickers:
                try:
                    # Optimized fetch using fast_info
                    ticker = yf.Ticker(ticker_symbol)
                    info = ticker.fast_info
                    current = info.last_price
                    prev_close = info.previous_close
                    
                    if prev_close and prev_close != 0:
                        change_pct = ((current - prev_close) / prev_close) * 100
                    else:
                        change_pct = 0

                    updates.append({
                        "ticker": ticker_symbol,
                        "price": round(current, 2),
                        "change": f"{round(change_pct, 2)}%",
                        "positive": change_pct >= 0
                    })
                except Exception as e:
                    logger.error(f"Error fetching {ticker_symbol}: {e}")

            if updates:
                await manager.broadcast(updates)
            
            await asyncio.sleep(5)
            
        except Exception as e:
            logger.error(f"Price stream loop error: {e}")
            await asyncio.sleep(10)

@router.websocket("/ws/prices")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")
                msg_data = msg.get("data")
                
                if msg_type == "SUBSCRIBE":
                    if isinstance(msg_data, list):
                        await manager.subscribe(websocket, msg_data)
                    elif isinstance(msg_data, str):
                        await manager.subscribe(websocket, [msg_data])
                elif msg_type == "UNSUBSCRIBE":
                    if isinstance(msg_data, list):
                        await manager.unsubscribe(websocket, msg_data)
                    elif isinstance(msg_data, str):
                        await manager.unsubscribe(websocket, [msg_data])
            except json.JSONDecodeError:
                pass # Ignore malformed JSON heartbeats
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

def start_background_stream():
    global streaming_task
    if streaming_task is None:
        streaming_task = asyncio.create_task(stream_prices())
        logger.info("Price stream task initialized")
