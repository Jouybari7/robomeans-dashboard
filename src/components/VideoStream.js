import React from 'react';

const VideoStream = ({ robotId }) => {
  const streamUrl = `https://your-secure-streaming-server.com/stream/${robotId}`;
  return (
    <div style={{ marginTop: 20 }}>
      <h4>Live Feed</h4>
      <img src={streamUrl} alt="Live stream" width="640" height="480" />
    </div>
  );
};

export default VideoStream;
