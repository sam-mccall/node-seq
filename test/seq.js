var Seq = require('seq');

exports.seq = function (assert) {
    var calls = 0;
    Seq(1)
        .seq(function (n) {
            assert.equal(n, 1);
            this(null, 2);
            calls++;
        })
        .seq(function (n) {
            assert.equal(n, 2);
            calls++;
        })
    ;
    setTimeout(function () {
        assert.equal(calls, 2);
    }, 10);
};

exports.catch = function (assert) {
    var calls = 0, caught = false;
    Seq(1)
        .seq(function (n) {
            assert.equal(n, 1);
            this('pow!');
            calls++;
        })
        .seq(function (n) {
            assert.equal(n, 2);
            calls++;
        })
        .catch(function (err) {
            assert.equal(err, 'pow!');
            caught = true;
        })
    ;
    setTimeout(function () {
        assert.equal(calls, 1);
        assert.ok(caught);
    }, 10);
};
