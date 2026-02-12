from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging
from huggingface_hub import InferenceClient
from Config.SystemConfig import get_settings
import yfinance as yf
import json
import re
from Utils.ResponseHelper import make_response
from Utils.ResponseHelperModels import HTTPStatusCode, APICode

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()

# Initialize Hugging Face Client
client = InferenceClient(token=settings.HF_TOKEN)

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []

class ChatResponse(BaseModel):
    response: str
    tool_used: Optional[str] = None
    data: Optional[dict] = None

# --- Tools ---

def get_stock_price(ticker: str):
    """Fetches real-time stock price."""
    try:
        # Append .NS if not present and looks like an Indian ticker
        if not ticker.endswith(".NS") and not ticker.startswith("^"):
             ticker += ".NS"
        
        stock = yf.Ticker(ticker)
        data = stock.history(period="1d")
        if not data.empty:
            price = data["Close"].iloc[-1]
            return f"The current price of {ticker} is ₹{price:.2f}"
        return f"Could not fetch price for {ticker}."
    except Exception as e:
        return f"Error fetching price for {ticker}: {str(e)}"

def get_stock_news(ticker: str):
    """Fetches latest news for a stock."""
    from Controller.NewsFetchController import fetch_google_news
    try:
        if not ticker.endswith(".NS") and not ticker.startswith("^"):
             ticker += ".NS"
        
        news = fetch_google_news(f"{ticker} stock news")
        if news:
            summary = "Here is the latest news:\n"
            for item in news[:3]:
                summary += f"- [{item['title']}]({item['link']}) ({item['source']})\n"
            return summary
        return f"No recent news found for {ticker}."
    except Exception as e:
        return f"Error fetching news for {ticker}: {str(e)}"

def analyze_stock(ticker: str):
    """Performs technical analysis on a stock."""
    try:
        # Append .NS if not present and looks like an Indian ticker
        if not ticker.endswith(".NS") and not ticker.startswith("^"):
             ticker += ".NS"
        
        stock = yf.Ticker(ticker)
        history = stock.history(period="6mo")
        
        if history.empty:
            return f"No data found for {ticker}."
            
        closes = history['Close']
        current_price = closes.iloc[-1]
        
        # RSI
        delta = closes.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        current_rsi = rsi.iloc[-1]
        
        # SMA
        sma_50 = closes.rolling(window=50).mean().iloc[-1]
        
        # Signal
        signal = "HOLD"
        if current_rsi < 30 and current_price > sma_50: signal = "BUY"
        elif current_rsi > 70 and current_price < sma_50: signal = "SELL"
        
        return json.dumps({
            "ticker": ticker,
            "price": round(current_price, 2),
            "rsi": round(current_rsi, 2),
            "sma_50": round(sma_50, 2),
            "signal": signal
        })
    except Exception as e:
        return f"Error analyzing {ticker}: {str(e)}"

# --- Tool Definitions for LLM ---
TOOLS = {
    "get_stock_price": get_stock_price,
    "get_stock_news": get_stock_news,
    "analyze_stock": analyze_stock
}

SYSTEM_PROMPT = """
You are Matrix Alpha, a Senior Financial Analyst AI.
You have access to the following tools:
1. `get_stock_price(ticker: str)`: Get the current price of a stock.
2. `get_stock_news(ticker: str)`: Get the latest news for a stock.
3. `analyze_stock(ticker: str)`: Get technical indicators (RSI, SMA) and a Buy/Sell signal.

**INSTRUCTIONS**:
- If the user asks for price, news, or analysis, you MUST reply with a JSON object calling the tool.
- Format: `{"tool": "tool_name", "args": {"ticker": "TICKER"}}`
- If no tool is needed, answer directly.
- **IMPORTANT**: When you get tool output, summarize it professionally in Markdown.
  - Use **Bold** for prices and signals.
  - Use Tables for multiple data points if needed.

**EXAMPLES**:
User: "Analyze RELIANCE"
You: {"tool": "analyze_stock", "args": {"ticker": "RELIANCE"}}

User: "News for TCS"
You: {"tool": "get_stock_news", "args": {"ticker": "TCS"}}
"""

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        user_msg = request.message
        
        # 1. First Pass: Ask LLM
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg}
        ]
        
        if request.history:
             for msg in request.history[-2:]:
                 messages.append({"role": msg['role'], "content": msg['content']})

        # Call LLM logic
        try:
            initial_response = client.chat_completion(
                model="mistralai/Mistral-7B-Instruct-v0.2",
                messages=messages,
                max_tokens=200,
                temperature=0.1
            )
            content = initial_response.choices[0].message.content.strip()
            logger.info(f"LLM Initial Response: {content}")
        except Exception as e:
            logger.error(f"LLM Initial Call Failed: {e}")
            return make_response(
                status=HTTPStatusCode.OK, # Return OK to frontend to show message
                code=APICode.OK,
                message="LLM unavailable",
                data={"response": "I'm having trouble thinking right now. Please try again later."}
            )

        # 2. Check for Tool Call
        tool_call = None
        try:
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                if "```json" in content:
                     json_str = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                     json_str = content.split("```")[1].strip()
                
                tool_data = json.loads(json_str)
                if "tool" in tool_data and "args" in tool_data:
                    tool_call = tool_data
        except Exception as e:
            logger.warning(f"Failed to parse tool call: {e}")

        # 3. Execute Tool if applicable
        if tool_call:
            tool_name = tool_call["tool"]
            args = tool_call["args"]
            
            if tool_name in TOOLS:
                logger.info(f"Executing tool: {tool_name} with {args}")
                tool_result = TOOLS[tool_name](**args)
                
                # 4. Feed result back to LLM
                follow_up_messages = messages + [
                    {"role": "assistant", "content": json.dumps(tool_call)},
                    {"role": "system", "content": f"Tool Output: {tool_result}\n\nNow provide a helpful response to the user based on this output."}
                ]
                
                try:
                    final_response = client.chat_completion(
                        model="mistralai/Mistral-7B-Instruct-v0.2",
                        messages=follow_up_messages,
                        max_tokens=400,
                        temperature=0.7
                    )
                    final_answer = final_response.choices[0].message.content
                except Exception as e:
                    logger.error(f"LLM Follow-up Call Failed: {e}")
                    # Fallback: Just return the tool result if LLM fails
                    # If tool result is JSON (analyze_stock), maybe format it a bit?
                    if isinstance(tool_result, str) and tool_result.startswith("{"):
                         # It's likely JSON from analyze_stock, send as is or raw text
                         final_answer = f"Here is the data, but I couldn't summarize it:\n\n{tool_result}"
                    else:
                         final_answer = tool_result

                return make_response(
                    status=HTTPStatusCode.OK,
                    code=APICode.OK,
                    message="Tool execution successful",
                    data={
                        "response": final_answer,
                        "tool_used": tool_name,
                        "data": {"args": args, "result": tool_result}
                    }
                )
            else:
                 return make_response(
                    status=HTTPStatusCode.OK,
                    code=APICode.OK,
                    message="Tool not found",
                    data={"response": "I tried to use a tool that doesn't exist."}
                )

        # If no tool, return the text
        return make_response(
            status=HTTPStatusCode.OK,
            code=APICode.OK,
            message="Chat response generated",
            data={"response": content}
        )

    except Exception as e:
        logger.error(f"Chat Error: {e}")
        return make_response(
            status=HTTPStatusCode.INTERNAL_SERVER_ERROR,
            code=APICode.INTERNAL_SERVER_ERROR,
            message="Chat failed",
            error=str(e),
            location="chat"
        )
