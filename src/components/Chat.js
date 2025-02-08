import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

  const formatResponse = (text) => {
    try {
      const sections = {
        initialThoughts: [],
        mentalHealthConcerns: [],
        suggestedActivities: [],
        researchBasedSolutions: []
      };
      
      let currentSection = 'initialThoughts';
      
      const lines = text.split('\n');
      lines.forEach(line => {
        if (line.toLowerCase().includes('mental health concern')) {
          currentSection = 'mentalHealthConcerns';
        } else if (line.toLowerCase().includes('suggested activit')) {
          currentSection = 'suggestedActivities';
        } else if (line.toLowerCase().includes('research-based') || line.toLowerCase().includes('evidence-based')) {
          currentSection = 'researchBasedSolutions';
        } else if (line.trim()) {
          sections[currentSection].push(line.trim());
        }
      });

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-blue-600">Initial Assessment:</h3>
            {sections.initialThoughts.map((thought, i) => (
              <p key={i} className="text-gray-700">{thought}</p>
            ))}
          </div>
          
          {sections.mentalHealthConcerns.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-purple-600">Potential Concerns:</h3>
              <ul className="list-disc pl-5">
                {sections.mentalHealthConcerns.map((concern, i) => (
                  <li key={i} className="text-gray-700">{concern}</li>
                ))}
              </ul>
            </div>
          )}
          
          {sections.suggestedActivities.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-green-600">Suggested Activities:</h3>
              <ul className="list-disc pl-5">
                {sections.suggestedActivities.map((activity, i) => (
                  <li key={i} className="text-gray-700">{activity}</li>
                ))}
              </ul>
            </div>
          )}
          
          {sections.researchBasedSolutions.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-indigo-600">Research-Based Solutions:</h3>
              <ul className="list-disc pl-5">
                {sections.researchBasedSolutions.map((solution, i) => (
                  <li key={i} className="text-gray-700">{solution}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error('Error formatting response:', error);
      return <p className="text-gray-700">{text}</p>;
    }
  };

  const analyzeResponse = async (userMessage) => {
    try {
      setIsTyping(true);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `Analyze the following message and provide a structured response with these sections:

1. Initial Thoughts: Brief empathetic assessment of the message
2. Mental Health Concerns: List potential underlying concerns if any
3. Suggested Activities: Practical, actionable steps the person can take
4. Research-Based Solutions: Evidence-based interventions or techniques that could help

Keep each section clear and concise. Format with appropriate section headers.

User's message: "${userMessage}"`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      setMessages(prev => [...prev, {
        type: 'bot',
        content: text,
        formatted: true
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: "I apologize, but I'm having trouble processing your message. Please try again.",
        formatted: false
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    
    setMessages(prev => [...prev, {
      type: 'user',
      content: userMessage,
      formatted: false
    }]);

    await analyzeResponse(userMessage);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`chat-message ${
              message.type === 'user' ? 'user-message' : 'bot-message'
            }`}
          >
            {message.formatted ? formatResponse(message.content) : message.content}
          </div>
        ))}
        {isTyping && (
          <div className="chat-message bot-message">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat; 