import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';

const VideoCall = () => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionRef = useRef(new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  }));
  const socketRef = useRef();

  useEffect(() => {
    // Update the URL to your deployed backend
    socketRef.current = io('https://vc-backend-three.vercel.app');

    const peerConnection = peerConnectionRef.current;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('candidate', event.candidate);
      }
    };

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      remoteVideoRef.current.srcObject = remoteStream;
    };

    socketRef.current.on('offer', async (offer) => {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socketRef.current.emit('answer', answer);
    });

    socketRef.current.on('answer', async (answer) => {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socketRef.current.on('candidate', (candidate) => {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    (async () => {
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
      localVideoRef.current.srcObject = localStream;
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketRef.current.emit('offer', offer);
    })();

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  return (
    <div>
      <video ref={localVideoRef} autoPlay muted />
      <video ref={remoteVideoRef} autoPlay />
    </div>
  );
};

export default VideoCall;
