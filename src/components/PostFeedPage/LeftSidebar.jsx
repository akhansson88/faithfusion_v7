import React from 'react';

function LeftSidebar({ groups }) {
  return (
    <div className="sidebar left-sidebar">
      <h3>Groups</h3>
      <ul>
        {groups.map(group => (
          <li key={group.id}>{group.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default LeftSidebar;
