
from fastapi import APIRouter
import requests
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
import time
from typing import List, Dict
from Utils.ResponseHelper import make_response
from Utils.ResponseHelperModels import HTTPStatusCode, APICode
import logging
import warnings

# Suppress XMLParsedAsHTMLWarning
warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

def fetch_google_news(query: str = "Finance"):
    """
    Fetch news from Google News RSS feed.
    """
    url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            # Use 'xml' parser for RSS feeds
            soup = BeautifulSoup(response.content, "xml")
            items = soup.find_all("item")
            news_list = []
            
            for item in items[:10]:
                try:
                    title = item.title.text if item.title else "No Title"
                    link = item.link.text if item.link else "#"
                    pubDate = item.pubDate.text if item.pubDate else ""
                    
                    # Source might be a tag or text within source tag
                    source = "Unknown"
                    if item.source:
                        source = item.source.text
                    
                    news_list.append({
                        "title": title,
                        "link": link,
                        "pubDate": pubDate,
                        "source": source
                    })
                except Exception:
                    continue
                    
            return news_list
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        return []
    return []

@router.get("/latest")
async def get_latest_news():
    """
    Get general market news.
    """
    try:
        data = fetch_google_news("Stock Market")
        return make_response(
            status=HTTPStatusCode.OK,
            code=APICode.OK,
            message="News fetched successfully",
            data=data,
        )
    except Exception as e:
        logger.error(f"Failed to fetch news: {e}")
        return make_response(
            status=HTTPStatusCode.INTERNAL_SERVER_ERROR,
            code=APICode.INTERNAL_SERVER_ERROR,
            message="Failed to fetch news",
            error=str(e),
            location = "get_latest_news"
        )

@router.get("/{ticker}")
async def get_stock_news(ticker: str):
    """
    Get news specific to a ticker.
    """
    try:
        data = fetch_google_news(f"{ticker} stock news")
        return make_response(
            status=HTTPStatusCode.OK,
            code=APICode.OK,
            message="News fetched successfully",
            data=data
        )
    except Exception as e:
        logger.error(f"Failed to fetch news for {ticker}: {e}")
        return make_response(
            status=HTTPStatusCode.INTERNAL_SERVER_ERROR,
            code=APICode.INTERNAL_SERVER_ERROR,
            message="Failed to fetch news",
            error=str(e),
            location = "get_stock_news"
        )