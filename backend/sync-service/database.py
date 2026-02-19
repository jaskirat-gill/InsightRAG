import asyncpg
from config import settings
from typing import Optional

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

# Global database instance
db = Database()

# Dependency for FastAPI
async def get_db():
    return db