import socketio
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from robot_manager import robot_connections
import boto3
import jwt  # PyJWT
import redis
import json
import ssl
from decimal import Decimal

# === Redis (Valkey) Setup ===
redis_client = redis.Redis(
    host='robomeans-cache-v2-i8vsax.serverless.cac1.cache.amazonaws.com',
    port=6379,
    ssl=True,
    ssl_cert_reqs=None,
    decode_responses=True,
    socket_connect_timeout=5
)

# === FastAPI and Socket.IO setup ===
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")
app = FastAPI()
socket_app = socketio.ASGIApp(sio, app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === In-memory session tracking ===
active_ui_sessions = {}  # email -> list of SIDs
sid_robot_map = {}       # sid -> list of robot_ids
robot_ui_subscribers = {}  # robot_id -> set of sid


def convert_floats_to_decimals(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, list):
        return [convert_floats_to_decimals(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimals(v) for k, v in obj.items()}
    else:
        return obj


# === Utility Functions ===
def set_robot_state(robot_id, data):
    redis_client.set(f"robot:{robot_id}:state", json.dumps(data))


def get_robot_state(robot_id):
    data = redis_client.get(f"robot:{robot_id}:state")
    return json.loads(data) if data else None


# === WebSocket Events ===
@sio.event
async def connect(sid, environ):
    print(f"✅ WebSocket client connected: {sid}")


@sio.event
async def register_robot(sid, data):
    robot_id = data.get("robot_id")
    if robot_id:
        robot_connections[robot_id] = sid
        state = get_robot_state(robot_id) or {}
        state["connection_status"] = 1
        state["connection"] = "connected"
        set_robot_state(robot_id, state)
        print(f"🤖 Robot registered: {robot_id} (SID: {sid})")
        await sio.emit("status", state)


@sio.event
async def register_ui(sid, data):
    email = data.get("email")
    robot_ids = data.get("robot_ids", [])
    print(f"🧾 Received register_ui from SID: {sid}, email: {email}, robot_ids: {robot_ids}")


    if not email:
        print("❌ UI tried to register without email.")
        return

    if email not in active_ui_sessions:
        active_ui_sessions[email] = []
    active_ui_sessions[email].append(sid)

    sid_robot_map[sid] = robot_ids

    for robot_id in robot_ids:
        if robot_id not in robot_ui_subscribers:
            robot_ui_subscribers[robot_id] = set()
        robot_ui_subscribers[robot_id].add(sid)

        state = get_robot_state(robot_id)
        if state:
            await sio.emit("status", state, to=sid)

    print(f"🧑 UI registered: {email} (SID: {sid}) controls robots: {robot_ids}")


@sio.event
async def command_to_robot(sid, data):
    print(f"📨 Received command from UI: {data} (SID: {sid})")
    robot_id = data.get("robot_id")
    command = data.get("command")
    target_sid = robot_connections.get(robot_id)

    if target_sid:
        await sio.emit("command", {"command": command}, to=target_sid)
        print(f"📤 Sent '{command}' to {robot_id}")
    else:
        print(f"⚠️ Robot {robot_id} not connected")


@sio.event
async def status_update(sid, data):
    robot_id = data.get("robot_id")
    if not robot_id:
        return

    data["connection"] = "connected"
    set_robot_state(robot_id, data)
    print(f"📱 Status from {robot_id}: {data}")

    subscribers = robot_ui_subscribers.get(robot_id, set())
    for ui_sid in subscribers:
        await sio.emit("status", data, to=ui_sid)


@sio.event
async def disconnect(sid, environ):
    print(f"🔌 Disconnected: {sid}")

    for rid, rsid in list(robot_connections.items()):
        if rsid == sid:
            del robot_connections[rid]
            state = get_robot_state(rid) or {}
            state["connection_status"] = 0
            state["connection"] = "disconnected"
            set_robot_state(rid, state)
            print(f"❌ Robot disconnected: {rid}")
            for ui_sid in list(robot_ui_subscribers.get(rid, [])):
                await sio.emit("status", state, to=ui_sid)

    for email, sids in list(active_ui_sessions.items()):
        if sid in sids:
            active_ui_sessions[email] = [s for s in sids if s != sid]
            if not active_ui_sessions[email]:
                del active_ui_sessions[email]
            print(f"❌ UI SID {sid} disconnected for {email}")

    if sid in sid_robot_map:
        for rid in sid_robot_map[sid]:
            if rid in robot_ui_subscribers:
                robot_ui_subscribers[rid].discard(sid)
                if not robot_ui_subscribers[rid]:
                    del robot_ui_subscribers[rid]
        del sid_robot_map[sid]


@sio.event
async def robot_image(sid, data):
    robot_id = data.get("robot_id")

    image_base64 = data.get("image_base64")
    if not robot_id or not image_base64:
        print("❌ Missing robot_id or image_base64 in robot_image event")
        return

    # print(f"🖼️  Received image from {robot_id} (SID: {sid}) - size: {len(image_base64)} bytes")
    # print(f"🧠 robot_ui_subscribers = {robot_ui_subscribers}")
    # print(f"🔍 Emitting image from {robot_id} to: {robot_ui_subscribers.get(robot_id, set())}")
    

    event_name = f"robot_image_{robot_id}"
    for ui_sid in robot_ui_subscribers.get(robot_id, set()):
        await sio.emit(event_name, {
            "robot_id": robot_id,
            "image_base64": image_base64
        }, to=ui_sid)
        print(f"📡 Relayed image from {robot_id} to UI SID: {ui_sid}")


# === REST API ===
@app.get("/api/myrobots")
async def get_my_robots(request: Request):
    try:
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise ValueError("Missing or invalid Authorization header")
        token = auth_header.split(" ")[1]

        decoded = jwt.decode(token, options={"verify_signature": False})
        user_email = decoded.get("email")
        if not user_email:
            raise ValueError("Email not found in token")

        dynamodb = boto3.client("dynamodb", region_name="ca-central-1")
        response = dynamodb.query(
            TableName="UserRobotMapping",
            KeyConditionExpression="email = :e",
            ExpressionAttributeValues={":e": {"S": user_email}},
        )

        items = response.get("Items", [])
        robots = [
            {
                "robot_id": item["robot_id"]["S"],
                "ui_type": item.get("ui_type", {}).get("S", "default")
            }
            for item in items
        ]

        return JSONResponse(content={"robots": robots})

    except Exception as e:
        print("🚨 Error in /api/myrobots:", e)
        return JSONResponse(status_code=401, content={"error": str(e)})


@app.get("/api/robot_state/{robot_id}")
async def get_robot_state_route(robot_id: str):
    state = get_robot_state(robot_id)
    if state:
        return JSONResponse(content=state)
    return JSONResponse(status_code=404, content={"error": "Robot state not found"})


@app.post("/api/save_missions")
async def save_missions(request: Request):
    try:
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise ValueError("Missing or invalid Authorization header")

        token = auth_header.split(" ")[1]
        decoded = jwt.decode(token, options={"verify_signature": False})
        email = decoded.get("email")
        if not email:
            raise ValueError("Email not found in token")

        body = await request.json()
        robot_id = body.get("robot_id")
        missions = body.get("missions")

        if not robot_id or not isinstance(missions, list):
            raise HTTPException(status_code=400, detail="Invalid mission payload")

        missions = convert_floats_to_decimals(missions)

        dynamodb = boto3.resource("dynamodb", region_name="ca-central-1")
        table = dynamodb.Table("UserRobotMissions")

        table.put_item(Item={
            "email": email,
            "robot_id": robot_id,
            "missions": missions
        })

        return {"status": "saved"}

    except Exception as e:
        print("🚨 Error saving missions:", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/get_missions/{robot_id}")
async def get_missions(robot_id: str, request: Request):
    try:
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise ValueError("Missing or invalid Authorization header")
        token = auth_header.split(" ")[1]

        decoded = jwt.decode(token, options={"verify_signature": False})
        email = decoded.get("email")
        if not email:
            raise ValueError("Email not found in token")

        dynamodb = boto3.resource("dynamodb", region_name="ca-central-1")
        table = dynamodb.Table("UserRobotMissions")

        response = table.get_item(Key={"email": email, "robot_id": robot_id})
        item = response.get("Item")

        if item and "missions" in item:
            return {"missions": item["missions"]}
        else:
            return {"missions": []}
    except Exception as e:
        print("🚨 Error fetching missions:", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/")
async def root():
    return {"message": "Robomeans API Server is running 🚀"}
