import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getChatHistory,
  sendMessageToAssistant,
  clearChatHistory,
} from '../../api/healthAssistant';
import { colors } from '../../theme/colors';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  record_id?: string | null;
  created_at?: string;
}

export default function HealthAssistantScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const recordId = params.record_id as string | undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // Suggested questions based on context
  const suggestionList = recordId
    ? [
        'Explain this report',
        'What do these findings mean?',
        'What changed compared to my previous report?',
        'What should I ask my doctor?',
      ]
    : [
        'Explain my latest report',
        'Summarize my health journey',
        'What changed recently?',
        'Explain my blood test',
        'What medicines were mentioned?',
        'Prepare me for my doctor visit',
      ];

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await getChatHistory();
      if (res.success && res.data) {
        setMessages(res.data);
      }
    } catch (err) {
      console.warn('Failed to load chat history:', err);
    } finally {
      setLoadingHistory(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async (text: string) => {
    if (!text.trim() || sending) return;
    setError(null);
    const userText = text.trim();
    setInputText('');

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: userText,
      record_id: recordId || null,
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await sendMessageToAssistant(userText, recordId);
      if (res.success && res.data) {
        // Replace/Append with actual response
        const assistantMsg: Message = {
          id: Math.random().toString(),
          role: 'assistant',
          content: res.data.response,
          record_id: recordId || null,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setError("I couldn't generate a response right now. Please try again.");
      }
    } catch (err) {
      setError("I couldn't generate a response right now. Please try again.");
    } finally {
      setSending(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleClear = async () => {
    try {
      await clearChatHistory();
      setMessages([]);
    } catch (err) {
      console.warn('Failed to clear conversation history:', err);
    }
  };

  const handleCopy = (content: string) => {
    Clipboard.setString(content);
  };

  const handleRegenerate = async () => {
    const lastUserMsgIndex = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserMsgIndex === -1) return;

    const actualIdx = messages.length - 1 - lastUserMsgIndex;
    const lastUserText = messages[actualIdx].content;

    // Remove any assistant responses after this user query
    setMessages((prev) => prev.slice(0, actualIdx + 1));
    handleSend(lastUserText);
  };

  // Helper to parse bold, bullet points, and numbered lists into React Native text structures
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Check for bullet list
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*');
      // Check for numbered list
      const isNumbered = /^\d+\.\s/.test(line.trim());

      const cleanLine = isBullet
        ? line.trim().replace(/^[-•*]\s*/, '')
        : isNumbered
        ? line.trim().replace(/^\d+\.\s*/, '')
        : line;

      // Parse bold tags **text**
      const parts = cleanLine.split('**');
      const textElements = parts.map((part, pIdx) => {
        const isBold = pIdx % 2 === 1;
        return (
          <Text key={pIdx} className={isBold ? 'font-extrabold text-slate-900' : 'text-slate-700'}>
            {part}
          </Text>
        );
      });

      if (isBullet) {
        return (
          <View key={idx} className="flex-row items-start space-x-1.5 py-0.5 pl-2">
            <Text className="text-teal-700 font-extrabold text-sm">•</Text>
            <Text className="text-slate-700 text-sm flex-1 leading-relaxed">{textElements}</Text>
          </View>
        );
      }

      if (isNumbered) {
        const match = line.trim().match(/^(\d+)\.\s*/);
        const num = match ? match[1] : '1';
        return (
          <View key={idx} className="flex-row items-start space-x-1.5 py-0.5 pl-2">
            <Text className="text-teal-700 font-bold text-xs mt-0.5">{num}.</Text>
            <Text className="text-slate-700 text-sm flex-1 leading-relaxed">{textElements}</Text>
          </View>
        );
      }

      return (
        <Text key={idx} className="text-slate-700 text-sm leading-relaxed mb-1">
          {textElements}
        </Text>
      );
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* 1. HEADER */}
      <View className="flex-row items-center justify-between border-b border-slate-100 px-6 py-4">
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity onPress={() => router.back()} className="py-2">
            <Text className="text-teal-700 text-base font-extrabold mr-1">⇠</Text>
          </TouchableOpacity>
          <View>
            <Text className="text-lg font-extrabold text-slate-900">AI Health Assistant</Text>
            <Text className="text-[10px] text-slate-400 font-medium">
              Understand your medical reports in simple language.
            </Text>
          </View>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={handleClear} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg active:bg-slate-100">
            <Text className="text-slate-500 font-bold text-[10px] uppercase">Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* KeyboardAvoidingView for smooth inputs */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
          className="flex-1 bg-slate-50"
        >
          {/* 2. DISCLAIMER */}
          <View className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4">
            <Text className="text-amber-800 font-bold text-xs mb-1">⚠️ Educational Information Only</Text>
            <Text className="text-amber-700 text-[10px] leading-relaxed">
              This AI assistant provides educational information only. It cannot diagnose diseases or replace healthcare professionals.
            </Text>
          </View>

          {loadingHistory ? (
            <View className="py-8 justify-center items-center">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : messages.length === 0 ? (
            /* EMPTY CHAT */
            <View className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm items-center my-6">
              <Text className="text-4xl mb-3">💬</Text>
              <Text className="text-slate-800 font-extrabold text-base text-center mb-2">
                Hello! I'm your AI Health Assistant.
              </Text>
              <Text className="text-slate-500 text-center text-xs leading-relaxed px-4">
                I can help you understand your medical reports, explain health terms, summarize your health journey, and help you prepare for your next doctor visit.
              </Text>
            </View>
          ) : (
            /* CHAT MESSAGE LIST */
            <View className="space-y-4">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                // Context helper header above AI bubble
                const showContextHelper = !isUser && index > 0 && messages[index - 1].role === 'user';
                const contextText = recordId ? "Based on your selected Blood Test" : "Based on your Health Journey";

                return (
                  <View key={index} className={`flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <View className="max-w-[85%]">
                      {showContextHelper && (
                        <Text className="text-[10px] text-slate-400 font-semibold mb-1 pl-1">
                          ✨ {contextText}
                        </Text>
                      )}
                      <TouchableOpacity
                        onLongPress={() => handleCopy(msg.content)}
                        activeOpacity={0.8}
                        className={`p-4 rounded-2xl shadow-sm border ${
                          isUser
                            ? 'bg-teal-50 border-teal-100 rounded-tr-none'
                            : 'bg-white border-slate-200 rounded-tl-none'
                        }`}
                      >
                        {renderMessageContent(msg.content)}
                        <View className="flex-row justify-end space-x-2 mt-1.5 border-t border-slate-50 pt-1.5">
                          <TouchableOpacity onPress={() => handleCopy(msg.content)}>
                            <Text className="text-[10px] font-bold text-slate-400 uppercase">Copy</Text>
                          </TouchableOpacity>
                          {!isUser && index === messages.length - 1 && (
                            <TouchableOpacity onPress={handleRegenerate}>
                              <Text className="text-[10px] font-bold text-slate-400 uppercase">Regenerate</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* 3. CONVERSATION STARTERS (Chips) */}
          {!loadingHistory && messages.length === 0 && (
            <View className="mt-4">
              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2.5">
                Suggested Questions
              </Text>
              <View className="flex-row flex-wrap">
                {suggestionList.map((chip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSend(chip)}
                    className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-full mr-2 mb-2 shadow-sm active:bg-slate-50"
                  >
                    <Text className="text-slate-700 font-bold text-xs">💬 {chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 6. TYPING INDICATOR */}
          {sending && (
            <View className="flex-row justify-start mt-4">
              <View className="bg-slate-50 border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[85%]">
                <Text className="text-slate-400 text-xs font-semibold italic animate-pulse">
                  AI Health Assistant is preparing your response...
                </Text>
              </View>
            </View>
          )}

          {/* ERROR STATE */}
          {error && (
            <View className="bg-red-50 border border-red-200 p-4 rounded-xl mt-4 items-center">
              <Text className="text-red-700 font-bold text-xs mb-2">{error}</Text>
              <TouchableOpacity
                onPress={handleRegenerate}
                className="bg-red-600 px-4 py-2 rounded-lg active:bg-red-700"
              >
                <Text className="text-white font-bold text-[10px] uppercase">Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* INPUT INPUT BOX */}
        <View className="border-t border-slate-100 bg-white px-6 py-4 flex-row items-center space-x-3">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask anything about your health journey..."
            placeholderTextColor="#94a3b8"
            className="flex-1 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-slate-800 text-sm"
          />
          <TouchableOpacity
            onPress={() => handleSend(inputText)}
            disabled={!inputText.trim() || sending}
            className={`px-4 py-3 rounded-xl items-center justify-center ${
              inputText.trim() && !sending ? 'bg-teal-700 active:bg-teal-800' : 'bg-slate-100'
            }`}
          >
            <Text className={`font-bold text-sm ${inputText.trim() && !sending ? 'text-white' : 'text-slate-400'}`}>
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
