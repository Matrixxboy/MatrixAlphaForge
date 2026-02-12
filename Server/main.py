from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from Controller.StockController import router as stock_router
from Controller.NewsFetchController import router as news_router
from Database.DatabaseConnection import init_db

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)


app = FastAPI(
    title="MatrixAlphaForge API",
    description="Financial Intelligence API",
    version="1.0.0"
)

@app.on_event("startup")
def on_startup():
    init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
import time

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    print(f"➡️  API Hit: {request.method} {request.url}")

    response = await call_next(request)

    process_time = round((time.time() - start_time) * 1000, 2)

    print(f"⬅️  Completed: {response.status_code} | {process_time}ms")

    return response


# Include Routers
app.include_router(stock_router, prefix="/api/stock", tags=["Stock"])
app.include_router(news_router, prefix="/api/news", tags=["News"])


@app.get("/")
async def root():
    return {"status": "active", "system": "MatrixAlphaForge Intelligence Core"}


