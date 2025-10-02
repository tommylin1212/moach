"use client"

import * as React from "react"
import { Plus, MessageSquare, Trash2, Edit2, Save, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Conversation } from "@/lib/database/schema"

export interface ConversationSidebarProps {
  conversations: Conversation[]
  currentConversationId?: string
  isLoading?: boolean
  isSaving?: boolean
  onNewConversation: () => void
  onLoadConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  onUpdateTitle: (id: string, title: string) => void
  className?: string
}

export const ConversationSidebar = ({
  conversations,
  currentConversationId,
  isLoading = false,
  onNewConversation,
  onLoadConversation,
  onDeleteConversation,
  onUpdateTitle,
  className
}: ConversationSidebarProps) => {
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editTitle, setEditTitle] = React.useState('')


  const handleStartEdit = (conversation: Conversation) => {
    setEditingId(conversation.id)
    setEditTitle(conversation.title)
  }

  const handleSaveEdit = async () => {
    if (editingId && editTitle.trim()) {
      await onUpdateTitle(editingId, editTitle.trim())
      setEditingId(null)
      setEditTitle('')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
  }
  

  return (
    <div className={cn("w-80 border-r bg-background", className)}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Conversations</h2>
          </div>
          
          <Button
            onClick={onNewConversation}
            className="w-full"
            size="sm"
          >
            <Plus className="size-4 mr-2" />
            New Conversation
          </Button>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs">Start chatting to create your first conversation</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group relative rounded-lg border p-3 transition-all hover:shadow-sm cursor-pointer",
                      conversation.id === currentConversationId
                        ? "bg-accent border-accent-foreground/20"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => {
                      if (editingId !== conversation.id) {
                        onLoadConversation(conversation.id)
                      }
                    }}
                  >
                    {editingId === conversation.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Conversation title"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit()
                            } else if (e.key === 'Escape') {
                              handleCancelEdit()
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button
                            onClick={handleSaveEdit}
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-sm line-clamp-2 pr-2">
                            {conversation.title}
                          </h3>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStartEdit(conversation)
                              }}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="size-3" />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteConversation(conversation.id)
                              }}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                        
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

export default ConversationSidebar
