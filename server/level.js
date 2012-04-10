function Level(params) {
	this.maxSpeed = params.maxSpeed;
	this.width = params.width;
	this.height = params.height;

	this.lastID = 0;
}

Level.prototype.generate = function() {
	var state = {
		entities: [],
		entityMap: {},
		timeStamp: new Date()
	};

	return state;
}


function LevelGenerator(params) {
  this.blobCount = params.blobCount;
  this.maxSpeed = params.maxSpeed;
  this.maxRadius = params.maxRadius;
  this.width = params.width;
  this.height = params.height;

  this.lastId = 0;
}

exports.Level = Level;