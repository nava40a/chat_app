from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import http_router, ws_router


app = FastAPI()

app.include_router(http_router)
app.include_router(ws_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
