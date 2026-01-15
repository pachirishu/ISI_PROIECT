import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import signOutImg from '../assets/126467.png';
import editImg from '../assets/edit-246.png';
import './UserProfile.css';

const cardStyle = {
  background: 'rgba(255,255,255,0.35)',
  borderRadius: '24px',
  padding: '16px',
  boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
};

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // posts | favorites
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [favoriteCards, setFavoriteCards] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingUser(false);
      if (firebaseUser) {
        fetchUserProfile(firebaseUser.uid);
        fetchUserPosts(firebaseUser.uid);
      } else {
        setPosts([]);
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserPosts = async (uid) => {
    setLoadingPosts(true);
    setError('');
    try {
      const q = query(collection(db, 'attractionMeta'), where('createdBy', '==', uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPosts(data);
    } catch (err) {
      console.error('Error reading posts:', err);
      setError('Could not load your posts. Check Firestore configuration.');
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchUserProfile = async (uid) => {
    setLoadingProfile(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserProfile({ id: uid, ...userDoc.data() });
      } else {
        setUserProfile(null);
      }
    } catch (err) {
      console.error('Profile error:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleAvatarChange = async (event) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAuthError('');
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', user.uid), { avatarUrl: url });
      setUserProfile((prev) => prev ? { ...prev, avatarUrl: url } : prev);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setAuthError('Could not upload avatar. Check storage permissions.');
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  };

  useEffect(() => {
    if (activeTab !== 'favorites') return;
    if (!userProfile?.favorites || userProfile.favorites.length === 0) {
      setFavoriteCards([]);
      return;
    }
    const ids = userProfile.favorites
      .map((fav) => (typeof fav === 'string' ? fav : fav?.id))
      .filter(Boolean);
    if (ids.length === 0) {
      setFavoriteCards([]);
      return;
    }
    let active = true;
    const loadFavorites = async () => {
      setLoadingFavorites(true);
      try {
        const chunks = [];
        for (let i = 0; i < ids.length; i += 10) {
          chunks.push(ids.slice(i, i + 10));
        }
        const results = [];
        for (const chunk of chunks) {
          const q = query(
            collection(db, 'attractionMeta'),
            where(documentId(), 'in', chunk)
          );
          const snapshot = await getDocs(q);
          snapshot.forEach((snap) => {
            const data = snap.data();
            results.push({
              id: snap.id,
              title: data.title || 'Favorite',
              imageUrl: data.imageUrl || '',
              category: data.category || ''
            });
          });
        }
        const resultMap = new Map(results.map((item) => [item.id, item]));
        const ordered = ids.map((id) => resultMap.get(id) || { id, title: 'Favorite', imageUrl: '', category: '' });
        if (active) setFavoriteCards(ordered);
      } catch (err) {
        console.error('Eroare favorite meta:', err);
      } finally {
        if (active) setLoadingFavorites(false);
      }
    };
    loadFavorites();
    return () => { active = false; };
  }, [userProfile?.favorites, activeTab]);

  const openFavoriteOnMap = (favId) => {
    navigate('/map', { state: { focusObjectId: favId } });
  };

  return (
    <div className="profile-background" style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{ maxWidth: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 48px 0 8px' }}>
        <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%', paddingTop: '0' }}>
          {user && (
            <>
              <div style={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingRight: '12px' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid #ddd',
                    background: '#fff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontFamily: '"InterMedium", "Inter", system-ui, sans-serif'
                  }}
                >
                  <img src={signOutImg} alt="sign out" style={{ width: '18px', height: '18px' }} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </header>

        {loadingUser && (
          <div style={cardStyle}>
            <p style={{ margin: 0, color: '#555' }}>Checking session...</p>
          </div>
        )}

        {authError && (
          <div style={{ ...cardStyle, border: '1px solid #ffd0d0', background: '#fff7f7' }}>
            <strong style={{ color: '#d32f2f' }}>Authentication error</strong>
            <span>{authError}</span>
          </div>
        )}

        {loadingProfile && (
          <div style={cardStyle}>
            <p style={{ margin: 0, color: '#555' }}>Loading profile...</p>
          </div>
        )}

        {user && (
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: '4px', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ ...cardStyle, flex: '0 0 320px', minWidth: '280px', maxWidth: '360px', alignItems: 'center', textAlign: 'center', marginRight: '32px', padding: '22px 18px 22px', minHeight: '380px', position: 'relative', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>
              <div style={{ position: 'relative', width: '170px', height: '170px', marginBottom: '32px' }}>
                {userProfile?.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt="avatar"
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#e7eef5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#007AC2', fontSize: '36px' }}>
                    {userProfile?.username ? userProfile.username[0]?.toUpperCase() : 'U'}
                  </div>
                )}
                {user && (
                  <>
                    <input
                      id="avatar-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('avatar-upload-input')?.click()}
                      disabled={avatarUploading}
                      style={{
                        position: 'absolute',
                        bottom: '-6px',
                        right: '-6px',
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        border: '1px solid #ddd',
                        background: '#fff',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0
                      }}
                    >
                      {avatarUploading ? '...' : <img src={editImg} alt="edit avatar" style={{ width: '18px', height: '18px' }} />}
                    </button>
                  </>
                )}
              </div>
              <div style={{ width: '100%', maxWidth: '240px', margin: '0 auto 8px auto', position: 'relative', paddingTop: '12px' }}>
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  fontSize: '10px',
                  letterSpacing: '1px',
                  fontWeight: 700,
                  color: '#666'
                }}>USERNAME</span>
                <div style={{
                  borderBottom: '1px solid #ddd',
                  padding: '4px 6px 8px',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#1f1f1f'
                }}>
                  {userProfile?.username || user?.displayName || 'User'}
                </div>
              </div>

              <div style={{ width: '100%', maxWidth: '240px', margin: '0 auto 8px auto', position: 'relative', paddingTop: '12px' }}>
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  fontSize: '10px',
                  letterSpacing: '1px',
                  fontWeight: 700,
                  color: '#666'
                }}>EMAIL</span>
                <div style={{
                  borderBottom: '1px solid #ddd',
                  padding: '4px 6px 8px',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#1f1f1f'
                }}>
                  {userProfile?.email || user?.email}
                </div>
              </div>

              <span style={{ color: '#777', fontSize: '14px', marginBottom: '6px' }}>
                {userProfile?.createdAt?.seconds
                  ? `Created on ${new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString()}`
                  : 'Created on: -'}
              </span>
              <div style={{ display: 'flex', gap: '14px', color: '#444', fontSize: '15px', marginTop: '16px' }}>
                <span>Favorites: {userProfile?.favorites?.length || 0}</span>
                <span>Posts: {userProfile?.postedAttractionsCount || posts.length}</span>
              </div>
            </div>

            <div style={{ ...cardStyle, flex: '1 1 420px', minWidth: '320px', marginLeft: '32px', marginRight: '24px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '14px', marginBottom: '12px', borderBottom: '1px solid #e5e5e5', paddingBottom: '6px', flex: '0 0 auto' }}>
                <button
                  onClick={() => setActiveTab('posts')}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '12px',
                    letterSpacing: '1px',
                    fontWeight: 500,
                    color: '#7a7a7a',
                    fontFamily: '"InterMedium", "Inter", system-ui, sans-serif',
                    textTransform: 'uppercase',
                    borderBottom: activeTab === 'posts' ? '2px solid #5f4135' : '2px solid transparent',
                    outline: 'none',
                    boxShadow: 'none',
                    borderRadius: 0,
                    appearance: 'none'
                  }}
                >
                  Posts
                </button>
                <button
                  onClick={() => setActiveTab('favorites')}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '12px',
                    letterSpacing: '1px',
                    fontWeight: 500,
                    color: '#7a7a7a',
                    fontFamily: '"InterMedium", "Inter", system-ui, sans-serif',
                    textTransform: 'uppercase',
                    borderBottom: activeTab === 'favorites' ? '2px solid #5f4135' : '2px solid transparent',
                    outline: 'none',
                    boxShadow: 'none',
                    borderRadius: 0,
                    appearance: 'none'
                  }}
                >
                  Favorites
                </button>
              </div>
              <div className="profile-posts-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                {activeTab === 'posts' ? (
                  loadingPosts ? (
                    <div style={cardStyle}>Loading your posts...</div>
                  ) : error ? (
                    <div style={{ ...cardStyle, border: '1px solid #ffd0d0', background: '#fff7f7' }}>
                      <strong style={{ color: '#d32f2f' }}>Oops!</strong>
                      <span>{error}</span>
                    </div>
                  ) : posts.length === 0 ? (
                    <div style={{ marginTop: '4px' }}>
                      <h3 style={{ margin: '0 0 6px 0', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif', fontWeight: 500 }}>
                        You have no posts yet
                      </h3>
                      <p style={{ margin: 0, color: '#555', fontFamily: '"InterExtraLight", "Inter", system-ui, sans-serif', fontWeight: 200 }}>
                        Add your first street art piece from the map. Every post will appear here.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '22px' }}>
                      {posts.map((post) => (
                        <button
                          key={post.id}
                          onClick={() => openFavoriteOnMap(post.id)}
                          style={{
                            border: '1px solid #e5e5e5',
                            borderRadius: '6px',
                            padding: 0,
                            background: '#fff',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'stretch'
                          }}
                        >
                          {post.imageUrl ? (
                            <img src={post.imageUrl} alt={post.title} loading="lazy" decoding="async" style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', background: '#f7f7f7' }}>
                              No image
                            </div>
                          )}
                          <div style={{ padding: '10px 12px', textAlign: 'left' }}>
                            <div style={{ fontSize: '12px', color: '#9c6644', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>{post.category || 'Post'}</div>
                            <div style={{ fontSize: '15px', color: '#333', fontWeight: 600, marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>
                              {post.title || 'Post'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {loadingFavorites ? (
                      <div style={cardStyle}>Loading favorites...</div>
                    ) : favoriteCards.length === 0 ? (
                      <div style={{ marginTop: '4px' }}>
                        <h3 style={{ margin: '0 0 6px 0', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif', fontWeight: 500 }}>
                          No favorites yet
                        </h3>
                        <p style={{ margin: 0, color: '#555', fontFamily: '"InterExtraLight", "Inter", system-ui, sans-serif', fontWeight: 200 }}>
                          Add items to favorites to see them here.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '22px' }}>
                        {favoriteCards.map((fav) => (
                          <button
                            key={fav.id}
                            onClick={() => openFavoriteOnMap(fav.id)}
                            style={{
                              border: '1px solid #e5e5e5',
                              borderRadius: '6px',
                              padding: 0,
                              background: '#fff',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'stretch'
                            }}
                          >
                          {fav.imageUrl ? (
                            <img src={fav.imageUrl} alt={fav.title} loading="lazy" decoding="async" style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                          ) : (
                              <div style={{ width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', background: '#f7f7f7' }}>
                                Fara imagine
                              </div>
                            )}
                            <div style={{ padding: '10px 12px', textAlign: 'left' }}>
                              <div style={{ fontSize: '12px', color: '#9c6644', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>{fav.category || 'Favorite'}</div>
                              <div style={{ fontSize: '15px', color: '#333', fontWeight: 600, marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>
                                {fav.title || 'Favorite'}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
