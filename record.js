/*
Record audio from the browser using streams and promises
*/

var spectrogram = []; 
const freqBins = 20000;
const overlap = 17000;

const freq = 10000;
const volume = 0.5;
const type = 'sine';

//document.getElementById("ex").innerHTML = "Type of Exercise: " + ex;

const recordAudio = () =>
  new Promise(async resolve => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks = [];

    mediaRecorder.addEventListener("dataavailable", event => {
      audioChunks.push(event.data);
    });

    const start = () => mediaRecorder.start();

    const stop = () =>
      new Promise(resolve => {
        mediaRecorder.addEventListener("stop", () => {
          const audioBlob = new Blob(audioChunks);
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          const play = () => audio.play();
          resolve({ audioBlob, audioUrl, play });
        });

        mediaRecorder.stop();
      });

    resolve({ start, stop });
  });

var audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
var osc;

let recorder = null;
const actionButton = document.getElementById('record');
let audio = null;

const startRecord = async() => {
    var start_time = new Date();
    var timestamp = start_time.getFullYear() + "_" + start_time.getMonth() + "_" + start_time.getDate() + "_" + start_time.getHours() + "_" + start_time.getMinutes() + "_" + start_time.getSeconds();
    
    faudio = timestamp + "_audio.wav";
    fnotes = timestamp + "_audioNotes.json";
    
    //play tone
    osc = audioCtx.createOscillator();
    var gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
  
    gainNode.gain.value = volume;
    osc.frequency.value = freq;
    osc.type = type;
    
    if (osc.noteOn) osc.noteOn(0); //old browsers
    if (osc.start) osc.start(); //new browsers

    console.log("Recording started...");
    recorder = await recordAudio();
    recorder.start();

    //disable and enable buttons
    document.getElementById("start").disabled = true;
    document.getElementById("stop").disabled = false;
};
const stopRecord = async () => {
    if (recorder) {
        audio = await recorder.stop();
        
        //stop tone
        if (osc.noteOff) osc.noteOff(0); //old browsers
        if (osc.stop) osc.stop(); //new browsers
        console.log("recording ended");
        recorder = null;

        //disable and enable buttons
        document.getElementById("stop").disabled = true;
        document.getElementById("start").disabled = false;
    }
};

function decodePredictions(arr) {
    if (arr[0] == 1) return "arm lift";
    if (arr[1] == 1) return "bicep curl";
    if (arr[2] == 1) return "chair stand";
    if (arr[3] == 1) return "non exercise";
}

const predict = async () => {
    var model = await loadModel();

    var spec_t = new Array(spec[0].length); //Transposing the spectrogram 2d matrix
    console.log("\nSPEC SHAPE: " + spec.length + " " + spec[0].length);
    for (var i=0; i<spec[0].length; i++)  {
        spec_t[i] = new Array(spec.length);
        
        //Transposing the spectrogram matrix and normalizing by dividing by the max amplitude
        for (var j=0; j<spec.length; j++) {
            spec_t[i][j] = spec[j][i]/maxAmpl; 
        }
    }
    
    document.getElementById('spec').innerHTML = "Spectrogram shape: " + spec_t.length + " " + spec_t[0].length;
    
    console.log("input: ", spec_t);
    var input = tf.tensor2d(spec_t);
    input = input.reshape([1, input.shape[0], input.shape[1], 1]);
    var output = model.predict(input);
    output = Array.from(output.dataSync());
    pred = decodePredictions(output);
    console.log("output: " + pred);
    //return output;
}

const classifyAudio = async () => {
    var length = 0;
    if (audio) {
        var reader = new FileReader();
        reader.addEventListener("loadend", function() {
            var buffer = reader.result;
            console.log(buffer.byteLength + " byte length.");
            var dv = new DataView(buffer);
            var samples = [];
            
            for (var i=0; i<dv.byteLength-1; i++){
                samples.push(dv.getInt16(i));
            }
            console.log(samples.length + " samples.");
            //testTransform(samples);
            
            computeSpectrogram(samples, freqBins, overlap);
        
            //Run Inference model
            predict()/*.then((out) => {//console.log("TYPE ", (typeof out));
                                        console.log("out[0] ", out[0]);
                                        console.log("out[1] " + out[1]);
                                        console.log("out[2] " + out[2]);
                                        console.log("out[3] " + out[3]);
                                    });*/
        });
        var text = reader.readAsArrayBuffer(audio['audioBlob']);
        document.getElementById("samples").innerHMTL = "Samples: " + samples.length;
    }
};

document.getElementById('start').addEventListener("click", startRecord);
document.getElementById('stop').addEventListener("click", stopRecord);
document.getElementById('classify').addEventListener("click", classifyAudio);