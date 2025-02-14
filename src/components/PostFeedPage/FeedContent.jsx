import React, { useState } from 'react';
import { auth, storage } from '../../firebase';
import { ref, push } from 'firebase/database';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { rtdb } from '../../firebase';
import { format } from 'date-fns';

function FeedContent({
  posts,
  postText,
  setPostText,
  postImage,
  setPostImage,
  previewImage,
  setPreviewImage,
  handleOpenPrayerModal,
  loading,
  error,
  scheduledPrayers,
  setScheduledPrayers
}) {

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

    loading = true; // Start loading

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
      error = error;
      console.error("Error creating post:", error);
      alert('Failed to create post.');
    } finally {
      loading = false; // End loading
    }
  };

  return (
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
  );
}

export default FeedContent;
