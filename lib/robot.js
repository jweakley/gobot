var five = require('johnny-five'),
    temporal = require('temporal'),
    _ = require('lodash');

function Robot(opts) {

  var pinRightServo = opts.rightWheel,
      pinLeftServo = opts.leftWheel,
      pinBuzzer = opts.buzzer,
      pinRightLed = opts.rightLed,
      pinLeftLed = opts.leftLed;

  this.minimumMoveTime = 150;

  this.servos = {
    right: new five.Servo({
      pin: pinRightServo,
      type: 'continuous',
      isInverted: true
    }),
    left: new five.Servo({
      pin: pinLeftServo,
      type: 'continuous'
    })
  };

  this.leds = {
    right: new five.Led({
      pin: pinRightLed
    }),
    left: new five.Led({
      pin: pinLeftLed
    })
  };

  this.buzzer = new five.Piezo({
    pin: pinBuzzer
  });

  this.direcitonMap = {
    forward: 'max',
    backward: 'min'
  };

  this.moves = [];
  this.rememberedMoves = [];
  this.currentMove = null;
  this.lastMove = null;
  this.isThinking = false;
  this.isSinging = false;
}

Robot.prototype.sing = function() {
  if(!this.isSinging) {
    this.buzzer.song("agecdbfc", "11111111");
    this.isSinging = true;
    temporal.wait(9, function(){
      this.isSinging = false;
    }.bind(this));
  }
  return this;
};

Robot.prototype.eyes = function(opts) {
  var action = opts.style || 'blink',
      rate = opts.rate || 50,
      duration = opts.duration || 1200;
  switch(opts.side) {
    case 'right':
      this.leds.right[action](rate);
      break;
    case 'left':
      this.leds.left[action](rate);
      break;
    default:
      this.leds.right[action](rate);
      this.leds.left[action](rate);
      break;
  }
  temporal.wait(duration, function(){
    this.stopEyes();
  }.bind(this));
  return this;
};

Robot.prototype.stopEyes = function() {
  this.leds.right.off();
  this.leds.left.off();
};

Robot.prototype.obstacle = function(side) {
  var opposing = {
        right: -45,
        left: 45
      },
      turn = opposing[side];

  this.stopNow();
  this.eyes({side: side}).sing();
  this.remember().backward({time: 1000}).turn({degrees: turn});
  if(this.isThinking) {
    this.think();
  } else {
    this.goNow();
  }
};

Robot.prototype.dance = function(opts) {
  var getRandomInt = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
      },
      numberOfMoves = opts || getRandomInt(5,10),
      turnMap = {
        0: 'right',
        1: 'left'
      },
      moveMap = {
        0: 'forward',
        1: 'backward'
      };
  for(var i=0;i<numberOfMoves;i++) {
    switch(getRandomInt(0,4)) {
      case 0:
        this.forward(
          getRandomInt(
            this.minimumMoveTime,
            numberOfMoves*this.minimumMoveTime
          )
        );
        break;
      case 1:
        this.turn({
          degrees: getRandomInt(45,135)
        });
        break;
      default:
        this.arcTurn({
          side: turnMap[getRandomInt(0,1)],
          degrees: getRandomInt(45,135)
        });
        break;
    }
  }
  return this;
};

Robot.prototype.danceNow = function(opts) {
  this.dance(opts).goNow();
};

Robot.prototype.go = function (opts) {
  var args = opts || {},
      nextStepTime;
  if(this.moves.length > 0 & this.isThinking) {
    this.currentMove = this.moves.shift();
    nextStepTime = this[this.currentMove.action](this.currentMove.arguments);
  }
  if(this.moves.length === 0) {
    if(_.isNull(this.currentMove)) {
      this.isThinking = false;
      this.stopNow();
    } else {
      this.currentMove = null;
    }
  }
};

Robot.prototype.goNow = function() {
  this.think();
  this.go();
};

Robot.prototype.remember = function() {
  this.rememberedMoves = this.moves;
  this.moves = [];
  return this;
};

Robot.prototype.forget = function() {
  this.rememberedMoves = [];
  this.moves = [];
  return this;
};

Robot.prototype.think = function() {
  this.isThinking = true;
  if(this.currentMove){
    this.moves.push(this.currentMove);
    this.currentMove = null;
  }
  if(this.rememberedMoves.length > 0) {
    this.moves = this.moves.concat(this.rememberedMoves);
    this.rememberedMoves = [];
  }
  return this;
};

// Later Actions

Robot.prototype.arcTurn = function(opts) {
  var args = opts || {};
  this.moves.push({action: 'arcTurnNow', arguments: args});
  return this;
};

Robot.prototype.turn = function(opts) {
  var args = opts || {};
  this.moves.push({action: 'turnNow', arguments: args});
  return this;
};

Robot.prototype.forward = function(opts) {
  var args = opts || {};
  this.moves.push({action: 'forwardNow', arguments: args});
  return this;
};

Robot.prototype.backward = function(opts) {
  var args = opts || {};
  this.moves.push({action: 'backwardNow', arguments: args});
  return this;
};

Robot.prototype.stop = function(opts) {
  var args = opts || {};
  this.moves.push({action: 'stopNow', arguments: args});
  return this;
};

// Now Actions.

Robot.prototype.arcTurnNow = function(opts) {
  var degrees = opts.degrees,
      actualDegrees = degrees % 360,
      calibratedNinety = 1075,
      time = opts.time || Math.ceil(calibratedNinety * Math.abs(degrees) / 90),
      direciton = (degrees > 0 ? 'forward' : 'backward');
  switch(opts.side) {
    case 'right':
      this.servos.right[this.direcitonMap[direciton]]();
      break;
    case 'left':
      this.servos.left[this.direcitonMap[direciton]]();
      break;
  }
  temporal.wait(time, function(){
    this.stopNow();
    this.go();
  }.bind(this));
  return time;
};

Robot.prototype.turnNow = function(opts) {
  var degrees = opts.degrees || opts,
      actualDegrees = degrees % 360,
      calibratedNinety = 570,
      time;
  if(degrees > 0) {
    time = opts.time || Math.ceil(calibratedNinety * degrees / 90);
    this.servos.right.min();
    this.servos.left.max();
  } else {
    time = opts.time || Math.ceil(calibratedNinety * Math.abs(degrees) / 90);
    this.servos.right.max();
    this.servos.left.min();
  }
  temporal.wait(time, function(){
    this.go();
  }.bind(this));
  return time;
};

Robot.prototype.forwardNow = function(opts) {
  var time = opts.time || opts;
  this.servos.right.max();
  this.servos.left.max();
  temporal.wait(time, function(){
    this.go();
  }.bind(this));
  return time;
};

Robot.prototype.backwardNow = function(opts) {
  var time = opts.time || opts;
  this.servos.right.min();
  this.servos.left.min();
  temporal.wait(time, function(){
    this.go();
  }.bind(this));
  return time;
};

Robot.prototype.stopNow = function() {
  this.servos.right.center();
  this.servos.left.center();
};

module.exports = Robot;
