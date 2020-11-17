
import './lib/webaudio-controls.js';

const getBaseURL = () => {
  const base = new URL('.', import.meta.url);
  console.log("Base = " + base);
  return `${base}`;
};

const template = document.createElement("template");
template.innerHTML = `
  <style>

    #mute,#playButton,#moins5s,#plus5s,#replay,#slowMode,#speedMode,#pauseButton {
      color:yellow;
      background:black;
      width: 60px;
      height: 40px;
      font-size: 160%;
      vertical-align: top;
    }

    #playButton {
      color:green;
      background:black;
      margin-left:2%;
    }

    #pauseButton {
      color:orange;
      background:black;
    }

    #mute {
      color:red;
      background:black;
    }

    #slowMode {
      width: 60px;
      height: 40px;
      font-size: 160%;
    }

    .progress {
      width:70%;
      height:15px;
  }

    canvas {
      border: 1px solid black;
      margin-top: 45px;
      width:100%;

    }

    #knobStereo{
        left: 90%;
    }

    #knobStereo,#knobVolume{
      margin-top: 10px;
    }

    #moins5s{
      margin-left:30%;
    }

    #slowMode{
      margin-left:33%;
    }

    .eq{
      font-size : 9px;
      color:red;
      display:inline-block;
      margin-right: 20%;
      margin-left:20%;
      margin-top:-50px;    }

      #a{
        margin-left:20%;
      }

  </style>
    
    <audio id="myPlayer" preload="auto" crossorigin>
        <source src="./myComponents/assets/audio/AC_DC.mp3" type="audio/mp3" />
    </audio>
    <webaudio-knob id="knobVolume" tooltip="Volume:%s" src="./assets/imgs/vintage.png" sprites="50" value=0.5 min="0" max="1" step=0.01>
    Volume</webaudio-knob>

    <webaudio-knob id="knobStereo" tooltip="Balance:%s" src="./assets/imgs/balance.png" sprites="127" value=0 min="-1" max="1" step=0.01>
    Balance G/D</webaudio-knob>

    <div class="eq">

    <label>60Hz</label>
    <webaudio-knob id="hz60" tooltip="Equalizer:%s" src="./assets/imgs/gain0.png" sprites="60" value="0" step="1" min="-30" max="30" step="1" width=200 height=30></webaudio-knob>
    <output id="gain0">0 dB</output>

    <label>170Hz</label>
    <webaudio-knob id="hz70" tooltip="Equalizer:%s" src="./assets/imgs/gain0.png" sprites="60" value="0" step="1" min="-30" max="30" step="1" width=200 height=30></webaudio-knob>
    <output id="gain1">30 dB</output>

    <label>350Hz</label>
    <webaudio-knob id="hz350" tooltip="Equalizer:%s" src="./assets/imgs/gain0.png" sprites="60" value="0" step="1" min="-30" max="30" step="1" width=200 height=30></webaudio-knob>
    <output id="gain1">0 dB</output>

    <label>1000Hz</label>
    <webaudio-knob id="hz1000" tooltip="Equalizer:%s" src="./assets/imgs/gain0.png" sprites="60" value="0" step="1" min="-30" max="30" step="1" width=200 height=30></webaudio-knob>
    <output id="gain0">0 dB</output>
    
    <label id ="a">3500Hz</label>
    <webaudio-knob id="hz3500" tooltip="Equalizer:%s" src="./assets/imgs/gain0.png" sprites="60" value="0" step="1" min="-30" max="30" step="1" width=200 height=30></webaudio-knob>
    <output id="gain1">0 dB</output>

    <label>10000Hz</label>
    <webaudio-knob id="hz10000" tooltip="Equalizer:%s" src="./assets/imgs/gain0.png" sprites="60" value="0" step="1" min="-30" max="30" step="1" width=200 height=30></webaudio-knob>
    <output id="gain1">0 dB</output>

    </div>

    



        <canvas id="myCanvas" width=1500 height=540></canvas>
        <webaudio-slider class="progress" height="20" width="1690" id="progressRuler" min="0" step="0.01" value="0" src="./assets/imgs/slider.png" ></webaudio-slider>
        <br>
        <br>
        <button id="playButton">⏵</button>
        <button id="pauseButton">⏸</button>
        <button id="mute">🔇</button>
        <button id="moins5s">⏮</button>
        <button id="replay">↺</button>
        <button id="plus5s">⏭</button>
        <button id="slowMode">🐢</button>
        <button id="speedMode">🚀</button>
        `;

class MyAudioPlayer extends HTMLElement {
  constructor() {
    super();
    this.volume = 1;
    this.attachShadow({ mode: "open" });
    //this.shadowRoot.innerHTML = template;
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.basePath = getBaseURL(); // url absolu du composant
    // Fix relative path in WebAudio Controls elements
    this.fixRelativeImagePaths();
  }

  connectedCallback() {
    this.player = this.shadowRoot.querySelector("#myPlayer");
    this.player.loop = true;

    // get the canvas, its graphic context...
    this.canvas = this.shadowRoot.querySelector("#myCanvas");
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.canvasContext = this.canvas.getContext('2d');

    //contexte webAudio
    let audioContext = new AudioContext();

    //Chrome correction warning
    let mediaElement = this.shadowRoot.getElementById('myPlayer');
    mediaElement.onplay = (e) => { audioContext.resume(); }
    mediaElement.addEventListener('play', () => audioContext.resume());

    let playerNode = audioContext.createMediaElementSource(this.player);
    this.pannerNode = audioContext.createStereoPanner();
    this.filters = [];

    // Create an analyser node
    this.analyserNode = audioContext.createAnalyser();
    // set visualizer options, for lower precision change 1024 to 512,
    // 256, 128, 64 etc. bufferLength will be equal to fftSize/2
    this.analyserNode.fftSize = 512;
    this.bufferLength = this.analyserNode.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);

    // create the equalizer. It's a set of biquad Filters

    // Set filters
    [60, 170, 350, 1000, 3500, 10000].forEach((freq, i) => {
      var eq = audioContext.createBiquadFilter();
      eq.frequency.value = freq;
      eq.type = "peaking";
      eq.gain.value = 0;
      this.filters.push(eq);
    });

    // Connect filters in serie
    playerNode.connect(this.filters[0]);
    for (var i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1]);
    }

    // connect the last filter to the speakers
    this.filters[this.filters.length - 1].connect(this.pannerNode);
    this.pannerNode.connect(this.analyserNode);
    this.analyserNode.connect(audioContext.destination);
    /*
        playerNode
        .connect(this.pannerNode)
        .connect(this.analyserNode)
        .connect(audioContext.destination); // connect to the speakers
    */
    this.visualize();
    this.declareListeners();
  }

  visualize() {
    // 1 effacer le canvas
    this.canvasContext.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.canvasContext.clearRect(0, 0, this.width, this.height);

    // 2 - Get the analyser data - for waveforms we need time domain data
    this.analyserNode.getByteTimeDomainData(this.dataArray);

    // 3 - draws the waveform
    this.canvasContext.lineWidth = 8;
    //this.canvasContext.strokeStyle = 'red';
    //couleur graph
    let gradient = this.canvasContext.createLinearGradient(100, 550, 170, 0);
    gradient.addColorStop("0", "magenta");
    gradient.addColorStop("0.4", "blue");
    gradient.addColorStop("1.0", "red");
    this.canvasContext.strokeStyle = gradient;

    // the waveform is in one single path, first let's
    // clear any previous path that could be in the buffer
    this.canvasContext.beginPath();
    var sliceWidth = this.width / this.bufferLength;
    var x = 0;

    for (var i = 0; i < this.bufferLength; i++) {
      // dataArray values are between 0 and 255,
      // normalize v, now between 0 and 1
      var v = this.dataArray[i] / 255;
      // y will be in [0, canvas height], in pixels
      var y = v * this.height;

      if (i === 0) {
        this.canvasContext.moveTo(x, y);
      } else {
        this.canvasContext.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.canvasContext.lineTo(this.width, this.height / 2);
    // draw the path at once
    this.canvasContext.stroke();


    // 3 rappel animation
    requestAnimationFrame(() => { this.visualize() });
  }

  changeGain(sliderVal, nbFilter) {
    var value = parseFloat(sliderVal);
    this.filters[nbFilter].gain.value = value;
    // update output labels
    var output = this.shadowRoot.querySelector("#gain" + nbFilter);
    output.value = value + " dB";
  }

  fixRelativeImagePaths() {
    // change webaudiocontrols relative paths for spritesheets to absolute
    let webaudioControls = this.shadowRoot.querySelectorAll(
      'webaudio-knob, webaudio-slider, webaudio-switch, img'
    );
    webaudioControls.forEach((e) => {
      let currentImagePath = e.getAttribute('src');
      if (currentImagePath !== undefined) {
        //console.log("Got wc src as " + e.getAttribute("src"));
        let imagePath = e.getAttribute('src');
        //e.setAttribute('src', this.basePath  + "/" + imagePath);
        e.src = this.basePath + "/" + imagePath;
        //console.log("After fix : wc src as " + e.getAttribute("src"));
      }
    });
  }

  declareListeners() {
    this.shadowRoot.querySelector("#playButton").addEventListener("click", (event) => {
      console.log("Lancement de la musique")
      this.play();
    });

    this.shadowRoot.querySelector("#pauseButton").addEventListener("click", (event) => {
      console.log("Mise en pause de la musique")
      this.pause();
    });

    // rajoute -5 sec 
    this.shadowRoot.querySelector("#moins5s").addEventListener("click", (event) => {
      console.log("Retour de 5s")
      this.moins5s();
    });

    // replay
    this.shadowRoot.querySelector("#replay").addEventListener("click", (event) => {
      console.log("Replay de la musique")
      this.replay();
    });

    //on rajoute +5 sec
    this.shadowRoot.querySelector("#plus5s").addEventListener("click", (event) => {
      console.log("Avancement de 5s")
      this.plus5s();
    });

    //quand la souris passe sur le bouton mute il se mute
    this.shadowRoot.querySelector("#mute").addEventListener("mouseenter", (event) => {
      console.log("Son muté car souris sur le bouton")
      this.mute();
    });

    //quand la souris va en dehors du bouton mute, on remet le son
    this.shadowRoot.querySelector("#mute").addEventListener("mouseout", (event) => {
      console.log("Son unmute car souris en dehors du bouton")
      this.mute();
    });

    //on reduit la vitesse de 50%
    this.shadowRoot.querySelector("#slowMode").addEventListener("click", (event) => {
      console.log("Slow mode activé")
      this.vitesseRalenti();
    });

    //on augmente la vitesse de 50%
    this.shadowRoot.querySelector("#speedMode").addEventListener("click", (event) => {
      console.log("Speed mode activé")
      this.vitesseAccelere();
    });


   //60Hz
   this.shadowRoot.querySelector("#hz60").addEventListener("change", (event) => {
    this.changeGain(event.target.value, 0);
  });

   //170Hz
   this.shadowRoot.querySelector("#hz70").addEventListener("change", (event) => {
    this.changeGain(event.target.value, 1);
  });

   //350Hz
   this.shadowRoot.querySelector("#hz350").addEventListener("change", (event) => {
    this.changeGain(event.target.value, 2);
  });

   //1000Hz
   this.shadowRoot.querySelector("#hz1000").addEventListener("change", (event) => {
    this.changeGain(event.target.value, 3);
  });

   //3500Hz
   this.shadowRoot.querySelector("#hz3500").addEventListener("change", (event) => {
    this.changeGain(event.target.value, 4);
  });

   //10000Hz
   this.shadowRoot.querySelector("#hz10000").addEventListener("change", (event) => {
    this.changeGain(event.target.value, 5);
  });

    //volume
    this.shadowRoot
      .querySelector("#knobVolume")
      .addEventListener("input", (event) => {
        console.log("Nouvelle valeur du volume = " + event.target.value)
        this.setVolume(event.target.value);
      });

    //stereo
    this.shadowRoot
      .querySelector("#knobStereo")
      .addEventListener("input", (event) => {
        console.log("Nouvelle valeur du stereo = " + event.target.value)
        this.setBalance(event.target.value);
      });

      this.shadowRoot.querySelector("#progressRuler").addEventListener("change", (event) => {
        this.setActualTime(event.target.value);
        console.log("time = " + event.target.currentTime)
        

    });

    //progressbar  
    
    this.player.addEventListener('timeupdate', (event) => {
      console.log("time = " + event.target.currentTime)
      let p = this.shadowRoot.querySelector("#progressRuler");
      try {
        p.max = this.player.duration.toFixed(2);
        p.value = this.player.currentTime;
      } catch (err) {

      }


    })
    
  }

  // API
  setVolume(val) {
    this.player.volume = val;
  }

  setBalance(val) {
    this.pannerNode.pan.value = val;
  }

  setActualTime(val) {
        this.player.currentTime = val;
    }

  play() {
    this.player.play();
    this.player.playbackRate = 1;
  }

  pause() {
    this.player.pause();
  }

  replay() {
    this.player.currentTime = 0;
  }

  mute(val) {
  if(this.player.muted == false ) {
      this.player.muted = true;
  } else {
      this.player.muted = false;
  }
}

  plus5s() {
    this.player.currentTime += 5;
  }

  moins5s() {
    this.player.currentTime -= 5;
  }

  vitesseAccelere() {
    this.player.playbackRate = 1.5;
  }

  vitesseRalenti() {
    this.player.playbackRate = 0.5;
  }
}

customElements.define("my-audioplayer", MyAudioPlayer);
