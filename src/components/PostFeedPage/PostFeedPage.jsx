import React, { useState, useEffect } from 'react';
import { auth, rtdb, storage } from '../../firebase';
import { ref, onValue, get } from 'firebase/database';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { format, isToday } from 'date-fns';
import PrayerModal from '../PrayerModal';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import FeedContent from './FeedContent';

function PostFeedPage() {
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [scheduledPrayers, setScheduledPrayers] = useState([]);
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);
  const [editingPrayerId, setEditingPrayerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New states for post creation
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch posts
        const postsRef = ref(rtdb, 'posts');
        onValue(postsRef, (snapshot) => {
          const data = snapshot.val();
          const postsArray = data ? Object.entries(data).map(([id, post]) => ({ id, ...post })) : [];
          // Sort posts by timestamp in descending order (newest first)
          postsArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setPosts(postsArray);
        });

        // Fetch groups
        const groupsRef = ref(rtdb, 'groups');
        onValue(groupsRef, (snapshot) => {
          const data = snapshot.val();
          const groupsArray = data ? Object.entries(data).map(([id, group]) => ({ id, ...group })) : [];
          setGroups(groupsArray);
        });

        // Fetch scheduled prayers in real-time
        const prayersRef = ref(rtdb, 'scheduledPrayers');
        onValue(prayersRef, (snapshot) => {
          const data = snapshot.val();
          const prayersArray = data ? Object.entries(data).map(([id, prayer]) => ({ id, ...prayer })) : [];
          setScheduledPrayers(prayersArray);
        });
      } catch (err) {
        setError(err);
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleOpenPrayerModal = (prayerId = null) => {
    setEditingPrayerId(prayerId);
    setIsPrayerModalOpen(true);
  };

  const handleClosePrayerModal = () => {
    setIsPrayerModalOpen(false);
    setEditingPrayerId(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="post-feed-page">
      <LeftSidebar groups={groups} />
      <FeedContent
        posts={posts}
        postText={postText}
        setPostText={setPostText}
        postImage={postImage}
        setPostImage={setPostImage}
        previewImage={previewImage}
        setPreviewImage={setPreviewImage}
        scheduledPrayers={scheduledPrayers}
        setScheduledPrayers={setScheduledPrayers}
        loading={loading}
        error={error}
        handleOpenPrayerModal={handleOpenPrayerModal}
      />
      <RightSidebar
        scheduledPrayers={scheduledPrayers}
        setScheduledPrayers={setScheduledPrayers}
        handleOpenPrayerModal={handleOpenPrayerModal}
        loading={loading}
        error={error}
      />
      <PrayerModal
        isOpen={isPrayerModalOpen}
        onClose={handleClosePrayerModal}
        editingPrayerId={editingPrayerId}
      />
    </div>
  );
}

export default PostFeedPage;
