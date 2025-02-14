import React, { useState, useEffect } from 'react';
import { auth, rtdb } from '../firebase';
import { ref, push, update, get } from 'firebase/database';

function PrayerModal({ isOpen, onClose, editingPrayerId }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleType, setScheduleType] = useState('daily');
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    if (editingPrayerId) {
      // Fetch the prayer data to pre-populate the form
      const prayerRef = ref(rtdb, `scheduledPrayers/${editingPrayerId}`);
      get(prayerRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const prayerData = snapshot.val();
            setTitle(prayerData.title);
            setDescription(prayerData.description);
            setScheduleType(prayerData.scheduleType);
            setScheduledDate(prayerData.scheduledDate || '');
          } else {
            console.log("Prayer not found");
            onClose(); // Close the modal if the prayer is not found
          }
        })
        .catch((error) => {
          console.error("Error fetching prayer: ", error);
          onClose(); // Close the modal if there's an error
        });
    } else {
      // Reset the form if it's a new prayer
      setTitle('');
      setDescription('');
      setScheduleType('daily');
      setScheduledDate('');
    }
  }, [editingPrayerId, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title || !description) {
      alert('Please fill in all fields');
      return;
    }

    const prayer = {
      title: title,
      description: description,
      scheduleType: scheduleType,
      scheduledDate: scheduleType === 'once' ? scheduledDate : null,
    };

    // Save to Firebase
    if (editingPrayerId) {
      // Update existing prayer
      const prayerRef = ref(rtdb, `scheduledPrayers/${editingPrayerId}`);
      update(prayerRef, prayer)
        .then(() => {
          console.log('Prayer updated successfully');
          onClose();
        })
        .catch((error) => {
          console.error('Error updating prayer: ', error);
        });
    } else {
      // Create new prayer
      const prayersRef = ref(rtdb, 'scheduledPrayers');
      push(prayersRef, prayer)
        .then(() => {
          console.log('Prayer scheduled successfully');
          onClose();
        })
        .catch((error) => {
          console.error('Error scheduling prayer: ', error);
        });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>{editingPrayerId ? 'Edit Prayer' : 'Schedule a Prayer'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Title:
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Description:
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
          </label>
          <label>
            Schedule:
            <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="once">Once</option>
            </select>
          </label>
          {scheduleType === 'once' && (
            <label>
              Date:
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required />
            </label>
          )}
          <button type="submit">Save</button> {/* Changed button text */}
        </form>
      </div>
    </div>
  );
}

export default PrayerModal;
