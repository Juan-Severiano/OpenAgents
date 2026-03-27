from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import structlog

from app.database import get_db
from app.models.mcp_server import MCPServer
from app.schemas.mcp_server import MCPServerCreate, MCPServerResponse, MCPServerUpdate

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/mcp-servers", tags=["mcp-servers"])


@router.get("", response_model=list[MCPServerResponse])
async def list_mcp_servers(db: AsyncSession = Depends(get_db)) -> list[MCPServer]:
    result = await db.execute(select(MCPServer))
    return list(result.scalars().all())


@router.post("", response_model=MCPServerResponse, status_code=status.HTTP_201_CREATED)
async def create_mcp_server(
    body: MCPServerCreate, db: AsyncSession = Depends(get_db)
) -> MCPServer:
    server = MCPServer(**body.model_dump())
    db.add(server)
    await db.flush()
    await db.refresh(server)
    log.info("mcp_server.created", id=server.id, name=server.name)
    return server


@router.get("/{server_id}", response_model=MCPServerResponse)
async def get_mcp_server(server_id: str, db: AsyncSession = Depends(get_db)) -> MCPServer:
    server = await db.get(MCPServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail=f"MCP server {server_id} not found")
    return server


@router.put("/{server_id}", response_model=MCPServerResponse)
async def update_mcp_server(
    server_id: str, body: MCPServerUpdate, db: AsyncSession = Depends(get_db)
) -> MCPServer:
    server = await db.get(MCPServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail=f"MCP server {server_id} not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(server, field, value)
    await db.flush()
    await db.refresh(server)
    return server


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mcp_server(server_id: str, db: AsyncSession = Depends(get_db)) -> None:
    server = await db.get(MCPServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail=f"MCP server {server_id} not found")
    await db.delete(server)


@router.post("/{server_id}/connect")
async def connect_mcp_server(server_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    server = await db.get(MCPServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail=f"MCP server {server_id} not found")
    # Placeholder — full MCP engine in Phase 5
    server.status = "connecting"
    await db.flush()
    return {"status": "connecting", "message": "MCP engine not yet implemented (Phase 5)"}


@router.post("/{server_id}/disconnect")
async def disconnect_mcp_server(server_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    server = await db.get(MCPServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail=f"MCP server {server_id} not found")
    server.status = "disconnected"
    await db.flush()
    return {"status": "disconnected"}


@router.get("/{server_id}/tools")
async def get_mcp_server_tools(
    server_id: str, db: AsyncSession = Depends(get_db)
) -> dict:
    server = await db.get(MCPServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail=f"MCP server {server_id} not found")
    return {
        "server_id": server_id,
        "status": server.status,
        "tools": server.discovered_tools or [],
    }


@router.post("/{server_id}/tools/{tool_name}/test")
async def test_mcp_tool(
    server_id: str,
    tool_name: str,
    args: dict,
    db: AsyncSession = Depends(get_db),
) -> dict:
    server = await db.get(MCPServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail=f"MCP server {server_id} not found")
    return {
        "server_id": server_id,
        "tool": tool_name,
        "args": args,
        "result": "MCP tool test not yet implemented (Phase 5)",
    }
