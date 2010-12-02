var Seq = require('seq');
Seq()
    .par(function () { this(null, 'a') })
    .par(function () { this(null, 'b') })
    .par(function () { this(null, 'c') })
    .seq(function (a, b, c) {
        console.dir([ a, b, c ])
    })
;
