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

		this.drawDirection = params.showDirection || false;
	}

	Renderer.prototype.start = function() {
		var self = this;
		requestAnimationFrame(function() {
			self.render.call(self);
			self.start();
		});
	}

	Renderer.prototype.render = function() {
		var entities = this.game.state.entities,
			entity, i;

		// Clear the canvas
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Render all objects
		for(i in entities) {
			// Check to make sure the entity isn't removed
			if((entity = entities[i]).remove) { continue };

			this.renderEntity(entity);
		}
	};

	Renderer.prototype.renderEntity = function(entity) {
		var ctx = this.ctx;

		// Save context and translate to entity origin
		ctx.save();
		ctx.translate(entity.pos[0], entity.pos[1]);

		// Render directional arrow if enabled
		if(this.drawDirection) {
			var x = entity.pos[0] - entity.lastPos[0];
			var y = entity.pos[1] - entity.lastPos[1];
			var theta = Math.atan2(y, x) + Math.PI / 2;

			ctx.save();
			ctx.strokeStyle = '#0000FF';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.rotate(theta);
			ctx.moveTo(0, 0);
			ctx.lineTo(0, -20);
			ctx.stroke();
			ctx.closePath();
			ctx.restore();
		}

		// If entity is a player, render their name
		switch(entity.type) {
			case 'player': this._renderPlayer(entity); break;
			case 'bullet': this._renderBullet(entity); break;
			case 'powerup': this._renderPowerup(entity); break;
		}

		// Restore canvas context
		ctx.restore();
	};

	Renderer.prototype._renderPlayer = function(player) {
		var ctx = this.ctx,
			isMe = game.me === player,
			radius = player.radius,
			r2 = radius / 2,
			shield = (player.shield / 100);

		// Render player#
		ctx.save();
		ctx.rotate(player.angle);
		ctx.beginPath();
		ctx.moveTo(0, 10); ctx.lineTo(6, -8);
		ctx.lineTo(0, 0); ctx.lineTo(-6, -8);
		ctx.closePath();
		ctx.fillStyle = isMe ? 'green' : 'red';
		ctx.fill();
		ctx.restore();

		// Render player shield
		if(player.shield > 0) {
			ctx.lineWidth = shield * 4;
			ctx.strokeStyle = 'rgb('+
				Math.floor(255 - (shield * 255)) + ', ' +
				Math.floor(80 - (shield * 80)) + ', ' +
				Math.floor(shield * 255) +
			')';
			ctx.beginPath();
			ctx.arc(0, 0, radius - (shield*2), 0, 2 * Math.PI, true);
			ctx.closePath();
			ctx.stroke();
		}

		// Render the player name
		ctx.font = '8pt monospace';
		ctx.fillStyle = 'black';
		ctx.textAlign = 'center';
		ctx.fillText(player.id, 0, -radius - r2);

		ctx.font = '7pt monospace';
		ctx.fillStyle = 'blue';
		ctx.fillText(Math.floor(player.shield) + '%', 0, radius + r2 + ctx.lineWidth);
	}

	Renderer.prototype._renderPowerup = function(powerup) {
		var ctx = this.ctx;

		ctx.fillStyle = powerup.subtype === 'shield' ? 'cyan' : 'green';
		ctx.beginPath();
		ctx.arc(0, 0, powerup.radius, 0, 2 * Math.PI, true);
		ctx.closePath();
		ctx.fill();
	}

	Renderer.prototype._renderBullet = function(bullet) {
		var ctx = this.ctx,
			mine = bullet.owner === game.me.id,
			range = Math.min(1, 1.5 - (vec3.dist(bullet.pos, bullet.initialPos) / bullet.range));

		ctx.fillStyle = mine ? 'green' : 'red';
		ctx.rotate(bullet.angle);
		ctx.beginPath();
		ctx.arc(0, 0, bullet.radius * range, 0, 2 * Math.PI, true);
		ctx.closePath();
		ctx.fill();
	}

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