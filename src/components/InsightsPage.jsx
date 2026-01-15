import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import './InsightsPage.css';

const cardStyle = {
  background: 'rgba(255,255,255,0.6)',
  borderRadius: '18px',
  padding: '16px',
  boxShadow: '0 10px 24px rgba(0,0,0,0.08)'
};

const InsightsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalFavorites: 0,
    topCategory: '—',
    topPosts: [],
    avgFavorites: '0.0'
  });
  
  const [categoryData, setCategoryData] = useState([]);
  const [sectorTops, setSectorTops] = useState([]);
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setError('');
      try {
        const snapshot = await getDocs(collection(db, 'attractionMeta'));
        const docs = snapshot.docs.map((doc) => doc.data());
        
        const categoryCounts = {};
        const sectorMap = {};
        
        let totalFavorites = 0;
        let topLikes = -1;
        let topPosts = [];

        docs.forEach((doc) => {
          const likes = doc.likes || [];
          const likeCount = likes.length;
          totalFavorites += likeCount;
          
          const category = doc.category || 'Uncategorized';
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          
          if (likeCount > topLikes) {
            topLikes = likeCount;
            topPosts = [{ title: doc.title || 'Untitled', category, likes: likeCount }];
          } else if (likeCount === topLikes) {
            topPosts.push({ title: doc.title || 'Untitled', category, likes: likeCount });
          }

          const sector = doc.sector || "Necunoscut"; 
          if (sector !== "Necunoscut") {
              if (!sectorMap[sector]) {
                sectorMap[sector] = [];
              }
              sectorMap[sector].push({
                title: doc.title || 'Fara titlu',
                likes: likeCount,
                category: category
              });
          }
        });

        const processedSectors = Object.entries(sectorMap).map(([sectorName, posts]) => {
            const sorted = posts.sort((a, b) => b.likes - a.likes);
            const top3 = sorted.slice(0, 3);
            return {
                sector: sectorName,
                top3: top3
            };
        });

        processedSectors.sort((a, b) => a.sector.localeCompare(b.sector, undefined, { numeric: true }));
        setSectorTops(processedSectors);

        const topCategory = Object.keys(categoryCounts).reduce((acc, key) => {
          if (!acc) return key;
          return categoryCounts[key] > categoryCounts[acc] ? key : acc;
        }, '');

        const categoryChartData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

        setStats({
          totalPosts: docs.length,
          totalFavorites,
          topCategory: topCategory || '—',
          topPosts,
          avgFavorites: docs.length ? (totalFavorites / docs.length).toFixed(1) : '0.0'
        });
        setCategoryData(categoryChartData);

      } catch (err) {
        console.error('Insights error:', err);
        setError('Could not load insights right now.');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  useEffect(() => {
    const quotes = [
      { text: 'People say graffiti is ugly, irresponsible and childish... but thats only if its done properly.', author: 'Banksy' },
      { text: 'Speak softly, but carry a big can of paint.', author: 'Banksy' },
      { text: 'Graffiti is beautiful; like a brick in the face of a cop.', author: 'Hunter S. Thompson' },
      { text: 'If it takes more than 5 minutes, its not graffiti.', author: 'Mint Serf' },
      { text: 'Art is an evolutionary act. The shape of art and its role in society is constantly changing.', author: 'Raymond Salvatore Harmon' }
    ];
    const pick = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(pick);
  }, []);

  const funFacts = useMemo(() => {
    const items = [];
    if (stats.topPosts.length > 0) {
      items.push(`Most loved pieces: ${stats.topPosts.length} with ${stats.topPosts[0].likes} favorites`);
    }
    items.push(`Average favorites per post: ${stats.avgFavorites}`);
    items.push(`Top category right now: ${stats.topCategory}`);
    return items;
  }, [stats]);

  const chartColors = ['#9C3A32', '#D57B4E', '#5F4135', '#C6A18B', '#3D2A24'];

  return (
    <div className="insights-scroll" style={{ height: '100%', width: '100%', padding: '20px 20px 36px', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, color: '#3d2a24', fontFamily: 'Gladolia, system-ui, sans-serif' }}>Street Art Insights</h2>
            <p style={{ margin: '6px 0 0 0', color: '#6a5a52', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>
              A quick look at the community vibe and activity.
            </p>
          </div>
        </header>

        {quote && (
          <div style={{ ...cardStyle, borderLeft: '6px solid #9C3A32', background: 'rgba(255,255,255,0.7)' }}>
            <div style={{ marginTop: '8px', color: '#3d2a24', fontSize: '16px', lineHeight: 1.5, fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>
              "{quote.text}"
            </div>
            <div style={{ marginTop: '8px', color: '#6a5a52', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>
              — {quote.author}
            </div>
          </div>
        )}

        {loading ? (
          <div style={cardStyle}>Loading insights...</div>
        ) : error ? (
          <div style={{ ...cardStyle, border: '1px solid #ffd0d0', background: '#fff7f7', color: '#b63b3b' }}>
            {error}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={cardStyle}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#8b7b72', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>Total posts</div>
                <div style={{ fontSize: '28px', color: '#2b211e', fontWeight: 700 }}>{stats.totalPosts}</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#8b7b72', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>Total favorites</div>
                <div style={{ fontSize: '28px', color: '#2b211e', fontWeight: 700 }}>{stats.totalFavorites}</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#8b7b72', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>Top category</div>
                <div style={{ fontSize: '22px', color: '#2b211e', fontWeight: 700 }}>{stats.topCategory}</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#8b7b72', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>Avg favorites</div>
                <div style={{ fontSize: '28px', color: '#2b211e', fontWeight: 700 }}>{stats.avgFavorites}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 12px 0', color: '#3d2a24', fontFamily: 'Gladolia, system-ui, sans-serif' }}>Categories</h3>
                {categoryData.length === 0 ? (
                  <div style={{ color: '#6a5a52' }}>No data yet.</div>
                ) : (
                  <div style={{ width: '100%', height: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} margin={{ top: 6, right: 12, left: 0, bottom: 6 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eadfda" />
                        <XAxis dataKey="name" tick={{ fill: '#6a5a52', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#6a5a52', fontSize: 12 }} allowDecimals={false} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {categoryData.map((entry, index) => (
                            <Cell key={`bar-${entry.name}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 8px 0', color: '#3d2a24', fontFamily: 'Gladolia, system-ui, sans-serif' }}>Fun facts</h3>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#4a3b34', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>
                  {funFacts.map((fact, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>{fact}</li>
                  ))}
                </ul>
              </div>
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 8px 0', color: '#3d2a24', fontFamily: 'Gladolia, system-ui, sans-serif' }}>Spotlight (All time)</h3>
                {stats.topPosts.length > 0 ? (
                  <div style={{ color: '#4a3b34', fontFamily: '"InterMedium", "Inter", system-ui, sans-serif' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#8b7b72' }}>Most favorited</div>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {stats.topPosts.map((post) => (
                        <div key={`${post.title}-${post.category}`} style={{ borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
                          <div style={{ fontSize: '16px', fontWeight: 700 }}>{post.title}</div>
                          <div style={{ marginTop: '4px', color: '#6a5a52' }}>{post.likes} favorites · {post.category}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#6a5a52' }}>No posts yet.</div>
                )}
              </div>
            </div>

            {sectorTops.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#3d2a24', fontFamily: 'Gladolia, system-ui, sans-serif', fontSize: '24px' }}>
                        Local Legends: Top 3 per Sector
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
                        {sectorTops.map((secData) => (
                            <div key={secData.sector} style={cardStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '2px solid #9C3A32', paddingBottom: '8px' }}>
                                    <h4 style={{ margin: 0, color: '#2b211e', fontFamily: 'Gladolia, system-ui, sans-serif', fontSize: '18px' }}>
                                        {secData.sector}
                                    </h4>
                                    <span style={{ fontSize: '11px', color: '#9C3A32', fontWeight: 700, textTransform: 'uppercase' }}>Top 3</span>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {secData.top3.map((post, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ 
                                                width: '24px', height: '24px', borderRadius: '50%', 
                                                background: idx === 0 ? '#FFD700' : (idx === 1 ? '#C0C0C0' : '#CD7F32'), 
                                                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                fontSize: '12px', fontWeight: 'bold', flexShrink: 0 
                                            }}>
                                                {idx + 1}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, color: '#333', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {post.title}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#777' }}>
                                                    {post.likes} likes • {post.category}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {secData.top3.length === 0 && <div style={{ color: '#888', fontSize: '13px' }}>No posts yet.</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

          </>
        )}
      </div>
    </div>
  );
};

export default InsightsPage;
