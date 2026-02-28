import asyncpg
import psycopg2
from pathlib import Path
from config import settings
from typing import Optional
import logging

logger = logging.getLogger("sync_service.db_bootstrap")

class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self, retries: int = 5, delay: float = 2.0):
        """Create database connection pool with retry logic"""
        import asyncio
        for attempt in range(1, retries + 1):
            try:
                self.pool = await asyncpg.create_pool(
                    settings.DATABASE_URL,
                    min_size=5,
                    max_size=20
                )
                print("✅ Database connected")
                return
            except (ConnectionRefusedError, OSError) as e:
                if attempt == retries:
                    print(f"❌ Database connection failed after {retries} attempts")
                    raise
                print(f"⏳ Database not ready (attempt {attempt}/{retries}), retrying in {delay}s...")
                await asyncio.sleep(delay)
    
    async def disconnect(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            print("❌ Database disconnected")

    async def ensure_schema_and_seed(self):
        """
        Ensure auth/KB schema exists and seed baseline users/roles.
        - Runs init.sql only when the core schema is missing.
        - Runs seed_user_kb.sql every startup (idempotent) so demo users exist.
        """
        schema_exists = await self._table_exists("users")
        if not schema_exists:
            logger.info("Core schema missing. Applying init.sql")
            await self._run_sql_file_async("init.sql")
        else:
            logger.info("Core schema already exists. Skipping init.sql")

        logger.info("Ensuring roles/permissions/demo users via seed_user_kb.sql")
        await self._run_sql_file_async("seed_user_kb.sql")
        logger.info("Schema/seed bootstrap complete")
    
    async def fetch_one(self, query: str, *args):
        """Execute query and return one row"""
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)
    
    async def fetch_all(self, query: str, *args):
        """Execute query and return all rows"""
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)
    
    async def execute(self, query: str, *args):
        """Execute query without return"""
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)

    async def _table_exists(self, table_name: str) -> bool:
        row = await self.fetch_one(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = $1
            ) AS exists
            """,
            table_name,
        )
        return bool(row["exists"]) if row else False

    async def _run_sql_file_async(self, filename: str):
        import asyncio
        await asyncio.to_thread(self._run_sql_file_sync, filename)

    def _run_sql_file_sync(self, filename: str):
        sql_path = self._resolve_sql_file(filename)
        logger.info("Executing SQL file: %s", sql_path)
        sql = sql_path.read_text(encoding="utf-8")

        with psycopg2.connect(settings.DATABASE_URL) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql)

    def _resolve_sql_file(self, filename: str) -> Path:
        candidates = [
            Path(settings.DB_SQL_DIR) / filename,
            Path(__file__).resolve().parents[1] / "database" / filename,
        ]
        for path in candidates:
            if path.exists():
                return path
        searched = ", ".join(str(p) for p in candidates)
        raise FileNotFoundError(f"Could not find {filename}. Checked: {searched}")

# Global database instance
db = Database()

# Dependency for FastAPI
async def get_db():
    return db
