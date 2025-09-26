'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { Response } from '@/components/ai-elements/response';
import { BrainIcon, GlobeIcon } from 'lucide-react';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/source';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Loader } from '@/components/ai-elements/loader';
import { MemoryDisplay, type MemoryItem } from '@/components/ai-elements/memory';

const models = [
  {
    name: 'OPENAI',
    value: 'openai',
  },
  {
    name: 'MEM0',
    value: 'mem0',
  },
];

const ChatBotDemo = () => {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const [memory, setMemory] = useState(true);
  const { messages, sendMessage, status } = useChat();

  // Helper function to extract memory operations from message parts
  const extractMemoryFromMessage = (message: any): MemoryItem[] => {
    if (!message.parts) return [];
    
    const memoryItems: MemoryItem[] = [];
    
    message.parts.forEach((part: any) => {
      // Check for memory tool calls
      if (part.type?.startsWith('tool-memory_')) {
        const toolName = part.type.replace('tool-', '');
        const operation = toolName.replace('memory_', '').replace('_semantic', '').replace('_by_tags', '').replace('_by_key', '');
        
        // Extract input and output data
        if (part.state === 'output-available' && part.input && part.output) {
          try {
            if (operation === 'store' || operation === 'store_multiple') {
              // Handle store operations
              if (part.input.memoryList) {
                // Multiple store operation
                part.input.memoryList.forEach((item: any) => {
                  memoryItems.push({
                    key: item.key,
                    value: item.value,
                    tags: item.tags || [],
                    operation: 'store'
                  });
                });
              } else if (part.input.key && part.input.value) {
                // Single store operation
                memoryItems.push({
                  key: part.input.key,
                  value: part.input.value,
                  tags: part.input.tags || [],
                  operation: 'store'
                });
              }
            } else if (operation === 'retrieve' || operation === 'search') {
              // Handle retrieve/search operations
              const results = part.output?.results || part.output;
              if (Array.isArray(results)) {
                results.forEach((result: any) => {
                  memoryItems.push({
                    id: result.id,
                    key: result.key,
                    value: result.value,
                    tags: typeof result.tags === 'string' ? JSON.parse(result.tags) : result.tags || [],
                    created_at: result.created_at,
                    similarity: result.similarity,
                    operation: 'retrieve'
                  });
                });
              }
            } else if (operation === 'update') {
              // Handle update operations
              memoryItems.push({
                key: part.input.key,
                value: part.input.value,
                tags: part.input.tags || [],
                operation: 'update'
              });
            }
          } catch (error) {
            console.error('Error parsing memory data:', error);
          }
        }
      }
    });
    
    return memoryItems;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(
        { text: input },
        {
          body: {
            model: model,
            webSearch: webSearch,
            memory: memory,
          },
        },
      );
      setInput('');
    }
  };
  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-screen">
      <div className="flex flex-col h-full">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message) => {
              const memoryItems = extractMemoryFromMessage(message);
              
              return (
                <div key={message.id}>
                  {message.role === 'assistant' && (() => {
                    const sourceUrls = message.parts.filter(part => part.type === 'source-url');
                    const uniqueSourceUrls = sourceUrls.filter((part, index, self) => 
                      index === self.findIndex(p => p.url === part.url)
                    );
                    return uniqueSourceUrls.length > 0 ? (
                      <Sources>
                        <SourcesTrigger count={uniqueSourceUrls.length} />
                        <SourcesContent>
                          {uniqueSourceUrls.map((part, i) => (
                            <Source
                              key={`${message.id}-${i}`}
                              href={part.url}
                              title={part.url}
                            />
                          ))}
                        </SourcesContent>
                      </Sources>
                    ) : null;
                  })()}
                  
                  {/* Memory Display - Show before the message for assistant messages with memory operations */}
                  {memoryItems.length > 0 && (
                    <div className="mb-3 p-2 rounded-lg bg-gradient-to-r from-purple-50/50 via-transparent to-blue-50/50 dark:from-purple-950/20 dark:via-transparent dark:to-blue-950/20 border border-purple-100/50 dark:border-purple-900/30">
                      <MemoryDisplay memories={memoryItems} />
                    </div>
                  )}
                  
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case 'text':
                            return (
                              <Response key={`${message.id}-${i}`}>
                                {part.text}
                              </Response>
                            );
                          case 'reasoning':
                            return (
                              <Reasoning
                                key={`${message.id}-${i}`}
                                className="w-full"
                                isStreaming={status === 'streaming'}
                              >
                                <ReasoningTrigger />
                                <ReasoningContent>{part.text}</ReasoningContent>
                              </Reasoning>
                            );
                          default:
                            return null;
                        }
                      })}
                    </MessageContent>
                  </Message>
                </div>
              );
            })}
            {status === 'submitted' && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-4">
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
          />
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputButton
                variant={webSearch ? 'default' : 'ghost'}
                onClick={() => setWebSearch(!webSearch)}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
              <PromptInputButton
                variant={memory ? 'default' : 'ghost'}
                onClick={() => setMemory(!memory)}
              >
                <BrainIcon size={16} />
                <span>Enable Memory</span>
              </PromptInputButton>
              <PromptInputModelSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
              >
                <PromptInputModelSelectTrigger>
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {models.map((model) => (
                    <PromptInputModelSelectItem key={model.value} value={model.value}>
                      {model.name}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input} status={status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

export default ChatBotDemo;