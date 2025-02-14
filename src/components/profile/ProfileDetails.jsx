import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, storage, rtdb } from '../../firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, onValue } from 'firebase/database';
import countries from '../../data/countries';

function ProfileDetails() {
  const [profile, setProfile] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [interests, setInterests] = useState([]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (auth.currentUser) {
        const user = auth.currentUser;
        const userId = user.uid;

        // Real-time listener for profile data
        const userRef = dbRef(rtdb, `users/${userId}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.val());
          } else {
            console.log("No profile data available");
            setProfile(null);
          }
        });

        // Fetch profile image (not real-time, fetched once)
        const profileImageRef = ref(storage, `profileImages/${userId}/profileImage`);
        try {
          const url = await getDownloadURL(profileImageRef);
          setProfileImageUrl(url);
        } catch (error) {
          console.error("Error fetching profile image:", error);
          setProfileImageUrl(null);
        }

        // Real-time listener for interests
        const interestsRef = dbRef(rtdb, `users/${userId}/interests`);
        onValue(interestsRef, (snapshot) => {
          if (snapshot.exists()) {
            setInterests(snapshot.val());
          } else {
            setInterests([]);
          }
        });
      }
    };

    fetchProfileData();
  }, []);

  // Helper function to calculate age
  const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const month = today.getMonth() - birthDate.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Helper function to get country name from code
  const getCountryName = (countryCode) => {
    const country = countries.find(c => c.code === countryCode);
    return country ? country.name : 'Unknown';
  };

  if (!profile) {
    return <div>Loading profile...</div>;
  }

  const age = calculateAge(profile.birthdate);
  const countryName = getCountryName(profile.country);

  return (
    <div className="profile-wrapper">
      <div className="profile-header-section">
        <div className="profile-cover">
          <div className="profile-picture-wrapper">
            <div className="profile-picture">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span>No profile image</span>
              )}
            </div>
          </div>
        </div>
        <div className="profile-intro">
          <h1>{profile.fullName}</h1>
          <p className="profile-details-bio">A faithful member of the Christian community</p>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h2>Personal Information</h2>
          <div className="profile-details-grid">
            <div><strong>Full Name:</strong></div><div>{profile?.fullName}</div>
            <div><strong>Age:</strong></div><div>{age !== null ? age : 'Unknown'}</div>
            <div><strong>Country:</strong></div><div>{countryName}</div>
            <div><strong>Occupation:</strong></div><div>{profile?.occupation}</div>
            <div><strong>Location:</strong></div><div>{profile?.location}</div>
            <div><strong>Became Christian:</strong></div><div>{profile?.becameChristian}</div>
            <div><strong>Baptised:</strong></div><div>{profile?.baptised}</div>
          </div>
        </div>

        <div className="profile-section">
          <h2>Faith Journey</h2>
          <div className="profile-details-grid">
            <div><strong>Denomination:</strong></div><div>{profile?.denomination}</div>
            <div><strong>Church Name:</strong></div><div>{profile?.churchName}</div>
            <div><strong>About Faith:</strong></div><div>{profile?.aboutFaith}</div>
          </div>
        </div>

        <div className="profile-section">
          <h2>Interests & Preferences</h2>
          <div className="profile-details-grid">
            <div><strong>Hobbies:</strong></div><div>{profile?.hobbies}</div>
            <div><strong>Favorite Verse:</strong></div><div>{profile?.favoriteVerse}</div>
            <div><strong>About Me:</strong></div><div>{profile?.aboutMe}</div>
          </div>
        </div>

        <div className="profile-section">
          <h2>Interests</h2>
          <div className="interests-list">
            {interests && interests.map((interest, index) => (
              <span key={index} className="interest-badge">
                {interest}
              </span>
            ))}
          </div>
        </div>
        <Link to="/profile" className="button">Edit Profile</Link>
      </div>
    </div>
  );
}

export default ProfileDetails;
