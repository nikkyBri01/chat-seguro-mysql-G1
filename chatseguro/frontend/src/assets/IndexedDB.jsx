import React from 'react'

export const IndexedDB = () => {
    async function saveWrappedPrivateKey(privateKey, password) {
        const salt = crypto.getRandomValues(new Uint8Array(16)); // guardar también
        const iv = crypto.getRandomValues(new Uint8Array(12));   // guardar también
      
        const wrappingKey = await deriveKeyFromPassword(password, salt);
      
        const wrappedKey = await crypto.subtle.wrapKey(
          "pkcs8", privateKey, wrappingKey, { name: "AES-GCM", iv }
        );
      
        // Guardar todo en IndexedDB
        const db = await openDB();
        await db.put('keys', { wrappedKey, salt, iv }, 'privateKey');
        console.log("Clave privada guardada cifrada.");
      }
      
    
      async function loadUnwrappedPrivateKey(password) {
        const db = await openDB();
        const record = await db.get('keys', 'privateKey');
        if (!record) return null;
      
        const { wrappedKey, salt, iv } = record;
        const wrappingKey = await deriveKeyFromPassword(password, salt);
      
        const privateKey = await crypto.subtle.unwrapKey(
          "pkcs8",
          wrappedKey,
          wrappingKey,
          { name: "AES-GCM", iv },
          { name: "RSA-OAEP", hash: "SHA-256" },
          true,
          ["decrypt"]
        );
      
        return privateKey;
      }
      
  return (
    <div>indexedDB</div>
  )
}
