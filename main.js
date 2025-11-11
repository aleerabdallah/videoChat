let stream = null;
let myPeerConnection;

const ws = new WebSocket("ws://192.168.1.72:8000/ws");

const sessionID = crypto.randomUUID();

const toggleCamera = document.getElementById("toggleCameraBtn");
const localStream = document.getElementById("localStream");
const startCallBtn = document.getElementById("startCall");
const remoteVideo = document.getElementById("remoteStream");

window.onload = async function () {
  await createPeerConnection();
  console.log(myPeerConnection);
};

ws.addEventListener("close", (event) => {
  console.log("WebSocket closed:", event.code, event.reason);
});

ws.addEventListener("open", () => {
  console.log("Connected to the WebSocket server");
});

ws.addEventListener("message", async (event) => {
  data = JSON.parse(event.data);
  //console.log(data);
  if (data.candidate && data.session !== sessionID) {
    await myPeerConnection.addIceCandidate(data.candidate);
  }
  if (data.offer && data.session !== sessionID) {
    console.log("You are the user that's supposed to recieve this offer");
    await createPeerConnection();

    myPeerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer),
    );
    const answer = await myPeerConnection.createAnswer();
    await myPeerConnection.setLocalDescription(answer);

    ws.send(
      JSON.stringify({
        session: sessionID,
        answer: myPeerConnection.localDescription,
      }),
    );
  } else if (data.answer && data.session !== sessionID) {
    console.log("This answer is for you");
    await myPeerConnection.setRemoteDescription(
      new RTCSessionDescription(data.answer),
    );
  }

  //logConnectionState();
});

toggleCamera.addEventListener("click", async function () {
  const icon = this.querySelector("i");
  if (stream === null) {
    const constraints = {
      video: true,
      audio: true,
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);

    stream.getVideoTracks()[0].enabled = true;

    icon.className = "fas fa-video";
    this.classList.remove("bg-red-500");
    this.classList.add("bg-green-100");

    localStream.srcObject = stream;
    stream.getTracks().forEach((track) => {
      myPeerConnection.addTrack(track, stream);
    });
    console.log(myPeerConnection);
  } else {
    stream.getVideoTracks()[0].stop();
    stream = null;
    this.classList.add("bg-red-500");
    icon.className = "fas fa-video-slash";
    this.classList.remove("bg-green-100");
    this.classList.add("bg-red-500");
    console.log(myPeerConnection);
  }
});

startCallBtn.addEventListener("click", async function () {
  const offer = await myPeerConnection.createOffer();
  await myPeerConnection.setLocalDescription(offer);
  ws.send(
    JSON.stringify({
      session: sessionID,
      offer: myPeerConnection.localDescription,
    }),
  );
  console.log("Peer Connection Status after sending offer: ", myPeerConnection);
});

async function createPeerConnection() {
  const configuration = {
    iceServers: [
      {
        urls: "",
      },
    ],
  };
  myPeerConnection = new RTCPeerConnection();
  myPeerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      console.log("Candiate event");
      ws.send(
        JSON.stringify({
          session: sessionID,
          type: "candidate",
          candidate: event.candidate,
        }),
      );
    }
  };

  myPeerConnection.addEventListener("track", async (event) => {
    const [remoteStream] = event.streams;
    console.log(remoteStream);
    remoteVideo.srcObject = remoteStream;
  });

  //logConnectionState();
}

function logConnectionState() {
  console.log("Connection State: ", myPeerConnection.connectionState);
  console.log(
    "Can TrickleIceCandidates: ",
    myPeerConnection.canTrickleIceCandidates,
  );
  console.log("LocalDescription: ", myPeerConnection.localDescription);
  console.log(
    "Current LocalDescription: ",
    myPeerConnection.currentLocalDescription,
  );
  console.log("RemoteDescription: ", myPeerConnection.remoteDescription);
  console.log(
    "Current RemoteDescription: ",
    myPeerConnection.currentLocalDescription,
  );
  console.log("ICE Connection state: ", myPeerConnection.iceConnectionState);

  console.log("Signaling State: ", myPeerConnection.signalingState);
}
