import React, { useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './loginForm';
import Chat from './Chat';
import MessageForm from './MessageForm';
import '../styles/Main.css';

import {
  socket,
  base64ToBuffer,
  decryptMessageWithAES,
  decryptFileWithAES,
} from '../assets/crypto';

function Main() {
  const [rsaKeys, setRsaKeys] = useState(null);
  const [username, setUsername] = useState('');
  const [receiver, setReceiver] = useState('');
  const [messages, setMessages] = useState([]);

  // Cargar clave privada desde localStorage al iniciar sesión
  useEffect(() => {
    const ChargingPK = async () => {
      if (!username) return;

      const storedPrivateKey = localStorage.getItem(`privateKey_${username}`);
      if (storedPrivateKey) {
        try {
          const privateKeyBuffer = base64ToBuffer(storedPrivateKey);
          const privateKey = await crypto.subtle.importKey(
            "pkcs8",
            privateKeyBuffer,
            {
              name: "RSA-OAEP",
              hash: "SHA-256",
            },
            false,
            ["decrypt"]
          );
          setRsaKeys(prev => ({ ...prev, privateKey }));
          console.log("Clave privada cargada automáticamente");
        } catch (error) {
          console.error("Error al importar clave privada:", error);
        }
      }
    };

    ChargingPK();
  }, [username]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!username || !receiver || !rsaKeys?.privateKey) return;
  
      try {
        const res = await fetch(`http://localhost:5000/get_messages/${username}/${receiver}`);
        const data_bd = await res.json();
        const loadedMessages = [];
  
        for (const msg of data_bd) {
          // Seleccionar la clave correcta según si soy emisor o receptor
          const isSender = msg.sender === username;
          const encryptedKey = base64ToBuffer(isSender ? msg.encrypted_key_sender : msg.encrypted_key_receiver);

          try {
            if (msg.is_file) {
              // Desencriptar el archivo
              const decryptedFileBuffer = await decryptFileWithAES(
                base64ToBuffer(msg.ciphertext),
                encryptedKey,
                msg.nonce,
                rsaKeys.privateKey
              );
        
              // Crear un Blob del archivo desencriptado
              const fileBlob = new Blob([decryptedFileBuffer], { type: msg.file_type });
              const fileURL = URL.createObjectURL(fileBlob);
        
              // Añadir el mensaje desencriptado al historial
              loadedMessages.push({
                type: "file",
                fileName: msg.file_name,
                fileType: msg.file_type,
                fileURL,
                from: msg.sender,
                to: msg.receiver,
                time: new Date(msg.timestamp).toLocaleString(),
              });
            } else {
              const nonceBuf = base64ToBuffer(msg.nonce);
              const ciphertextBuf = base64ToBuffer(msg.ciphertext);
  
              const decryptedText = await decryptMessageWithAES(
                ciphertextBuf,
                encryptedKey,
                nonceBuf,
                rsaKeys.privateKey
              );
  
              loadedMessages.push({
                from: msg.sender,
                to: msg.receiver,
                text: decryptedText,
                time: new Date(msg.timestamp).toLocaleString(),
              });

              console.log('ESTO TIENE LOADED MESSAGES', loadedMessages);
              
            }
          } catch (error) {
            console.error("Error al descifrar mensaje:", error);
            loadedMessages.push({
              from: msg.sender,
              to: msg.receiver,
              text: "[No se pudo descifrar el contenido]",
              time: new Date(msg.timestamp).toLocaleString(),
            });
          }
        }
  
        // Ordenar mensajes por timestamp (si no están ya ordenados)
        loadedMessages.sort((a, b) => new Date(a.time) - new Date(b.time));
  
        // setMessages(loadedMessages); 
        setMessages(prev => [...prev, ...loadedMessages]);

      } catch (error) {
        console.error("Error al cargar historial:", error);
      }
    };
  
    loadHistory();
  }, [username, receiver, rsaKeys?.privateKey]);
  
  // Escuchar mensajes y archivos en tiempo real
  useEffect(() => {
    if (!rsaKeys?.privateKey || !username) return;
  
    const ReceiveMessage = async (data) => {
      const { sender, ciphertext, encrypted_key_sender, encrypted_key_receiver, nonce } = data;
      try {
        const isSender = data.sender === username;
        const encrypted_key = base64ToBuffer(isSender ? encrypted_key_sender : encrypted_key_receiver);
        const newText = await decryptMessageWithAES(
          base64ToBuffer(ciphertext),
          base64ToBuffer(encrypted_key),
          base64ToBuffer(nonce),
          rsaKeys.privateKey
        );
  
        console.log("Nuevo mensaje recibido:", newText); // Verifica el contenido del mensaje
        // setMessages(prev => [...prev, { from: sender, text: messageText, time: new Date().toLocaleTimeString() }]);
        setMessages(prev => [...prev, { from: sender === username ? "Tú" : sender, text: newText, time: new Date().toLocaleTimeString()}]);
      } catch (error) {
        console.error("Error al descifrar mensaje recibido:", error);
      }
    };
  
    const ReceiveFile = async (data) => {
      const { fileData, fileType, fileName, encrypted_key_sender, encrypted_key_receiver, nonce } = data;
      try {
        const isSender = data.sender === username;
        const encrypted_key = base64ToBuffer(isSender ? encrypted_key_sender : encrypted_key_receiver);
        const decryptedFileBuffer = await decryptFileWithAES(base64ToBuffer(fileData), encrypted_key, nonce, rsaKeys.privateKey);
        const fileBlob = new Blob([decryptedFileBuffer], { type: fileType });
        const fileURL = URL.createObjectURL(fileBlob);
  
        console.log("Nuevo archivo recibido:", fileURL); // Verificar el archivo recibido
        setMessages(prev => [...prev, { type: "file", fileURL, fileName: fileName, fileType: fileType, from: data.sender === username ? "Tú" : data.sender, time: new Date().toLocaleTimeString() }]);
      } catch (error) {
        console.error("Error al descifrar archivo recibido:", error);
      }
    };
  
    socket.on("receive_message", ReceiveMessage);
    socket.on("receive_file", ReceiveFile);
  
    return () => {
      socket.off("receive_message", ReceiveMessage);
      socket.off("receive_file", ReceiveFile);
    };
  }, [rsaKeys?.privateKey, username]);
  
  return (
    <div className='main'>
      <ToastContainer />
      <div className="input-container">
        <Login
          username={username}
          setUsername={setUsername}
          setRsaKeys={setRsaKeys}
          socket={socket}
          isLogin={!!rsaKeys}
        />
        {rsaKeys && (
          <>
            <label>Para:</label>
            <input
              className='inputDest'
              type="text"
              placeholder="Destinatario"
              value={receiver}
              onChange={e => setReceiver(e.target.value)}
            />
          </>
        )}
      </div>

      {rsaKeys && (
        <div className="chat-wrapper">
          <div className="chat-box">
            <Chat messages={messages} username={username} />
          </div>
          <div className="message-container">
            <MessageForm
              username={username}
              receiver={receiver}
              setMessages={setMessages}
              socket={socket}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Main;