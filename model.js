/*
Load machine learning model using TensorFlow/Keras JavaScript wrappers and run inference model, passing in 2d spectrogram array as input
*/

const loadModel = async () => {
    var model = await tf.loadLayersModel('models4/model.json');
    console.log("Model summary " + model.summary());
    console.log("Model LOADED!!!")
    return model;
}

function decodePredictions(arr) {
    if (arr[0] > 0.5) return "arm lift " + arr[0];
    if (arr[1] > 0.5) return "bicep curl " + arr[1];
    if (arr[2] > 0.5) return "chair stand " + arr[2];
    if (arr[3] > 0.5) return "non exercise " + arr[3];
    return "not sure, please try again";
}

const predict = async () => {
    var model = await loadModel();
    spec_no_tone = new Array(66);
    for (var i=0; i<spec.length; i++) {
        var tmp = i;
        if (i>32 && i<50) continue;
        if (i>=50) tmp = i-17;
        
        spec_no_tone[tmp] = new Array(58);
        for (var j=0; j<58; j++){
            spec_no_tone[tmp][j] = spec[i][j]; 
        }
    }
    var spec_t = new Array(spec[0].length); //Transposing the spectrogram 2d matrix
    console.log("\nSPEC SHAPE: " + spec.length + " " + spec[0].length);
    for (var i=0; i<spec[0].length; i++)  {
        spec_t[i] = new Array(spec.length);
        
        //Transposing the spectrogram matrix and normalizing by dividing by the max amplitude
        for (var j=0; j<spec.length; j++) {
            spec[j][i] /= maxAmpl;
            spec_t[i][j] = spec[j][i]; 
        }
    }
    
    /*var spec_f = new Array(66);
    for (var i=0; i<spec[0].length; i++) {
        if (i>=33 && i<=49) continue;
        spec_f.push(spec[i]);
    }*/
    //console.log("SPEC_F SHAPE " + spec_f.length + ", " + spec_f[0].length);
    //document.getElementById('spec').innerHTML = "Spectrogram shape: " + spec_t.length + " " + spec_t[0].length;
    
    //console.log("input: ", spec_t);
    var input = tf.tensor2d(spec_no_tone);
    input = input.reshape([1, input.shape[0], input.shape[1], 1]);
    var output = model.predict(input);
    output = Array.from(output.dataSync());
    console.log("output before decoding: " + output);
    pred = decodePredictions(output);
    console.log("output after decoding: " + pred);
    document.getElementById("dv").innerHTML = pred;
    //return output;
}

const drawSpectrogram = async () => {
    var canvas = document.getElementById("spectrogram");
    var ctx = canvas.getContext("2d");
    document.getElementById('spec').innerHTML = "spec.length " + spec.length + ", spec[0].length " + spec[0].length;
    
    for (var i=0; i<spec.length; i++){
        for (var j=0; j<spec[0].length; j++) {
            //var color = spec[i][j]/11000;
            var color = 2*spec[i][j]/maxAmpl * 255;
            console.log("color " + color);
            ctx.fillStyle = "rgb(" + color + ", " + color + ", " + color + ")";
            ctx.fillRect(j*10, i*10, 10, 10);
        }
    }
    predict();
}