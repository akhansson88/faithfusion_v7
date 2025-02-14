import React, { useState, useEffect } from 'react';
import { ref, get, update, remove } from 'firebase/database';
import { rtdb } from '../../firebase';
import { format, isToday } from 'date-fns';

function RightSidebar({ scheduledPrayers, setScheduledPrayers, handleOpenPrayerModal, loading, error }) {
  const [totalPrayers, setTotalPrayers] = useState(0);
  const [totalPrayersPrayed, setTotalPrayersPrayed] = useState(0);

  useEffect(() => {
    // Calculate total prayers and total prayers prayed
    setTotalPrayers(scheduledPrayers.length);
    let totalPrayed = 0;
    scheduledPrayers.forEach(prayer => {
      totalPrayed += (prayer.prayerCount || 0);
    });
    setTotalPrayersPrayed(totalPrayed);
  }, [scheduledPrayers]);

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
        setScheduledPrayers(prevPrayers => {
          const updatedPrayers = prevPrayers.filter(prayer => prayer.id !== prayerId);
          return updatedPrayers;
        });
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
  );
}

export default RightSidebar;
