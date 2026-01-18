import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Inbox, Search, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ThreadListItem, type CommunicationThread } from './ThreadListItem';
import { CustomerThreadConversation } from './CustomerThreadConversation';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import type { AttachmentFile } from './AttachmentUploader';

interface CustomerInboxLayoutProps {
  threads: CommunicationThread[];
  selectedThread: CommunicationThread | null;
  onSelectThread: (thread: CommunicationThread) => void;
  onReply: (threadId: string, content: string, attachments?: AttachmentFile[]) => Promise<void>;
  onBack?: () => void;
  customerId?: string;
}

export const CustomerInboxLayout: React.FC<CustomerInboxLayoutProps> = ({
  threads,
  selectedThread,
  onSelectThread,
  onReply,
  onBack,
  customerId
}) => {
  const { isMobile } = useMobileDetection();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredThreads = threads.filter(thread => 
    thread.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.latestMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  const handleReply = async (content: string, attachments?: AttachmentFile[]) => {
    if (selectedThread) {
      await onReply(selectedThread.id, content, attachments);
    }
  };

  // Mobile: Show either thread list or conversation
  if (isMobile) {
    return (
      <AnimatePresence mode="wait">
        {selectedThread ? (
          <motion.div
            key="conversation"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="h-[calc(100vh-200px)] min-h-[500px]"
          >
            <Card className="h-full border-2 overflow-hidden">
              <CustomerThreadConversation
                thread={selectedThread}
                onBack={onBack}
                onReply={handleReply}
                isMobile
                customerId={customerId}
              />
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <Card className="border-2 border-indigo-400/30 bg-gradient-to-br from-background via-indigo-50/5 to-background shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-400/10 via-indigo-400/5 to-transparent border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-indigo-400/20 rounded-lg shadow-sm">
                      <Inbox className="h-6 w-6 text-indigo-500" />
                    </div>
                    Inbox
                    {totalUnread > 0 && (
                      <Badge variant="destructive" className="animate-pulse">
                        {totalUnread} new
                      </Badge>
                    )}
                  </CardTitle>
                </div>
                {/* Search */}
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 border-2"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {filteredThreads.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No conversations found' : 'No messages yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredThreads.map(thread => (
                      <ThreadListItem
                        key={thread.id}
                        thread={thread}
                        isSelected={false}
                        onClick={() => onSelectThread(thread)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: Split view
  return (
    <Card className="border-2 border-indigo-400/30 bg-gradient-to-br from-background via-indigo-50/5 to-background shadow-lg overflow-hidden">
      <div className="flex h-[600px]">
        {/* Thread list - 40% */}
        <div className="w-2/5 border-r flex flex-col">
          <div className="p-4 border-b bg-gradient-to-r from-indigo-400/10 via-indigo-400/5 to-transparent">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Inbox className="h-5 w-5 text-indigo-500" />
                Inbox
                {totalUnread > 0 && (
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    {totalUnread}
                  </Badge>
                )}
              </h3>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 border-2 text-sm"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 p-2">
            {filteredThreads.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No results' : 'No messages'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredThreads.map(thread => (
                  <ThreadListItem
                    key={thread.id}
                    thread={thread}
                    isSelected={selectedThread?.id === thread.id}
                    onClick={() => onSelectThread(thread)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Conversation panel - 60% */}
        <div className="w-3/5 flex flex-col">
          <CustomerThreadConversation
            thread={selectedThread}
            onReply={handleReply}
            customerId={customerId}
          />
        </div>
      </div>
    </Card>
  );
};