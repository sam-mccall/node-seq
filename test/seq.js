var Seq = require('seq');

exports.seq = function (assert) {
    var calls = 0;
    Seq(1)
        .seq(function (n) {
            assert.equal(n, 1);
            this(null, 2);
            calls++;
            console.log('1!');
        })
        .seq(function (n) {
            assert.equal(n, 2);
            calls++;
            console.log('2!');
        })
    ;
    setTimeout(function () {
        assert.equal(calls, 2);
    }, 10);
};
