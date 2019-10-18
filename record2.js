var canvas = document.getElementById('spectrogram');
var ctx = canvas.getContext("2d");
ctx.fillStyle = "rgb(0,0,0)";
ctx.fillRect(0, 0, canvas.width, canvas.height);

var spec = []; //spectrogram stored in a 2d array
const freqBins = 20000; //number of frequency bins in spectrogram
const overlap = 17000; //overlap of each time segment in spectrogram calculation


//webkitURL is deprecated but nevertheless 
URL = window.URL || window.webkitURL;
var gumStream;

//stream from getUserMedia() 
var rec; //Recorder.js object 

var input;
//MediaStreamAudioSourceNode we'll be recording 
// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext;
//new audio context to help us record 
var recordButton = document.getElementById("start");
var stopButton = document.getElementById("stop");
var classifyButton = document.getElementById("classify");

var osc; //oscillator- later used to play tone
var freq = 10000;
const volume = 0.5; //volume of tone
const type = 'sine'; //type of tone
var audioCtx;

function startTone(){
	audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
	
	osc = audioCtx.createOscillator();
    var gainNode = audioCtx.createGain();
    
	osc.connect(gainNode);
	gainNode.connect(audioCtx.destination);

	gainNode.gain.value = volume;
	osc.frequency.value = freq;
	osc.type = type;

	if (osc.noteOn) osc.noteOn(0); //old browsers
	if (osc.start) osc.start(); //new browsers
}

function stopTone() {
	if (osc.noteOff) osc.noteOff(0); //old browsers
        if (osc.stop) osc.stop(); //new browsers
}

function startRecording() {
	
	startTone(); //start playing a tone
	console.log("start button clicked");
	
	
	/*
		Simple constraints object, for more advanced audio features see
		https://addpipe.com/blog/audio-constraints-getusermedia/
	*/
    
	var constraints = { audio: true, video:false }

	/*
    	We're using the standard promise based getUserMedia() 
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/
	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		console.log("getUserMedia() success, stream created, initializing Recorder.js ...");
		/*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device
		*/
		audioContext = new AudioContext();
		
		//  assign to gumStream for later use  
		gumStream = stream;
		
		// use the stream 
		input = audioContext.createMediaStreamSource(stream);
		 
		//Create the Recorder object and configure to record mono sound (1 channel)
		rec = new Recorder(input,{numChannels:1})
		//start the recording process
		rec.record()
		console.log("Recording started");
	}).catch(function(err) {
    		console.log(err);
	});
}

function stopRecording() {
	console.log("stopButton clicked");
	//tell the recorder to stop the recording
	rec.stop(); //stop microphone access
	stopTone();
	
	gumStream.getAudioTracks()[0].stop();
    
	//create the wav blob, callback function: classifyPressListener, which creates an event listener for "Classify" button press
	rec.exportWAV(classifyPressListener);
}

/*Creates an event listener for "Classify" button press*/
function classifyPressListener(blob) {
	classifyButton.addEventListener("click", retrieveBlob, false);
	classifyButton.audioBlob = blob;
}

/*Use FileReader to read the blob as an ArrayBuffer*/
function retrieveBlob(event) {
	var blob = event.target.audioBlob;
    
	var reader = new FileReader();
	reader.readAsArrayBuffer(blob);
	reader.addEventListener("loadend", processBlob);
	
}

/*Convert ArrayBuffer of audio samples to an Int16 Array and generate a spectrogram in the form of a 2d array from it*/
function processBlob() {
	var buffer = this.result;
	var view = new DataView(buffer);
	var samples = [];
    	
	for (var i=(sampleRate*2)*3; i<(sampleRate*2)*7; i+=2){
		if (i==6*sampleRate) {
			document.getElementById('1sample').innerHTML = "16-bit sample 1 " + view.getInt16((sampleRate*2)*3);
    			document.getElementById('2sample').innerHTML = "16-bit sample 2 " + view.getInt16((sampleRate*2)*3+1);
		}
        	//console.log(view.getInt8(i) + " " + view.getInt8(i+1));
		try {
			samples.push(view.getInt16(i));
		} catch (error) {
			console.error("Audio is not long enough. Try again.");
            		return;
		}
	}
    	//testTransform(samples);
	computeSpectrogram(samples, freqBins, overlap);
    	drawSpectrogram();
}

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);