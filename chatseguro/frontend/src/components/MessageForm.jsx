import React, { useState } from 'react';
import Files from './Files';
import '../styles/MessageForm.css';

import { 
  generateAESKey, 
  encryptAESKey, 
  encryptMessageWithAES, 
  encryptFileWithAES, 
  bufferToBase64, 
  base64ToBuffer
} from '../assets/crypto';

const MessageForm = ({ username, receiver, setMessages, socket }) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const sendMessage = async () => {
    if (!receiver) return;

    // const sender = localStorage.getItem('currentUser'); 
    // const publicKeySender = localStorage.getItem(`publicKey_${sender}`);
    // const publicKeyReceiver = localStorage.getItem(`publicKey_${receiver}`);

    const resReceiver = await fetch(`http://localhost:5000/get_public_key/${receiver}`);
    const { public_key: publicKeyReceiver } = await resReceiver.json();

    const resSender = await fetch(`http://localhost:5000/get_public_key/${username}`);
    const { public_key: publicKeySender } = await resSender.json();

    if (message) {
      const aesKey = await generateAESKey();
      const aesRaw = await crypto.subtle.exportKey("raw", aesKey);
      const encryptedKeyReceiver = await encryptAESKey(aesRaw, publicKeyReceiver);
      const encryptedKeySender = await encryptAESKey(aesRaw, publicKeySender);
      const { ciphertext, iv } = await encryptMessageWithAES(aesKey, message);

      socket.emit("send_message", {
        sender: username,
        receiver,
        encrypted_key_receiver: bufferToBase64(encryptedKeyReceiver),
        encrypted_key_sender: bufferToBase64(encryptedKeySender),
        nonce: bufferToBase64(iv),
        ciphertext: bufferToBase64(ciphertext)
      });
      
      setMessages(prev => [...prev, {
        from: "Tú",
        text: message,
        time: new Date().toLocaleTimeString()
      }]);

      setMessage('');
    }

    if (selectedFile) {
      try {
        // Generar una clave AES
        const aesKey = await generateAESKey();
        const aesRaw = await crypto.subtle.exportKey("raw", aesKey);
    
        // Encriptar el archivo con AES
        const encryptedFile = await encryptFileWithAES(aesKey, selectedFile);
    
        // Encriptar la clave AES con las claves públicas del receptor y emisor
        const encryptedKeyReceiver = await encryptAESKey(aesRaw, publicKeyReceiver);
        const encryptedKeySender = await encryptAESKey(aesRaw, publicKeySender);
    
        // Enviar el archivo y las claves encriptadas a través del socket
        socket.emit("send_file", {
          sender: username,
          receiver,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileData: bufferToBase64(encryptedFile.ciphertext),
          encrypted_key_receiver: bufferToBase64(encryptedKeyReceiver),
          encrypted_key_sender: bufferToBase64(encryptedKeySender),
          nonce: bufferToBase64(encryptedFile.iv)
        });
    
        // Actualizar el estado de los mensajes
        setMessages(prev => [...prev,
          {
            from: "Tú",
            type: "file",
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileURL: URL.createObjectURL(selectedFile),
            time: new Date().toLocaleTimeString()
          }
        ]);
    
        setSelectedFile(null);
      } catch (error) {
        console.error("Error al encriptar el archivo:", error);
      }
    }    
  };

  return (
    <div className='message-form-container'>
      <input
        type="text"
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Escribe tu mensaje..."
        className='message-input'
      />

      <div className="file-upload">
        <Files setSelectedFile={setSelectedFile} />
      </div>

      <button className='send-button' onClick={sendMessage} disabled={!message && !selectedFile}>
        <i className="fa fa-paper-plane" style={{ fontSize: '24px', color: '#0f3d11' }}></i>
      </button>
    </div>
  );
};

export default MessageForm;