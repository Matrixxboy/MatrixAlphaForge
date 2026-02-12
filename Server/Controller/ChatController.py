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

**TOOLS AVAILABLE:**
1. `get_stock_price(ticker: str)`: Use this to get the current price of a stock.
2. `get_stock_news(ticker: str)`: Use this to get the latest news for a stock.
3. `analyze_stock(ticker: str)`: Use this to get technical indicators (RSI, SMA) and a Buy/Sell signal.

**FORMAT INSTRUCTIONS:**
- If you need to use tools to answer, you must output one or more Action lines.
- Each Action MUST be a valid JSON object starting with 'Action: '.
- Format: Action: {"tool": "tool_name", "args": {"ticker": "TICKER"}}
- You can provide multiple Actions if needed (e.g., to fetch both price and news).
- Use Thought: to explain your reasoning before taking actions.
- NEVER provide an Answer until you have the tool results if tools are needed.
- If no tool is needed, respond with Thought: followed by Answer:.

**EXAMPLES:**

User: "Analyze RELIANCE"
Thought: The user wants technical analysis for Reliance Industries. I should use the analyze_stock tool.
Action: {"tool": "analyze_stock", "args": {"ticker": "RELIANCE"}}

User: "Get price and news for TCS"
Thought: The user wants both price and news for TCS. I will call both tools.
Action: {"tool": "get_stock_price", "args": {"ticker": "TCS"}}
Action: {"tool": "get_stock_news", "args": {"ticker": "TCS"}}

User: "Hello"
Thought: The user is greeting me. No tool is needed.
Answer: Hello! I am Matrix Alpha, your financial assistant. How can I help you today?
"""

def parse_actions(text: str):
    """Parses all 'Action: {JSON}' patterns from the text."""
    actions = []
    # Find all lines starting with Action: 
    matches = re.findall(r"Action:\s*(\{.*\})", text, re.IGNORECASE)
    for match in matches:
        try:
            # Clean up potential markdown or trailing text
            clean_json = match.strip()
            # If there's trailing content after the closing brace of the first object, try to isolate it
            # This is a bit naive but helps if the LLM adds commentary on the same line
            actions.append(json.loads(clean_json))
        except json.JSONDecodeError:
            # Try a slightly more aggressive match if direct load fails
            try:
                second_chance = re.search(r"\{.*\}", match)
                if second_chance:
                    actions.append(json.loads(second_chance.group(0)))
            except:
                logger.warning(f"Failed to parse action JSON: {match}")
    return actions

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

        # 2. Check for Tool Calls
        tool_calls = parse_actions(content)
        
        # 3. Execute Tools if applicable
        if tool_calls:
            results = []
            executed_tools = []
            
            for tool_call in tool_calls:
                tool_name = tool_call.get("tool")
                args = tool_call.get("args", {})
                
                if tool_name in TOOLS:
                    logger.info(f"Executing tool: {tool_name} with {args}")
                    try:
                        tool_result = TOOLS[tool_name](**args)
                        results.append(f"Tool '{tool_name}' output: {tool_result}")
                        executed_tools.append({"name": tool_name, "args": args, "result": tool_result})
                    except Exception as e:
                        logger.error(f"Error executing {tool_name}: {e}")
                        results.append(f"Tool '{tool_name}' failed: {str(e)}")
                else:
                    logger.warning(f"Tool not found: {tool_name}")
                    results.append(f"Tool '{tool_name}' not found.")

            if results:
                # 4. Feed all results back to LLM for a final summary
                combined_results = "\n\n".join(results)
                follow_up_messages = messages + [
                    {"role": "assistant", "content": content},
                    {"role": "system", "content": f"SYSTEM: Collected Tool Outputs:\n{combined_results}\n\nPlease synthesize these results into a professional final answer for the user. Do NOT mention tool names, just provide the info."}
                ]
                
                try:
                    final_response = client.chat_completion(
                        # model="mistralai/Mistral-7B-Instruct-v0.2",
                        model="mistralai/Mixtral-8x7B-Instruct-v0.1", # Using a slightly larger/smarter model for synthesis if available
                        messages=follow_up_messages,
                        max_tokens=500,
                        temperature=0.3
                    )
                    final_answer = final_response.choices[0].message.content.strip()
                except Exception as e:
                    logger.error(f"LLM Follow-up Call Failed: {e}")
                    # Fallback synthesis
                    final_answer = "I've gathered the following information for you:\n\n" + "\n".join([str(r) for r in results])

                return make_response(
                    status=HTTPStatusCode.OK,
                    code=APICode.OK,
                    message="Multi-tool execution successful",
                    data={
                        "response": final_answer,
                        "tools_used": [t["name"] for t in executed_tools],
                        "details": executed_tools
                    }
                )

        # If no tool, return the text (clean up if LLM included 'Answer:' prefix)
        clean_response = content
        if "Answer:" in content:
            clean_response = content.split("Answer:", 1)[1].strip()
        
        return make_response(
            status=HTTPStatusCode.OK,
            code=APICode.OK,
            message="Chat response generated",
            data={"response": clean_response}
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
