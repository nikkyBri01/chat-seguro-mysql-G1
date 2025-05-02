// components/Chat.jsx
import React from 'react';
import '../styles/chat.css';

const Chat = ({ messages, username }) => {
  return (
    <div className="chat-container">
      <div className="chat-messages">
        {/* Ordena los mensajes por timestamp antes de mostrarlos */}
        {[...messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map((msg, index) => {
          const isMe = msg.from === 'Tú' || msg.from === username;
          const messageClass = isMe ? 'message-sent' : 'message-received';

          return msg.type === 'file' ? (
            <div key={index} className={`message ${messageClass}`}>
              <div className="message-bubble">
                <strong>{msg.from || 'Tú'}:</strong><br />
                <a href={msg.fileURL} download={msg.fileName}>{msg.fileName}</a>
                <span className="message-meta">{msg.time}</span>
              </div>
            </div>
          ) : (
            <div key={index} className={`message ${messageClass}`}>
              <div className="message-bubble">
                <strong>{msg.from}:</strong> {msg.text} 
                <span className="message-meta">{msg.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Chat;