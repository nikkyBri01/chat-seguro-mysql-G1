from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS
from db.connection import get_db_connection

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Guardamos las claves públicas temporalmente
user_keys = {}

@app.route('/')
def home():
    return "Servidor de chat seguro corriendo correctamente"

# Ruta para obtener la clave pública de otro usuario
@app.route("/get_public_key/<username>")
def get_public_key(username):
    key = user_keys.get(username)
    if key:
        print(f"[INFO] Public key for {username}: {key}")  # Imprime la clave pública del usuario
        return jsonify({"public_key": key})
    else:
        return "Not found", 404

# Evento para registrar clave pública
@socketio.on("register_public_key")
def register(data):
    username = data["username"]
    pubkey = data["public_key"]
    user_keys[username] = pubkey
    print(f"[INFO] Public key registered for {username}: {pubkey}")  # Imprime cuando se registre una clave pública

# Ver todas las claves públicas registradas
print(f"[INFO] All registered public keys: {user_keys}")

# Evento para recibir un mensaje y reenviarlo
@socketio.on("send_message")
def send_message(data):
    receiver = data["receiver"]
    sender = data["sender"]
    ciphertext = data["ciphertext"]
    encrypted_key_receiver = data["encrypted_key_receiver"]
    encrypted_key_sender = data["encrypted_key_sender"]
    nonce = data["nonce"]
    is_file = data.get("is_file", False)
    file_name = data.get("file_name", None)
    file_type = data.get("file_type", None)
    
    if not ciphertext:
        print("Error: Texto cifrado vacío o null.")
        return

    # Guardar el mensaje en la base de datos
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO messages (sender, receiver, ciphertext, encrypted_key_receiver, encrypted_key_sender, nonce, is_file, file_name, file_type)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (sender, receiver, ciphertext, encrypted_key_receiver, encrypted_key_sender, nonce, is_file, file_name, file_type))

    conn.commit()
    cursor.close()
    conn.close()

    # Reenviar el mensaje a través de WebSocket
    emit("receive_message", data, room=receiver)
    print(f"Mensaje enviado de {sender} a {receiver}")

# Evento para enviar archivos
@socketio.on('send_file')
def send_file(data):
    receiver = data.get("receiver")
    sender = data.get("sender")
    file_data = data.get("fileData")
    file_name = data.get("fileName")
    file_type = data.get("fileType")
    encrypted_key_receiver = data.get("encrypted_key_receiver")
    encrypted_key_sender = data.get("encrypted_key_sender")
    nonce = data.get("nonce")

    if not file_data:
        print("Error: fileData está vacío o null.")
        return

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO messages (sender, receiver, ciphertext, encrypted_key_receiver, encrypted_key_sender, nonce, is_file, file_name, file_type)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (sender, receiver, file_data, encrypted_key_receiver, encrypted_key_sender, nonce, True, file_name, file_type))

    conn.commit()
    cursor.close()
    conn.close()

    emit("receive_file", data, room=receiver)
    print(f"Archivo enviado de {sender} a {receiver}")

# Evento para unir al usuario a su sala privada
@socketio.on("join")
def on_join(data):
    username = data["username"]
    join_room(username)
    print(f"[INFO] {username} entró a la conversación")

# Obtener mensajes
@app.route("/get_messages/<user1>/<user2>")
def get_messages(user1, user2):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT sender, receiver, ciphertext, encrypted_key_receiver, encrypted_key_sender, nonce, is_file, file_name, file_type, timestamp
        FROM messages
        WHERE (sender = %s AND receiver = %s) OR (sender = %s AND receiver = %s)
        ORDER BY timestamp
    """, (user1, user2, user2, user1))
    
    rows = cursor.fetchall()

    messages = [{
        "sender": row[0],
        "receiver": row[1],
        "ciphertext": row[2],
        "encrypted_key_receiver": row[3],
        "encrypted_key_sender": row[4],
        "nonce": row[5],
        "is_file": row[6],
        "file_name": row[7],
        "file_type": row[8],
        "timestamp": row[9].isoformat()
    } for row in rows]

    cursor.close()
    conn.close()

    return jsonify(messages)

if __name__ == '__main__':
    socketio.run(app, host="127.0.0.1", port=5000, debug=True)
