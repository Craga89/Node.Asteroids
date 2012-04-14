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

	function random(min, max) {
		return (Math.random() * (max - min + 1)) + min;
	}

	function Renderer(params) {
		var self = this, width, height, i;

		this.game = params.game;
		this.canvas = document.getElementById(params.id);
		this.ctx = this.canvas.getContext('2d');

		// Viewport
		this.viewport = new Viewport(
			this.canvas.width = window.innerWidth,
			this.canvas.height = window.innerHeight,
			width = game.WIDTH,
			height = game.HEIGHT
		);

		// Ensure viewport updates with window resize
		window.onresize = function() {
			self.viewport.width = self.canvas.width = window.innerWidth;
			self.viewport.height = self.canvas.height = window.innerHeight;
		}

		// Canvas cache
		this.cache = {};

		// Flags
		this.drawDirection = params.showDirection || false;
		this.drawBoundary = params.drawBoundary || false;

		// Create some stars
		this.stars = [];
		i = 1000; while(i--) {
			this.stars.push([ random(0, width), random(0, height), random(0.3, 1) ]);
		}
	}

	Renderer.prototype.start = function() {
		var self = this;
		requestAnimationFrame(function() {
			self.render.call(self);
			self.start();
		});
	};

	Renderer.prototype._cache = function(func, width, height) {
		var canvas = document.createElement('canvas'),
			ctx = canvas.getContext('2d'),
			size = Math.max(width, height) || 0;

		canvas.width = width || size || this.canvas.width;
		canvas.height = height || size || this.canvas.height;

		func.call(this, ctx);

		return canvas;
	};

	Renderer.prototype.render = function(coords) {
		// Only proceed if we can grab a reference to our player
		if(!this.game.me) { return; }

		var self = this,
			ctx = this.ctx,
			game = this.game,
			canvas = this.canvas,
			entities = game.state.entities,
			entity, i, t;

		// Clear the canvas and use black background
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		ctx.fillStyle = 'rgb(20,20,20)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// If we aren't rendering a specific canvas area...
		if(typeof coords === 'undefined') {
			vec3.set(this.game.me.pos, this.viewport.pos);

			// Clear the canvas and use black background
			ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			ctx.fillStyle = 'rgb(20,20,20)';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Render adjacent world tiles if needed
			this._drawTiles(ctx);
		}

		// Set viewport position if coordinates were passed...
		else { vec3.set(coords, this.viewport.pos); }

		// Draw the stars
		this._drawStars(ctx);

		// Render all objects
		for(i in entities) {
			// Check to make sure the entity isn't removed
			if((entity = entities[i]).remove) { continue };

			// Render the entity
			this.renderEntity(ctx, entity);
		}

		// Draw the viewport boundaries
		if(typeof coords === 'undefined' && this.drawBoundary) {
			this.viewport.drawBounds(ctx);
		}
	};

	Renderer.prototype._drawTiles = function(ctx) {
		var game = this.game,
			viewport = this.viewport, mePos = game.me.pos,
			vPos = viewport.pos, vCentre = viewport.centre,
			vWidth = viewport.width, vHeight = viewport.height,
			gWidth = game.WIDTH, gHeight = game.HEIGHT;

		// Determine transform coords
		t = [
			vCentre[0] - (gWidth - vPos[0]),
			gWidth - vCentre[0] - (gWidth - vPos[0]),
			vCentre[1] - (gHeight - vPos[1]),
			gHeight - vCentre[1] - (gHeight - vPos[1]),
		]

		// Draw parallel tiles
		if(t[1] < 0) { this._drawTile(ctx, -t[1] - vWidth, 0, [ gWidth - vCentre[0], mePos[1] ]); } // Left
		else if(t[0] > 0) { this._drawTile(ctx, vWidth - t[0], 0, [ vCentre[0], mePos[1] ]); } // Right
		if(t[3] < 0) { this._drawTile(ctx, 0, -t[3] - vHeight, [ mePos[0], gHeight - vCentre[1] ]); } // Top
		else if(t[2] > 0) { this._drawTile(ctx, 0, vHeight - t[2], [ mePos[0], vCentre[1] ]); } // Bottom

		// Draw diagonal tiles
		if(t[1] < 0 && t[3] < 0) { this._drawTile(ctx, -t[1] - vWidth, -t[3] - vHeight, [ gWidth - vCentre[0], gHeight - vCentre[1] ]); } // Top left
		else if(t[0] > 0 && t[3] < 0) { this._drawTile(ctx, vWidth - t[0], -t[3] - vHeight, [ vCentre[0], gHeight - vCentre[1] ]); } // Top right
		else if(t[1] < 0 && t[2] > 0) { this._drawTile(ctx, -t[1] - vWidth, vHeight - t[2], [ gWidth - vCentre[0], vCentre[1] ]); } // Bottom left
		else if(t[0] > 0 && t[2] > 0) { this._drawTile(ctx, vWidth - t[0], vHeight - t[2], vCentre); } // Bottom right

		// Reset viewport coordinates
		vec3.set(mePos, vPos);
	}

	Renderer.prototype._drawTile = function(ctx, x, y, coords) {
		ctx.save();
		ctx.translate(Math.round(x), Math.round(y));
		this.render(coords);
		ctx.restore();
	}

	Renderer.prototype._drawStars = function(ctx) {
		var cache = this.cache,
			game = this.game,
			coords = this.viewport.worldToScreen([0,0,0]);

		// Draw and cache stars if not already
		if(!cache.stars) {
			cache.stars = this._cache( this._renderStars, game.WIDTH, game.HEIGHT );
		}

		// Draw the star images
		ctx.save();
		ctx.translate(coords[0], coords[1]);
		ctx.drawImage(this.cache.stars, 0, 0);
		ctx.restore();
	};

	Renderer.prototype.renderEntity = function(ctx, entity, bounds) {
		var viewport = this.viewport,
			pos = entity.pos,
			coords;

		// Don't render stuff outside the viewport
		if(!viewport.withinBounds(pos, bounds, entity.radius)) { return; }

		// Calculate local coords
		coords = viewport.worldToScreen(pos);

		// Save context and translate to entity origin
		ctx.save();
		ctx.translate(coords[0], coords[1]);

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
			case 'player': this._renderPlayer(ctx, entity); break;
			case 'bullet': this._renderBullet(ctx, entity); break;
			case 'powerup': this._renderPowerup(ctx, entity); break;
		}

		// Restore canvas context
		ctx.restore();
	};

	Renderer.prototype._renderStars = function(ctx) {
		var stars = this.stars, i = stars.length,
			star;

		ctx.save();
		ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, .3 + Math.random()) + ')';
		while((star = stars[--i])) {
			ctx.beginPath();
			ctx.arc(star[0], star[1], star[2], 0, 2 * Math.PI, true);
			ctx.closePath();
			ctx.fill();
		}
		ctx.restore();
	};

	Renderer.prototype._renderPlayer = function(ctx, player) {
		var ctx = this.ctx,
			isMe = game.me === player,
			radius = player.radius,
			r2 = radius / 2,
			shield = (player.shield / 100);

		// Render player shield
		if(player.shield > 0) {
			ctx.lineWidth = shield * 4;
			ctx.fillStyle = 'rgba(255,255,255,0.1)';
			ctx.strokeStyle = 'rgb('+
				Math.floor(255 - (shield * 255)) + ', ' +
				Math.floor(80 - (shield * 80)) + ', ' +
				Math.floor(shield * 255) +
			')';
			ctx.beginPath();
			ctx.arc(0, 0, radius - (shield*2), 0, 2 * Math.PI, true);
			ctx.closePath();
			ctx.stroke();
			ctx.fill();
		}

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


		// Render the player name
		ctx.font = '8pt monospace';
		ctx.fillStyle = 'white';
		ctx.textAlign = 'center';
		ctx.fillText(player.id, 0, -radius - r2);

		ctx.font = '7pt monospace';
		ctx.fillStyle = 'blue';
		ctx.fillText(Math.floor(player.shield) + '%', 0, radius + r2 + ctx.lineWidth);
	}

	Renderer.prototype._renderPowerup = function(ctx, powerup) {
		var ctx = this.ctx;

		ctx.fillStyle = powerup.subtype === 'shield' ? 'cyan' : 'green';
		ctx.beginPath();
		ctx.arc(0, 0, powerup.radius, 0, 2 * Math.PI, true);
		ctx.closePath();
		ctx.fill();
	}

	Renderer.prototype._renderBullet = function(ctx, bullet) {
		var ctx = this.ctx,
			mine = bullet.owner === game.me.id,
			range = Math.min(1, .5 + bullet.lifespan / bullet.duration);

		ctx.fillStyle = mine ? 'green' : 'red';
		ctx.rotate(bullet.angle);
		ctx.beginPath();
		ctx.arc(0, 0, bullet.radius * range, 0, 2 * Math.PI, true);
		ctx.closePath();
		ctx.fill();
	}

	exports.Renderer = Renderer;

}(window))