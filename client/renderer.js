(function(exports) {
	(function() {
		var lastTime = 0;
		var vendors = ['ms', 'moz', 'webkit', 'o'];
		for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
			window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
			window.cancelAnimationFrame =
				window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
		}

		if (!window.requestAnimationFrame)
			window.requestAnimationFrame = function(callback, element) {
				var currTime = new Date().getTime();
				var timeToCall = Math.max(0, 16 - (currTime - lastTime));
				var id = window.setTimeout(function() { callback(currTime + timeToCall); },
				timeToCall);
				lastTime = currTime + timeToCall;
				return id;
			};

		if (!window.cancelAnimationFrame)
			window.cancelAnimationFrame = function(id) {
				clearTimeout(id);
			};
	}());

	function Renderer(params) {
		this.game = params.game;
		this.canvas = document.getElementById(params.id);
		this.ctx = this.canvas.getContext('2d');

		this.canvas.width = this.game.WIDTH;
		this.canvas.height = this.game.HEIGHT;

		this.drawBounding = params.drawBounding || false;
		this.drawGhost = params.showGhost || false;
		this.drawDirection = params.showDirection || false;
	}

	Renderer.prototype.render = function() {
		var self = this,
			entities = this.game.state.entities,
			entity, i;

		// Clear the canvas
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Render all objects
		for(i in entities) {
			entity = entities[i];

			if(entity.remove) {
				if(entity.type === 'player') {
					console.log('Player ' + entity.id + ' died!');
				}
			}

			self.renderEntity(entity);
		}

		requestAnimationFrame(function() {
			self.render.call(self);
		});
	};

	Renderer.prototype.renderEntity = function(entity) {
		var ctx = this.ctx,
			isPlayer = entity.type === 'player',
			isMe = entity.isMe;

		// Render ghost if enabled
		if(this.drawGhost) {
			ctx.save();
			ctx.translate(entity.lastPos[0], entity.lastPos[1]);
			ctx.fillStyle = 'green';
			ctx.beginPath();
			ctx.arc(0, 0, 5, 0, 2 * Math.PI, true);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}

		// Save context and translate to entity origin
		ctx.save();
		ctx.translate(entity.pos[0], entity.pos[1]);

		// Render directional arrow if enabled
		if(this.drawDirection) {
			var x = entity.pos[0] - entity.lastPos[0];
			var y = entity.pos[1] - entity.lastPos[1];
			var theta = Math.atan2(y, x) + Math.PI / 2;

			ctx.strokeStyle = '#0000FF';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.rotate(theta);
			ctx.moveTo(0, 0);
			ctx.lineTo(0, -20);
			ctx.stroke();
			ctx.closePath();
		}

		// Render our entity
		ctx.fillStyle = isMe ? 'blue' : 'red';
		ctx.beginPath();
		ctx.arc(0, 0, entity.radius, 0, 2 * Math.PI, true);
		ctx.closePath();
		ctx.fill();

		// Render bounding if enabled
		if(this.drawBounding || true) {
			ctx.strokeStyle = 'blue';
			ctx.beginPath();
			ctx.arc(0, 0, entity.radius, 0, 2 * Math.PI, true);
			ctx.closePath();
			ctx.stroke();
		}
	
		// If entity is a player, render their name
		if(isPlayer) {
			ctx.font = '8pt monospace';
			ctx.fillStyle = 'black';
			ctx.textAlign = 'center';
			ctx.fillText(entity.id, 0, -15);
		}

		// Restore canvas context
		ctx.restore();
	};

	Renderer.prototype.rotate = function(radians) {
		var canvas = document.createElement('canvas'),
			ctx = canvas.getContext('2d'),
			size = Math.max(image.width, image.height);

		canvas.width = canvas.height = size;

		ctx.translate(size / 2, size / 2);
		ctx.rotate(this.angle + Math.PI / 2);
		ctx.drawImage(image, -(image.width / 2), -(image.height / 2));

		return canvas;
	};

	exports.Renderer = Renderer;

}(window))