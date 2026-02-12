
from pydantic import BaseModel
from typing import List, Optional

class TickerInput(BaseModel):
    ticker: str

class PortfolioItem(BaseModel):
    ticker: str
    weight: float

class RiskAnalysisRequest(BaseModel):
    portfolio: List[PortfolioItem]
