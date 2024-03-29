(function(exports){

	function AssetManager(params) {
		this.successCount = 0;
		this.errorCount = 0;
		this.cache = {};
		this.downloadQueue = [];

		if(params.paths) { this.queue(params.paths); }
	}

	AssetManager.prototype.queue = function(paths) {
		if(typeof paths === 'string') { paths = [path]; }

		var self = this;
		paths.forEach(function(path, i) {
			self.downloadQueue.push(path);
		});
	};

	AssetManager.prototype.isDone = function() {
		return (this.downloadQueue.length === this.successCount + this.errorCount);
	};

	AssetManager.prototype.downloadAll = function(callback) {
		var self = this;

		this.downloadQueue.forEach(function(path, i) {
			var img = new Image();

			img.addEventListener('load', function() {
				self.successCount += 1;
				if(self.isDone()) { callback(); }
			});
			img.addEventListener('error', function() {
				self.errorCount += 1;
				if(self.isDone()) { callback(); }
			});

			img.src = path;
			self.cache[path] = img;
		});
	};

	exports.AssetManager = AssetManager;
});