/**
 * Viewport world to local coordinate calculations
 *
 * Adapted from Rob Hawkes Viewport implementation in Rawkets
 * 	https://raw.github.com/robhawkes/rawkets/
 */

(function(exports) {

	function Viewport(width, height, worldw, worldh) {
		this.worldWidth = worldw;
		this.worldHeight = worldh;
		this.width = width;
		this.height = height;

		// Centre of the world
		this.centre = vec3.create([ width / 2, height / 2, 0 ]);
		this.worldCentre = vec3.create([ worldw / 2, worldh / 2, 0 ]);
		this.pos = vec3.set(this.worldCentre, vec3.create());
	};

	Viewport.withinBounds = function(coords, bounds) {
		return coords[0] > bounds[0] && coords[0] < bounds[1] &&
			coords[1] > bounds[2] && coords[1] < bounds[3];
	}

	/**
	 * Check to see if given world coordinate is visible within the viewport bounds
	 *
	 * @param {Number} x Horizontal position
	 * @param {Number} y Vertical position
	 * @returns Returns true or false depending on wether the coordinate is within the bounds
	 * @type Boolean
	*/
	Viewport.prototype.withinBounds = function(coords, padding) {
		var centre = this.centre, pos = this.pos;

		if(typeof padding === 'undefined') { padding = 50; }

		return Viewport.withinBounds(coords, [
			(pos[0] - centre[0]) - padding, (pos[0] + centre[0]) + padding,
			(pos[1] - centre[1]) - padding, (pos[1] + centre[1]) + padding
		]);
	};

	/**
	 * Check to see if given world coordinate is within the world bounds
	 *
	 * @param {Number} x Horizontal position
	 * @param {Number} y Vertical position
	 * @returns Returns true or false depending on wether the coordinate is within the bounds
	 * @type Boolean
	*/
	Viewport.prototype.withinWorldBounds = function(coords) {
		return Viewport.withinBounds(coords, [
			0, this.worldWidth, 0, this.worldHeight
		]);
	};

	Viewport.prototype.bounds = function() {
		var centre = this.centre, pos = this.pos;

		return [
			pos[0] - centre[0], pos[0] + centre[0] + padding,
			pos[1] - centre[1], pos[1] + centre[1] + padding
		];
	}

	/**
	 * Convert world coordinates to screen coordinates
	 *
	 * @param {Number} x Horizontal position
	 * @param {Number} y Vertical position
	 * @returns Returns a vector object containing the screen coordinates
	 * @type Vector
	*/
	Viewport.prototype.worldToScreen = function(pos) {
		return vec3.create([
			this.worldXToScreenX(pos[0]),
			this.worldYToScreenY(pos[1]),
			0
		]);
	};

	/**
	 * Convert world X/Y coordinate to screen X/Y coordinate
	 *
	 * @param {Number} x/y Horizontal position
	 * @returns Returns the X/Y screen coordinate
	 * @type Number
	*/
	Viewport.prototype.worldXToScreenX = function(x) {
		return ((this.pos[0] - this.centre[0]) - x) * -1;
	};
	Viewport.prototype.worldYToScreenY = function(y) {
		return ((this.pos[1] - this.centre[1]) - y) * -1;
	};

	
	Viewport.prototype.drawBounds = function(ctx) {
		var posX, posY, width, height;

		// Calculate pos
		posX = this.worldWidth < this.width || (this.pos[0] - this.centre[0]) > 0 ?
			0 : this.worldXToScreenX(0.0);

		posY = this.worldHeight < this.height || (this.pos[1] - this.centre[1]) > 0 ?
			0 : this.worldYToScreenY(0.0);

		// Calculate dimensions
		width = this.worldWidth < this.width ? this.worldWidth :
			this.worldWidth < (this.pos[0] + this.centre[0]) ?
				this.worldXToScreenX(this.worldWidth) : this.width;

		height = this.worldHeight < this.height ? this.worldHeight :
			this.worldHeight < (this.pos[1] + this.centre[0]) ?
			this.worldYToScreenY(this.worldHeight) : this.height;

		ctx.save();
		ctx.strokeStyle = 'rgb(0, 100, 255)';
		ctx.lineWidth = 3;
		ctx.strokeRect(
			posX - ctx.lineWidth,
			posY - ctx.lineWidth,
			width + (ctx.lineWidth * 2),
			height + (ctx.lineWidth * 2)
		);
		
		ctx.restore();
	};

	exports.Viewport = Viewport;

})(window);