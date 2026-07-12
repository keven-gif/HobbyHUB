import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Flag, HelpCircle, Send, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function Support() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    // In a real app, this would send to a backend
    setSubmitted(true);
    toast.success('Support ticket submitted! We will get back to you soon.');
  };

  const faqs = [
    {
      q: 'How do I join a subcommittee?',
      a: 'Go to any community page, scroll to the subcommittees section, and tap the Join button on any subcommittee that interests you.',
    },
    {
      q: 'Why can\'t I post?',
      a: 'You need to join at least one subcommittee before you can create posts. Join a subcommittee that matches your interests and try again.',
    },
    {
      q: 'How do I change my profile picture?',
      a: 'Go to your Profile page, tap the camera icon on your avatar, and select a new photo from your device.',
    },
    {
      q: 'How do I report a post?',
      a: 'Tap the flag icon on any post to report it. Our moderation team will review it.',
    },
    {
      q: 'How do I message other users?',
      a: 'Tap the Chats tab in the bottom navigation, then tap New to start a direct message or group chat.',
    },
  ];

  if (submitted) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 pb-20" style={{ backgroundColor: '#000000' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#d93a3a22' }}>
          <Check size={32} style={{ color: '#d93a3a' }} />
        </div>
        <h2 className="font-display text-xl tracking-wider mb-2" style={{ color: '#ffffff' }}>TICKET SUBMITTED</h2>
        <p className="font-body text-sm text-center mb-6 max-w-[280px]" style={{ color: '#666666' }}>
          Thanks for reaching out. We will get back to you as soon as possible.
        </p>
        <button
          onClick={() => { setSubmitted(false); setSubject(''); setMessage(''); }}
          className="font-body text-sm px-6 py-2 rounded-lg"
          style={{ backgroundColor: '#d93a3a', color: '#ffffff' }}
        >
          Send Another
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] px-4 pt-4 pb-20" style={{ backgroundColor: '#000000' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" style={{ color: '#888888' }}>
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-display text-lg tracking-wider" style={{ color: '#ffffff' }}>SUPPORT</h1>
      </div>

      {/* Contact Options */}
      <div className="flex flex-col gap-3 mb-8">
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#d93a3a22' }}>
            <Mail size={18} style={{ color: '#d93a3a' }} />
          </div>
          <div>
            <span className="font-body text-sm font-semibold block" style={{ color: '#ffffff' }}>Email Support</span>
            <span className="font-body text-xs" style={{ color: '#666666' }}>support@hobbyhub.app</span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#d93a3a22' }}>
            <Flag size={18} style={{ color: '#d93a3a' }} />
          </div>
          <div>
            <span className="font-body text-sm font-semibold block" style={{ color: '#ffffff' }}>Report an Issue</span>
            <span className="font-body text-xs" style={{ color: '#666666' }}>Flag posts or report bugs</span>
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <div className="mb-8">
        <h2 className="font-display text-sm tracking-wider mb-3" style={{ color: '#888888' }}>CONTACT US</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full font-body text-sm px-4 py-3 rounded-lg outline-none"
            style={{ backgroundColor: '#111111', color: '#ffffff', border: '1px solid #222222' }}
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue..."
            rows={5}
            className="w-full font-body text-sm px-4 py-3 rounded-lg outline-none resize-none"
            style={{ backgroundColor: '#111111', color: '#ffffff', border: '1px solid #222222' }}
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-2 font-body font-semibold text-white py-3 rounded-lg"
            style={{ backgroundColor: '#d93a3a' }}
          >
            <Send size={16} /> Submit Ticket
          </button>
        </form>
      </div>

      {/* FAQs */}
      <div>
        <h2 className="font-display text-sm tracking-wider mb-3" style={{ color: '#888888' }}>FAQ</h2>
        <div className="flex flex-col gap-2">
          {faqs.map((faq, i) => (
            <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle size={14} style={{ color: '#d93a3a' }} />
                <span className="font-body text-sm font-semibold" style={{ color: '#ffffff' }}>{faq.q}</span>
              </div>
              <p className="font-body text-xs pl-5" style={{ color: '#aaaaaa' }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
