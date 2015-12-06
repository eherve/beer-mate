'use strict';

var express = require('express');
var router = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var Filter = require('../../tools/filter');
var Auth = require('../../tools/auth');
var ObjectId = require('mongoose').Types.ObjectId;
var PubModel = require('../../models/pub');

router.path = '/pubs/:pubId';
router.middlewares = [
	function(req, res, next) {
		var id = req.params.pubId;
		if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
		req.pubId = id;
		next();
	}
];

router.get('/comments', function(req, res, next) {
	PubModel.findById(req.pubId, '_id', function(err, pub) {
		if (err) { return next(err); }
		if (!pub) { return next(new NotFoundError()); }
		var aggregate = PubModel.aggregate();
		aggregate.match({ _id: new ObjectId(pub.id) })
			.unwind('comments').sort({ 'comments.createdAt': -1 });
		var skip = Filter.getSkip(req);
		if (skip !== null) { aggregate.skip(skip); }
		var limit = Filter.getLimit(req);
		if (limit !== null) { aggregate.limit(limit); }
		aggregate.group({ _id: '$_id',
			nbComments: { $first: '$nbComments' },
			comments: { $push: '$comments' }
		});
		aggregate.project({ nbComments: 1, comments: 1 });
		aggregate.exec(function(err, data) {
			if (err) { return next(err); }
			PubModel.populate(data,
				[ { path: 'comments.userId', select: 'firstname lastname' } ],
				function(err, data) {
					if (err) { return next(err); }
					data = data[0] || { _id: pub.id, nbComments: 0, comments: [] };
					data.skip = skip; data.limit = limit;
					res.send(data);
				}
			);
		});
	});
});

router.post('/comments', Auth.userConnected, function(req, res, next) {
	PubModel.findById(req.pubId, 'comments', function(err, pub) {
		if (err) { return next(err); }
		req.body.userId = req.redisData.id; pub.comments.push(req.body);
		pub.nbComments = pub.comments.length;
		pub.save(function(err, pub) {
			if (err) { return next(err); }
			var comment = pub.comments[pub.comments.length - 1].toObject();
			comment.comments = { userId: comment.userId }; delete comment.userId;
			PubModel.populate([ comment ],
				[ { path: 'comments.userId', select: 'firstname lastname' } ],
				function(err, comments) {
					if (err) { return next(err); }
					comment = comments[0];
					comment.userId = comment.comments.userId; delete comment.comments;
					res.send(comment);
				}
			);
		});
	});
});

module.exports = router;