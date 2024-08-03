import React from 'react';
import VideoCall from './VideoCall';
import './App.css';
import { CssBaseline, Container, Typography } from '@mui/material';

function App() {
  return (
    <div className="App">
      <CssBaseline />
      <Container>
        <Typography variant="h2" align="center" gutterBottom>
          Video Calling App
        </Typography>
        <VideoCall />
      </Container>
    </div>
  );
}

export default App;
