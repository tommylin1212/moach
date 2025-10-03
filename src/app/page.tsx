'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
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
import { useEffect, useState } from 'react';
import { useConversation } from '@/lib/hooks/useConversation';
import { BrainIcon, GlobeIcon } from 'lucide-react';
import { Loader } from '@/components/ai-elements/loader';
import { MemoryDisplay } from '@/components/conversation-elements/memory';
import SourceDisplay from '@/components/conversation-elements/source';
import { generateConversationId } from '@/lib/utils';
import ConversationSidebar from '@/components/conversation-elements/conversation-sidebar';
import MessageDisplay from '@/components/conversation-elements/messages';

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

export default function Page() {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const [memory, setMemory] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  /*
  Check query params for conversationId
  if conversationId is provided, load the conversation
  if conversationId is not provided, gen new conversation id and change url to include conversationId
  */
  

  const {
    messages,
    sendMessage,
    status,
    currentConversationId,
    conversations,
    isLoading,
    startNewConversation,
    loadConversationById,
    deleteConversationById,
    updateTitle
  } = useConversation({ initialConversationId: conversationId || undefined });
  
  useEffect(() => {
    const urlConversationId = new URLSearchParams(window.location.search).get('conversationId');
    if (urlConversationId && urlConversationId !== null) {
      setConversationId(urlConversationId);
      loadConversationById(urlConversationId);
    } else {
      const newConversationId = generateConversationId();
      setConversationId(newConversationId);
      window.history.pushState({}, '', `?conversationId=${newConversationId}`);
    }
  },[loadConversationById]);
  
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
            conversationId: currentConversationId,
          },
        },
      );
      setInput('');
    }
  };
  return (
    <div className="flex h-screen">
      {/* Conversation Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        isLoading={isLoading}
        onNewConversation={startNewConversation}
        onLoadConversation={loadConversationById}
        onDeleteConversation={deleteConversationById}
        onUpdateTitle={updateTitle}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto p-6 relative">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message) => {

              return (
                <div key={message.id}>
                  <SourceDisplay message={message} />

                  <MemoryDisplay message={message} />


                  <MessageDisplay message={message} />
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