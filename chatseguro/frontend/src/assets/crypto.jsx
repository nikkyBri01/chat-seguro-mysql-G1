import { io } from 'socket.io-client';

export const socket = io("http://localhost:5000");

export function bufferToBase64(buf) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(b64) {
  let cleanBase64 = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const padding = cleanBase64.length % 4;
  if (padding !== 0) {
    cleanBase64 += '='.repeat(4 - padding);
  }
  return Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
}

export async function generateRSAKeys() {
  return await crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
}

export async function exportPublicKey(key) {
  const spki = await crypto.subtle.exportKey("spki", key);
  return bufferToBase64(spki);
}

export async function exportPrivateKey(key) {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", key);
  return bufferToBase64(pkcs8);
}

export async function encryptAESKey(aesKeyRaw, receiverPublicKeyB64) {
  const pubBuf = base64ToBuffer(receiverPublicKeyB64);
  const key = await crypto.subtle.importKey("spki", pubBuf, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  return await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, aesKeyRaw);
}

export async function generateAESKey() {
  return await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function encryptMessageWithAES(key, message) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = new TextEncoder().encode(message);
  const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encodedMessage);
  const ciphertext = new Uint8Array(encryptedBuffer);
  return { ciphertext, iv };
}

export async function encryptFileWithAES(key, file) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const fileData = new Uint8Array(await file.arrayBuffer());
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, fileData);
  return { ciphertext: new Uint8Array(cipher), iv };
}

export async function decryptMessageWithAES(ciphertext, encryptedKeyBuf, nonceBuf, privateKey) {
  try {
    console.log("Cargando clave AES cifrada:", encryptedKeyBuf);
    console.log("Cargando nonce (IV):", nonceBuf);
    console.log("Cargando mensaje cifrado:", ciphertext);

    const aesKeyRaw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, encryptedKeyBuf);
    const aesKey = await crypto.subtle.importKey("raw", aesKeyRaw, { name: "AES-GCM" }, false, ["decrypt"]);
    const iv = nonceBuf;
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error("Error al verificar la integridad del mensaje:", err);
    throw new Error("La autenticidad del mensaje no se puede verificar.");
  }
}

export async function decryptFileWithAES(ciphertext, encryptedKey, nonce, privateKey) {
  try {
    // Desencriptar la clave AES usando la clave privada RSA
    const aesKeyRaw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, encryptedKey);

    // Importar la clave AES para descifrado
    const aesKey = await crypto.subtle.importKey("raw", aesKeyRaw, { name: "AES-GCM" }, false, ["decrypt"]);

    // Convertir el nonce de base64 a ArrayBuffer
    const iv = base64ToBuffer(nonce);

    // Desencriptar el archivo con AES-GCM
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);

    return new Blob([new Uint8Array(decrypted)]); // Retorna el archivo desencriptado
  } catch (error) {
    console.error("Error al desencriptar el archivo:", error);
    throw new Error("Desencriptado fallido");
  }
}


