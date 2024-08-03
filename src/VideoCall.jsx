import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import './VideoCall.css';

const VideoCall = () => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionRef = useRef(new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  }));
  const socketRef = useRef();
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [currentCamera, setCurrentCamera] = useState(0);
  const [cameras, setCameras] = useState([]);

  useEffect(() => {
    socketRef.current = io('https://vc-backend-oih5.onrender.com');

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
      if (!peerConnection.currentRemoteDescription) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socketRef.current.emit('answer', answer);
      }
    });

    socketRef.current.on('answer', async (answer) => {
      if (!peerConnection.currentRemoteDescription) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socketRef.current.on('candidate', (candidate) => {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const startCall = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    setCameras(videoDevices);
    const localStream = await getUserMedia(videoDevices[0].deviceId);
    setLocalStream(localStream);
    localStream.getTracks().forEach((track) => peerConnectionRef.current.addTrack(track, localStream));
    localVideoRef.current.srcObject = localStream;
    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);
    socketRef.current.emit('offer', offer);
    setInCall(true);
  };

  const getUserMedia = async (deviceId) => {
    const constraints = {
      video: { deviceId: deviceId ? { exact: deviceId } : undefined },
      audio: true
    };
    return await navigator.mediaDevices.getUserMedia(constraints);
  };

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const newCameraIndex = (currentCamera + 1) % cameras.length;
    const newStream = await getUserMedia(cameras[newCameraIndex].deviceId);
    const videoTrack = newStream.getVideoTracks()[0];
    const sender = peerConnectionRef.current.getSenders().find(s => s.track.kind === videoTrack.kind);
    sender.replaceTrack(videoTrack);
    setCurrentCamera(newCameraIndex);
    setLocalStream(newStream);
    localVideoRef.current.srcObject = newStream;
  };

  const endCall = () => {
    peerConnectionRef.current.close();
    setInCall(false);
  };

  return (
    <div className="video-call-container">
      <div className="video-container">
        <video ref={localVideoRef} autoPlay muted className="video" />
        <video ref={remoteVideoRef} autoPlay className="video" />
      </div>
      <div className="controls">
        <button onClick={startCall} disabled={inCall}>Start Call</button>
        <button onClick={endCall} disabled={!inCall}>End Call</button>
        <button onClick={switchCamera} disabled={!inCall || cameras.length < 2}>Switch Camera</button>
      </div>
    </div>
  );
};

export default VideoCall;
