// components/Login.jsx
import React, { use } from 'react';
import { toast } from 'react-toastify';
import { generateRSAKeys, exportPublicKey, bufferToBase64 } from '../assets/crypto';

const Login = ({ username, setUsername, setRsaKeys, socket, isLogin}) => {
  
  const handleLogin = async () => {
    const keys = await generateRSAKeys();
    console.log('Esto tiene keys cuando se hace el login: ', keys);
    
    const pubKey = await exportPublicKey(keys.publicKey);
    console.log('Esta es la llave publica: ', pubKey);
    
    socket.emit("register_public_key", { username, public_key: pubKey });
    socket.emit("join", { username });
    setRsaKeys(keys);

    //Almacenar llave publica
    const publicKey = await crypto.subtle.exportKey("spki", keys.publicKey);
    console.log('Esta es la llave pública: ', publicKey);
    localStorage.setItem(`prublicKey_${username}`, bufferToBase64(publicKey));

    // Almacenar llave privada
    const privKey = await crypto.subtle.exportKey("pkcs8", keys.privateKey);
    console.log('Esta es la llave publica: ', privKey);
    
    localStorage.setItem(`privateKey_${username}`, bufferToBase64(privKey));

    toast.success(`¡Bienvenido, ${username}! Inicio de sesión exitoso.`);
  };

  return (
    <div>
      {isLogin && (<label htmlFor="">De: </label>)}
      <input
        className='inputDest'
        type="text"
        value={username}
        placeholder="Nombre de usuario"
        onChange={e => setUsername(e.target.value)}
      />
      {!isLogin && (<button onClick={handleLogin}>Iniciar sesión</button>)}

    </div>
  );
};

export default Login;
