import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [assessment, setAssessment] = useState({
    conditions: {},
    questionsAsked: [],
    confidenceThreshold: 0.7,
    currentFocus: null
  });
  const [analysisHistory, setAnalysisHistory] = useState([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    
    // Title
    doc.setFontSize(20);
    doc.text('Mental Health Assessment Analysis', 20, 20);
    
    // Timestamp
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
    
    let yPos = 40;
    
    // Add each analysis entry
    analysisHistory.forEach((entry, index) => {
      // Timestamp for this entry
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Entry ${index + 1} - ${new Date(entry.timestamp).toLocaleString()}`, 20, yPos);
      yPos += 10;

      // User message
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`User: ${entry.userMessage}`, 20, yPos);
      yPos += 10;

      // Initial Assessment
      if (entry.analysis.initialThoughts.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 255);
        doc.text('Initial Assessment:', 20, yPos);
        yPos += 10;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        entry.analysis.initialThoughts.forEach(thought => {
          const lines = doc.splitTextToSize(thought, 170);
          lines.forEach(line => {
            doc.text(line, 25, yPos);
            yPos += 6;
          });
        });
      }

      // Potential Concerns
      if (entry.analysis.mentalHealthConcerns.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(128, 0, 128);
        doc.text('Potential Concerns:', 20, yPos);
        yPos += 10;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        entry.analysis.mentalHealthConcerns.forEach(concern => {
          const lines = doc.splitTextToSize(`• ${concern}`, 170);
          lines.forEach(line => {
            doc.text(line, 25, yPos);
            yPos += 6;
          });
        });
      }

      // Suggested Activities
      if (entry.analysis.suggestedActivities.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0, 128, 0);
        doc.text('Suggested Activities:', 20, yPos);
        yPos += 10;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        entry.analysis.suggestedActivities.forEach(activity => {
          const lines = doc.splitTextToSize(`• ${activity}`, 170);
          lines.forEach(line => {
            doc.text(line, 25, yPos);
            yPos += 6;
          });
        });
      }

      // Add page if needed
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      // Separator
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, 190, yPos);
      yPos += 15;
    });

    // Save the PDF
    doc.save('mental-health-analysis.pdf');
  };

  const formatResponse = (text, messageContent) => {
    try {
      const sections = {
        initialThoughts: [],
        mentalHealthConcerns: [],
        suggestedActivities: [],
        researchBasedSolutions: [],
        followUpQuestion: ''
      };
      
      // Split text into sections
      const sectionRegex = /(Initial Thoughts:|Mental Health Concerns:|Follow-up Question:)([\s\S]*?)(?=(Initial Thoughts:|Mental Health Concerns:|Follow-up Question:|$))/g;
      let match;
      
      while ((match = sectionRegex.exec(text)) !== null) {
        const [, header, content] = match;
        const cleanContent = content.trim();
        
        if (header.includes('Initial Thoughts:')) {
          sections.initialThoughts = cleanContent.split('\n').map(line => line.trim()).filter(Boolean);
        } else if (header.includes('Mental Health Concerns:')) {
          sections.mentalHealthConcerns = cleanContent.split('\n').map(line => line.trim()).filter(Boolean);
        } else if (header.includes('Follow-up Question:')) {
          sections.followUpQuestion = cleanContent;
        }
      }

      // For debugging
      console.log('Parsed sections:', sections);
      console.log('Original text:', text);

      return {
        sections,
        jsx: (
          <div className="space-y-4">
            {sections.followUpQuestion ? (
              <div className="text-gray-700 leading-relaxed">
                {sections.followUpQuestion}
              </div>
            ) : (
              <div className="text-gray-700 leading-relaxed">
                I'm here to listen and understand. Could you tell me more about what's on your mind?
              </div>
            )}
          </div>
        )
      };
    } catch (error) {
      console.error('Error formatting response:', error);
      return {
        sections: {},
        jsx: (
          <div className="text-gray-700 leading-relaxed">
            I'm here to listen. What would you like to share with me?
          </div>
        )
      };
    }
  };

  const analyzeResponse = async (userMessage) => {
    try {
      setIsTyping(true);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const conversationContext = messages.map(m => 
        `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n');

      const prompt = `You are an experienced mental health professional conducting an assessment. Your goal is to understand the person's situation through careful, empathetic questioning.

Previous conversation:
${conversationContext}

Latest message: "${userMessage}"

Current assessment state:
${JSON.stringify(assessment.conditions, null, 2)}

Instructions:
1. Analyze the message and previous context carefully.
2. Consider:
   - Core emotions or concerns expressed
   - Unclear aspects needing exploration
   - Critical information gaps
   - Most insightful area to explore next

3. Formulate ONE thoughtful follow-up question that:
   - Is specific yet open-ended
   - Shows empathy and understanding
   - Feels natural in conversation
   - Helps understand the root cause

Format your response EXACTLY as shown below, including the exact headers:

Initial Thoughts:
[Write your internal assessment here]

Mental Health Concerns:
[List concerns with confidence levels]

Follow-up Question:
[Write your single question here, making it conversational and empathetic]

Important: Make sure to include all three headers exactly as shown above.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // For debugging
      console.log('AI Response:', text);

      // Format the response and get sections
      const { sections, jsx } = formatResponse(text, userMessage);

      // Update analysis history
      setAnalysisHistory(prev => [...prev, {
        timestamp: new Date().toISOString(),
        userMessage: userMessage,
        analysis: sections
      }]);

      // Extract and update assessment data
      try {
        const conditions = text.match(/(?:anxiety|depression|stress|trauma|ptsd)(?:\s+\(?confidence:?\s*\d+%\)?)/gi) || [];
        
        conditions.forEach(condition => {
          const [name, confidence] = condition.split(/\s+(?=confidence)/i);
          const confidenceValue = parseInt(confidence.match(/\d+/)[0]) / 100;
          
          setAssessment(prev => ({
            ...prev,
            conditions: {
              ...prev.conditions,
              [name.toLowerCase()]: {
                confidence: confidenceValue,
                lastUpdated: new Date().toISOString()
              }
            }
          }));
        });
      } catch (error) {
        console.error('Error updating assessment:', error);
      }

      setMessages(prev => [...prev, {
        type: 'bot',
        content: text,
        formatted: true,
        jsx: jsx
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: "I'm here to listen and help. Could you tell me more about what's on your mind?",
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
      <div className="bg-white border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">MindMeld Chat</h1>
        <button
          onClick={generatePDF}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586L7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
          </svg>
          Download Analysis
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`chat-message ${
              message.type === 'user' ? 'user-message' : 'bot-message'
            }`}
          >
            {message.formatted ? message.jsx : message.content}
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