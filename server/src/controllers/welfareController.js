const Welfare = require('../models/Welfare');

async function getWelfare(req, res) {
  const w = await Welfare.findOne({ providerId: req.params.providerId });
  res.json(w || {});
}

async function upsertWelfare(req, res) {
  const w = await Welfare.findOneAndUpdate({ providerId: req.params.providerId }, req.body, { new: true, upsert: true });
  res.json(w);
}

module.exports = { getWelfare, upsertWelfare };
