from fastapi import FastAPI

app = FastAPI(title="Cloud Sync Service")

@app.get("/")
async def root():
    return {"message": "Cloud Sync Service is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
