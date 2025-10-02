import { useChat, type UIMessage } from '@ai-sdk/react';
import { useState, useCallback, useEffect } from 'react';
import {
    loadConversation,
    getUserConversations,
    deleteConversation,
    updateConversationTitle,
} from '../database/conversations';
import { Conversation } from '../database/schema';
import { generateConversationId } from '../utils';

export interface UseConversationOptions {
    initialConversationId?: string;
}

export interface ConversationState {
    currentConversationId?: string;
    conversations: Conversation[];
    isLoading: boolean;
    error?: string;
}

export function useConversation(options: UseConversationOptions = {}) {
    const { initialConversationId } = options;
    const [conversationState, setConversationState] = useState<ConversationState>({
        currentConversationId: initialConversationId,
        conversations: [],
        isLoading: false,
    });
    useEffect(() => {
        setConversationState(prev => ({ ...prev, currentConversationId: initialConversationId }));
    }, [initialConversationId]);

    // Initialize useChat with initial messages if loading a conversation
    const { messages, sendMessage, status, setMessages } = useChat();




    // Load conversations list
    const loadConversations = useCallback(async () => {
        setConversationState(prev => ({ ...prev, isLoading: true }));

        try {
            const result = await getUserConversations();
            if (result.success) {
                setConversationState(prev => ({
                    ...prev,
                    conversations: result.conversations,
                    isLoading: false,
                    error: undefined,
                }));
            } else {
                setConversationState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: result.error,
                }));
            }
        } catch (error) {
            setConversationState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : String(error),
            }));
        }
    }, []);

    // Load a specific conversation
    const loadConversationById = useCallback(async (conversationId: string) => {
        setConversationState(prev => ({ ...prev, isLoading: true }));
        try {
            const result = await loadConversation(conversationId);
            if (result.success && result.messages) {
                setMessages(result.messages);
                setConversationState(prev => ({
                    ...prev,
                    currentConversationId: conversationId,
                    isLoading: false,
                    error: undefined,
                }));
                //update url with conversationId as query param
                window.history.pushState({}, '', `?conversationId=${conversationId}`);
            } else {
                setConversationState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: result.error,
                }));
            }
        } catch (error) {
            setConversationState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : String(error),
            }));
        }
    }, [setMessages]);

    // Start a new conversation
    const startNewConversation = useCallback(() => {
        setMessages([]);
        const newConversationId = generateConversationId();
        window.history.pushState({}, '', `?conversationId=${newConversationId}`);
        setConversationState(prev => ({
            ...prev,
            currentConversationId: newConversationId,
            error: undefined,
        }));
    }, [setMessages]);

    // Delete a conversation
    const deleteConversationById = useCallback(async (conversationId: string) => {
        try {
            const result = await deleteConversation(conversationId);
            if (result.success) {
                // If we're deleting the current conversation, start a new one
                if (conversationState.currentConversationId === conversationId) {
                    startNewConversation();
                }
                // Refresh conversations list
                await loadConversations();
            }
            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }, [conversationState.currentConversationId, startNewConversation]);

    // Update conversation title
    const updateTitle = useCallback(async (conversationId: string, title: string) => {
        try {
            const result = await updateConversationTitle(conversationId, title);
            if (result.success) {
                // Refresh conversations list
                await loadConversations();
            }
            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }, []);

    // Load initial conversation if provided
    useEffect(() => {
        const loadInitialData = async () => {
            // Load conversations list first
            setConversationState(prev => ({ ...prev, isLoading: true }));

            try {
                const result = await getUserConversations();
                if (result.success) {
                    setConversationState(prev => ({
                        ...prev,
                        conversations: result.conversations,
                        isLoading: false,
                        error: undefined,
                    }));
                } else {
                    setConversationState(prev => ({
                        ...prev,
                        isLoading: false,
                        error: result.error,
                    }));
                }
            } catch (error) {
                setConversationState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            }

            // Load specific conversation if provided
            if (initialConversationId) {
                setConversationState(prev => ({ ...prev, isLoading: true }));
                try {
                    const result = await loadConversation(initialConversationId);
                    if (result.success && result.messages) {
                        setMessages(result.messages);
                        setConversationState(prev => ({
                            ...prev,
                            currentConversationId: initialConversationId,
                            isLoading: false,
                            error: undefined,
                        }));
                    } else {
                        setConversationState(prev => ({
                            ...prev,
                            isLoading: false,
                            error: result.error,
                        }));
                    }
                } catch (error) {
                    setConversationState(prev => ({
                        ...prev,
                        isLoading: false,
                        error: error instanceof Error ? error.message : String(error),
                    }));
                }
            }
        };

        loadInitialData();
    }, [initialConversationId, setMessages]);

    return {
        // Chat functionality
        messages,
        sendMessage,
        status,

        // Conversation management
        ...conversationState,
        loadConversations,
        loadConversationById,
        startNewConversation,
        deleteConversationById,
        updateTitle,
        loadConversation: loadConversationById,
    };
}
