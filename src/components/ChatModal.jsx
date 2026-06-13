import React, { useState, useEffect, useRef } from 'react';
import { db, fbDb, auth } from '../config/firebase';

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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2500 }}>
      <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden' }}>

        {/* LEFT PANEL: NAVIGATION & FRIENDS */}
        {(!isMobile || !activeFriend) && (
          <div style={{ width: isMobile ? '100%' : '320px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg2)' }}>
            
            {/* Header / Brand */}
            <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>🤝 Friends Hub</h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '2rem', cursor: 'pointer', padding: '0 5px' }}>&times;</button>
            </div>

            {/* Sub Tabs Toggle */}
            <div style={{ display: 'flex', gap: '5px', padding: '10px', borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => setActiveSubTab('friends')} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: activeSubTab === 'friends' ? 'var(--card)' : 'transparent', color: 'var(--text)', fontWeight: 'bold', cursor: 'pointer' }}>
                Friends ({friends.length})
              </button>
              <button onClick={() => setActiveSubTab('add_friend')} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: activeSubTab === 'add_friend' ? 'var(--card)' : 'transparent', color: 'var(--text)', fontWeight: 'bold', cursor: 'pointer', position: 'relative' }}>
                Add / Requests
                {incomingRequests.length > 0 && (
                  <span style={{ position: 'absolute', top: '4px', right: '4px', background: '#EF4444', color: '#fff', fontSize: '0.7rem', borderRadius: '50%', padding: '2px 6px', fontWeight: '800' }}>{incomingRequests.length}</span>
                )}
              </button>
            </div>

            {/* TAB CONTENT */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
              
              {activeSubTab === 'friends' && (
                loading ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div> :
                friends.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '0.9rem', margin: 0 }}>No friends yet.</p>
                  </div>
                ) : (
                  friends.map(f => (
                    <div key={f.uid} onClick={() => setActiveFriend(f)} style={{ padding: '0.9rem', borderRadius: '10px', background: activeFriend?.uid === f.uid ? 'var(--card)' : 'transparent', border: activeFriend?.uid === f.uid ? '1px solid var(--border)' : '1px solid transparent', cursor: 'pointer', marginBottom: '6px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: f.isOnline ? '#10B981' : 'transparent', border: f.isOnline ? 'none' : '1px solid var(--text-muted)' }}></span>
                      <span style={{ fontWeight: '500' }}>@{f.username}</span>
                    </div>
                  ))
                )
              )}

              {activeSubTab === 'add_friend' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  {/* Send Request Form */}
                  <form onSubmit={handleSendRequestByUsername} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>SEND FRIEND REQUEST</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" value={searchUsername} onChange={e => { setSearchUsername(e.target.value); setSearchStatus(''); }} placeholder="Enter exact username" style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', outline: 'none' }} />
                      <button type="submit" style={{ padding: '0.6rem 1rem', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Send</button>
                    </div>
                    <div style={{ fontSize: '0.8rem' }}>
                      {searchStatus === 'searching' && <span style={{ color: 'var(--text-muted)' }}>Searching registry...</span>}
                      {searchStatus === 'not_found' && <span style={{ color: '#EF4444' }}>❌ Username does not exist.</span>}
                      {searchStatus === 'its_you' && <span style={{ color: '#EF4444' }}>⚠️ That is your own username!</span>}
                      {searchStatus === 'success' && <span style={{ color: '#4CAF50' }}>✅ Friend request sent successfully!</span>}
                    </div>
                  </form>

                  {/* Incoming Requests List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>PENDING REQUESTS</label>
                    {incomingRequests.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>No pending incoming requests.</p>
                    ) : (
                      incomingRequests.map(req => (
                        <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: '500' }}>@{req.username}</span>
                          <button onClick={() => handleAcceptRequest(req)} style={{ padding: '4px 10px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>Accept</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* RIGHT PANEL: LIVE CHAT SPACE */}
        {(!isMobile || activeFriend) && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
            
            {/* Active Friend Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', minHeight: '62px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isMobile && <button onClick={() => setActiveFriend(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>← Back</button>}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>{activeFriend ? `@${activeFriend.username}` : ''}</h3>
              </div>
              {!isMobile && <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.8rem', cursor: 'pointer', padding: '0 5px' }}>&times;</button>}
            </div>

            {/* Chat Body */}
            {activeFriend ? (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {messages.map((m, idx) => {
                    const isMe = m.senderId === currentUid;
                    return (
                      <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', background: isMe ? 'var(--accent)' : 'var(--card)', color: isMe ? '#000' : 'var(--text)', padding: '0.7rem 1.2rem', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', maxWidth: '70%', fontSize: '0.9rem', wordBreak: 'break-word', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        {m.text}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={sendMessage} style={{ padding: '1.2rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', background: 'var(--bg2)' }}>
                  <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Type a message..." style={{ flex: 1, padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', outline: 'none', font: 'inherit' }} />
                  <button type="submit" style={{ padding: '0.85rem 1.6rem', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Send</button>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '10px', padding: '2rem' }}>
                <span style={{ fontSize: '3rem' }}>👥</span>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '500' }}>Select a friend from the left list to begin chatting.</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Or switch to 'Add / Requests' tab to accept incoming requests or search your crew by username!</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}