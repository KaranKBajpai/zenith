from fastapi import FastAPI

app = FastAPI(title="Zenith API")

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

