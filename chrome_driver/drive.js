//chromedriver --url-base=/wd/hub
//npm install deasync
//npm install webdriverio
var client = require('webdriverio').remote({
  host: "localhost",
  port: 9515,
  desiredCapabilities: { browserName: "chrome" }
}).init();


var next = false;
printStats = function(prefix) {
  client.getHTML('#innerHiddenStats', false, function(err, html) {
    next=true;
    console.log(prefix + html);
  });
};

console.log("WORKER, LAYER, RATE, LAT, TTFS, TT300S, Decode(avg.), Download(avg.), Size(avg.)");



[8, 4, 1].forEach(function(worker) {
  [0, 30, 100].forEach(function(latency) {
    [5000, 25000, 50000].forEach(function(rate) {
      [1,3,4].forEach(function(q) {
        for (i = 0; i < 7; i++) {
          var url = "http://127.0.0.1:8000/bench.html?rate=" + rate + "&latency=" + latency + "&quality=" + q + "&worker=" + worker;
          //var url = "http://192.168.1.146:8000/bench.html?rate=" + rate + "&latency=" + latency + "&quality=" + q;
          client.url(url);

          client.timeoutsImplicitWait(2000).then(function(){
            return this.isExisting('#innerHiddenStats').then(function() {
              client.waitUntil(function() {
                return this.getHTML('#innerHiddenStats', false).then(function(text) {
                  return text !== 'notready'
                });
              }, 300*1000).then(function() {
                printStats(worker + ', ' + q + ", " + rate + ", " + latency + ", ");
              });
            });
          });

          while(!next){require('deasync').sleep(100);}
          next = false;
        }
      });
    });
  });
});

