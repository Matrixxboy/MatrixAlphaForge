
from fastapi import APIRouter, Depends
import yfinance as yf
from typing import List, Dict, Optional
import logging
from Utils.ResponseHelper import make_response
from Utils.ResponseHelperModels import HTTPStatusCode, APICode
from Config.SystemConfig import get_settings
from Database.DatabaseConnection import get_db_connection
from Models.StockModels import TickerInput, RiskAnalysisRequest
import pandas as pd
import numpy as np
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()

@router.get("/market/summary")
async def get_market_summary():
    """
    Fetch summary data for major Indian indices.
    """
    logger.info("Fetching market summary")
    try:
        indices = {
            "Nifty 50": "^NSEI",
            "Sensex": "^BSESN",
            "Nifty Bank": "^NSEBANK",
            "India VIX": "^INDIAVIX"
        }
        
        summary_data = []
        
        for name, ticker in indices.items():
            try:
                stock = yf.Ticker(ticker)
                # Optimization: use fast_info
                current = stock.fast_info.last_price
                prev_close = stock.fast_info.previous_close
                
                if prev_close and prev_close != 0:
                    change_pct = ((current - prev_close) / prev_close) * 100
                else:
                    change_pct = 0
                
                summary_data.append({
                    "title": name,
                    "value": round(current, 2),
                    "change": f"{round(change_pct, 2)}%",
                    "positive": change_pct >= 0
                })
            except Exception as e:
                logger.error(f"Error fetching {name}: {e}")
                
        return make_response(
            status=HTTPStatusCode.OK,
            code=APICode.OK,
            message="Market summary fetched successfully",
            data=summary_data
        )
    except Exception as e:
        logger.error(f"Market summary failed: {e}")
        return make_response(
            status=HTTPStatusCode.INTERNAL_SERVER_ERROR,
            code=APICode.INTERNAL_SERVER_ERROR,
            message="Failed to fetch market summary",
            error=str(e),
            location="get_market_summary"
        )

@router.get("/watchlist")
async def get_watchlist():
    """Get all stocks in the watchlist"""
    try:
        results = []
        with get_db_connection() as conn:
            watchlist = conn.execute("SELECT * FROM watchlist").fetchall()
            
            for item in watchlist:
                ticker = item['ticker']
                try:
                    stock = yf.Ticker(ticker)
                    info = stock.fast_info
                    current = info.last_price
                    prev = info.previous_close
                    change = ((current - prev) / prev) * 100 if prev else 0
                    
                    results.append({
                        "id": item['id'],
                        "symbol": ticker,
                        "price": round(current, 2),
                        "change": round(change, 2)
                    })
                except Exception:
                    # Log as warning only if needed, or silently fail for delisted/invalid stocks to avoid noise
                    # logger.warning(f"Could not fetch data for {ticker}")
                    results.append({
                        "id": item['id'],
                        "symbol": ticker,
                        "price": 0,
                        "change": 0
                    })
                    
        return make_response(
            status=HTTPStatusCode.OK,
            code=APICode.OK,
            message="Watchlist fetched successfully",
            data=results
        )
    except Exception as e:
        return make_response(
            status=HTTPStatusCode.INTERNAL_SERVER_ERROR,
            code=APICode.INTERNAL_SERVER_ERROR,
            message="Failed to fetch watchlist",
            error=str(e),
            location="get_watchlist"
        )

@router.post("/watchlist")
async def add_to_watchlist(ticker_input: TickerInput):
    """Add a stock to the watchlist"""
    try:
        with get_db_connection() as conn:
            try:
                conn.execute("INSERT INTO watchlist (ticker) VALUES (?)", (ticker_input.ticker.upper(),))
                conn.commit()
            except Exception:
                return make_response(
                    status=HTTPStatusCode.BAD_REQUEST,
                    code=APICode.DATA_EXIST,
                    message="Ticker already exists or invalid"
                )
            
        return make_response(
            status=HTTPStatusCode.CREATED,
            code=APICode.CREATED,
            message=f"Added {ticker_input.ticker} to watchlist",
            data={"ticker": ticker_input.ticker}
        )
    except Exception as e:
        return make_response(
            status=HTTPStatusCode.INTERNAL_SERVER_ERROR,
            code=APICode.INTERNAL_SERVER_ERROR,
            message="Failed to add to watchlist",
            error=str(e),
            location="add_to_watchlist"
        )

@router.delete("/watchlist/{ticker}")
async def remove_from_watchlist(ticker: str):
    """Remove a stock from the watchlist"""
    try:
        with get_db_connection() as conn:
            conn.execute("DELETE FROM watchlist WHERE ticker = ?", (ticker.upper(),))
            conn.commit()

        return make_response(
            status=HTTPStatusCode.OK,
            code=APICode.OK,
            message=f"Removed {ticker} from watchlist",
            data={"ticker": ticker}
        )
    except Exception as e:
        return make_response(
            status=HTTPStatusCode.INTERNAL_SERVER_ERROR,
            code=APICode.INTERNAL_SERVER_ERROR,
            message="Failed to remove from watchlist",
            error=str(e),
            location="remove_from_watchlist"
        )


# mock 
@router.get("/market/analysis")
async def get_market_analysis():
    """
    Get top gainers/losers and sector performance.
    """
    try:
        # Mocking Sector Performance for reliability
        sectors = [
            {"name": "Nifty Bank", "change": 1.2, "performance": "Bullish"},
            {"name": "Nifty IT", "change": -0.5, "performance": "Bearish"},
            {"name": "Nifty Auto", "change": 0.8, "performance": "Bullish"},
            {"name": "Nifty Pharma", "change": -0.2, "performance": "Neutral"},
            {"name": "Nifty FMCG", "change": 0.1, "performance": "Neutral"},
        ]
        
        # Simulated Top Movers
        movers = {
            "gainers": [
                 {"symbol": "RELIANCE.NS", "price": 2500, "change": 2.5},
                 {"symbol": "TCS.NS", "price": 3400, "change": 1.8},
                 {"symbol": "HDFCBANK.NS", "price": 1600, "change": 1.5},
            ],
            "losers": [
                 {"symbol": "INFY.NS", "price": 1400, "change": -1.2},
                 {"symbol": "WIPRO.NS", "price": 400, "change": -2.0},
                 {"symbol": "TATAMOTORS.NS", "price": 600, "change": -0.8},
            ]
        }
        
        return make_response(
            status=HTTPStatusCode.OK,
            code=APICode.OK,
            message="Market analysis fetched successfully",
            data={"sectors": sectors, "movers": movers}
        )
    except Exception as e:
        logger.error(f"Market analysis error: {e}")
        return make_response(
            status=HTTPStatusCode.INTERNAL_SERVER_ERROR,
            code=APICode.INTERNAL_SERVER_ERROR,
            message="Failed to fetch market analysis",
            error=str(e),
            location="get_market_analysis"
        )

@router.post("/risk/calculate")
async def calculate_risk(request: RiskAnalysisRequest):
    """
    Calculate portfolio volatility and beta.
    """
    try:
        if not request.portfolio:
             return make_response(
                status=HTTPStatusCode.OK,
                code=APICode.OK,
                message="Portfolio empty, returning zero risk",
                data={
                    "volatility": 0,
                    "beta": 0,
                    "sharpe_ratio": 0,
                    "var_95": 0
                }
            )
             
        tickers = [item.ticker for item in request.portfolio]
        weights = [item.weight for item in request.portfolio]
        
        # Normalize weights
        total_weight = sum(weights)
        if total_weight == 0:
             return make_response(
                status=HTTPStatusCode.BAD_REQUEST,
                code=APICode.BAD_REQUEST,
                message="Total weight cannot be zero"
             )
        weights = [w / total_weight for w in weights]
        
        # Download data (silently)
        data = yf.download(tickers, period="6mo", progress=False)['Close']
        
        # Handle single ticker case (Series vs DataFrame)
        if isinstance(data, pd.Series):
            data = data.to_frame(name=tickers[0])
            
        # Align data
        data = data.dropna()
        if data.empty:
             return make_response(
                status=HTTPStatusCode.BAD_REQUEST,
                code=APICode.DATA_NOT_FOUND,
                message="Not enough data fetched for tickers"
             )

        returns = data.pct_change().dropna()
        
        # Calculate Portfolio Volatility
        cov_matrix = returns.cov() * 252 # Annualized
        port_variance = np.dot(weights, np.dot(cov_matrix, weights))
        port_volatility = np.sqrt(port_variance)
        
        # Benchmark (Nifty 50) for Beta
        nifty = yf.download("^NSEI", period="6mo", progress=False)['Close']
        nifty_returns = nifty.pct_change().dropna()
        
        # Align indices
        common_dates = returns.index.intersection(nifty_returns.index)
        
        if len(common_dates) < 10:
             # Fallback
            return make_response(
                status=HTTPStatusCode.OK,
                code=APICode.OK,
                message="Risk calculated with limited data (Beta default 1.0)",
                data={
                    "volatility": round(port_volatility * 100, 2),
                    "beta": 1.0, 
                    "sharpe_ratio": 0,
                    "var_95": round(port_volatility * 1.65 * 100, 2)
                }
            )

        # Calculate Beta
        # Calculate portfolio daily returns series
        portfolio_returns_series = returns.dot(weights)
        
        aligned_port = portfolio_returns_series.loc[common_dates]
        aligned_mkt = nifty_returns.loc[common_dates]
        
        covariance = np.cov(aligned_port, aligned_mkt)[0][1]
        market_variance = np.var(aligned_mkt)
        beta = covariance / market_variance if market_variance != 0 else 1.0
        
        return make_response(
            status=HTTPStatusCode.OK,
            code=APICode.OK,
            message="Risk analysis calculated successfully",
            data={
                "volatility": round(port_volatility * 100, 2), # Percentage
                "beta": round(beta, 2),
                "sharpe_ratio": round((port_volatility - 0.04) / port_volatility, 2) if port_volatility != 0 else 0,
                "var_95": round(port_volatility * 1.65 * 100, 2)
            }
        )
        
    except Exception as e:
        logger.error(f"Risk calc error: {e}")
        return make_response(
            status=HTTPStatusCode.INTERNAL_SERVER_ERROR,
            code=APICode.INTERNAL_SERVER_ERROR,
            message="Risk calculation failed",
            error=str(e),
            location="calculate_risk"
        )

@router.get("/ai/signals")
async def get_ai_signals():
    """
    Scan market for Buy/Sell signals based on Technicals.
    """
    try:
        # Predefined scan list (Top liquid stocks)
        scan_list = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "LICI.NS", "HINDUNILVR.NS"]
        results = []
        
        # Batch fetching would be better, but loop is okay for 10 items
        for ticker in scan_list:
            try:
                stock = yf.Ticker(ticker)
                history = stock.history(period="6mo")
                if history.empty: continue

                closes = history['Close']
                delta = closes.diff()
                gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
                loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
                rs = gain / loss
                rsi = 100 - (100 / (1 + rs))
                current_rsi = rsi.iloc[-1]
                
                sma_50 = closes.rolling(window=50).mean().iloc[-1]
                current_price = closes.iloc[-1]
                
                signal = "HOLD"
                signal_score = 0
                
                if current_rsi < 30: signal_score += 1
                elif current_rsi > 70: signal_score -= 1
                
                if current_price > sma_50: signal_score += 1
                else: signal_score -= 1
                
                if signal_score >= 1: signal = "BUY"
                elif signal_score <= -1: signal = "SELL"
                
                results.append({
                    "ticker": ticker,
                    "signal": signal,
                    "rsi": round(current_rsi, 2),
                    "price": round(current_price, 2)
                })
            except:
                continue
                
        return make_response(
            status=HTTPStatusCode.OK,
            code=APICode.OK,
            message="AI signals generated successfully",
            data=results
        )
    except Exception as e:
         logger.error(f"AI Signal error: {e}")
         return make_response(
            status=HTTPStatusCode.INTERNAL_SERVER_ERROR,
            code=APICode.INTERNAL_SERVER_ERROR,
            message="Failed to generate AI signals",
            error=str(e),
            location="get_ai_signals"
        )

@router.get("/{ticker}/history")
async def get_stock_history(ticker: str, period: str = "1mo"):
    """
    Fetch historical data for charts.
    """
    try:
        stock = yf.Ticker(ticker)
        # valid periods: 1d,5d,1mo,3mo,6mo,1y,2y,5y,10y,ytd,max
        history = stock.history(period=period)
        
        data = []
        for index, row in history.iterrows():
            data.append({
                "date": index.strftime('%Y-%m-%d'),
                "open": round(row['Open'], 2),
                "high": round(row['High'], 2),
                "low": round(row['Low'], 2),
                "close": round(row['Close'], 2),
                "volume": int(row['Volume'])
            })
        return make_response(
            status=HTTPStatusCode.OK,
            code=APICode.OK,
            message=f"History for {ticker} fetched successfully",
            data=data
        )
    except Exception as e:
        return make_response(
            status=HTTPStatusCode.INTERNAL_SERVER_ERROR,
            code=APICode.INTERNAL_SERVER_ERROR,
            message="Failed to fetch stock history",
            error=str(e),
            location="get_stock_history"
        )

@router.get("/{ticker}/analysis")
async def get_stock_analysis(ticker: str):
    """
    Perform AI Analysis (RSI, SMA, Signal) using OpenAI.
    """
    logger.info(f"Analyzing ticker: {ticker}")
    try:
        stock = yf.Ticker(ticker)
        # Fetch enough data for calculations (at least 50 days for SMA50)
        history = stock.history(period="6mo")
        
        if history.empty:
             logger.warning(f"No history found for {ticker}")
             return make_response(
                status=HTTPStatusCode.NOT_FOUND,
                code=APICode.DATA_NOT_FOUND,
                message=f"No data found for symbol {ticker}"
             )

        closes = history['Close']
        
        # Calculate RSI (14)
        delta = closes.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        current_rsi = rsi.iloc[-1]
        
        # Calculate SMA (Simple Moving Average)
        sma_50 = closes.rolling(window=50).mean().iloc[-1]
        current_price = closes.iloc[-1]

        # Calculate Technical Signal
        signal_score = 0
        technical_signal = "HOLD"
        
        if current_rsi < 30: signal_score += 1
        elif current_rsi > 70: signal_score -= 1
        
        if current_price > sma_50: signal_score += 1
        else: signal_score -= 1
        
        if signal_score >= 1: technical_signal = "BUY"
        elif signal_score <= -1: technical_signal = "SELL"
        
        logger.info(f"Technicals calculated: Price={current_price}, RSI={current_rsi}, SMA={sma_50}, Tech Signal={technical_signal}")

        # Fetch News for Context
        news_summary = ""
        try:
            from Controller.NewsFetchController import fetch_google_news
            # Clean ticker for better news search (e.g., RELIANCE.NS -> RELIANCE)
            clean_ticker = ticker.split('.')[0]
            query = f"{clean_ticker} share price news"
            news_items = fetch_google_news(query)
            
            for item in news_items[:3]:
                news_summary += f"- {item['title']} ({item['source']})\n"
            logger.info(f"News fetched successfully for {clean_ticker}")
        except Exception as e:
            logger.error(f"News fetch failed: {e}")
            news_summary = "No recent news available."

        # Hugging Face Analysis
        try:
            hf_token = settings.HF_TOKEN
            if not hf_token:
                logger.error("HF_TOKEN key missing")
                raise ValueError("Missing HF Token")

            from huggingface_hub import InferenceClient
            client = InferenceClient(api_key=hf_token)

            # System prompt to enforce persona and JSON format
            system_prompt = """
                You are a Senior Financial Markets Analyst AI specializing in technical and sentiment-based stock evaluation.

                Your objective:
                Analyze structured stock data and return a trading decision.

                CRITICAL OUTPUT RULES:
                - Output MUST be strictly valid JSON.
                - Do NOT include markdown, backticks, commentary, or explanations outside JSON.
                - Do NOT add extra fields.
                - Do NOT change field names.
                - Response must be a single JSON object.

                Required JSON Schema:
                {
                    "signal": "BUY" | "SELL" | "HOLD",
                    "reasoning": ["reason 1", "reason 2", "reason 3", "reason 4", "reason 5"],
                    "sentiment_score": integer (0-100)
                }

                Decision Rules:
                - Heavily prioritize the provided Technical Indicator Signal.
                - Only override it if news sentiment is strongly contradictory.
                - reasoning must contain EXACTLY 5 concise, professional statements.
                - sentiment_score:
                    0–40  = Bearish
                    41–60 = Neutral
                    61–100 = Bullish
                """


            user_prompt = f"""
                Stock: {ticker}

                Technical Data:
                - Current Price: {round(current_price, 2)}
                - RSI (14): {round(current_rsi, 2)}
                - SMA (50): {round(sma_50, 2)}
                - Precomputed Technical Signal: {technical_signal}

                News Summary:
                {news_summary}

                Analysis Instructions:
                1. Base your primary decision on the Precomputed Technical Signal.
                2. Adjust only if news sentiment strongly conflicts.
                3. Provide EXACTLY 5 concise reasons.
                4. Assign a sentiment score between 0 and 100.
                5. Return strictly valid JSON.
                """
            
            logger.info("Sending request to Hugging Face (mistralai/Mistral-7B-Instruct-v0.2)")
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            response = client.chat_completion(
                model="mistralai/Mistral-7B-Instruct-v0.2",
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            
            content_str = response.choices[0].message.content
            
            # Clean possible markdown code blocks if the model ignores instruction
            if "```json" in content_str:
                content_str = content_str.split("```json")[1].split("```")[0].strip()
            elif "```" in content_str:
                content_str = content_str.split("```")[1].strip()
                
            import json
            ai_content = json.loads(content_str)
            
            signal = ai_content.get("signal", technical_signal) # Fallback to technical signal
            reasoning = ai_content.get("reasoning", ["AI analysis unavailable."])
            sentiment_score = ai_content.get("sentiment_score", 50) 
            logger.info("Hugging Face analysis complete")

        except Exception as e:
            logger.error(f"Hugging Face Analysis failed: {e}")
            # Fallback Logic
            signal = technical_signal
            reasoning = ["AI connection failed, using fallback technicals."]
            if technical_signal == "BUY":
                reasoning.append("Technical indicators suggest upside momentum.")
            elif technical_signal == "SELL":
                reasoning.append("Technical indicators suggest downside risk.")
            else:
                reasoning.append("Market conditions encompass mixed signals.")
            

        # Fetch Fundamental Data
        try:
            info = stock.info
            fundamentals = {
                "market_cap": info.get("marketCap", "N/A"),
                "pe_ratio": info.get("trailingPE", "N/A"),
                "fifty_two_week_high": info.get("fiftyTwoWeekHigh", "N/A"),
                "fifty_two_week_low": info.get("fiftyTwoWeekLow", "N/A"),
                "sector": info.get("sector", "N/A"),
                "industry": info.get("industry", "N/A"),
            }
        except Exception as e:
            logger.error(f"Fundamentals fetch failed: {e}")
            fundamentals = {}

        return make_response(
            status=HTTPStatusCode.OK,
            code=APICode.OK,
            message=f"Analysis for {ticker} completed",
            data={
                "ticker": ticker,
                "signal": signal,
                "rsi": round(current_rsi, 2),
                "sma_50": round(sma_50, 2),
                "current_price": round(current_price, 2),
                "reasoning": reasoning,
                "fundamentals": fundamentals
            }
        )
        
    except Exception as e:
        logger.error(f"General error in analysis: {e}")
        return make_response(
            status=HTTPStatusCode.INTERNAL_SERVER_ERROR,
            code=APICode.INTERNAL_SERVER_ERROR,
            message="Stock analysis failed",
            error=str(e),
            location="get_stock_analysis"
        )