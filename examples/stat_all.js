var fs = require('fs');
var Hash = require('traverse/hash');
var Seq = require('seq');

Seq()
    .seq(function () {
        fs.readdir(__dirname, this);
    })
    .flatten()
    .parEach(function (file) {
        fs.stat(__dirname + '/' + file, this(file));
    })
    .seq(function (stats) {
        var sizes = Hash.map(stats[0], function (s) { return s.size })
        console.dir(sizes);
    })
;
