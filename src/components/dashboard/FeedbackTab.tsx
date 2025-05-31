import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, updateDoc as updateContactDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Modal } from '../ui/modal';
import { Input } from '../ui/input';
import { Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  timestamp: any;
  reply?: string;
  adminNote?: string;
  status: 'pending' | 'resolved';
}

interface FeedbackTabProps {
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
}

const FeedbackTab: React.FC<FeedbackTabProps> = ({ messages, onMessagesChange }) => {
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgSearch, setMsgSearch] = useState('');
  const [replyInputs, setReplyInputs] = useState({});
  const [expandedReply, setExpandedReply] = useState<string | null>(null);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [msgNotes, setMsgNotes] = useState({});
  const [msgNoteSaving, setMsgNoteSaving] = useState({});
  const [modalType, setModalType] = useState<'reply' | 'note' | null>(null);
  const [modalMsgId, setModalMsgId] = useState<string | null>(null);

  // Filter messages based on search (client-side search on the messages prop)
  const filteredMessages = React.useMemo(() => {
    return messages.filter(msg =>
      (!msgSearch ||
      msg.name.toLowerCase().includes(msgSearch.toLowerCase()) ||
      msg.email.toLowerCase().includes(msgSearch.toLowerCase()) ||
      msg.subject.toLowerCase().includes(msgSearch.toLowerCase()) ||
      msg.message.toLowerCase().includes(msgSearch.toLowerCase()))
    );
  }, [messages, msgSearch]);

  // Sorting messages (Assuming sorting is handled in AdminDashboard or will be added here)
  // For now, displaying as is or add sorting logic if needed
  const sortedMessages = React.useMemo(() => {
    return filteredMessages; // Apply sorting logic here if needed later
  }, [filteredMessages]);

  // Pagination (Assuming pagination is handled in AdminDashboard or will be added here)
  const paginatedMessages = sortedMessages; // Apply pagination logic here if needed later

  // Handlers
  const handleMarkRead = async (id: string, read: boolean) => {
    try {
      await updateDoc(doc(db, 'contact_messages', id), { read });
      // Rely on the onSnapshot listener to update the state via onMessagesChange
      toast.success(`Message marked as ${read ? 'read' : 'unread'}`);
    } catch (error) {
      console.error('Error marking message as read/unread:', error);
      toast.error(`Failed to mark message as ${read ? 'read' : 'unread'}`);
    }
  };

  const handleMarkResolved = async (id: string, resolved: boolean) => {
    try {
      await updateDoc(doc(db, 'contact_messages', id), { status: resolved ? 'resolved' : 'pending' });
      // Rely on the onSnapshot listener to update the state via onMessagesChange
      toast.success(`Message marked as ${resolved ? 'resolved' : 'pending'}`);
    } catch (error) {
      console.error('Error marking message as resolved/pending:', error);
      toast.error(`Failed to mark message as ${resolved ? 'resolved' : 'pending'}`);
    }
  };

  const handleDeleteMsg = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteDoc(doc(db, 'contact_messages', id));
        // Rely on the onSnapshot listener to update the state via onMessagesChange
        toast.success('Message deleted successfully!');
      } catch (error) {
        console.error('Error deleting message:', error);
        toast.error('Failed to delete message');
      }
    }
  };

  const handleReplyChange = (id: string, value: string) => {
    setReplyInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleSendReply = async (msg: Message) => {
    const replyText = replyInputs[msg.id];
    if (!replyText) {
      toast.error('Reply cannot be empty');
      return;
    }
    // Assuming there's a mechanism to send emails or in-app notifications
    console.log(`Sending reply to ${msg.email}: ${replyText}`);
    toast.success('Reply sent (simulated)'); // Simulate sending
    // You might want to store the reply in Firestore as well
    // await updateDoc(doc(db, 'contact_messages', msg.id), { reply: replyText });
    // onMessagesChange(messages.map(m => m.id === msg.id ? { ...m, reply: replyText } : m));
    setReplyInputs(prev => { delete prev[msg.id]; return { ...prev }; });
    setExpandedReply(null);
  };

  const handleMsgNoteChange = (id: string, value: string) => {
    setMsgNotes(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveMsgNote = async (msg: Message) => {
    setMsgNoteSaving(prev => ({ ...prev, [msg.id]: true }));
    const noteText = msgNotes[msg.id] || '';
    try {
      await updateDoc(doc(db, 'contact_messages', msg.id), { adminNote: noteText });
      onMessagesChange(messages.map(m => m.id === msg.id ? { ...m, adminNote: noteText } : m));
      toast.success('Note saved!');
    } catch (error) {
      toast.error('Failed to save note');
    } finally {
      setMsgNoteSaving(prev => ({ ...prev, [msg.id]: false }));
      setExpandedNote(null);
    }
  };

  // Bulk Actions (assuming bulk actions are needed)
  // Need state for selected messages and handlers for bulk actions

  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-green-100">
      <h2 className="text-2xl font-bold mb-4 text-green-700">Feedback & Support Messages ({messages.length})</h2>
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
         <Input
           type="text"
           placeholder="Search messages..."
           value={msgSearch}
           onChange={e => setMsgSearch(e.target.value)}
           className="w-full md:w-64"
         />
         {/* Add sorting and status filtering options here */}
      </div>
      
      {msgLoading ? (
        <div className="text-center">Loading Messages...</div>
      ) : (
        <div className="space-y-4">
          {paginatedMessages.map(msg => (
            <div key={msg.id} className="border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-bold text-gray-800">{msg.name}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{msg.email}</span>
                    <a href={`mailto:${msg.email}`}>
                      <Button variant="outline" size="sm" className="h-6 px-2">
                        <Mail className="h-3 w-3 mr-1" /> Reply
                      </Button>
                    </a>
                  </div>
                  <div className="text-sm text-gray-500">{new Date(msg.timestamp?.seconds * 1000).toLocaleString()}</div>
                  <div className={`text-sm font-semibold mt-1 ${
                    msg.status === 'resolved' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    Status: {msg.status ? msg.status.charAt(0).toUpperCase() + msg.status.slice(1) : 'Unknown'}
                  </div>
                </div>
                <div className="flex gap-2">
                  {msg.status === 'pending' ? (
                    <Button variant="outline" size="sm" onClick={() => handleMarkResolved(msg.id, true)}>
                      Mark as Resolved
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleMarkResolved(msg.id, false)}>
                      Mark as Pending
                    </Button>
                  )}
                  {!msg.read ? (
                    <Button variant="outline" size="sm" onClick={() => handleMarkRead(msg.id, true)}>Mark as Read</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleMarkRead(msg.id, false)}>Mark as Unread</Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteMsg(msg.id)}>Delete</Button>
                </div>
              </div>
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-1">Subject: {msg.subject}</h4>
                <p className="text-gray-600">{msg.message}</p>
              </div>
              
              <div>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedNote(expandedNote === msg.id ? null : msg.id)}
                  className="text-blue-600 hover:text-blue-800 p-0"
                >
                  {expandedNote === msg.id ? 'Hide Note' : 'Admin Note'}
                </Button>
                {expandedNote === msg.id && (
                  <div className="mt-2">
                    <Textarea
                      placeholder="Add internal notes..."
                      value={msgNotes[msg.id] !== undefined ? msgNotes[msg.id] : msg.adminNote || ''}
                      onChange={e => handleMsgNoteChange(msg.id, e.target.value)}
                      rows={2}
                    />
                    <Button 
                      size="sm" 
                      onClick={() => handleSaveMsgNote(msg)}
                      disabled={msgNoteSaving[msg.id] || (msgNotes[msg.id] === undefined ? !msg.adminNote : msgNotes[msg.id] === msg.adminNote || msgNotes[msg.id] === '')}
                      className="mt-2"
                    >
                      {msgNoteSaving[msg.id] ? 'Saving...' : 'Save Note'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Add Pagination Controls here if needed */}
        </div>
      )}

      {/* Reply Dialog */}
      <Dialog open={modalType === 'reply'} onOpenChange={() => setModalType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Message</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <Textarea
              placeholder="Enter your reply..."
              value={replyInputs[modalMsgId || ''] || ''}
              onChange={(e) => handleReplyChange(modalMsgId || '', e.target.value)}
              className="min-h-[100px]"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalType(null)}>Cancel</Button>
              <Button onClick={() => modalMsgId && handleSendReply(messages.find(m => m.id === modalMsgId)!)}>Send Reply</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={modalType === 'note'} onOpenChange={() => setModalType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Note</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <Textarea
              placeholder="Add internal notes..."
              value={msgNotes[modalMsgId || ''] || ''}
              onChange={(e) => handleMsgNoteChange(modalMsgId || '', e.target.value)}
              className="min-h-[100px]"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalType(null)}>Cancel</Button>
              <Button onClick={() => modalMsgId && handleSaveMsgNote(messages.find(m => m.id === modalMsgId)!)}>Save Note</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackTab; 