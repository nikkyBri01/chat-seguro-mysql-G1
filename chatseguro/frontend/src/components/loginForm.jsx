// components/Login.jsx
import React, { use } from 'react';
import { toast } from 'react-toastify';
import { generateRSAKeys, exportPublicKey, exportPrivateKey } from '../assets/crypto';

const Login = ({ username, setUsername, setRsaKeys, socket, isLogin}) => {
  
  const handleLogin = async () => {
    const keys = await generateRSAKeys();
    console.log('Esto tiene keys cuando se hace el login: ', keys);
    
    //Almacenar llave publica
    const publicKey = await exportPublicKey(keys.publicKey);
    console.log('Esta es la llave pública: ', publicKey);
    // localStorage.setItem(`publicKey_${username}`, publicKey);
    socket.emit("register_public_key", { username, public_key: publicKey });

    // Almacenar llave privada
    const privKey = await exportPrivateKey(keys.privateKey);
    console.log('Esta es la llave privada: ', privKey);
    localStorage.setItem(`privateKey_${username}`, privKey);

    socket.emit("join", { username });
    setRsaKeys(keys);

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
