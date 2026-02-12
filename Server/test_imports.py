try:
    import fastapi
    import uvicorn
    import yfinance
    import numpy
    import pandas
    print("Imports successful")
    print(f"Numpy version: {numpy.__version__}")
    print(f"Pandas version: {pandas.__version__}")
except Exception as e:
    print(f"Import failed: {e}")
