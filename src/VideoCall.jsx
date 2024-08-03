import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { Button, Container, Grid, Typography, Paper } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import CallEndIcon from '@mui/icons-material/CallEnd';
import CameraSwitchIcon from '@mui/icons-material/CameraSwitch';

const VideoCall = () => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionRef = useRef(new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  }));
  const socketRef = useRef();
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [currentCamera, setCurrentCamera] = useState(0);
  const [cameras, setCameras] = useState([]);

  useEffect(() => {
    // Update the URL to your deployed backend
    socketRef.current = io('https://vc-backend-oih5.onrender.com');

    const peerConnection = peerConnectionRef.current;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        socketRef.current.emit('candidate', event.candidate);
      }
    };

    peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.streams);
      const [remoteStream] = event.streams;
      remoteVideoRef.current.srcObject = remoteStream;
    };

    socketRef.current.on('offer', async (offer) => {
      console.log('Received offer:', offer);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socketRef.current.emit('answer', answer);
    });

    socketRef.current.on('answer', async (answer) => {
      console.log('Received answer:', answer);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socketRef.current.on('candidate', (candidate) => {
      console.log('Received ICE candidate:', candidate);
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
    console.log('Sending offer:', offer);
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
    <Container>
      <Typography variant="h3" align="center" gutterBottom>
        Video Call
      </Typography>
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} md={6}>
          <Paper elevation={3}>
            <video ref={localVideoRef} autoPlay muted style={{ width: '100%' }} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3}>
            <video ref={remoteVideoRef} autoPlay style={{ width: '100%' }} />
          </Paper>
        </Grid>
      </Grid>
      <Grid container spacing={3} justifyContent="center" style={{ marginTop: '20px' }}>
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            startIcon={<VideocamIcon />}
            onClick={startCall}
            disabled={inCall}
          >
            Start Call
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<CallEndIcon />}
            onClick={endCall}
            disabled={!inCall}
          >
            End Call
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="default"
            startIcon={<CameraSwitchIcon />}
            onClick={switchCamera}
            disabled={!inCall || cameras.length < 2}
          >
            Switch Camera
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
};

export default VideoCall;
