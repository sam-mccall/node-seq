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

exports.catchSeq = function (assert) {
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

exports.catchPar = function (assert) {
    var done = false, caught = false;
    Seq()
        .par(function (par) {
            assert.equal(par, this);
            setTimeout(this('one').bind({}, 'rawr'), 25);
            setTimeout(this('two').bind({}, null, 'y'), 50);
        })
        .seq(function (x, y) {
            assert.equal(x, 'x');
            assert.equal(y, 'y');
            done = true;
        })
        .catch(function (err, key) {
            assert.equal(err, 'rawr');
            assert.equal(key, 'one');
            caught = true;
        })
    ;
    setTimeout(function () {
        assert.ok(!done);
        assert.ok(caught);
    }, 75);
};

exports.forEach = function (assert) {
    var count = 0, done = false;
    Seq([1,2,3])
        .forEach(function (x, i) {
            assert.equal(x - 1, i);
            count ++;
        })
        .seq(function () {
            assert.equal(count, 3);
            done = true;
        })
    ;
    setTimeout(function () {
        assert.ok(done);
    }, 25);
};
