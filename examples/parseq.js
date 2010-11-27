var fs = require('fs');
var exec = require('child_process').exec;

/* Ideas:
    dependency analysis
    .seq(key, f) or this.to(key)
*/

var Seq = require('seq');
Seq()
    .seq('who', function () {
        exec('whoami', this)
    })
    .par(function () {
        exec('groups ' + this.vars.who, this);
    })
    .par(function () {
        fs.readFile(__filename, 'ascii', this);
    })
    .join(function (groups, src) {
        console.log('Groups: ' + groups[0].trim());
        console.log('This file has ' + src.length + ' bytes');
    })
;
