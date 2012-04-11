(function(exports) {

	function Timer(interval, callback) {
		this.interval = interval;
		this.callback = callback;

		this._tick = null;
		this._on = false;
	};

	Timer.prototype.start = function(skew, scope, immediate) {
		if(this._on) { return; }

		var callback = this.callback,
			interval = this.interval,
			lastUpdate;

		// Setup timer and last update
		skew = skew || 0;
		lastUpdate = Date.now() - skew;

		// If immediate, call it now
		if(immediate) { callback.call(scope, lastUpdate); }

		// Setup an accurate timer
		this._tick = setInterval(function() {
			var date = Date.now() - skew;
			if (date - lastUpdate >= interval) {
				callback.call(scope, date);
				lastUpdate += interval;
			}
		}, 1);

		// Set flag
		this._on = true;

		return this;
	}

	Timer.prototype.started = function() { return this._on; }

	Timer.prototype.stop = function() {
		clearInterval(this._tick);
		this._on = false;

		return this;
	}

	exports.Timer = Timer;

})(typeof global === 'undefined' ? window : exports);