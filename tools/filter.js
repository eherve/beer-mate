'use strict';

var util = require('util');

module.exports.getSkip = function(req) {
  if (req.query.skip) {
    var skip = parseInt(req.query.skip);
    if (!isNaN(skip)) {
      return skip;
    }
  }
  return null;
};

module.exports.getLimit = function(req) {
  if (req.query.limit) {
    var limit = parseInt(req.query.limit);
    if (!isNaN(limit) && limit > 0) {
      return limit;
    }
  }
  return null;
};

// TODO fix the count when limit retrieve nothing
module.exports.fetch = function(Model, options) {
  var aggregate = Model.aggregate();
  aggregate.match(options.match);
  var id = util.format('$%s', options.idField || '_id');
  var unwind = options.unwind;
  var fields = options.fields || [];
  var group1 = { _id: id, count: { $sum: 1 } };
  var group2 = { _id: id, count: { $first: '$count' } };
  var project = {};
  group1[ unwind ]  = group2[ unwind ] = { $push: util.format('$%s', unwind) };
  project[ unwind ] = 1;
  fields.forEach(function(field) {
    group1[field] = group2[field] = { $first: util.format('$%s', field) };
  });
  var count = options.count !== false;
  if (count) {
    project.count = 1;
    aggregate.unwind(unwind).group(group1);
  }
  if (!count || options.skip !== null || options.limit !== null) {
    aggregate.unwind(unwind);
    if (options.sort) { aggregate.sort(options.sort); }
    if (options.skip !== null) { aggregate.skip(options.skip); }
    if (options.limit !== null) { aggregate.limit(options.limit); }
    aggregate.group(group2);
  }
  aggregate.project(project);
  return aggregate;
}
