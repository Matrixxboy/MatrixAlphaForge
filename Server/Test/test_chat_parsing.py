
import sys
import os
import json
import re

# Add Server to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from Controller.ChatController import parse_actions

def test_parse_actions():
    test_cases = [
        {
            "input": "Thought: I need price.\nAction: {\"tool\": \"get_stock_price\", \"args\": {\"ticker\": \"RELIANCE\"}}",
            "expected": [{"tool": "get_stock_price", "args": {"ticker": "RELIANCE"}}]
        },
        {
            "input": "Thought: I need price and news.\nAction: {\"tool\": \"get_stock_price\", \"args\": {\"ticker\": \"TCS\"}}\nAction: {\"tool\": \"get_stock_news\", \"args\": {\"ticker\": \"TCS\"}}",
            "expected": [
                {"tool": "get_stock_price", "args": {"ticker": "TCS"}},
                {"tool": "get_stock_news", "args": {"ticker": "TCS"}}
            ]
        },
         {
            "input": "Action: {\"tool\": \"analyze_stock\", \"args\": {\"ticker\": \"INFY\"}} Extra text here.",
            "expected": [{"tool": "analyze_stock", "args": {"ticker": "INFY"}}]
        }
    ]

    for i, case in enumerate(test_cases):
        results = parse_actions(case["input"])
        print(f"Test {i+1}: {'PASS' if results == case['expected'] else 'FAIL'}")
        if results != case["expected"]:
            print(f"  Input: {case['input']}")
            print(f"  Got: {results}")
            print(f"  Expected: {case['expected']}")

if __name__ == "__main__":
    test_parse_actions()
