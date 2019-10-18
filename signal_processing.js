/*
Signal processing: Fast Fourier Transform of raw waveform data and spectrogram generation
*/

var spec = [];
var maxAmpl = 0;
var sampleRate = 48000; //depends on the browser and device, this is the sample rate for Chrome on the Google Pixel phone

/*Applied to each time segment prior to computing the D.F.T. to decrease "spectral leakage" in the spectrogram*/
function tukeyWindow(samples, shapeParam) {
    var samplesProcessed = [];
    var splice1 = Math.floor(shapeParam/2*samples.length);
    var splice2 = Math.floor((1-shapeParam/2)*samples.length);
    
    for (var i=0; i<splice1; i++){
        samplesProcessed.push(0.5*(1+Math.cos(2*Math.PI/shapeParam*(i/samples.length-shapeParam/2)))*samples[i]);
    }
    for (var i=splice1; i<splice2; i++){
        samplesProcessed.push(samples[i]);
    }
    for (var i=splice2; i<samples.length; i++){
        samplesProcessed.push(0.5*(1+Math.cos(2*Math.PI/shapeParam*(i/samples.length-1+shapeParam/2)))*samples[i]);
    }
    for (var i=0; i<samples.length; i+=50){
        //console.log("processed: " + samplesProcessed[i] + " unprocessed: " + samples[i]);
    }
    return samplesProcessed;
}

/*Discrete Fourier Transform*/
function dft(samples) {
    var N = samples.length;
    
    var samplesProcessed = tukeyWindow(samples, 0.25);
    
    var lowerBin1 = Math.floor(9900/sampleRate * 20000);
    var upperBin1 = Math.floor(9980/sampleRate * 20000);
    var lowerBin2 = Math.floor(10020/sampleRate * 20000);
    var upperBin2 = Math.floor(10100/sampleRate * 20000);
    var res = new Array(upperBin1-lowerBin1+upperBin2-lowerBin2);
    
    var idx = 0;
    for (var i=upperBin2-1; i>=lowerBin1; i--){
        //if (i<lowerBin2 && i>=upperBin1) continue;
        res[idx] = new Complex(0, 0);
        for (var j=0; j<N; j++) {
            var tmp = new Complex(Math.cos(2*Math.PI*j*i/N), 
                                 -Math.sin(2*Math.PI*j*i/N));
            var sample = new Complex(samplesProcessed[j], 0);
            tmp.mul(sample, tmp);
            res[idx].add(tmp, res[idx]);
        }
        idx++;
    }
    return res;
}

/*Fast Fourier Transform*/
function fft(samples) {
	var N = samples.length;
	
	//base case
	if (N<=1) return samples; 
	
	//recursive case
	var even = new Array(N/2);
	var odd = new Array(N/2);
	
	for (var i=0; i<N/2; i++){
		even[i] = samples[i*2];
		odd[i] = samples[i*2+1];
	}
	even = fft(even);
	odd = fft(odd);
	
	var a = -2 * Math.PI;
	for(var k=0; k<N/2; k++){
		if (!(even[k] instanceof Complex)) even[k] = new Complex(even[k], 0);
		if (!(odd[k] instanceof Complex)) odd[k] = new Complex(odd[k], 0);
		
		var p = k/N;
		var t = new Complex(0, a * p);
		t.cexp(t).mul(odd[k], t);
		samples[k] = even[k].add(t, odd[k]);
		samples[k+N/2] = even[k].sub(t, even[k]);
	}
	
	//if (samples[0].re !== undefined) console.log("not undefined: N = " + N);
	return samples;
}

/*Test correctness of dft() and fft()*/
function testTransform(samples) {
    var seg = samples.slice(9900, 9932);
    var seg2 = samples.slice(9900, 9932);
    var fast = fft(seg);
    var discrete = dft(seg);
    for (var i=0; i<32; i++){
        var f = Math.floor(Math.sqrt(
							Math.pow(fast[i].re, 2) +
							Math.pow(fast[i].im, 2)
							));
        var d = Math.floor(Math.sqrt(
                            Math.pow(discrete[i].re, 2) + 
                            Math.pow(discrete[i].im, 2)
            ));
        if (f==d) console.log("correct: f " + f + ", d " + d);
        if (f!=d) console.log("wrong: f " + f + ", d " + d);
        
    }
}


function computeSpectrogram(samples, freqBins, overlap) {
    var shift = freqBins - overlap;
	spec.length = 66; //fixed dimensions as the ConvNet model takes only input array of dims (66, 58)
    for (var i=0; i<58; i++) {
		var seg = samples.slice(i*shift, i*shift+freqBins);
		//console.log("seg: " + seg);
        var transformed_complex = dft(seg);
        
		//transformed_complex = transformed_complex.slice(lowerBin1, upperBin1).concat(transformed_complex.slice(lowerBin2, upperBin2));
		var transformed_real = new Array(transformed_complex.length);
		
		//console.log("transformed_complex[3000] re " + transformed_complex[3000].re + ", im " + transformed_complex[1].im);
		//console.log("transformed_complex[8191] re " + transformed_complex[8191].re + ", im " + transformed_complex[2].im);
		
		for (var j=0; j<transformed_complex.length; j++){
			//console.log("type of transformed[i] before magnitude taken: " + (typeof transformed[i])); 
			var magn = Math.sqrt(
							Math.pow(transformed_complex[j].re, 2) +
							Math.pow(transformed_complex[j].im, 2)
							);
            transformed_real[j] = magn;
            if (i==0) spec[j] = [];
			spec[j].push(magn);
            maxAmpl = Math.max(maxAmpl, magn);
			//console.log("type of transformed[i] after magnitude is taken: " + (typeof transformed[i]));
		}
		//console.log("transformed_real " + transformed_real);
	}
} 