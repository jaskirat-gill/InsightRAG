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
        - Runs SQL migrations in DB_SQL_DIR/migrations every startup (once per file).
        """
        schema_exists = await self._table_exists("users")
        if not schema_exists:
            logger.info("Core schema missing. Applying init.sql")
            await self._run_sql_file_async("init.sql")
        else:
            logger.info("Core schema already exists. Skipping init.sql")

        logger.info("Ensuring roles/permissions/demo users via seed_user_kb.sql")
        await self._run_sql_file_async("seed_user_kb.sql")
        await self._apply_pending_migrations()
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

    async def _apply_pending_migrations(self):
        import asyncio
        await asyncio.to_thread(self._apply_pending_migrations_sync)

    def _run_sql_file_sync(self, filename: str):
        sql_path = self._resolve_sql_file(filename)
        logger.info("Executing SQL file: %s", sql_path)
        sql = sql_path.read_text(encoding="utf-8")

        with psycopg2.connect(settings.DATABASE_URL) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql)

    def _apply_pending_migrations_sync(self):
        migrations_dir = Path(settings.DB_SQL_DIR) / "migrations"
        if not migrations_dir.exists():
            logger.info("No migrations directory at %s; skipping migrations", migrations_dir)
            return

        migration_files = sorted(
            [p for p in migrations_dir.iterdir() if p.is_file() and p.suffix.lower() == ".sql"],
            key=lambda p: p.name,
        )
        if not migration_files:
            logger.info("No SQL migration files found in %s", migrations_dir)
            return

        logger.info("Checking %d migration file(s) in %s", len(migration_files), migrations_dir)
        with psycopg2.connect(settings.DATABASE_URL) as conn:
            conn.autocommit = False
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS schema_migrations (
                        migration_name TEXT PRIMARY KEY,
                        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
                cur.execute("SELECT migration_name FROM schema_migrations")
                applied = {row[0] for row in cur.fetchall()}

            for migration_path in migration_files:
                migration_name = migration_path.name
                if migration_name in applied:
                    continue

                logger.info("Applying migration: %s", migration_name)
                sql = migration_path.read_text(encoding="utf-8")
                try:
                    with conn.cursor() as cur:
                        cur.execute(sql)
                        cur.execute(
                            "INSERT INTO schema_migrations (migration_name) VALUES (%s)",
                            (migration_name,),
                        )
                    conn.commit()
                except Exception:
                    conn.rollback()
                    logger.exception("Failed migration: %s", migration_name)
                    raise

        logger.info("Database migrations check complete")

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
