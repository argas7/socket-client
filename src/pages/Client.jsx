import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';

function Client() {
  const [yourID, setYourID] = useState('');
  const [users, setUsers] = useState({});
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();

  useEffect(() => {
    socket.current = io.connect('https://testsocketexample.herokuapp.com/');
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (userVideo.current) userVideo.current.srcObject = stream;
      });

    socket.current.on('myID', (id) => setYourID(id));

    socket.current.on('allUsers', (users) => setUsers(users));

    socket.current.on('call', (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });
  }, []);

  function callPeer(id) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on('signal', (data) => {
      socket.current.emit('callUser', { userToCall: id, signalData: data, from: yourID });
    });

    peer.on('stream', (stream) => {
      if (partnerVideo.current) partnerVideo.current.srcObject = stream;
    });

    socket.current.on('callAccepted', (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });
  }

  function acceptCall() {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on('signal', (data) => {
      socket.current.emit('acceptCall', { signal: data, to: caller });
    });

    peer.on('stream', (stream) => {
      partnerVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
  }

  let UserVideo;
  if (stream) {
    UserVideo = (
      <video playsInline muted ref={userVideo} autoPlay />
    );
  }

  let PartnerVideo;
  if (callAccepted) {
    PartnerVideo = (
      <video playsInline ref={partnerVideo} autoPlay />
    );
  }
  let incomingCall;
  if (receivingCall) {
    incomingCall = (
      <div>
        <h1>{caller} está ligando</h1>
        <button onClick={acceptCall}>Atender</button>
      </div>
    );
  }

  return (
    <div className="client">
      <div>
        {UserVideo}
        {PartnerVideo}
      </div>
      <div>
        {Object.keys(users).map((key) => {
          if (key === yourID) return null;
          return (<button onClick={() => callPeer(key)}>Ligue para {key}</button>);
        })}
      </div>
      <div>{incomingCall}</div>
    </div>
  );
}

export default Client;
