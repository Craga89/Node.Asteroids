(function(exports) {

	function Timer(interval, callback) {
		this.interval = interval;
		this.callback = callback;

		this.tick = null;
	};

	Timer.prototype.start = function(skew) {
		var callback = this.callback,
			interval = this.interval,
			lastUpdate;

		// Setup timer and last update
		skew = skew || 0;
		lastUpdate = Date.now() - skew;

		// Setup an accurate timer
		this.tick = setInterval(function() {
			var date = Date.now() - skew;
			if (date - lastUpdate >= interval) {
				callback(date);
				lastUpdate += interval;
			}
		}, 1);

		return this;
	}

	Timer.prototype.stop = function() {
		clearInterval(this.tick);

		return this;
	}

	exports.Timer = Timer;

})(typeof global === 'undefined' ? window : exports);