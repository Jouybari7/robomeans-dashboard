import React from "react";


function VideoStream({ robotId }) {
  const streamUrl = `http://your-streaming-server.com/stream/${robotId}`; // Replace this with your real video source

  return (
    <div style={{ marginTop: 20 }}>
      <h4>Live Camera Stream</h4>
      <img src={streamUrl} alt="Robot Live Stream" width="640" height="480" />
    </div>
  );
}

export default VideoStream;
