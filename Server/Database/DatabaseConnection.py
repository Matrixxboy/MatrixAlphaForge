
import sqlite3
import os
from contextlib import contextmanager
from Config.SystemConfig import get_settings

settings = get_settings()

SCHEMA_FILE = "Database/schema.sql"

@contextmanager
def get_db_connection():
    """
    Context manager for database connection.
    Ensures connection is closed after use.
    """
    conn = sqlite3.connect(settings.DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    if not os.path.exists(settings.DB_FILE):
        print("Initializing Database...")
        # Create schema
        with get_db_connection() as conn:
            try:
                with open(SCHEMA_FILE, 'r') as f:
                    conn.executescript(f.read())
                conn.commit()
                print("Schema created.")
                
                # Add defaults
                cursor = conn.cursor()
                defaults = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS"]
                for ticker in defaults:
                    try:
                        cursor.execute("INSERT INTO watchlist (ticker) VALUES (?)", (ticker,))
                    except sqlite3.IntegrityError:
                        pass 
                conn.commit()
                print("Default data seeded.")
            except Exception as e:
                print(f"Database initialization failed: {e}")
    else:
        print(f"Database {settings.DB_FILE} already exists.")

if __name__ == "__main__":
    init_db()