const express = require('express');
const router = express.Router();
const aws = require('aws-sdk');

const s3 = new aws.S3({
  accessKeyId: process.env.aws_access_key_id,
  secretAccessKey: process.env.aws_secret_access_key,
  sessionToken: process.env.aws_session_token,
  region: 'us-east-1',
});

router.post('/', async (req, res) => {
  const {firstName, lastName, code} = req.body || {};

  const params = {
    Bucket: `${process.env.Environment}-source-bucket`,
    Key: `${firstName}-${lastName}-${new Date().getTime()}.json`,
    Body: JSON.stringify({
      requested_by: `${firstName} ${lastName}`,
      commands: code.split('\n'),
    })
  };

  const result = await s3.putObject(params).promise();
  res.send(result);
});

router.get('/', async (req, res) => {
  const params = {
    Bucket: `${process.env.Environment}-results-bucket`,
    MaxKeys: 100
  };

  const objects = await s3.listObjectsV2(params).promise();
  console.log(objects);

  res.json(objects);
});

router.get('/:key', async (req, res) => {
  const params = {
    Bucket: `${process.env.Environment}-results-bucket`,
    Key: req.params.key
  };

  s3.getObject(params).createReadStream()
    .pipe(res.set('Content-Type', 'application/json').set('Content-Disposition', 'inline; filename="results.json"'));
});

module.exports = router;
