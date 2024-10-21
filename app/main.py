from fastapi import FastAPI

from .routers import http_router, ws_router


app = FastAPI()

app.include_router(http_router)
app.include_router(ws_router)
