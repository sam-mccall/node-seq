Seq
===

Seq is an asynchronous flow control library with a chainable interface for
sequential and parallel actions. Even the error handling is chainable.

Examples
========

parseq.js
---------

    var fs = require('fs');
    var exec = require('child_process').exec;
    
    var Seq = require('seq');
    Seq()
        .seq(function () {
            exec('whoami', this)
        })
        .par(function (who) {
            exec('groups ' + who[0], this);
        })
        .par(function () {
            fs.readFile(__filename, 'ascii', this);
        })
        .seq(function (groups, src) {
            console.log('Groups: ' + groups[0].trim());
            console.log('This file has ' + src.length + ' bytes');
        })
    ;

Output:

    Groups: substack : substack dialout cdrom floppy audio src video plugdev games netdev fuse www
    This file has 469 bytes

There is a default error handler at the end of all chains. The default error
handler looks like this:

    .catch(function (err) {
        console.error(err.stack ? err.stack : err)
    })

Everytime `this` or `this()` for `.par()` gets executed, its first argument
should be the error value. This error value propagates downward until it hits a
`.catch()`. There is an implicit `.catch()` at the bottom of all chains like the
one in the example immediately above.

Installation
============

With [npm](http://github.com/isaacs/npm), just do:
    npm install seq

or clone this project on github:

    git clone http://github.com/substack/node-seq.git

To run the tests with [expresso](http://github.com/visionmedia/expresso),
just do:

    expresso
