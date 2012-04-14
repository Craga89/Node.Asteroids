var Player = require('../common/player').Player,
	Powerups = require('../common/powerup'),
	Asteroid = require('../common/asteroid').Asteroid;

function random(min, max) {
	return (Math.random() * (max - min + 1)) + min;
}

function Level() { }

Level.generate = function(game) {
	var state = {
		entities: [],
		entityMap: {},
		timeStamp: Date.now()
	},
	i, j, id;

	// Add some power ups
	for(i in Powerups) {
		for(j = 0; j < random(2, 20); j++) {
			id = 'powerup_' + (game.lastID++);
			state.entityMap[id] = -1 + state.entities.push(
				new Powerups[i]({
					id: id,
					pos: [
						random(0, game.WIDTH),
						random(0, game.HEIGHT),
						0
					]
				},
				game)
			)
		}
	}

	i = 20;
	while(--i) {
		id = 'asteroid_' + (game.lastID++);
		state.entityMap[id] = -1 + state.entities.push(
			new Asteroid({
				id: id,
				pos: [
					random(0, game.WIDTH),
					random(0, game.HEIGHT),
					0
				],
				angularVelocity: random(0.2, Math.PI / 10),
				radius: random(4, 25),
				velocity: [
					random(-2, 2) / 100,
					random(-2, 2) / 100,
					0
				]
			},
			game)
		)
	}

	return state;
}

exports.Level = Level;