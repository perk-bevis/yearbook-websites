import os
import psycopg2
import psycopg2.pool
from contextlib import contextmanager
from datetime import datetime, date

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

pool = psycopg2.pool.SimpleConnectionPool(1, 10, DATABASE_URL)


def row_to_dict(cursor, row):
    """Convert a database row to a JSON-serializable dictionary."""
    if row is None:
        return None
    columns = [desc[0] for desc in cursor.description]
    result = {}
    for col, val in zip(columns, row):
        if isinstance(val, (datetime, date)):
            result[col] = val.isoformat()
        else:
            result[col] = val
    return result


def rows_to_list(cursor, rows):
    return [row_to_dict(cursor, row) for row in rows]


@contextmanager
def get_db():
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)
