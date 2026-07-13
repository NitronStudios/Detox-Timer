import React, { useState, useEffect, useRef } from 'react';
import { db, fbDb, auth } from '../config/firebase';
import { Users, AlertTriangle, CheckCircle, XCircle, UserPlus, Info } from 'lucide-react';

export default function ChatModal({ onClose }) {
  const [friends, setFriends] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Friend Request States
  const [searchUsername, setSearchUsername] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('friends'); // 'friends' or 'add_friend'

  const messagesEndRef = useRef(null);
  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Fetch Friends List (Real-time)
  useEffect(() => {
    if (!currentUid) return;
    const unsub = fbDb.onSnapshot(fbDb.collection(db, 'friendships'), async (snapshot) => {
      const friendsList = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.users.includes(currentUid)) {
          const friendUid = data.users.find(uid => uid !== currentUid);
          const userDoc = await fbDb.getDoc(fbDb.doc(db, 'users', friendUid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          const username = userData.settings?.username || `Anonymous_${friendUid.substring(0, 4)}`;
          
          const lastActive = userData.lastActive || 0;
          const isOnline = (Date.now() - lastActive) < 5 * 60 * 1000; 

          friendsList.push({ uid: friendUid, username, chatId: doc.id, isOnline });
        }
      }
      setFriends(friendsList);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUid]);

  // 2. Fetch Incoming Friend Requests (Real-time & Asynchronous)
  useEffect(() => {
    if (!currentUid) return;
    const unsub = fbDb.onSnapshot(fbDb.collection(db, 'friend_requests'), async (snapshot) => {
      const reqs = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.to === currentUid) {
          const senderDoc = await fbDb.getDoc(fbDb.doc(db, 'users', data.from));
          const senderUsername = senderDoc.exists() ? (senderDoc.data().settings?.username || `Anonymous_${data.from.substring(0, 4)}`) : `Anonymous_${data.from.substring(0, 4)}`;
          reqs.push({ id: doc.id, from: data.from, username: senderUsername });
        }
      }
      setIncomingRequests(reqs);
    });
    return () => unsub();
  }, [currentUid]);

  // 3. Listen for Messages
  useEffect(() => {
    if (!activeFriend) return;
    const msgQuery = fbDb.query(
      fbDb.collection(db, 'chats', activeFriend.chatId, 'messages'),
      fbDb.orderBy('timestamp', 'asc')
    );
    const unsub = fbDb.onSnapshot(msgQuery, (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => msgs.push(doc.data()));
      setMessages(msgs);
    });
    return () => unsub();
  }, [activeFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send Message Logic
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeFriend) return;
    const text = inputText.trim();
    setInputText('');
    await fbDb.addDoc(fbDb.collection(db, 'chats', activeFriend.chatId, 'messages'), {
      senderId: currentUid,
      text: text,
      timestamp: Date.now()
    });
  };

  // Asynchronous Send Friend Request by Username
  const handleSendRequestByUsername = async (e) => {
    e.preventDefault();
    const targetName = searchUsername.trim().toLowerCase().replace('@', '');
    if (!targetName) return;
    setSearchStatus('searching');

    try {
      const docSnap = await fbDb.getDoc(fbDb.doc(db, 'usernames', targetName));
      if (!docSnap.exists()) {
        setSearchStatus('not_found');
        return;
      }
      const targetUid = docSnap.data().uid;
      if (targetUid === currentUid) {
        setSearchStatus('its_you');
        return;
      }

      // Create Request document
      await fbDb.setDoc(fbDb.doc(db, 'friend_requests', `${currentUid}_${targetUid}`), {
        from: currentUid,
        to: targetUid,
        timestamp: Date.now()
      });
      setSearchStatus('success');
      setSearchUsername('');
    } catch (err) {
      setSearchStatus('error');
    }
  };

  // Asynchronous Accept Friend Request
  const handleAcceptRequest = async (req) => {
    try {
      const chatId = `${currentUid}_${req.from}`.split('_').sort().join('_');
      await fbDb.setDoc(fbDb.doc(db, 'friendships', chatId), { users: [currentUid, req.from] });
      await fbDb.deleteDoc(fbDb.doc(db, 'friend_requests', req.id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="friends-hub-overlay">
      <style>{`
        .friends-hub-overlay {
          --bg-overlay: var(--bg);
          --ink: var(--text);
          --surface: var(--card);
          --ink-muted: var(--text-muted);
          --border-color: var(--border);
          --soft-radius: 32px;
        }

        .friends-hub-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2500;
          padding-top: var(--safe-top, 0px);
          font-family: 'Inter', sans-serif;
          color: var(--ink);
        }

        .shell {
          flex: 1;
          display: flex;
          padding: 16px;
          gap: 16px;
          height: 100%;
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Sidebar: Modern floating dark panel */
        .nav-pane {
          width: 320px;
          background: var(--surface);
          border-radius: var(--soft-radius);
          border: 1px solid var(--border-color);
          padding: 40px 24px;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          transition: all 0.2s;
        }

        .nav-pane h3 {
          font-family: 'Syne', sans-serif;
          font-size: 1.1rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 30px;
          color: var(--accent);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .switch {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 30px;
        }

        .switch-opt {
          background: var(--card2);
          border: 1px solid var(--border-color);
          color: var(--ink);
          padding: 16px 20px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .switch-opt:hover {
          background: var(--card2);
          border-color: var(--border);
        }

        .switch-opt.active {
          background: var(--accent);
          color: var(--bg-overlay);
          border-color: var(--accent);
        }

        .req-badge {
          background: #EF4444;
          color: var(--bg);
          font-size: 0.65rem;
          border-radius: 50%;
          padding: 2px 6px;
          font-weight: 800;
          font-family: 'Geist Mono', monospace;
        }

        .nav-pane-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        /* Friends List */
        .friends-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .friend-item {
          background: var(--card2);
          border: 1px solid var(--border-color);
          color: var(--ink);
          padding: 14px 18px;
          border-radius: 16px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .friend-item:hover {
          background: var(--card2);
          border-color: var(--border);
        }

        .friend-item.active {
          border-color: var(--accent);
          background: rgba(90, 235, 147, 0.05);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.online {
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent);
        }

        .status-dot.offline {
          background: var(--border);
          border: 1px solid var(--text-muted);
        }

        .friend-name {
          font-family: 'Geist Mono', monospace;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .sync-msg {
          margin-top: auto;
          font-family: 'Geist Mono', monospace;
          font-size: 0.6rem;
          color: var(--ink-muted);
          background: var(--card2);
          padding: 12px;
          border-radius: 12px;
          text-align: center;
          letter-spacing: 0.05em;
        }

        /* Main Section */
        .viewport {
          flex: 1;
          background: var(--surface);
          border-radius: var(--soft-radius);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .top-bar {
          height: 80px;
          padding: 0 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
        }

        .top-bar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .back-btn {
          background: var(--card2);
          border: 1px solid var(--border-color);
          color: var(--accent);
          padding: 8px 16px;
          border-radius: 12px;
          font-family: 'Geist Mono', monospace;
          font-size: 0.75rem;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: var(--card);
          color: var(--bg);
        }

        .status-pill {
          font-family: 'Geist Mono', monospace;
          font-size: 0.65rem;
          color: var(--ink-muted);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-pill::before {
          content: "";
          width: 6px;
          height: 6px;
          background: var(--accent);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--accent);
        }

        .exit {
          width: 48px;
          height: 48px;
          background: var(--card2);
          border: 1px solid var(--border-color);
          border-radius: 18px;
          color: var(--text);
          font-size: 1.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          transition: all 0.2s;
        }

        .exit:hover {
          background: var(--card);
          border-color: var(--border);
        }

        /* Empty State */
        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
        }

        .icon-wrap {
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, rgba(90, 235, 147, 0.1) 0%, transparent 70%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          margin-bottom: 20px;
        }

        .headline {
          font-family: 'Syne', sans-serif;
          font-size: 2.5rem;
          letter-spacing: -0.04em;
          margin-bottom: 16px;
          color: var(--ink);
        }

        .para {
          color: var(--ink-muted);
          max-width: 440px;
          line-height: 1.6;
          font-size: 0.95rem;
          margin-bottom: 30px;
        }

        .bottom-box {
          border-top: 1px dashed var(--border-color);
          padding-top: 30px;
          width: 100%;
          max-width: 440px;
        }

        .code-label {
          font-family: 'Geist Mono', monospace;
          font-size: 0.65rem;
          color: var(--accent);
          background: rgba(90, 235, 147, 0.1);
          padding: 4px 12px;
          border-radius: 6px;
          margin-bottom: 12px;
          display: inline-block;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .hint {
          font-size: 0.8rem;
          color: var(--ink-muted);
          line-height: 1.5;
        }

        /* Active Chat Workspace */
        .chat-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .msg-bubble {
          max-width: 70%;
          padding: 12px 18px;
          font-size: 0.9rem;
          line-height: 1.5;
          word-break: break-word;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .msg-bubble.me {
          align-self: flex-end;
          background: var(--accent);
          color: var(--bg-overlay);
          border-radius: 18px 18px 4px 18px;
          font-weight: 500;
        }

        .msg-bubble.them {
          align-self: flex-start;
          background: var(--card2);
          border: 1px solid var(--border-color);
          color: var(--ink);
          border-radius: 18px 18px 18px 4px;
        }

        .chat-form {
          padding: 20px 24px;
          border-top: 1px solid var(--border-color);
          display: flex;
          gap: 12px;
          background: rgba(0, 0, 0, 0.1);
        }

        .chat-input {
          flex: 1;
          padding: 14px 20px;
          border-radius: 20px;
          border: 1px solid var(--border-color);
          background: var(--card2);
          color: var(--ink);
          outline: none;
          font-family: 'Geist Mono', monospace;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .chat-input:focus {
          border-color: var(--accent);
          background: var(--card2);
        }

        .send-btn {
          padding: 0 24px;
          background: var(--card2);
          color: var(--ink);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          font-weight: bold;
          cursor: pointer;
          font-family: 'Geist Mono', monospace;
          font-size: 0.8rem;
          transition: all 0.2s;
        }

        .send-btn:hover {
          background: var(--accent);
          color: var(--bg-overlay);
          border-color: var(--accent);
        }

        /* Form Controls in Sidebar */
        .add-friend-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-input {
          width: 100%;
          padding: 12px 14px;
          background: var(--card2);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          color: var(--ink);
          font-family: 'Geist Mono', monospace;
          font-size: 0.8rem;
          outline: none;
          transition: all 0.2s;
        }

        .form-input:focus {
          border-color: var(--accent);
          background: var(--card2);
        }

        .form-btn {
          width: 100%;
          padding: 12px;
          background: var(--accent);
          color: var(--bg-overlay);
          border: none;
          border-radius: 12px;
          font-weight: bold;
          font-size: 0.85rem;
          cursor: pointer;
          font-family: 'Geist Mono', monospace;
          transition: all 0.2s;
        }

        .form-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .status-msg-container {
          font-family: 'Geist Mono', monospace;
          font-size: 0.75rem;
          min-height: 20px;
          margin-top: 4px;
        }

        .requests-section {
          border-top: 1px dashed var(--border-color);
          padding-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .request-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--card2);
          border-radius: 16px;
          border: 1px solid var(--border-color);
        }

        .accept-btn {
          padding: 6px 14px;
          background: var(--accent);
          color: var(--bg-overlay);
          border: none;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: bold;
          cursor: pointer;
          font-family: 'Geist Mono', monospace;
          transition: all 0.2s;
        }

        .accept-btn:hover {
          filter: brightness(1.1);
        }

        /* Responsive adaptations */
        @media (max-width: 768px) {
          .shell {
            padding: 0px;
            gap: 0;
          }
          .nav-pane {
            width: 100%;
            border-radius: 0;
            border: none;
            padding: 24px 16px;
            display: ${isMobile && activeFriend ? 'none' : 'flex'};
          }
          .viewport {
            width: 100%;
            border-radius: 0;
            border: none;
            display: ${isMobile && !activeFriend ? 'none' : 'flex'};
          }
          .headline {
            font-size: 2rem;
          }
        }
      `}</style>

      {/* Architectural Close Button (Mobile Only) */}
      <button 
        onClick={onClose} 
        style={{ 
          display: isMobile ? 'block' : 'none',
          position: 'absolute', 
          top: '1.5rem', 
          right: '1.5rem', 
          background: 'none', 
          border: 'none', 
          color: 'var(--text)', 
          fontSize: '1.25rem', 
          cursor: 'pointer', 
          opacity: 0.4, 
          transition: 'opacity 0.2s',
          zIndex: 3000
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
      >
        ✕
      </button>

      <div className="shell">
        
        {/* LEFT PANEL: NAVIGATION & FRIENDS */}
        <nav className="nav-pane">
          <h3>
            <Users size={18} style={{ marginRight: '8px' }} />
            Friends
          </h3>
          
          <div className="switch">
            <button 
              className={`switch-opt ${activeSubTab === 'friends' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('friends')}
            >
              <span>Friends ({friends.length})</span>
            </button>
            <button 
              className={`switch-opt ${activeSubTab === 'add_friend' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('add_friend')}
            >
              <span>Add / Requests</span>
              {incomingRequests.length > 0 && (
                <span className="req-badge">{incomingRequests.length}</span>
              )}
            </button>
          </div>

          <div className="nav-pane-content">
            {activeSubTab === 'friends' && (
              loading ? (
                <div className="sync-msg">Loading friends...</div>
              ) : friends.length === 0 ? (
                <div className="sync-msg" style={{ background: 'transparent', fontSize: '0.75rem' }}>
                  No friends added yet.
                </div>
              ) : (
                <div className="friends-list">
                  {friends.map(f => (
                    <div 
                      key={f.uid} 
                      onClick={() => setActiveFriend(f)} 
                      className={`friend-item ${activeFriend?.uid === f.uid ? 'active' : ''}`}
                    >
                      <span className={`status-dot ${f.isOnline ? 'online' : 'offline'}`} />
                      <span className="friend-name">@{f.username}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeSubTab === 'add_friend' && (
              <div className="add-friend-form">
                <form onSubmit={handleSendRequestByUsername} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span className="code-label">Search Users</span>
                  <input 
                    type="text" 
                    value={searchUsername} 
                    onChange={e => { setSearchUsername(e.target.value); setSearchStatus(''); }} 
                    placeholder="Enter exact username" 
                    className="form-input"
                  />
                  <button type="submit" className="form-btn">Send Request</button>
                  
                  <div className="status-msg-container">
                    {searchStatus === 'searching' && <span style={{ color: 'var(--ink-muted)' }}>Searching users...</span>}
                    {searchStatus === 'not_found' && <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={14} /> Username not found.</span>}
                    {searchStatus === 'its_you' && <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} /> This is your own username!</span>}
                    {searchStatus === 'success' && <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} /> Friend request sent!</span>}
                  </div>
                </form>

                <div className="requests-section">
                  <span className="code-label" style={{ background: 'var(--card2)', color: 'var(--text-muted)' }}>
                    Pending Requests ({incomingRequests.length})
                  </span>
                  {incomingRequests.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontStyle: 'italic', margin: 0 }}>No pending requests.</p>
                  ) : (
                    incomingRequests.map(req => (
                      <div key={req.id} className="request-item">
                        <span style={{ fontSize: '0.8rem', fontFamily: 'Geist Mono, monospace' }}>@{req.username}</span>
                        <button onClick={() => handleAcceptRequest(req)} className="accept-btn">Accept</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* RIGHT PANEL: LIVE CHAT SPACE */}
        <main className="viewport">
          <header className="top-bar">
            <div className="top-bar-left">
              {isMobile && activeFriend && (
                <button className="back-btn" onClick={() => setActiveFriend(null)}>← BACK</button>
              )}
              <div className="status-pill">
                {activeFriend ? `Chatting with @${activeFriend.username}` : "Online"}
              </div>
            </div>
            <button className="exit" onClick={onClose}>×</button>
          </header>

          {activeFriend ? (
            <>
              {/* Chat Messages */}
              <div className="chat-body">
                {messages.map((m, idx) => {
                  const isMe = m.senderId === currentUid;
                  return (
                    <div key={idx} className={`msg-bubble ${isMe ? 'me' : 'them'}`}>
                      {m.text}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={sendMessage} className="chat-form">
                <input 
                  type="text" 
                  value={inputText} 
                  onChange={e => setInputText(e.target.value)} 
                  placeholder="Type a message..." 
                  className="chat-input"
                />
                <button type="submit" className="send-btn">Send</button>
              </form>
            </>
          ) : (
            /* Empty State matching mockup exactly */
            <div className="empty-state">
              <div className="icon-wrap">
                <UserPlus size={48} color="var(--accent)" />
              </div>
              <h2 className="headline">Select a Friend</h2>
              <p className="para">Choose a contact from your list to initiate a private session or catch up on progress.</p>
              
              <div className="bottom-box">
                <span className="code-label">Tip</span>
                <p className="hint">Or switch to 'Add / Requests' tab to accept incoming requests or search your crew by username!</p>
              </div>
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
