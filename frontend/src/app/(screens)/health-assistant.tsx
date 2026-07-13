import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Clipboard,
  ActivityIndicator,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getChatHistory,
  sendMessageToAssistant,
  clearChatHistory,
} from '../../api/healthAssistant';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  record_id?: string | null;
  created_at?: string;
}

export default function HealthAssistantScreen() {
  console.log("HealthAssistant mounted");

  const router = useRouter();
  const params = useLocalSearchParams();
  const recordId = params.record_id as string | undefined;

  console.log("useRouter and useLocalSearchParams success");

  const { user } = useAuthStore();
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'there';

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const [normalHeight, setNormalHeight] = useState(windowHeight);

  useEffect(() => {
    if (!isKeyboardVisible) {
      setNormalHeight(windowHeight);
    }
  }, [windowHeight, isKeyboardVisible]);

  useEffect(() => {
    const showEvent = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      const hasResized = windowHeight < normalHeight - 100;
      const measuredHeight = e.endCoordinates.height;
      if (!hasResized) {
        setKeyboardHeight(measuredHeight);
      } else {
        setKeyboardHeight(0);
      }
      console.log(`[Diagnostic] showEvent - windowHeight: ${windowHeight}, normalHeight: ${normalHeight}, measuredHeight: ${measuredHeight}, hasResized: ${hasResized}`);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      console.log(`[Diagnostic] hideEvent - resetting keyboardHeight to 0`);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [windowHeight, normalHeight]);

  // Dynamic Header Title & Subtitle
  const headerTitle = recordId ? '🩺 Report Assistant' : '🤖 JeevanSetu AI';
  const headerSubtitle = recordId 
    ? 'Ask questions about this specific report.' 
    : 'Your Personal Health Companion';

  // Dynamic Suggestion Starter Questions list
  const suggestionList = useMemo(() => {
    return recordId
      ? [
          'Explain this report',
          'Compare with previous report',
          'What does this value mean?',
          'Should I worry?',
        ]
      : [
          'Summarize my health',
          'Compare my reports',
          'Explain my latest report',
          'What should I discuss with my doctor?',
          'Explain cholesterol',
          'Explain diabetes',
          'How healthy am I?',
        ];
  }, [recordId]);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await getChatHistory();
      if (res.success && res.data) {
        // Filter chat history to match current scope:
        // Report Assistant only shows messages matched to that record_id.
        // Global Companion only shows messages without a record_id.
        const filtered = res.data.filter((msg: any) => 
          recordId ? msg.record_id === recordId : !msg.record_id
        );
        setMessages(filtered);
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
  }, [recordId]);

  const handleSend = async (text: string) => {
    if (!text.trim() || sending) return;
    setError(null);
    const userText = text.trim();
    setInputText('');

    // Optimistically append user message
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

    setMessages((prev) => prev.slice(0, actualIdx + 1));
    handleSend(lastUserText);
  };

  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*');
      const isNumbered = /^\d+\.\s/.test(line.trim());

      const cleanLine = isBullet
        ? line.trim().replace(/^[-•*]\s*/, '')
        : isNumbered
        ? line.trim().replace(/^\d+\.\s*/, '')
        : line;

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
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
        {/* 1. DYNAMIC HEADER */}
        <View className="flex-row items-center justify-between border-b border-slate-100 px-6 py-4">
          <View className="flex-row items-center space-x-3">
            <TouchableOpacity onPress={() => router.back()} className="py-2">
              <Text className="text-teal-700 text-base font-extrabold mr-1">⇠</Text>
            </TouchableOpacity>
            <View>
              <Text className="text-lg font-extrabold text-slate-900">{headerTitle}</Text>
              <Text className="text-[10px] text-slate-400 font-medium">
                {headerSubtitle}
              </Text>
            </View>
          </View>
          {messages.length > 0 && (
            <TouchableOpacity onPress={handleClear} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg active:bg-slate-100">
              <Text className="text-slate-500 font-bold text-[10px] uppercase">Clear</Text>
            </TouchableOpacity>
          )}
        </View>

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
            /* 3. WELCOME CARD (GLOBAL ONLY) OR CHAT INTRO */
            !recordId ? (
              <View className="bg-white border border-slate-200 p-6 rounded-2xl my-6">
                <Text className="text-slate-800 font-extrabold text-base mb-2">
                  Hello {firstName} 👋
                </Text>
                <Text className="text-slate-600 text-sm leading-relaxed mb-4">
                  I'm JeevanSetu AI. I've reviewed your available health information and reports.
                </Text>
                <Text className="text-slate-800 font-bold text-xs mb-2">I can help you:</Text>
                <View className="space-y-1.5 mb-4">
                  <Text className="text-slate-600 text-xs pl-2">• Understand medical reports</Text>
                  <Text className="text-slate-600 text-xs pl-2">• Compare complex health trends</Text>
                  <Text className="text-slate-600 text-xs pl-2">• Explain difficult medical terms</Text>
                  <Text className="text-slate-600 text-xs pl-2">• Prepare for doctor visits</Text>
                </View>
                <Text className="text-slate-800 font-extrabold text-xs">
                  What would you like to know today?
                </Text>
              </View>
            ) : (
              <View className="bg-white border border-slate-200 p-6 rounded-2xl items-center my-6">
                <Text className="text-4xl mb-3">💬</Text>
                <Text className="text-slate-800 font-extrabold text-base text-center mb-2">
                  Hello! I'm your Report Assistant.
                </Text>
                <Text className="text-slate-500 text-center text-xs leading-relaxed px-4">
                  Ask me any questions about the parameters, findings, or healthy ranges listed inside this specific medical report.
                </Text>
              </View>
            )
          ) : (
            /* 4. PREMIUM CONVERSATION BUBBLE LAYOUT */
            <View className="space-y-4">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                const showContextHelper = !isUser && index > 0 && messages[index - 1].role === 'user';
                const contextText = recordId ? "Based on your selected report" : "Based on your Health Journey";

                return (
                  <View
                    key={index}
                    className={
                      isUser
                        ? 'flex-row justify-end mb-3'
                        : 'flex-row justify-start mb-3'
                    }
                  >
                    <View className="max-w-[85%]">
                      {showContextHelper && (
                        <Text className="text-[10px] text-slate-400 font-semibold mb-1 pl-1">
                          ✨ {contextText}
                        </Text>
                      )}
                      <TouchableOpacity
                        onLongPress={() => handleCopy(msg.content)}
                        activeOpacity={0.8}
                        className={
                          isUser
                            ? 'p-4 rounded-2xl border bg-teal-50 border-teal-100 rounded-tr-none'
                            : 'p-4 rounded-2xl border bg-white border-slate-200 rounded-tl-none'
                        }
                      >
                        {renderMessageContent(msg.content)}
                        <View className="flex-row justify-end space-x-2.5 mt-2 border-t border-slate-50 pt-1.5">
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

          {/* 5. SUGGESTION STARTERS (disappears after the first message) */}
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
                    className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-full mr-2 mb-2 active:bg-slate-50"
                  >
                    <Text className="text-slate-700 font-bold text-xs">💬 {chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 6. ANIMATED TYPING INDICATOR */}
          {sending && (
            <View className="flex-row justify-start mt-4">
              <View className="bg-slate-100 border border-slate-200 p-3 rounded-2xl rounded-tl-none max-w-[85%]">
                <Text className="text-slate-500 text-xs font-semibold">
                  JeevanSetu AI is thinking...
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

        {/* INPUT BOX */}
        <View className="border-t border-slate-100 bg-white px-6 py-4 flex-row items-center space-x-3">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={recordId ? "Ask about this report..." : "Ask anything about your health journey..."}
            placeholderTextColor="#94a3b8"
            className="flex-1 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-slate-800 text-sm"
          />
          <TouchableOpacity
            onPress={() => handleSend(inputText)}
            disabled={!inputText.trim() || sending}
            className={
              inputText.trim() && !sending
                ? 'px-4 py-3 rounded-xl items-center justify-center bg-teal-700 active:bg-teal-800'
                : 'px-4 py-3 rounded-xl items-center justify-center bg-slate-100'
            }
          >
            <Text className={inputText.trim() && !sending ? 'font-bold text-sm text-white' : 'font-bold text-sm text-slate-400'}>
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
