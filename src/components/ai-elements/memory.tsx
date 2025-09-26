"use client"

import * as React from "react"
import { Brain, Plus, Search, Tag, Clock, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

export interface MemoryItem {
  id?: string | number
  key: string
  value: string
  tags: string[]
  created_at?: string
  similarity?: number
  operation?: 'store' | 'retrieve' | 'update' | 'search'
}

export interface MemoryDisplayProps {
  memories: MemoryItem[]
  className?: string
}

export const MemoryDisplay = ({ memories, className }: MemoryDisplayProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  if (!memories || memories.length === 0) return null

  const groupedMemories = memories.reduce((acc, memory) => {
    const operation = memory.operation || 'retrieve'
    if (!acc[operation]) acc[operation] = []
    acc[operation].push(memory)
    return acc
  }, {} as Record<string, MemoryItem[]>)

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'store':
        return <Plus className="size-3" />
      case 'retrieve':
      case 'search':
        return <Search className="size-3" />
      case 'update':
        return <ArrowUpRight className="size-3" />
      default:
        return <Brain className="size-3" />
    }
  }

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'store':
        return 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800'
      case 'retrieve':
      case 'search':
        return 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800'
      case 'update':
        return 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800'
      default:
        return 'bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-400 dark:border-purple-800'
    }
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return null
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={cn("w-full", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between h-auto p-3 hover:bg-accent/50 transition-all duration-200 group border border-transparent hover:border-border/50 rounded-lg"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="relative">
                <Brain className={cn(
                  "size-4 text-purple-500 transition-all duration-200",
                  isOpen && "animate-pulse"
                )} />
                <div className="absolute -top-0.5 -right-0.5 size-2 bg-purple-500 rounded-full animate-ping opacity-75" />
              </div>
              <span className="font-medium group-hover:text-foreground transition-colors">
                {memories.length} memor{memories.length === 1 ? 'y' : 'ies'}
              </span>
              <div className="flex gap-1">
                {Object.keys(groupedMemories).map(operation => (
                  <Badge
                    key={operation}
                    variant="outline"
                    className={cn(
                      "text-xs px-1.5 py-0.5 capitalize transition-all duration-200 hover:scale-105",
                      getOperationColor(operation)
                    )}
                  >
                    {getOperationIcon(operation)}
                    {groupedMemories[operation].length}
                  </Badge>
                ))}
              </div>
            </div>
            <div className={cn(
              "transition-all duration-300 group-hover:scale-110",
              isOpen && "rotate-180"
            )}>
              <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1">
          <div className="space-y-3 p-3 pt-0">
            {Object.entries(groupedMemories).map(([operation, operationMemories], operationIndex) => (
              <div 
                key={operation} 
                className="space-y-2"
                style={{
                  animationDelay: `${operationIndex * 50}ms`
                }}
              >
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {getOperationIcon(operation)}
                  <span className="capitalize">{operation}</span>
                  <div className="h-px bg-gradient-to-r from-border to-transparent flex-1" />
                </div>
                
                <div className="space-y-2">
                  {operationMemories.map((memory, index) => (
                    <HoverCard key={`${operation}-${index}`}>
                      <HoverCardTrigger asChild>
                        <div 
                          className={cn(
                            "group/memory p-3 rounded-lg border bg-card/50 hover:bg-card transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-border",
                            getOperationColor(operation).replace(/text-\w+-\d+/, '').replace(/border-\w+-\d+/, '')
                          )}
                          style={{
                            animationDelay: `${(operationIndex * operationMemories.length + index) * 25}ms`
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-foreground truncate group-hover/memory:text-foreground transition-colors">
                                  {memory.key}
                                </span>
                                {memory.similarity && (
                                  <Badge variant="outline" className="text-xs animate-in fade-in-0 slide-in-from-right-1">
                                    {Math.round((1 - memory.similarity) * 100)}% match
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 group-hover/memory:text-muted-foreground/80 transition-colors">
                                {memory.value}
                              </p>
                            </div>
                            
                            {memory.created_at && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 opacity-70 group-hover/memory:opacity-100 transition-opacity">
                                <Clock className="size-3" />
                                {formatTimestamp(memory.created_at)}
                              </div>
                            )}
                          </div>
                          
                          {memory.tags && memory.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              <Tag className="size-3 text-muted-foreground opacity-70 group-hover/memory:opacity-100 transition-opacity" />
                              {memory.tags.slice(0, 3).map((tag, tagIndex) => (
                                <Badge
                                  key={tagIndex}
                                  variant="secondary"
                                  className="text-xs px-1.5 py-0.5 hover:bg-secondary/80 transition-colors"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {memory.tags.length > 3 && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs px-1.5 py-0.5 hover:bg-secondary/80 transition-colors"
                                >
                                  +{memory.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </HoverCardTrigger>
                      
                      <HoverCardContent side="left" className="w-80 bg-gradient-to-br from-card via-card to-card/80 shadow-xl border-2">
                        <div className="space-y-3">
                          <div className="border-b border-border/30 pb-2">
                            <h4 className="font-semibold text-sm mb-1 text-foreground">{memory.key}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {memory.value}
                            </p>
                          </div>
                          
                          {memory.tags && memory.tags.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1 mb-2">
                                <Tag className="size-3 text-purple-500" />
                                <p className="text-xs font-medium text-muted-foreground">Tags</p>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {memory.tags.map((tag, tagIndex) => (
                                  <Badge
                                    key={tagIndex}
                                    variant="secondary"
                                    className="text-xs hover:bg-secondary/80 transition-colors"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
                            <div className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-md",
                              getOperationColor(operation)
                            )}>
                              {getOperationIcon(operation)}
                              <span className="capitalize font-medium">{operation}</span>
                            </div>
                            {memory.created_at && (
                              <div className="flex items-center gap-1 text-muted-foreground/70">
                                <Clock className="size-3" />
                                {formatTimestamp(memory.created_at)}
                              </div>
                            )}
                          </div>
                          
                          {memory.similarity && (
                            <div className="bg-accent/30 p-2 rounded-md border border-border/20">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Similarity Score</span>
                                <span className="font-medium text-foreground">
                                  {Math.round((1 - memory.similarity) * 100)}%
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.round((1 - memory.similarity) * 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export default MemoryDisplay
