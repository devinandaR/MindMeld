import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [specialists, setSpecialists] = useState([]);
  const messagesEndRef = useRef(null);
  const [assessment, setAssessment] = useState({
    conditions: {},
    questionsAsked: [],
    confidenceThreshold: 0.7,
    currentFocus: null
  });
  const [analysisHistory, setAnalysisHistory] = useState([]);

  // Example specialists database - in a real app, this would come from an API
  const specialistsDatabase = {
    'suicide': [
      {
        name: 'Dr. Sarah Johnson',
        specialty: 'Crisis Intervention Specialist',
        experience: '15 years',
        contact: '+1-555-0123',
        availability: '24/7 Emergency',
        location: 'Downtown Medical Center'
      },
      {
        name: 'Dr. Michael Chen',
        specialty: 'Emergency Psychiatrist',
        experience: '12 years',
        contact: '+1-555-0124',
        availability: '24/7 Emergency',
        location: 'Central Hospital'
      }
    ],
    'trauma': [
      {
        name: 'Dr. Emily Rodriguez',
        specialty: 'Trauma Therapist',
        experience: '10 years',
        contact: '+1-555-0125',
        availability: 'Mon-Fri, Emergency Available',
        location: 'Healing Center'
      },
      {
        name: 'Dr. James Wilson',
        specialty: 'PTSD Specialist',
        experience: '18 years',
        contact: '+1-555-0126',
        availability: 'Mon-Sat, Emergency Available',
        location: 'Veterans Support Center'
      }
    ],
    'depression': [
      {
        name: 'Dr. Lisa Thompson',
        specialty: 'Clinical Depression Specialist',
        experience: '14 years',
        contact: '+1-555-0127',
        availability: 'Mon-Fri, Emergency Available',
        location: 'Wellness Center'
      },
      {
        name: 'Dr. David Park',
        specialty: 'Mood Disorders Expert',
        experience: '16 years',
        contact: '+1-555-0128',
        availability: 'Mon-Sat',
        location: 'Mind & Body Clinic'
      }
    ]
  };

  const EmergencyModal = ({ isOpen, onClose, specialists }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-red-600">Emergency Assistance Available</h2>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-red-50 rounded-lg">
              <p className="text-red-700 font-medium">
                Based on your message, we strongly recommend immediate professional help.
                Below are specialists available for immediate consultation:
              </p>
            </div>

            <div className="space-y-4">
              {specialists.map((specialist, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <h3 className="text-xl font-semibold text-gray-800">{specialist.name}</h3>
                  <p className="text-gray-600">{specialist.specialty}</p>
                  <p className="text-gray-600">{specialist.experience} experience</p>
                  <p className="text-gray-600">{specialist.location}</p>
                  <p className="text-gray-600 mb-3">Availability: {specialist.availability}</p>
                  <a
                    href={`tel:${specialist.contact}`}
                    className="inline-block bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Contact Now
                  </a>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-700">
                Remember: If you're experiencing an immediate crisis, also call:
                <br />
                • Emergency Services: 911
                <br />
                • National Suicide Prevention Lifeline: 988
                <br />
                • Crisis Text Line: Text HOME to 741741
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getRelevantSpecialists = (text) => {
    let relevantSpecialists = [];
    
    if (text.toLowerCase().includes('suicid')) {
      relevantSpecialists = [...relevantSpecialists, ...specialistsDatabase.suicide];
    }
    if (text.toLowerCase().includes('trauma') || text.toLowerCase().includes('ptsd')) {
      relevantSpecialists = [...relevantSpecialists, ...specialistsDatabase.trauma];
    }
    if (text.toLowerCase().includes('depress')) {
      relevantSpecialists = [...relevantSpecialists, ...specialistsDatabase.depression];
    }
    
    // Remove duplicates if any
    return Array.from(new Set(relevantSpecialists));
  };

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
        therapeuticResponse: '',
        followUpQuestion: '',
        isEmergency: false
      };
      
      // Check for emergency keywords in the response
      const emergencyKeywords = {
        severe: [
          'suicid', 'kill myself', 'want to die', 'end my life',
          'self-harm', 'cutting myself', 'hurting myself',
          'planning to end', 'no reason to live', 'better off dead',
          'cant take it anymore', 'psychotic episode', 'hearing voices',
          'violent thoughts', 'harming others'
        ],
        moderate: [
          'severe depression', 'acute anxiety', 'trauma',
          'ptsd', 'panic attack', 'crisis'
        ]
      };
      
      // Only trigger emergency for severe keywords or multiple moderate keywords
      const hasSevereKeywords = emergencyKeywords.severe.some(keyword => 
        text.toLowerCase().includes(keyword) || 
        messageContent.toLowerCase().includes(keyword)
      );
      
      const moderateKeywordCount = emergencyKeywords.moderate.filter(keyword => 
        text.toLowerCase().includes(keyword) || 
        messageContent.toLowerCase().includes(keyword)
      ).length;

      sections.isEmergency = hasSevereKeywords || moderateKeywordCount >= 2;

      // If emergency is detected, show modal with relevant specialists
      if (sections.isEmergency) {
        const relevantSpecialists = getRelevantSpecialists(text + ' ' + messageContent);
        setSpecialists(relevantSpecialists);
        setShowEmergencyModal(true);
      }
      
      // Split text into sections
      const sectionRegex = /(Initial Thoughts:|Mental Health Concerns:|Therapeutic Response:|Follow-up Question:)([\s\S]*?)(?=(Initial Thoughts:|Mental Health Concerns:|Therapeutic Response:|Follow-up Question:|$))/g;
      let match;
      
      while ((match = sectionRegex.exec(text)) !== null) {
        const [, header, content] = match;
        const cleanContent = content.trim();
        
        if (header.includes('Initial Thoughts:')) {
          sections.initialThoughts = cleanContent.split('\n').map(line => line.trim()).filter(Boolean);
        } else if (header.includes('Mental Health Concerns:')) {
          sections.mentalHealthConcerns = cleanContent.split('\n').map(line => line.trim()).filter(Boolean);
        } else if (header.includes('Therapeutic Response:')) {
          sections.therapeuticResponse = cleanContent;
        } else if (header.includes('Follow-up Question:')) {
          sections.followUpQuestion = cleanContent;
        }
      }

      return {
        sections,
        jsx: (
          <div className="space-y-4">
            <div className={`text-gray-700 leading-relaxed ${sections.isEmergency ? 'border-l-4 border-red-500 pl-4' : ''}`}>
              {sections.isEmergency && (
                <div className="bg-red-50 p-4 rounded-lg mb-4">
                  <h3 className="text-red-700 font-bold mb-2">Important Notice</h3>
                  <p className="text-red-600">
                    Based on your message, I strongly recommend seeking immediate professional help. 
                    Please don't hesitate to use the emergency resources provided below.
                  </p>
                </div>
              )}
              {sections.therapeuticResponse && (
                <div className={sections.isEmergency ? 'font-medium' : ''}>
                  {sections.therapeuticResponse.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4">{paragraph}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      };
    } catch (error) {
      console.error('Error formatting response:', error);
      return {
        sections: {},
        jsx: (
          <div className="text-gray-700 leading-relaxed">
            If you're experiencing a crisis, please call 988 (US) immediately for support. 
            Otherwise, I'm here to listen and help. What would you like to share?
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

      const prompt = `You are an empathetic therapist having a conversation with a client. Your goal is to understand their situation thoroughly before providing solutions.

Previous conversation:
${conversationContext}

Latest message: "${userMessage}"

CONVERSATION PHASE CHECK:
1. Initial Contact (0-1 messages): Ask 2-3 key questions to understand the situation
2. Understanding Phase (2-3 messages): Clarify and validate understanding
3. Solution Phase (4+ messages): Provide specific solutions and techniques

RESPONSE GUIDELINES:
${messages.length <= 3 ? `
EARLY CONVERSATION PHASE:
- Show empathy and build rapport
- Ask 2-3 specific, open-ended questions about:
  * The main concern/feeling
  * Duration and intensity
  * Impact on daily life
- Do NOT provide solutions yet, focus on understanding` 
:
`SOLUTION PHASE:
- Summarize your understanding
- Provide specific, tailored solutions
- Include practical techniques and exercises
- Structure solutions clearly with steps`}

Format your response EXACTLY as shown below:

Initial Thoughts:
[Brief assessment of the situation]

Mental Health Concerns:
[List identified concerns with severity levels]

Therapeutic Response:
[IF IN EARLY PHASE (0-3 messages):]
I understand [reflect key points they've shared]. To help me better understand your situation:
[Ask 2-3 specific, relevant questions]

[IF IN SOLUTION PHASE (4+ messages):]
Based on our conversation, I understand [summarize understanding]. Here are specific techniques that might help:

1. [First Technique]:
- Steps: [Clear numbered steps]
- Duration: [Specific time]
- Benefits: [Concrete benefits]
- Example: [Specific scenario]

2. [Second Technique]:
- Steps: [Clear numbered steps]
- Duration: [Specific time]
- Benefits: [Concrete benefits]
- Example: [Specific scenario]

3. [Third Technique]:
- Steps: [Clear numbered steps]
- Duration: [Specific time]
- Benefits: [Concrete benefits]
- Example: [Specific scenario]

Follow-up:
[IF IN EARLY PHASE: Include your questions here]
[IF IN SOLUTION PHASE: Skip this section]

Important: For any severe symptoms or crisis situations, ALWAYS emphasize the importance of professional help and provide emergency resources first.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

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
        content: "I hear you, and I understand this might be difficult to discuss. Would you like to tell me more about what you're experiencing?",
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
      <EmergencyModal 
        isOpen={showEmergencyModal} 
        onClose={() => setShowEmergencyModal(false)}
        specialists={specialists}
      />
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