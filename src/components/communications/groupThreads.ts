interface Communication {
  id: string;
  communication_type: string;
  subject: string;
  content: string;
  communication_date: string;
  direction: string;
  thread_id?: string;
  thread_position?: number;
  parent_communication_id?: string;
  contact_person?: string;
  created_by?: string;
  created_at: string;
  customers?: {
    id: string;
    company_name: string;
    contact_name?: string;
  };
  leads?: {
    id: string;
    title: string;
  };
}

interface CommunicationThread {
  id: string;
  subject: string;
  messageCount: number;
  messages: Communication[];
  latestMessage: Communication;
  customer?: {
    company_name: string;
    contact_name?: string;
  };
  hasUnread: boolean;
}

export const groupCommunicationsIntoThreads = (
  communications: Communication[]
): CommunicationThread[] => {
  const threads = new Map<string, Communication[]>();
  
  // Group communications by thread_id
  communications.forEach(comm => {
    const threadId = comm.thread_id || comm.id;
    if (!threads.has(threadId)) {
      threads.set(threadId, []);
    }
    threads.get(threadId)!.push(comm);
  });
  
  // Sort each thread by position and convert to thread objects
  const threadArray: CommunicationThread[] = Array.from(threads.values())
    .map(messages => {
      // Sort messages by thread position (or date if no position)
      const sortedMessages = messages.sort((a, b) => {
        if (a.thread_position !== undefined && b.thread_position !== undefined) {
          return a.thread_position - b.thread_position;
        }
        return new Date(a.communication_date).getTime() - new Date(b.communication_date).getTime();
      });

      const latestMessage = sortedMessages[sortedMessages.length - 1];
      const firstMessage = sortedMessages[0];

      return {
        id: firstMessage.thread_id || firstMessage.id,
        subject: firstMessage.subject,
        messageCount: sortedMessages.length,
        messages: sortedMessages,
        latestMessage,
        customer: firstMessage.customers,
        hasUnread: false // Can be enhanced with read tracking later
      };
    })
    .sort((a, b) => 
      new Date(b.latestMessage.communication_date).getTime() - 
      new Date(a.latestMessage.communication_date).getTime()
    );

  return threadArray;
};
