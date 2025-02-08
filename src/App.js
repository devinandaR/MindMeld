import React from 'react';
import Chat from './components/Chat';

function App() {
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-2xl font-bold">MindMeld - Mental Health Assistant</h1>
        <p className="text-sm opacity-90">A safe space to discuss your mental health concerns</p>
      </header>
      
      <main className="flex-1">
        <Chat />
      </main>
    </div>
  );
}

export default App;
