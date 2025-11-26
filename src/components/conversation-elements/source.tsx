import { Source, Sources, SourcesContent, SourcesTrigger } from "../ai-elements/source";
import { UIMessage } from "ai";
import logger from '@/lib/logger';
import { useEffect } from 'react';

export default function SourceDisplay({ message }: { message: UIMessage }) {
    if (message.role !== 'assistant') return null;

    const sourceUrls = message.parts.filter(part => part.type === 'source-url');
    const uniqueSourceUrls = sourceUrls.filter((part, index, self) =>
      index === self.findIndex(p => p.url === part.url)
    );
    
    useEffect(() => {
        if (uniqueSourceUrls.length > 0) {
            logger.debug(
                { 
                    component: 'SourceDisplay',
                    messageId: message.id,
                    sourceCount: uniqueSourceUrls.length,
                    urls: uniqueSourceUrls.map(s => s.url)
                }, 
                `SourceDisplay rendered with ${uniqueSourceUrls.length} sources`
            );
        }
    }, [uniqueSourceUrls.length, message.id]);

    if (uniqueSourceUrls.length === 0) return null;

    return (
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
    )    
}