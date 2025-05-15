import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import PromptCard from './PromptCard';

const ChatArea = ({ toggleWatchlist, watchlistMessage }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const messagesEndRef = useRef(null);

  // ✅ Test Key (temporary, replace with your own later)
  const OPENROUTER_API_KEY = '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';
  const FINNHUB_API_KEY = 'd08gifhr01qh1ecc2v7gd08gifhr01qh1ecc2v80';

  const promptCards = [
    { id: 1, title: 'Top 3 Call option contracts related to EV', subtitle: 'with the highest likelihood of profit', icon: 'ev' },
    { id: 2, title: 'Top 3 Call option contracts', subtitle: 'in the AI hardware sector', icon: 'ai' },
    { id: 3, title: 'Get me the top 3 option contracts for NVDA', subtitle: 'that can yield quick profits today', icon: 'nvda' },
    { id: 4, title: 'Provide shorting entry and exit for QQQ', subtitle: "based on today's technical analysis", icon: 'qqq' },
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (watchlistMessage) {
      handleSendWatchlistMessage(watchlistMessage);
    }
  }, [watchlistMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  const callOpenRouterAPI = async (messageText) => {
    setApiError(null);
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'openai/gpt-3.5-turbo', // ✅ Working public model
          messages: [{ role: 'user', content: messageText }],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'TradeGPT Chat',
          },
        }
      );

      console.log('✅ API Response:', response.data);
      return response.data.choices?.[0]?.message?.content || 'No response.';
    } catch (error) {
      console.error('❌ OpenRouter API Error:', error.response?.data || error.message);
      setApiError('Failed to fetch AI response.');
      return 'Sorry, something went wrong.';
    }
  };

  const callFinhubAndAnalyzeWithOpenRouter = async (messageText) => {
    const match = messageText.toLowerCase().match(/stock for ([A-Z]{1,5})/i);
    const symbol = match?.[1]?.toUpperCase();
    if (!symbol) return 'Invalid stock symbol.';

    try {
      const stockRes = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
      const data = stockRes.data;
      const summary = `${symbol} is trading at $${data.c}, change: ${data.d} (${data.dp}%).`;

      const aiRes = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'openai/gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Stock info for ${symbol}: ${summary}. What does this mean for traders?`,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Stock Analysis Chat',
          },
        }
      );

      return aiRes.data.choices?.[0]?.message?.content || 'AI gave no answer.';
    } catch (error) {
      console.error('❌ Finnhub/OpenRouter Error:', error.response?.data || error.message);
      return `Error retrieving info for ${symbol}.`;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages([...messages, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const isStockQuery = inputMessage.toLowerCase().startsWith('stock for ');
      const aiText = isStockQuery
        ? await callFinhubAndAnalyzeWithOpenRouter(inputMessage)
        : await callOpenRouterAPI(inputMessage);

      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: aiText,
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendWatchlistMessage = async (msg) => {
    const userMsg = {
      id: messages.length + 1,
      text: msg,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const isStockQuery = msg.toLowerCase().startsWith('stock for ');
      const aiText = isStockQuery
        ? await callFinhubAndAnalyzeWithOpenRouter(msg)
        : await callOpenRouterAPI(msg);

      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: aiText,
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptCardClick = async (prompt) => {
    const userMsg = {
      id: messages.length + 1,
      text: prompt,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages([...messages, userMsg]);
    setIsLoading(true);

    try {
      const aiText = await callOpenRouterAPI(prompt);
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: aiText,
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#161921] pt-[0px]">
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-primary-text chat-help">How can I help you today?</h1>
      </div>

      {apiError && (
        <div className="bg-red-500 bg-opacity-20 border border-red-400 text-red-100 px-4 py-2 m-4 rounded">
          <p className="font-bold">API Error:</p>
          <p>{apiError}</p>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
            {promptCards.map((card) => (
              <div key={card.id}>
                <PromptCard
                  title={card.title}
                  subtitle={card.subtitle}
                  icon={card.icon}
                  onClick={() => handlePromptCardClick(card.title)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex ${msg.sender === 'user' ? 'flex-row-reverse' : ''} max-w-3xl`}>
                <div className={`rounded-full w-10 h-10 flex items-center justify-center ${msg.sender === 'user' ? 'bg-hover-bg text-primary-accent ml-3' : 'bg-hover-bg text-blue-400 mr-3'}`}>
                  <i className={`bi ${msg.sender === 'user' ? 'bi-person-circle' : 'bi-robot'} text-xl`}></i>
                </div>
                <div className={`p-4 rounded-lg shadow ${msg.sender === 'user' ? 'bg-primary-accent text-white rounded-tr-none' : msg.isError ? 'bg-red-900 bg-opacity-30 text-primary-text rounded-tl-none border border-red-400' : 'bg-card-bg text-primary-text rounded-tl-none'}`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="p-6 border-t border-gray-700">
        <form onSubmit={handleSendMessage} className="relative">
          <input
            type="text"
            className="w-full bg-input-bg border border-gray-600 rounded-full py-3 px-5 pr-12 text-primary-text placeholder-secondary-text focus:outline-none focus:border-primary-accent focus:ring-1 focus:ring-primary-accent"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="search-icon absolute right-2 top-2 p-2 bg-primary-accent text-white rounded-full hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? <i className="bi bi-hourglass-split animate-spin"></i> : <i className="bi bi-send-fill"></i>}
          </button>
        </form>
        <p className="text-center text-xs text-secondary-text mt-2">TradeGPT is for informational purposes only. Always do your own research.</p>
      </div>
    </div>
  );
};

export default ChatArea;
