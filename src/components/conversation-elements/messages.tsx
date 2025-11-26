import { UIMessage } from "ai";
import { Message, MessageContent } from "../ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "../ai-elements/reasoning";
import { Response } from '@/components/ai-elements/response';
import { Tool } from "../ai-elements/tool";
import logger from '@/lib/logger';
import { useEffect } from 'react';

export default function MessageDisplay({ message }: { message: UIMessage }) {
    useEffect(() => {
        logger.debug(
            { 
                component: 'MessageDisplay',
                messageId: message.id,
                messageRole: message.role,
                partsCount: message.parts?.length || 0
            }, 
            'MessageDisplay rendered'
        );
    }, [message.id, message.role, message.parts?.length]);

    return (
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
                                        isStreaming={part.state === 'streaming'}
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
    )
}