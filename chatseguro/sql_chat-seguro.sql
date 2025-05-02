CREATE DATABASE chat_db;

USE chat_db;

DELETE FROM messages;
ALTER TABLE messages MODIFY ciphertext LONGTEXT;

CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender VARCHAR(255) NOT NULL,
    receiver VARCHAR(255) NOT NULL,
    ciphertext LONGTEXT,            
    encrypted_key_receiver TEXT,    
    encrypted_key_sender TEXT,      
    nonce TEXT NOT NULL,            
    is_file BOOLEAN DEFAULT FALSE,  
    file_name VARCHAR(255),         
    file_type VARCHAR(255),         
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

-- CREATE TABLE user_keys (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     username VARCHAR(255) NOT NULL UNIQUE,
--     public_key LONGTEXT NOT NULL,  
--     private_key LONGTEXT NOT NULL,  -- Clave privada encriptada (opcional en producción)
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );


SELECT * FROM messages