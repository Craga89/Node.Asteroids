(function(exports) {

	var Sprite = Class.extend({
		init: function(params) {
			this.game = params.game;
			this.image = params.image;
			this.width = params.width;
			this.height = params.height;
		},

		draw: function(x, y) {
			var ctx = this.game.ctx;

			ctx.drawImage(
				this.image,
				x, y,
				this.width, this.height
			);
		}
	});

	var Animation = Sprite.extend({
		init: function(params) {
			this._super(params);

			this.elapsedTime = 0;
			this.frameDuration = params.duration || 1;
			this.totalTime = (this.image.width / params.width) * this.frameDuration;
			this.repeat = params.repeat || false;
		},

		draw: function(x, y) {
			var ctx = this.game.ctx;

			this.elapsedTime += this.game.delta;

			ctx.drawImage(
				this.image,
				this.currentFrame() * this.width, 0,
				this.width, this.height,
				x, y,
				this.width, this.height
			);
		},

		currentFame: function() {
			return Math.floor(this.elapsedTime / this.frameDuration);
		},

		isDone: function() {
			return (this.elapsedTime >= this.totalTime);
		}
	});

});