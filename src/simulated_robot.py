import socketio
import time

# Replace with your EC2 public IP
SOCKET_SERVER_URL = 'http://3.98.138.140:8000'
ROBOT_ID = 'robot001'

sio = socketio.Client()

@sio.event
def connect():
    print("✅ Connected to server")
    sio.emit('register_robot', {'robot_id': ROBOT_ID})

@sio.on('command')
def on_command(data):
    command = data.get('command')
    print(f"📥 Received command: {command}")

    # Simulate command execution
    time.sleep(1)  # simulate processing delay
    if command:
        sio.emit('status_update', {
            'robot_id': ROBOT_ID,
            'status': f"{command} complete"
        })
        print(f"📤 Sent status: {command} complete")

@sio.event
def disconnect():
    print("❌ Disconnected from server")

if __name__ == "__main__":
    try:
        print(f"Connecting to {SOCKET_SERVER_URL}...")
        sio.connect(SOCKET_SERVER_URL)
        sio.wait()
    except Exception as e:
        print(f"❌ Connection error: {e}")
