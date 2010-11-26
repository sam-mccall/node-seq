var Seq = require('seq');

exports.seq = function (assert) {
    var calls = 0;
    Seq(1)
        .seq(function (n, seq) {
            assert.equal(this, seq);
            assert.equal(n, 1);
            setTimeout(function () { seq(null, 2) }, 50);
            calls++;
        })
        .seq(function (n, seq) {
            assert.equal(this, seq);
            assert.equal(n, 2);
            calls++;
        })
    ;
    setTimeout(function () {
        assert.equal(calls, 2);
    }, 75);
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
        .catch(function (err, key, seq) {
            assert.equal(key, 0);
            assert.equal(seq, this);
            assert.equal(err, 'pow!');
            caught = true;
        })
    ;
    setTimeout(function () {
        assert.equal(calls, 1);
        assert.ok(caught);
    }, 10);
};

exports.par = function (assert) {
    var done = false;
    Seq()
        .par(function (par) {
            assert.equal(par, this);
            setTimeout(this().bind({}, null, 'x'), 25);
            setTimeout(this().bind({}, null, 'y'), 50);
        })
        .seq(function (x, y) {
            assert.equal(x, 'x');
            assert.equal(y, 'y');
            done = true;
        })
    ;
    setTimeout(function () {
        assert.ok(done);
    }, 75);
};
