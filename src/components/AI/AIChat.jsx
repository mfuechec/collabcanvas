import { useState, useRef, useEffect } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { executeAICommandWithPlanAndExecute } from '../../services/aiAgent';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, LAYOUT } from '../../utils/designSystem';
import { Send, Sparkles, Minimize2, Maximize2 } from 'lucide-react';
import { clearAllShapes } from '../../utils/clearCanvas';
import { auth } from '../../services/firebase';

const AIChat = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I can help you create and manipulate shapes on the canvas. Try saying:\n\n• "Create a red circle"\n• "Make a 3x3 grid"\n• "Build a login form"\n• "Move the circle to the center"',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  const { shapes, executeSmartOperation } = useCanvas();
  
  // Get current user ID for style learning
  const currentUserId = auth.currentUser?.uid || null;
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Auto-focus input when panel opens
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMinimized]);
  
  // ⚡ SIMPLIFIED ACTION EXECUTOR - Delegates to smart service layer
  const executeActions = async (actions) => {
    console.log(`\n🎬 [AI-CHAT] Starting execution of ${actions.length} action(s)`);
    
    for (let i = 0; i < actions.length; i++) {
      const { action, data } = actions[i];
      const actionStart = performance.now();
      
      console.log(`\n▶️ [AI-CHAT] Action ${i + 1}/${actions.length}: ${action}`);
      console.log(`   Data:`, JSON.stringify(data).substring(0, 200));
      
      try {
        // Special case: clear_canvas uses utility function
        if (action === 'clear_canvas') {
          console.log(`   Route: clearAllShapes()`);
          await clearAllShapes();
        } else {
          // All other actions go through smart service layer
          console.log(`   Route: executeSmartOperation("${action}", data)`);
          await executeSmartOperation(action, data);
        }
        
        const actionTime = performance.now() - actionStart;
        console.log(`✅ [AI-CHAT] Action ${i + 1}/${actions.length} (${action}) completed in ${actionTime.toFixed(0)}ms`);
        
      } catch (error) {
        const actionTime = performance.now() - actionStart;
        console.error(`❌ [AI-CHAT] Action ${i + 1}/${actions.length} (${action}) FAILED after ${actionTime.toFixed(0)}ms:`, error.message);
        throw error;
      }
    }
    
    console.log(`\n🏁 [AI-CHAT] Completed all ${actions.length} action(s)\n`);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    
    // ⏱️ PERFORMANCE: Start timing
    const startTime = performance.now();
    console.log(`\n🚀 [AI-PERF] User submitted: "${userMessage}" at ${new Date().toLocaleTimeString()}`);
    
    try {
      // Build chat history
      const chatHistory = messages.map(m => ({
        role: m.role === 'user' ? 'human' : 'assistant',
        content: m.content,
      }));
      
      // ✅ Call AI Agent - It handles smart context building internally
      const aiStartTime = performance.now();
      const { response, actions } = await executeAICommandWithPlanAndExecute(
        userMessage, 
        chatHistory, 
        shapes,  // Pass full shapes array - aiAgent.js builds smart context internally
        currentUserId  // Pass current user ID for personalized style learning
      );
      const aiEndTime = performance.now();
      
      console.log(`⏱️ [AI-PERF] AI reasoning completed in ${(aiEndTime - aiStartTime).toFixed(0)}ms`);
      console.log(`📦 [AI-PERF] Actions to execute: ${actions?.length || 0}`);
      
      // Execute canvas actions
      if (actions && actions.length > 0) {
        const fbStartTime = performance.now();
        await executeActions(actions);
        const fbEndTime = performance.now();
        
        console.log(`⏱️ [AI-PERF] Firebase operations completed in ${(fbEndTime - fbStartTime).toFixed(0)}ms`);
      }
      
      const totalTime = performance.now() - startTime;
      console.log(`✅ [AI-PERF] Total request completed in ${totalTime.toFixed(0)}ms\n`);
      
      // Add AI response
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      const errorTime = performance.now() - startTime;
      console.error(`❌ [AI-PERF] Request failed after ${errorTime.toFixed(0)}ms:`, error.message);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Sorry, I encountered an error: ${error.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      // Refocus input after command completes (slight delay for state to settle)
      setTimeout(() => {
        if (inputRef.current && !isMinimized) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };
  
  // Styles
  const containerStyle = {
    position: 'fixed',
    bottom: 0,
    right: 0,
    width: LAYOUT.rightSidebar.width,
    height: isMinimized ? 'auto' : '60vh',
    backgroundColor: colors.sidebar,
    borderTop: `1px solid ${colors.border}`,
    borderLeft: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 40,
    transition: 'all 0.3s ease',
    opacity: 1,
  };
  
  const headerStyle = {
    padding: SPACING.md,
    backgroundColor: colors.bgSecondary,
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  };
  
  const titleStyle = {
    fontFamily: TYPOGRAPHY.fontFamily.body,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  };
  
  const messagesContainerStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: SPACING.md,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  };
  
  const messageStyle = (isUser) => ({
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: isUser ? colors.accent : colors.bgSecondary,
    color: isUser ? '#FFFFFF' : colors.textPrimary,
    maxWidth: '85%',
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    fontFamily: TYPOGRAPHY.fontFamily.body,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  });
  
  const inputContainerStyle = {
    padding: SPACING.md,
    borderTop: `1px solid ${colors.border}`,
    display: 'flex',
    gap: SPACING.sm,
  };
  
  const inputStyle = {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: colors.background, // ✅ Use background color (dark: #1E1E1E, light: #FFFFFF)
    border: `1px solid ${colors.border}`,
    borderRadius: BORDER_RADIUS.md,
    color: colors.textPrimary, // ✅ Text color (dark: white, light: black)
    fontFamily: TYPOGRAPHY.fontFamily.body,
    fontSize: TYPOGRAPHY.fontSize.sm,
    outline: 'none',
  };
  
  const buttonStyle = {
    padding: SPACING.sm,
    backgroundColor: colors.accent,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    color: '#FFFFFF',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s',
    opacity: isLoading ? 0.5 : 1,
  };
  
  const iconButtonStyle = {
    padding: SPACING.xs,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    color: colors.textSecondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  };
  
  return (
    <div style={containerStyle}>
      <div style={headerStyle} onClick={() => setIsMinimized(!isMinimized)}>
        <div style={titleStyle}>
          <Sparkles size={20} />
          AI Assistant
        </div>
        <div style={{ display: 'flex', gap: SPACING.xs }}>
          <button
            style={iconButtonStyle}
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = colors.bgHover}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          <div style={messagesContainerStyle}>
            {messages.map((message, index) => (
              <div key={index} style={messageStyle(message.role === 'user')}>
                {message.content}
              </div>
            ))}
            {isLoading && (
              <div style={messageStyle(false)}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>●</span>
                  <span style={{ animation: 'pulse 1.5s ease-in-out 0.2s infinite' }}>●</span>
                  <span style={{ animation: 'pulse 1.5s ease-in-out 0.4s infinite' }}>●</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSubmit} style={inputContainerStyle}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Try: Create a red circle..."
              style={inputStyle}
              disabled={isLoading}
              autoFocus
            />
            <button
              type="submit"
              style={buttonStyle}
              disabled={isLoading || !input.trim()}
              onMouseEnter={(e) => !isLoading && (e.target.style.opacity = 0.9)}
              onMouseLeave={(e) => !isLoading && (e.target.style.opacity = 1)}
            >
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default AIChat;
