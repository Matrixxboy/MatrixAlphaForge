import os
import sys
import logging
import yfinance as yf
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_analysis(ticker="^NSEI"):
    logger.info(f"Testing analysis for {ticker}")
    
    # 1. Test .env
    load_dotenv()
    api_key = os.getenv("OPEN_AI_API")
    if not api_key:
        logger.error("x .env loading failed or OPEN_AI_API missing")
        return
    else:
        logger.info(f"✓ .env loaded, Key found: {api_key[:5]}...")

    # 2. Test yfinance
    try:
        stock = yf.Ticker(ticker)
        history = stock.history(period="1mo")
        if history.empty:
            logger.warning("x yfinance returned empty data")
        else:
            logger.info(f"✓ yfinance fetched {len(history)} rows")
    except Exception as e:
        logger.error(f"x yfinance failed: {e}")
        return

    # 3. Test OpenAI
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        
        logger.info("Sending test request to OpenAI...")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": "Say 'Hello World' in JSON format: {'msg': '...'}"}
            ],
            response_format={"type": "json_object"}
        )
        logger.info(f"✓ OpenAI Response: {response.choices[0].message.content}")
        
    except ImportError:
        logger.error("x openai library not installed")
    except Exception as e:
        logger.error(f"x OpenAI API failed: {e}")

if __name__ == "__main__":
    test_analysis()
