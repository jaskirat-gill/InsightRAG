from fastapi import FastAPI

app = FastAPI(title="Query Engine")

@app.get("/")
async def root():
    return {"message": "Query Engine is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
