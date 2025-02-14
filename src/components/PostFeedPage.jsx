import React, { useState, useEffect } from 'react';
import { auth, rtdb, storage } from '../firebase';
import { ref, push, onValue, remove, update, get } from 'firebase/database';
import { format, isToday } from 'date-fns';
import PrayerModal from './PrayerModal';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';

function PostFeedPage() {
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [scheduledPrayers, setScheduledPrayers] = useState([]);
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);
  const [editingPrayerId, setEditingPrayerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPrayers, setTotalPrayers] = useState(0);
  const [totalPrayersPrayed, setTotalPrayersPrayed] = useState(0);

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

          // Calculate total prayers and total prayers prayed
          setTotalPrayers(prayersArray.length);
          let totalPrayed = 0;
          prayersArray.forEach(prayer => {
            totalPrayed += (prayer.prayerCount || 0);
          });
          setTotalPrayersPrayed(totalPrayed);
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setPostImage(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleAddPost = async () => {
    if (!postText && !postImage) {
      alert('Please enter text or upload an image');
      return;
    }

    setLoading(true); // Start loading

    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Please login to create a post.');
        return;
      }

      const post = {
        text: postText,
        userId: user.uid,
        timestamp: new Date().toISOString(),
      };

      if (postImage) {
        const imageRef = storageRef(storage, `postImages/${user.uid}/${Date.now()}-${postImage.name}`);
        const snapshot = await uploadBytes(imageRef, postImage);
        const imageUrl = await getDownloadURL(snapshot.ref);
        post.imageUrl = imageUrl;
      }

      const postsRef = ref(rtdb, 'posts');
      await push(postsRef, post);

      // Clear the input fields and preview
      setPostText('');
      setPostImage(null);
      setPreviewImage(null);
    } catch (error) {
      setError(error);
      console.error("Error creating post:", error);
      alert('Failed to create post.');
    } finally {
      setLoading(false); // End loading
    }
  };

  const handleOpenPrayerModal = (prayerId = null) => {
    setEditingPrayerId(prayerId);
    setIsPrayerModalOpen(true);
  };

  const handleClosePrayerModal = () => {
    setIsPrayerModalOpen(false);
    setEditingPrayerId(null);
  };

  const handlePrayed = async (prayerId) => {
    try {
      const prayerRef = ref(rtdb, `scheduledPrayers/${prayerId}`);
      const archivedPrayerRef = ref(rtdb, `archivedPrayers/${prayerId}`);
      const prayerCountRef = ref(rtdb, `scheduledPrayers/${prayerId}/prayerCount`);

      // Get the prayer data
      const snapshot = await get(prayerRef);
      if (snapshot.exists()) {
        const prayerData = snapshot.val();

        // Increment the prayer count
        const currentCount = prayerData.prayerCount || 0;
        const newCount = currentCount + 1;

        // Update the prayer count
        await update(prayerCountRef, newCount);
        console.log("Prayer count updated successfully.");

        // Set the prayer data in the archive
        await update(archivedPrayerRef, prayerData);
        console.log("Prayer archived successfully.");

        // Remove the prayer from the scheduled prayers
        await remove(prayerRef);
        console.log("Prayer removed from scheduled prayers.");

        // Update the state to reflect the changes
        setScheduledPrayers(prevPrayers => prevPrayers.filter(prayer => prayer.id !== prayerId));
        setTotalPrayersPrayed(prevCount => prevCount + 1);
        setTotalPrayers(prevTotal => prevTotal - 1);

      } else {
        console.log("Prayer not found");
      }
    } catch (error) {
      console.error("Error handling prayed action: ", error);
    }
  };

  const handleDeletePrayer = (prayerId) => {
    const prayerRef = ref(rtdb, `scheduledPrayers/${prayerId}`);
    const archivedPrayerRef = ref(rtdb, `archivedPrayers/${prayerId}`);

    // Remove the prayer from scheduled prayers
    remove(prayerRef)
      .then(() => {
        console.log("Prayer deleted successfully.");
        // Remove the prayer from archived prayers (if it exists)
        remove(archivedPrayerRef)
          .then(() => {
            console.log("Prayer deleted from archive (if it existed).");
          })
          .catch((error) => {
            console.error("Error deleting prayer from archive: ", error);
          });

        // Update the state to reflect the removal
        setScheduledPrayers(prevPrayers => prevPrayers.filter(prayer => prayer.id !== prayerId));
        setTotalPrayers(prevTotal => prevTotal - 1);
      })
      .catch((error) => {
        console.error("Error deleting prayer: ", error);
      });
  };

  const getPrayersForToday = () => {
    return scheduledPrayers.filter(prayer => {
      if (prayer.scheduleType === 'daily') {
        return true;
      } else if (prayer.scheduleType === 'once') {
        return isToday(new Date(prayer.scheduledDate));
      }
      return false;
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="post-feed-page">
      <div className="sidebar left-sidebar">
        <h3>Groups</h3>
        <ul>
          {groups.map(group => (
            <li key={group.id}>{group.name}</li>
          ))}
        </ul>
      </div>

      <div className="feed">
        <h2>Faith-Based Feed</h2>

        {/* Post Creation Section */}
        <div className="post-creation">
          <div className="post-creation-input">
            <textarea
              placeholder="What's on your mind?"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
            />
          </div>
          <div className="post-creation-actions">
            <label htmlFor="image-upload" className="upload-button">
              Upload Image
            </label>
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
            <button onClick={handleAddPost} disabled={loading}>
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
          {previewImage && (
            <img src={previewImage} alt="Preview" className="preview-image" />
          )}
        </div>

        {/* Display Posts */}
        {posts.map(post => (
          <div key={post.id} className="post">
            <div className="post-header">
              {/* Placeholder for user info (profile pic, name) */}
              <div className="user-info">User Name</div>
              <div className="timestamp">{format(new Date(post.timestamp), 'MMM dd, yyyy h:mm a')}</div>
            </div>
            <div className="post-content">
              {post.imageUrl && <img src={post.imageUrl} alt="Post Image" className="post-image" />}
              <p>{post.text}</p>
            </div>
            <div className="post-actions">
              {/* Placeholder for like, comment, share buttons */}
              <button>Like</button>
              <button>Comment</button>
              <button>Share</button>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar right-sidebar">
        <h3>Scheduled Prayers</h3>
        <ul>
          {getPrayersForToday().map(prayer => (
            <li key={prayer.id}>
              <h4>{prayer.title}</h4>
              <p>{prayer.description}</p>
              <div className="prayer-actions">
                <button onClick={() => handlePrayed(prayer.id)}>Prayed</button>
                <button onClick={() => handleOpenPrayerModal(prayer.id)} style={{ marginLeft: '10px' }}>Edit</button>
                <button onClick={() => handleDeletePrayer(prayer.id)} style={{ marginLeft: '10px' }}>Delete</button>
              </div>
              <p>Prayed {prayer.prayerCount || 0} times</p>
            </li>
          ))}
        </ul>
        <button onClick={() => handleOpenPrayerModal()}>Schedule Prayer</button>

        {/* Prayer Statistics */}
        <div className="prayer-stats">
          <h4>Prayer Statistics</h4>
          <p>Total Prayers: {totalPrayers}</p>
          <p>Total Prayers Prayed: {totalPrayersPrayed}</p>
        </div>
      </div>

      <PrayerModal
        isOpen={isPrayerModalOpen}
        onClose={handleClosePrayerModal}
        editingPrayerId={editingPrayerId}
      />
    </div>
  );
}

export default PostFeedPage;
