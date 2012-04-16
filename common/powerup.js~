(function(exports, CLIENT) {
	var Entity = (CLIENT ? exports : require('./entity')).Entity;

	/**
	 * Powerup class
	 *
	 * Represents a power up in the game
	 */
	function Powerup(subclass) {
		// Merge Entity defaults with subclasses
		Entity._merge(Powerup, subclass.defaults, Powerup.defaults, subclass.defaults);
	};

	// Defaults
	Powerup.defaults = {
		type: 'powerup',
		mass: 0
	}

	// Inherit from Entity
	Powerup.prototype = new Entity(Powerup);
	Powerup.prototype._super = Entity.prototype;
	Powerup.prototype.constructor = Powerup;

	// Simply inform the server of this position
	Powerup.prototype.computeState = function(delta) {
		this.registerChange( this.toJSON() );
	}

	// Activates a powerup (destroys it)
	Powerup.prototype.activate = function(player) {
		this.registerEvent('powerup', this.subtype, player.id);
		this.destroy();
	}

	
	/**
	 * Shield regeneration
	 *
	 * Regenerates your shield by a given amount
	 */
	function Shield(params, game) {
		this._game = game;

		// Set our parameters
		this.setup(params);
	}

	// Shield defaults
	Shield.defaults = {
		subtype: 'shield',
		power: 30,
		radius: 8
	};

	// Inherit from Entity
	Shield.prototype = new Powerup(Shield);
	Shield.prototype._super = Powerup.prototype;
	Shield.prototype.constructor = Shield;

	// Activates the power up on a particular player
	Shield.prototype.activate = function(player) {
		// Increase players shield (not above 100)
		if(player.shield + this.power <= 100) {
			player.adjustShield(this.power);
		};

		// Call super-class method
		this._super.activate.apply(this, arguments);
	}


	/**
	 * Shield power increase
	 *
	 * Increases your maximum shield power temporarily
	 */
	function ShieldUp(params, game) {
		this._game = game;

		// Set our parameters
		this.setup(params);
	}

	// Defaults
	ShieldUp.defaults = {
		subtype: 'shieldup',
		increase: 30,
		radius: 13
	};

	// Inherit from Entity
	ShieldUp.prototype = new Powerup(ShieldUp);
	ShieldUp.prototype._super = Powerup.prototype;
	ShieldUp.prototype.constructor = ShieldUp;

	// Activates the power up on a particular player
	ShieldUp.prototype.activate = function(player) {
		// Increase players shield to a new max based on increase
		player.setShield(
			player.shieldMax = 100 + this.increase
		);

		// Call super-class method
		this._super.activate.apply(this, arguments);
	}
	
	//exports.Powerup = Powerup;
	exports = CLIENT ? (exports.Powerups = {}) : exports;
	exports.Shield = Shield;
	exports.ShieldUp = ShieldUp;

})(typeof global === 'undefined' ? window : exports, typeof global === 'undefined');
