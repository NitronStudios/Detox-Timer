import React, { useState, useEffect } from 'react';
import { db, fbDb, auth } from '../config/firebase';

function formatTime(totalMins) {
  if (!totalMins) return '0 mins';
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m} mins`;
  return `${h} hrs ${m} mins`;
}

export default function UserProfileModal({ user, onClose }) {
  const [friendStatus, setFriendStatus] = useState('none'); // none, sent, received, friends
  const currentUid = auth.currentUser?.uid;
  const targetUid = user?.id;

  useEffect(() => {
    if (!currentUid || !targetUid || currentUid === targetUid) return;

    // Check friendship status
    const checkStatus = async () => {
      const fQuery = fbDb.query(fbDb.collection(db, 'friendships'));
      const fSnap = await fbDb.getDocs(fQuery);
      let isFriend = false;
      fSnap.forEach(doc => {
        if (doc.data().users.includes(currentUid) && doc.data().users.includes(targetUid)) isFriend = true;
      });
      if (isFriend) { setFriendStatus('friends'); return; }

      const reqDoc = await fbDb.getDoc(fbDb.doc(db, 'friend_requests', `${currentUid}_${targetUid}`));
      if (reqDoc.exists()) { setFriendStatus('sent'); return; }

      const recDoc = await fbDb.getDoc(fbDb.doc(db, 'friend_requests', `${targetUid}_${currentUid}`));
      if (recDoc.exists()) { setFriendStatus('received'); return; }

      setFriendStatus('none');
    };
    checkStatus();
  }, [currentUid, targetUid]);

  const handleFriendAction = async () => {
    if (friendStatus === 'none') {
      await fbDb.setDoc(fbDb.doc(db, 'friend_requests', `${currentUid}_${targetUid}`), { from: currentUid, to: targetUid });
      setFriendStatus('sent');
    } else if (friendStatus === 'received') {
      // Create friendship record
      const chatId = `${currentUid}_${targetUid}`.split('_').sort().join('_');
      await fbDb.setDoc(fbDb.doc(db, 'friendships', chatId), { users: [currentUid, targetUid] });
      await fbDb.deleteDoc(fbDb.doc(db, 'friend_requests', `${targetUid}_${currentUid}`));
      setFriendStatus('friends');
    }
  };

  if (!user) return null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '10px' }}>
      <div className="modal-content" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2rem', width: '95%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>👤 User Profile</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.6rem', cursor: 'pointer' }}>&times;</button>
        </div>
        
        <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--card2)', border: '2px solid var(--accent)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', fontSize: '2.2rem', fontWeight: '800', textTransform: 'uppercase' }}>
            {(user.username || `Anonymous_${user.id.substring(0, 4)}`).replace('@', '').charAt(0)}
          </div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--text)' }}>
            @{user.username || `Anonymous_${user.id.substring(0, 4)}`}
          </h3>
          
          {/* Friend Action Button */}
          {currentUid !== targetUid && (
            <button onClick={handleFriendAction} disabled={friendStatus === 'sent' || friendStatus === 'friends'} style={{ marginTop: '0.75rem', padding: '0.5rem 1.25rem', borderRadius: '20px', border: '1px solid var(--border)', background: friendStatus === 'none' ? 'var(--accent)' : 'var(--card)', color: friendStatus === 'none' ? '#000' : 'var(--text)', fontWeight: 'bold', cursor: 'pointer' }}>
              {friendStatus === 'none' && '➕ Add Friend'}
              {friendStatus === 'sent' && '⏳ Request Sent'}
              {friendStatus === 'received' && '✅ Accept Request'}
              {friendStatus === 'friends' && '🤝 Friends'}
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ background: 'var(--card)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>DAILY</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text)' }}>{formatTime(user.daily)}</div>
          </div>
          <div style={{ background: 'var(--card)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>WEEKLY</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text)' }}>{formatTime(user.weekly)}</div>
          </div>
          <div style={{ background: 'var(--card)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>MONTHLY</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text)' }}>{formatTime(user.monthly)}</div>
          </div>
          <div style={{ background: 'var(--card)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--accent)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>YEARLY</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent)' }}>{formatTime(user.yearly)}</div>
          </div>
        </div>

      </div>
    </div>
  );
}
