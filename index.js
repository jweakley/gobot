var five = require("johnny-five");
var Robot = require("./lib/robot.js");

var board = new five.Board();

board.on("ready", function(){
  var whiskers = {
        right: new five.Pin({
          pin: 4
        }),
        left: new five.Pin({
          pin: 3
        })
      },
      robot = new Robot({
        rightWheel: 10,
        leftWheel: 11,
        buzzer: 9,
        rightLed: 6,
        leftLed: 5
      });

  ["right", "left"].forEach(function(impact) {
    whiskers[impact].on("low", function() {
      console.log('%s side bumped!', impact.toUpperCase());
      robot.obstacle(impact);
    });
  });

  board.repl.inject({
    bot: robot
  });

  console.log("Robot Ready!");

});
