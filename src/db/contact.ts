
interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

// This is a mock database for demonstration
// In a real app, this would connect to a real database via Supabase or another backend
class ContactDatabase {
  private messages: ContactMessage[] = [];
  
  // Save a new contact message
  async saveMessage(data: Omit<ContactMessage, 'id' | 'createdAt' | 'read'>): Promise<ContactMessage> {
    const newMessage: ContactMessage = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
      read: false
    };
    
    this.messages.push(newMessage);
    return newMessage;
  }
  
  // Get all messages (admin functionality)
  async getAllMessages(): Promise<ContactMessage[]> {
    // In a real app, this would have pagination and filtering
    return [...this.messages].sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
  
  // Mark a message as read
  async markAsRead(id: string): Promise<boolean> {
    const message = this.messages.find(m => m.id === id);
    if (message) {
      message.read = true;
      return true;
    }
    return false;
  }
  
  // Delete a message
  async deleteMessage(id: string): Promise<boolean> {
    const initialLength = this.messages.length;
    this.messages = this.messages.filter(m => m.id !== id);
    return this.messages.length < initialLength;
  }
}

// Export a singleton instance
export const contactDb = new ContactDatabase();
