// allow console level access to the blob data
window.blobdata = {"blobs": []};

var Blob = function(owner) {
	this.data = {
		"on": false,
		"wave": "",
		"volume": 1,
		"pan": 0.5
	};
	
	this.wave_function = {
		"evaluate": function() {
			return 0;
		}
	}
	
	this.compute = function(parameters) {
		return this.data.on ? this.wave_function.evaluate(parameters) * this.data.volume * (parameters.c ? this.data.pan : 1 - this.data.pan) : 0;
	}
	
	this.remove = function() {
		owner.remove_blob(this);
	}
	
	this.set_equation = function (eq) {
		try {
			var fn = Parser.parse(eq).simplify();
		} catch (e) {
			console.log(e);
			return false;
		}
		this.wave_function = fn;
		this.data.wave = eq;
		return true;
	}
	
	this.on = function(x) {
		this.data.on = x;
	}
}

var BlobEngine = function(data) {
	var blobs = data.blobs;
	// rate at which time moves (length in time of one sample)
	var rate = 0;
	// current sample
	var current_sample = 0;
	// whether or not the engine is currently on
	var on = false;
	// temporary accumulator
	var accum = 0;
	// reference to self
	var engine = this;
	// how fast k moves (bpm)
	var krate = 1;
	
	// get the values of each blob at a particular point in time t
	this.process = function(buffer, channelCount) {
		if (on) {
			// blobvol = (1 / blobs.length);
			for (var j=0; j<buffer.length; j+=2, current_sample++) {
				buffer[j] = engine.process_at_time(current_sample * rate, 0);
				buffer[j+1] = engine.process_at_time(current_sample * rate, 1);
			}
		}
	}
	
	// process a single sample
	this.process_at_time = function(timestamp, channel) {
		accum = 0;
		if (on) {
			var blob_params = {"t": timestamp, "k": timestamp * krate, "c": channel};
			for (var b=0; b<blobs.length; b++) {
				accum += blobs[b].compute(blob_params);
			}
		}
		return accum;
	}
	
	// set the rate at which we will operate
	this.set_rate = function(sample_rate) {
		rate = 1 / sample_rate;
	}
	
	// master audio switch
	this.master = function(onoff) {
		on = onoff;
	}
	
	// add a new blob to our list of blobs
	this.new_blob = function() {
		var nb = new Blob(this);
		blobs.push(nb);
		return nb;
	}
	
	// remove a blob from our list of blobs
	this.remove_blob = function(blob) {
		blobs.splice(blobs.indexOf(blob), 1);
	}
	
	// set the bpm of the k rate
	this.set_bpm = function(bpm) {
		krate = (bpm / 60.0);
	}
};

// launch everything
$(function() {
	// create the blob playing engine
	window.blobengine = new BlobEngine(blobdata);
	
	// use sink to stream the audio to the browser
	var sink = Sink(blobengine.process, 2);
	blobengine.set_rate(sink.sampleRate);
	
	// test evaluating an expression
	//var expr = Parser.parse("2 * sin(t) + 1");
	// $("#show").html(expr.evaluate({"t": 2}));
	// blobdata.blobs.push({"wave_function": Parser.parse("sin(t * 440) * sin(tan(t)*pow(sin(t),10))")});
	// blobdata.blobs.push({"wave_function": Parser.parse("sin(t * 880)")});
});
